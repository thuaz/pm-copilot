"use client";

import { useState, useEffect } from "react";
import { getAIConfig, saveAIConfig, PROVIDER_OPTIONS, type AIProvider } from "@/lib/ai";
import { Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

const PROVIDER_MODELS: Record<AIProvider, { label: string; value: string }[]> = {
  siliconflow: [
    { label: "Qwen2.5-7B（免费）", value: "Qwen/Qwen2.5-7B-Instruct" },
    { label: "Qwen2.5-32B", value: "Qwen/Qwen2.5-32B-Instruct" },
    { label: "Qwen2.5-72B", value: "Qwen/Qwen2.5-72B-Instruct" },
    { label: "DeepSeek-V3", value: "deepseek-ai/DeepSeek-V3" },
    { label: "DeepSeek-R1", value: "deepseek-ai/DeepSeek-R1" },
    { label: "GLM-4-9B（免费）", value: "THUDM/glm-4-9b-chat" },
  ],
  openai: [
    { label: "GPT-4o mini", value: "gpt-4o-mini" },
    { label: "GPT-4o", value: "gpt-4o" },
  ],
  claude: [
    { label: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
    { label: "Claude Haiku 3.5", value: "claude-haiku-4-5-20251001" },
  ],
};

export default function SettingsPage() {
  const [provider, setProvider] = useState<AIProvider>("siliconflow");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const hasDefault = !!process.env.NEXT_PUBLIC_DEFAULT_API_KEY;
  const [usingDefault, setUsingDefault] = useState(false);

  useEffect(() => {
    setUsingDefault(hasDefault && !localStorage.getItem("ai-config"));
    const raw = localStorage.getItem("ai-config");
    if (raw) {
      try {
        const config = JSON.parse(raw);
        if (config.apiKey) {
          setProvider(config.provider || "siliconflow");
          setApiKey(config.apiKey);
          setModel(config.model || "");
          return;
        }
      } catch {}
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    saveAIConfig({ provider, apiKey: apiKey.trim(), model: model || undefined });
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      saveAIConfig({ provider, apiKey: apiKey.trim(), model: model || undefined });
      const { callAI } = await import("@/lib/ai");
      await callAI("请回复：连接成功");
      setTestResult("ok");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  const currentModels = PROVIDER_MODELS[provider];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          配置 AI 服务，让工具用起来
        </p>
      </div>

      <div className="space-y-6 max-w-lg">
        <div className="rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-medium mb-4">AI 服务配置</h2>

          {usingDefault && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              已配置默认 AI 服务（硅基流动），可直接使用所有功能。你也可以换成自己的 Key。
            </div>
          )}

          <div className="space-y-4">
            {/* Provider */}
            <div>
              <label className="text-sm text-[var(--color-muted-foreground)] mb-2 block">
                AI 服务商
              </label>
              <div className="flex gap-2">
                {PROVIDER_OPTIONS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setProvider(p.key);
                      setModel("");
                      setSaved(false);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      provider === p.key
                        ? "border-[var(--color-primary)] bg-[var(--color-accent)] text-[var(--color-primary)]"
                        : "border-[var(--color-border)] hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="text-sm text-[var(--color-muted-foreground)] mb-2 block">
                模型
              </label>
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setSaved(false);
                }}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] text-sm bg-white focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">默认模型</option>
                {currentModels.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="text-sm text-[var(--color-muted-foreground)] mb-2 block">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setSaved(false);
                  }}
                  placeholder={PROVIDER_OPTIONS.find((p) => p.key === provider)?.keyHint}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] text-sm pr-10 focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1.5">
                {provider === "siliconflow"
                  ? "从 siliconflow.cn 获取，注册即送免费额度"
                  : provider === "openai"
                  ? "从 platform.openai.com 获取"
                  : "从 console.anthropic.com 获取"}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Key 仅保存在你的浏览器中，不会上传到任何服务器
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="px-4 py-2 rounded-lg text-sm bg-[var(--color-primary)] text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saved ? "已保存" : "保存"}
              </button>
              <button
                onClick={handleTest}
                disabled={!apiKey.trim() || testing}
                className="px-4 py-2 rounded-lg text-sm border border-[var(--color-border)] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {testing ? "测试中..." : "测试连接"}
                {testResult === "ok" && <CheckCircle className="w-4 h-4 text-green-500" />}
                {testResult === "fail" && <AlertCircle className="w-4 h-4 text-red-500" />}
              </button>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-medium mb-2">数据存储</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            当前使用浏览器本地存储 (localStorage)，所有数据仅保存在你的浏览器中。
          </p>
        </div>
      </div>
    </div>
  );
}
