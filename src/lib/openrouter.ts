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
};

type ChatCompletionPayload = {
  choices?: {
    message?: {
      content?: string | Record<string, unknown>;
    };
  }[];
};

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";
const DEFAULT_TIMEOUT_MS = 18_000;

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
    baseUrl: (process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, ""),
    appName: process.env.OPENROUTER_APP_NAME?.trim() || "",
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || "",
  };
}

export function hasOpenRouterConfig() {
  return Boolean(getOpenRouterConfig().apiKey);
}

export function getOpenRouterStatus() {
  const config = getOpenRouterConfig();

  return {
    openRouterConfigured: Boolean(config.apiKey),
    model: config.model,
    baseUrlConfigured: Boolean(process.env.OPENROUTER_BASE_URL?.trim()),
    siteUrlConfigured: Boolean(config.siteUrl),
  };
}

function buildHeaders(config: ReturnType<typeof getOpenRouterConfig>) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.siteUrl) {
    headers["HTTP-Referer"] = config.siteUrl;
  }

  if (config.appName) {
    headers["X-Title"] = config.appName;
  }

  return headers;
}

function extractJsonObject(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? content;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return candidate;
  }

  return candidate.slice(firstBrace, lastBrace + 1);
}

export function parseOpenRouterJson<T>(content: string | Record<string, unknown> | undefined) {
  if (!content) {
    return null;
  }

  if (typeof content !== "string") {
    return content as T;
  }

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

function buildUserPrompt({
  prompt,
  schema,
  input,
}: Pick<OpenRouterJsonRequest, "prompt" | "schema" | "input">) {
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

export async function callOpenRouterJson<T>({
  context,
  prompt,
  schema,
  input,
  maxTokens = 1200,
  temperature = 0.2,
  systemPrompt = "You are a recruiting analyst. Return strict JSON only.",
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: OpenRouterJsonRequest) {
  const config = getOpenRouterConfig();

  console.info(`[OpenRouter] configured: ${Boolean(config.apiKey)}`);
  console.info(`[OpenRouter] model: ${config.model}`);

  if (!config.apiKey) {
    return null;
  }

  const userPrompt = buildUserPrompt({ prompt, schema, input });
  const promptCharacterLength = systemPrompt.length + userPrompt.length;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const messages: OpenRouterMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(config),
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      console.warn(`[OpenRouter] ${context} failed: status ${response.status} ${response.statusText}`);
      return null;
    }

    const payload = (await response.json()) as ChatCompletionPayload;
    const content = payload.choices?.[0]?.message?.content;
    const parsed = parseOpenRouterJson<T>(content);

    if (!parsed) {
      console.warn(`[OpenRouter] ${context} failed: invalid JSON response`);
      return null;
    }

    console.info(`[OpenRouter] ${context} succeeded`);
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    if (timedOut || (error instanceof Error && error.name === "AbortError")) {
      console.warn(
        `[OpenRouter] timed out after ${timeoutMs} ms; model=${config.model}; promptCharacters=${promptCharacterLength}`,
      );
      return null;
    }
    console.warn(`[OpenRouter] ${context} failed: ${message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
