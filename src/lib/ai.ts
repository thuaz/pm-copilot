export type AIProvider = "siliconflow" | "openai" | "claude";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

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
  return null;
}

export function hasDefaultAI(): boolean {
  return true;
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem("ai-config", JSON.stringify(config));
}

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const config = getAIConfig();

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      systemPrompt,
      stream: false,
      provider: config?.provider,
      apiKey: config?.apiKey,
      baseUrl: config?.baseUrl,
      model: config?.model,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.content;
}

export function callAIStream(prompt: string, systemPrompt?: string): ReadableStream<string> {
  const config = getAIConfig();

  return new ReadableStream<string>({
    async start(controller) {
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            systemPrompt,
            stream: true,
            provider: config?.provider,
            apiKey: config?.apiKey,
            baseUrl: config?.baseUrl,
            model: config?.model,
          }),
        });

        if (!res.ok) {
          throw new Error(`请求失败: ${res.status}`);
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
              if (json.error) {
                controller.error(new Error(json.error));
                return;
              }
              if (json.content) controller.enqueue(json.content);
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
