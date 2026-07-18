import { logger } from "@/lib/logger";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterJsonRequest = {
  context: string;
  prompt: string;
  schema: Record<string, unknown>;
  input: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  timeoutMs?: number;
  retries?: number;
};

type ChatCompletionPayload = {
  choices?: {
    message?: {
      content?: string | Record<string, unknown>;
    };
  }[];
};

type ProviderError = {
  code?: string;
  message?: string;
};

type OpenRouterConfig = {
  apiKey?: string;
  model: string;
  baseUrl: string;
  endpoint: string;
  appName: string;
  siteUrl: string;
};

type ConfigResolution =
  | { config: OpenRouterConfig; configError?: never }
  | { config: Omit<OpenRouterConfig, "endpoint"> & { endpoint: null }; configError: string };

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-oss-20b:free";
const DEFAULT_TIMEOUT_MS = 18_000;
const COMPLETIONS_PATH = "/api/v1/chat/completions";
const API_ROOT_PATH = "/api/v1";

export type OpenRouterFailureReason =
  | "missing_config"
  | "invalid_config"
  | "timeout"
  | "invalid_json"
  | "rate_limited"
  | "server_error"
  | "authentication_error"
  | "billing_error"
  | "endpoint_not_found"
  | "model_not_found"
  | "client_error"
  | "network_error";

export type OpenRouterJsonResult<T> =
  | { ok: true; data: T; attempts: number; model: string; endpoint: string }
  | {
      ok: false;
      reason: OpenRouterFailureReason;
      message: string;
      retryable: boolean;
      attempts: number;
      model: string;
      endpoint?: string;
      status?: number;
      errorCode?: string;
      errorMessage?: string;
    };

export type OpenRouterProbeResult = {
  configured: boolean;
  endpointReachable: boolean;
  modelAvailable: boolean | null;
  status: number | null;
  model: string;
  endpoint?: string;
  reason?: OpenRouterFailureReason;
  errorCode?: string;
  errorMessage?: string;
};

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function resolveOpenRouterEndpoint(baseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl.trim());
  } catch {
    throw new Error("OPENROUTER_BASE_URL must be a valid HTTPS URL.");
  }

  if (parsed.protocol !== "https:" || parsed.search || parsed.hash) {
    throw new Error("OPENROUTER_BASE_URL must be an HTTPS API root without a query string or fragment.");
  }
  if (parsed.hostname !== "openrouter.ai") {
    throw new Error("OPENROUTER_BASE_URL must use the openrouter.ai host.");
  }

  const pathname = normalizePathname(parsed.pathname);
  if (pathname !== API_ROOT_PATH && pathname !== COMPLETIONS_PATH) {
    throw new Error(`OPENROUTER_BASE_URL must be ${DEFAULT_BASE_URL} or ${DEFAULT_BASE_URL}/chat/completions.`);
  }

  return `${parsed.origin}${COMPLETIONS_PATH}`;
}

function getOpenRouterConfig(): ConfigResolution {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const baseUrl = process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const common = {
    apiKey,
    model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
    baseUrl,
    appName: process.env.OPENROUTER_APP_NAME?.trim() || "",
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || "",
  };

  try {
    return { config: { ...common, endpoint: resolveOpenRouterEndpoint(baseUrl) } };
  } catch (error) {
    return {
      config: { ...common, endpoint: null },
      configError: error instanceof Error ? error.message : "Invalid OpenRouter configuration.",
    };
  }
}

export function hasOpenRouterConfig() {
  const resolution = getOpenRouterConfig();
  return Boolean(resolution.config.apiKey && !resolution.configError);
}

export function getOpenRouterModelName() {
  return getOpenRouterConfig().config.model;
}

export function getOpenRouterStatus() {
  const resolution = getOpenRouterConfig();
  const { config } = resolution;

  return {
    openRouterConfigured: Boolean(config.apiKey && !resolution.configError),
    model: config.model,
    baseUrlConfigured: Boolean(process.env.OPENROUTER_BASE_URL?.trim()),
    siteUrlConfigured: Boolean(config.siteUrl),
    resolvedBaseUrl: config.baseUrl,
    endpoint: config.endpoint,
    configError: resolution.configError ?? null,
  };
}

function buildHeaders(config: OpenRouterConfig) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.siteUrl) headers["HTTP-Referer"] = config.siteUrl;
  if (config.appName) headers["X-Title"] = config.appName;

  return headers;
}

function extractJsonObject(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? content;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return candidate;
  return candidate.slice(firstBrace, lastBrace + 1);
}

export function parseOpenRouterJson<T>(content: string | Record<string, unknown> | undefined) {
  if (!content) return null;
  if (typeof content !== "string") return content as T;

  try {
    return JSON.parse(content) as T;
  } catch {
    try {
      return JSON.parse(extractJsonObject(content)) as T;
    } catch {
      return null;
    }
  }
}

