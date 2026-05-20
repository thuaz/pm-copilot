import { getAIConfig } from "./ai";

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const config = getAIConfig();

  if (config?.provider === "claude") {
    throw new Error("语音转写暂不支持 Claude，请在设置中切换为硅基流动或 OpenAI");
  }

  const mimeType = audioBlob.type || "audio/webm";
  const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("mp3") ? "mp3" : "webm";
  const file = new File([audioBlob], `recording.${ext}`, { type: mimeType });

  const formData = new FormData();
  formData.append("file", file);

  if (config?.apiKey && config.provider) {
    formData.append("provider", config.provider);
    formData.append("apiKey", config.apiKey);
    if (config.baseUrl) formData.append("baseUrl", config.baseUrl);
  }

  const res = await fetch("/api/whisper", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}
