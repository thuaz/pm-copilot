import { NextRequest, NextResponse } from "next/server";

const DEFAULT_API_KEY = process.env.AI_API_KEY || "";
const DEFAULT_BASE_URL = process.env.AI_BASE_URL || "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      systemPrompt,
      provider: clientProvider,
      apiKey: clientKey,
      baseUrl: clientBaseUrl,
      model: clientModel,
      stream = false,
    } = body;

    const useCustom = clientProvider && clientKey;

    if (useCustom) {
      const baseUrl = clientBaseUrl || getDefaultBaseUrl(clientProvider);
      const model = clientModel || getDefaultModel(clientProvider);

      if (clientProvider === "claude") {
        return stream
          ? streamClaudeResponse(clientKey, model, prompt, systemPrompt)
          : callClaude(clientKey, model, prompt, systemPrompt);
      }

      return stream
        ? streamOpenAIResponse(baseUrl, clientKey, model, prompt, systemPrompt)
        : callOpenAI(baseUrl, clientKey, model, prompt, systemPrompt);
    }

    if (stream) {
      return streamOpenAIResponse(DEFAULT_BASE_URL, DEFAULT_API_KEY, DEFAULT_MODEL, prompt, systemPrompt);
    }

    return callOpenAI(DEFAULT_BASE_URL, DEFAULT_API_KEY, DEFAULT_MODEL, prompt, systemPrompt);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "请求失败" },
      { status: 500 }
    );
  }
}

function getDefaultBaseUrl(provider: string): string {
  const defaults: Record<string, string> = {
    siliconflow: "https://api.siliconflow.cn/v1",
    openai: "https://api.openai.com/v1",
  };
  return defaults[provider] || defaults.siliconflow;
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    siliconflow: "Qwen/Qwen2.5-7B-Instruct",
    openai: "gpt-4o-mini",
    claude: "claude-sonnet-4-20250514",
  };
  return defaults[provider] || defaults.siliconflow;
}

async function callOpenAI(
  baseUrl: string, apiKey: string, model: string,
  prompt: string, systemPrompt?: string
) {
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
    return NextResponse.json({ error: `API 错误: ${res.status} - ${err}` }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ content: data.choices[0].message.content });
}

function streamOpenAIResponse(
  baseUrl: string, apiKey: string, model: string,
  prompt: string, systemPrompt?: string
) {
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `API 错误: ${res.status}` })}\n\n`));
          controller.close();
          return;
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
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : "请求失败" })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function callClaude(
  apiKey: string, model: string,
  prompt: string, systemPrompt?: string
) {
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
    return NextResponse.json({ error: `Claude API 错误: ${res.status} - ${err}` }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ content: data.content[0].text });
}

function streamClaudeResponse(
  apiKey: string, model: string,
  prompt: string, systemPrompt?: string
) {
  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    stream: true,
    messages: [{ role: "user", content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `Claude API 错误: ${res.status}` })}\n\n`));
          controller.close();
          return;
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
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: json.delta.text })}\n\n`));
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : "请求失败" })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
