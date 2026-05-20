import { NextRequest, NextResponse } from "next/server";

const DEFAULT_API_KEY = process.env.AI_API_KEY || "";
const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL = "FunAudioLLM/SenseVoiceSmall";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const provider = formData.get("provider") as string | null;
    const apiKey = formData.get("apiKey") as string | null;
    const baseUrl = formData.get("baseUrl") as string | null;

    if (!file) {
      return NextResponse.json({ error: "缺少音频文件" }, { status: 400 });
    }

    // Custom config: check provider
    if (provider && apiKey) {
      if (provider === "claude") {
        return NextResponse.json(
          { error: "语音转写暂不支持 Claude，请在设置中切换为硅基流动或 OpenAI" },
          { status: 400 }
        );
      }

      const base = baseUrl || (provider === "openai" ? "https://api.openai.com/v1" : "https://api.siliconflow.cn/v1");
      return transcribe(base, apiKey, formData, file);
    }

    // Default: use server-side key (siliconflow)
    if (!DEFAULT_API_KEY) {
      return NextResponse.json(
        { error: "服务端未配置 API Key，请在设置中自定义配置" },
        { status: 500 }
      );
    }

    return transcribe(DEFAULT_BASE_URL, DEFAULT_API_KEY, formData, file);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "语音转写失败" },
      { status: 500 }
    );
  }
}

async function transcribe(
  baseUrl: string,
  apiKey: string,
  originalFormData: FormData,
  file: File,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", DEFAULT_MODEL);
  formData.append("language", "zh");

  const res = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `语音转写失败: ${res.status} - ${err}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json({ text: data.text });
}