function sanitizeProviderValue(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).replace(/\s+/g, " ").trim().slice(0, 240) || undefined
    : undefined;
}

async function readProviderError(response: Response): Promise<ProviderError> {
  const raw = await response.text();
  if (!raw) return {};

  try {
    const payload = JSON.parse(raw) as { error?: { code?: unknown; message?: unknown } };
    return {
      code: sanitizeProviderValue(payload.error?.code),
      message: sanitizeProviderValue(payload.error?.message),
    };
  } catch {
    return { message: sanitizeProviderValue(raw) };
  }
}

export function classifyOpenRouterFailure(status: number, providerError: ProviderError = {}): Pick<Extract<OpenRouterJsonResult<unknown>, { ok: false }>, "reason" | "retryable"> {
  if (status === 401 || status === 403) return { reason: "authentication_error", retryable: false };
  if (status === 402) return { reason: "billing_error", retryable: false };
  if (status === 429) return { reason: "rate_limited", retryable: true };
  if (status >= 500) return { reason: "server_error", retryable: true };
  if (status === 404) {
    const diagnostic = `${providerError.code ?? ""} ${providerError.message ?? ""}`.toLowerCase();
    const modelMissing = /model|no endpoints found|provider.*not found|model.*not found/.test(diagnostic);
    return { reason: modelMissing ? "model_not_found" : "endpoint_not_found", retryable: false };
  }
  return { reason: "client_error", retryable: false };
}

// Backward-compatible export retained for callers and existing tests.
export function classifyOpenRouterStatus(status: number) {
  return classifyOpenRouterFailure(status);
}

function buildUserPrompt({ prompt, schema, input }: Pick<OpenRouterJsonRequest, "prompt" | "schema" | "input">) {
  return [
    prompt,
    "",
    "Return strict JSON only. Do not include markdown, commentary, or code fences.",
    "JSON schema:",
    JSON.stringify(schema),
    "",
    "Input:",
    JSON.stringify(input),
  ].join("\n");
}

function getConfigurationFailure<T>(resolution: ConfigResolution): Extract<OpenRouterJsonResult<T>, { ok: false }> | null {
  const { config } = resolution;
  if (!config.apiKey) {
    return {
      ok: false,
      reason: "missing_config",
      message: "OpenRouter is not configured.",
      retryable: false,
      attempts: 0,
      model: config.model,
      endpoint: config.endpoint ?? undefined,
    };
  }
  if (resolution.configError) {
    return {
      ok: false,
      reason: "invalid_config",
      message: resolution.configError,
      retryable: false,
      attempts: 0,
      model: config.model,
    };
  }
  return null;
}

