type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterJsonRequest = {
  messages: OpenRouterMessage[];
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  context: string;
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

export function hasOpenRouterConfig() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    baseUrl: (process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    appName: process.env.OPENROUTER_APP_NAME || "",
    siteUrl: process.env.OPENROUTER_SITE_URL || "",
  };
}

function buildHeaders(config: NonNullable<ReturnType<typeof getOpenRouterConfig>>) {
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

export async function requestOpenRouterJson<T>({
  messages,
  schemaName,
  schema,
  maxTokens = 1200,
  temperature = 0.2,
  context,
}: OpenRouterJsonRequest) {
  const config = getOpenRouterConfig();

  if (!config) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(config),
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature,
        max_tokens: maxTokens,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[OpenRouter] ${context} failed with status ${response.status}.`);
      return null;
    }

    const payload = (await response.json()) as ChatCompletionPayload;
    const content = payload.choices?.[0]?.message?.content;
    const parsed = parseOpenRouterJson<T>(content);

    if (!parsed) {
      console.warn(`[OpenRouter] ${context} returned invalid JSON.`);
      return null;
    }

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`[OpenRouter] ${context} request failed: ${message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
