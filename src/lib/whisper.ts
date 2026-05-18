import { getAIConfig } from "./ai";

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const config = getAIConfig();
  if (!config?.apiKey) {
    throw new Error("请先在设置中配置 AI API Key");
  }

  const mimeType = audioBlob.type || "audio/webm";
  const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("mp3") ? "mp3" : "webm";
  const file = new File([audioBlob], `recording.${ext}`, { type: mimeType });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", "FunAudioLLM/SenseVoiceSmall");
  formData.append("language", "zh");

  // 硅基流动支持语音转文字，使用 OpenAI 兼容接口
  const baseUrl = config.provider === "openai"
    ? "https://api.openai.com/v1"
    : config.provider === "siliconflow"
    ? "https://api.siliconflow.cn/v1"
    : "https://api.openai.com/v1";

  const res = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`语音转文字失败: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.text;
}