async function fetchOpenRouter({
  config,
  messages,
  temperature,
  maxTokens,
  timeoutMs,
}: {
  config: OpenRouterConfig;
  messages: OpenRouterMessage[];
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(config.endpoint, {
      method: "POST",
      headers: buildHeaders(config),
      signal: controller.signal,
      body: JSON.stringify({ model: config.model, messages, temperature, max_tokens: maxTokens }),
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function executeOpenRouterJson<T>({
  config,
  context,
  userPrompt,
  systemPrompt,
  temperature,
  maxTokens,
  timeoutMs,
  attempt,
}: {
  config: OpenRouterConfig;
  context: string;
  userPrompt: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  attempt: number;
}): Promise<OpenRouterJsonResult<T>> {
  const promptCharacterLength = systemPrompt.length + userPrompt.length;
  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  logger.info("openrouter_request_started", {
    resourceType: context,
    endpoint: config.endpoint,
    model: config.model,
  });

  try {
    const response = await fetchOpenRouter({ config, messages, temperature, maxTokens, timeoutMs });
    if (!response.ok) {
      const providerError = await readProviderError(response);
      const classification = classifyOpenRouterFailure(response.status, providerError);
      logger.warn("openrouter_request_failed", {
        resourceType: context,
        endpoint: config.endpoint,
        model: config.model,
        status: response.status,
        reason: classification.reason,
        errorCode: providerError.code,
        errorMessage: providerError.message,
      });
      return {
        ok: false,
        reason: classification.reason,
        message: providerError.message ?? `Provider returned ${response.status}.`,
        retryable: classification.retryable,
        attempts: attempt,
        model: config.model,
        endpoint: config.endpoint,
        status: response.status,
        errorCode: providerError.code,
        errorMessage: providerError.message,
      };
    }

    const payload = (await response.json()) as ChatCompletionPayload;
    const parsed = parseOpenRouterJson<T>(payload.choices?.[0]?.message?.content);
    if (!parsed) {
      logger.warn("openrouter_request_failed", {
        resourceType: context,
        endpoint: config.endpoint,
        model: config.model,
        reason: "invalid_json",
      });
      return {
        ok: false,
        reason: "invalid_json",
        message: "Provider returned invalid JSON.",
        retryable: false,
        attempts: attempt,
        model: config.model,
        endpoint: config.endpoint,
      };
    }

    logger.info("openrouter_request_succeeded", { resourceType: context, endpoint: config.endpoint, model: config.model, status: 200 });
    return { ok: true, data: parsed, attempts: attempt, model: config.model, endpoint: config.endpoint };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    const reason: OpenRouterFailureReason = timedOut ? "timeout" : "network_error";
    logger.warn(timedOut ? "openrouter_request_timed_out" : "openrouter_request_failed", {
      resourceType: context,
      endpoint: config.endpoint,
      model: config.model,
      reason: timedOut ? `timeout_${timeoutMs}ms_${promptCharacterLength}chars` : error instanceof Error ? error.name : "network_error",
    });
    return {
      ok: false,
      reason,
      message: timedOut ? "Provider request timed out." : "Provider request failed.",
      retryable: true,
      attempts: attempt,
      model: config.model,
      endpoint: config.endpoint,
    };
  }
}

export async function callOpenRouterJsonWithStatus<T>({
  context,
  prompt,
  schema,
  input,
  maxTokens = 1200,
  temperature = 0.2,
  systemPrompt = "You are a recruiting analyst. Return strict JSON only.",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = 1,
}: OpenRouterJsonRequest): Promise<OpenRouterJsonResult<T>> {
  const resolution = getOpenRouterConfig();
  const configurationFailure = getConfigurationFailure<T>(resolution);
  const { config } = resolution;
  logger.info("openrouter_configuration_checked", {
    resourceType: context,
    reason: configurationFailure?.reason ?? "configured",
    baseUrl: config.baseUrl,
    endpoint: config.endpoint ?? undefined,
    model: config.model,
  });
  if (configurationFailure) return configurationFailure;

  const userPrompt = buildUserPrompt({ prompt, schema, input });
  let result: OpenRouterJsonResult<T> | null = null;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    result = await executeOpenRouterJson<T>({
      config: config as OpenRouterConfig,
      context,
      userPrompt,
      systemPrompt,
      temperature,
      maxTokens,
      timeoutMs,
      attempt,
    });
    if (result.ok || !result.retryable || attempt > retries) return result;
  }

  return result ?? {
    ok: false,
    reason: "network_error",
    message: "Provider request did not complete.",
    retryable: true,
    attempts: 0,
    model: config.model,
    endpoint: config.endpoint ?? undefined,
  };
}

export async function probeOpenRouter(): Promise<OpenRouterProbeResult> {
  const resolution = getOpenRouterConfig();
  const configurationFailure = getConfigurationFailure<never>(resolution);
  const { config } = resolution;
  if (configurationFailure) {
    return {
      configured: false,
      endpointReachable: false,
      modelAvailable: false,
      status: null,
      model: config.model,
      endpoint: config.endpoint ?? undefined,
      reason: configurationFailure.reason,
      errorMessage: configurationFailure.reason === "invalid_config" ? configurationFailure.message : undefined,
    };
  }

  try {
    const response = await fetchOpenRouter({
      config: config as OpenRouterConfig,
      messages: [{ role: "user", content: "Reply with OK." }],
      temperature: 0,
      maxTokens: 8,
      timeoutMs: 12_000,
    });
    if (response.ok) {
      return { configured: true, endpointReachable: true, modelAvailable: true, status: response.status, model: config.model, endpoint: config.endpoint ?? undefined };
    }
    const providerError = await readProviderError(response);
    const classification = classifyOpenRouterFailure(response.status, providerError);
    return {
      configured: true,
      endpointReachable: classification.reason !== "endpoint_not_found",
      modelAvailable: classification.reason === "model_not_found" ? false : null,
      status: response.status,
      model: config.model,
      endpoint: config.endpoint ?? undefined,
      reason: classification.reason,
      errorCode: providerError.code,
      errorMessage: providerError.message,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      configured: true,
      endpointReachable: false,
      modelAvailable: null,
      status: null,
      model: config.model,
      endpoint: config.endpoint ?? undefined,
      reason: timedOut ? "timeout" : "network_error",
      errorMessage: timedOut ? "Provider request timed out." : "Provider request failed.",
    };
  }
}

export async function callOpenRouterJson<T>(request: OpenRouterJsonRequest) {
  const result = await callOpenRouterJsonWithStatus<T>(request);
  return result.ok ? result.data : null;
}
