export type AIProvider = "siliconflow" | "openai" | "claude";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

const HARDCODED_KEY = "sk-nnszgpvgumppxrljqvbvjpdxdmehdvuanbcjrxbhhilgtzcx";
const HARDCODED_BASE_URL = "https://api.siliconflow.cn/v1";

const PROVIDER_DEFAULTS: Record<AIProvider, { model: string; baseUrl: string }> = {
  siliconflow: {
    model: "Qwen/Qwen2.5-7B-Instruct",
    baseUrl: "https://api.siliconflow.cn/v1",
  },
  openai: {
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
  },
  claude: {
    model: "claude-sonnet-4-20250514",
    baseUrl: "https://api.anthropic.com",
  },
};

export const PROVIDER_OPTIONS: { key: AIProvider; label: string; keyHint: string }[] = [
  { key: "siliconflow", label: "硅基流动", keyHint: "sk-..." },
  { key: "openai", label: "OpenAI", keyHint: "sk-..." },
  { key: "claude", label: "Claude", keyHint: "sk-ant-..." },
];

export function getAIConfig(): AIConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("ai-config");
  if (raw) {
    try {
      const config = JSON.parse(raw) as AIConfig;
      if (config.apiKey) return config;
    } catch {}
  }
  return {
    provider: "siliconflow",
    apiKey: HARDCODED_KEY,
    baseUrl: HARDCODED_BASE_URL,
    model: "Qwen/Qwen2.5-7B-Instruct",
  };
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem("ai-config", JSON.stringify(config));
}

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const config = getAIConfig();
  if (!config?.apiKey) {
    throw new Error("请先在设置中配置 AI API Key");
  }

  const defaults = PROVIDER_DEFAULTS[config.provider];
  const model = config.model || defaults.model;

  if (config.provider === "claude") {
    return callClaude(config.apiKey, model, prompt, systemPrompt);
  }

  const baseUrl = config.baseUrl || defaults.baseUrl;
  return callOpenAICompatible(baseUrl, config.apiKey, model, prompt, systemPrompt);
}

export function callAIStream(prompt: string, systemPrompt?: string): ReadableStream<string> {
  const config = getAIConfig();
  if (!config?.apiKey) {
    return new ReadableStream({
      start(controller) {
        controller.error(new Error("请先在设置中配置 AI API Key"));
      },
    });
  }

  const defaults = PROVIDER_DEFAULTS[config.provider];
  const model = config.model || defaults.model;

  if (config.provider === "claude") {
    return streamClaude(config.apiKey, model, prompt, systemPrompt);
  }

  const baseUrl = config.baseUrl || defaults.baseUrl;
  return streamOpenAICompatible(baseUrl, config.apiKey, model, prompt, systemPrompt);
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 错误: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function streamOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string
): ReadableStream<string> {
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  return new ReadableStream<string>({
    async start(controller) {
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, messages, temperature: 0.7, stream: true }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`API 错误: ${res.status} - ${err}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop()!;

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(delta);
            } catch {}
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API 错误: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

function streamClaude(
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt?: string
): ReadableStream<string> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    stream: true,
    messages: [{ role: "user", content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  return new ReadableStream<string>({
    async start(controller) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Claude API 错误: ${res.status} - ${err}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop()!;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              if (json.type === "content_block_delta" && json.delta?.text) {
                controller.enqueue(json.delta.text);
              }
            } catch {}
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
