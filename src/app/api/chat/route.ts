import { NextRequest, NextResponse } from "next/server";

const DEFAULT_API_KEY = process.env.AI_API_KEY || "";
const DEFAULT_BASE_URL = process.env.AI_BASE_URL || "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, provider, apiKey: clientKey, baseUrl: clientBaseUrl, model: clientModel } = body;

    const apiKey = clientKey || DEFAULT_API_KEY;
    const baseUrl = clientBaseUrl || DEFAULT_BASE_URL;
    const model = clientModel || DEFAULT_MODEL;

    if (!apiKey) {
      return NextResponse.json({ error: "未配置 AI API Key" }, { status: 400 });
    }

    if (provider === "claude") {
      return streamClaudeChat(apiKey, model, messages);
    }

    return streamOpenAIChat(baseUrl, apiKey, model, messages);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "请求失败" },
      { status: 500 }
    );
  }
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function streamOpenAIChat(
  baseUrl: string, apiKey: string, model: string,
  messages: ChatMessage[]
) {
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
          controller.enqueue(encoder.encode(`API 错误: ${res.status} - ${err}`));
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
                controller.enqueue(encoder.encode(delta));
              }
            } catch {}
          }
        }
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(e instanceof Error ? e.message : "请求失败"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

function streamClaudeChat(
  apiKey: string, model: string,
  messages: ChatMessage[]
) {
  // Claude uses system as a top-level field, not in messages
  const systemMsg = messages.find((m) => m.role === "system")?.content;
  const chatMsgs = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    stream: true,
    messages: chatMsgs,
  };
  if (systemMsg) body.system = systemMsg;

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
          controller.enqueue(encoder.encode(`Claude API 错误: ${res.status} - ${err}`));
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
                controller.enqueue(encoder.encode(json.delta.text));
              }
            } catch {}
          }
        }
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(e instanceof Error ? e.message : "请求失败"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
