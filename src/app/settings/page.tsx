"use client";

import { useState, useEffect, useRef } from "react";
import { getAIConfig, saveAIConfig, PROVIDER_OPTIONS, type AIProvider } from "@/lib/ai";
import {
  Eye, EyeOff, CheckCircle, AlertCircle, Download, Upload, Trash2,
  BookOpen, ChevronDown, Shield, Database, HelpCircle, Lightbulb,
} from "lucide-react";

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

function collectAllData(): Record<string, unknown> {
  const keys = [
    "prd-docs", "prd-draft", "saved-terms", "saved-notes", "pm-todos", "prototypes",
    "pm-projects", "pm-current-project",
    "ai-config", "workflow-dismissed", "comm-guide-favorites", "comm-guide-custom",
  ];
  const data: Record<string, unknown> = {};
  keys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  });
  return data;
}

function restoreAllData(data: Record<string, unknown>) {
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  });
}

function clearAllData() {
  const keys = [
    "prd-docs", "prd-draft", "saved-terms", "saved-notes", "pm-todos", "prototypes",
    "pm-projects", "pm-current-project",
    "ai-config", "workflow-dismissed", "comm-guide-favorites", "comm-guide-custom",
  ];
  keys.forEach((key) => localStorage.removeItem(key));
}

export default function SettingsPage() {
  const [provider, setProvider] = useState<AIProvider>("siliconflow");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [usingDefault, setUsingDefault] = useState(false);

  // Data management
  const [backupStatus, setBackupStatus] = useState<"idle" | "done" | "fail">("idle");
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "done" | "fail">("idle");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearDone, setClearDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guide sections
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("ai-config");
    setUsingDefault(!raw);
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
    // Load last backup date
    setLastBackupDate(localStorage.getItem("last-backup-date"));
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

  const handleBackup = () => {
    try {
      const data = collectAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pm-copilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      // Track last backup date for reminder
      localStorage.setItem("last-backup-date", new Date().toISOString().slice(0, 10));
      setBackupStatus("done");
      setTimeout(() => setBackupStatus("idle"), 3000);
    } catch {
      setBackupStatus("fail");
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        restoreAllData(data);
        setRestoreStatus("done");
        setTimeout(() => setRestoreStatus("idle"), 3000);
      } catch {
        setRestoreStatus("fail");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClear = () => {
    clearAllData();
    setShowClearConfirm(false);
    setClearDone(true);
    setTimeout(() => setClearDone(false), 3000);
  };

  const currentModels = PROVIDER_MODELS[provider];

  const guides = [
    {
      key: "quick-start",
      title: "快速上手",
      content: `PM Copilot 是专为医疗行业 PM 设计的日常工作工具。核心流程：

1. **开会前** → 用「医学术语」预习专业词汇
2. **开会时** → 用「录音分析」一键录音
3. **开会后** → AI 自动转文字并生成会议总结
4. **写需求** → 审核总结后一键生成 PRD
5. **出原型** → 用「原型生成」快速出页面
6. **交开发** → 用「开发沟通」把需求翻译成技术语言

每个功能都可以独立使用，不一定要按顺序走。`,
    },
    {
      key: "prd-tips",
      title: "写好 PRD 的技巧",
      content: `1. **对话式写 PRD**：像聊天一样描述你的想法，AI 会逐步引导你补充细节
2. **引导式写 PRD**：如果思路还不清晰，用引导式填表，按步骤整理需求
3. **从录音生成**：开完会后直接从录音分析结果生成 PRD，最省事
4. **迭代 PRD**：PRD 不是一次写完的，可以随时迭代，输入工程师的反馈即可自动更新
5. **导出格式**：支持 Markdown、Word、PDF、HTML 四种格式，发给甲方用 Word/PDF，发给开发用 Markdown`,
    },
    {
      key: "dev-comm-tips",
      title: "和开发沟通的技巧",
      content: `1. **需求翻译**：把你的产品需求描述给 AI，它会翻译成开发能理解的技术语言
2. **技术答疑**：遇到不懂的技术术语，直接问 AI，会用通俗比喻解释
3. **沟通模板**：不确定怎么写需求文档？AI 帮你生成规范的技术沟通文档
4. **常见术语**：API = 接口，前端 = 用户看到的界面，后端 = 服务器逻辑，部署 = 把代码放到服务器上`,
    },
    {
      key: "data-safety",
      title: "数据安全说明",
      content: `1. **所有数据都存在你的浏览器中**，不会上传到任何服务器
2. **定期备份**：建议每周备份一次数据（设置页 → 数据备份）
3. **注意**：清除浏览器数据会丢失所有内容，请先备份
4. **换电脑/浏览器**：在新设备上用「数据恢复」导入备份文件即可`,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          配置 AI 服务、管理数据、查看使用指南
        </p>
      </div>

      <div className="space-y-6 max-w-lg">
        {/* AI Config */}
        <div className="rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--color-muted-foreground)]" />
            AI 服务配置
          </h2>

          {usingDefault && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              已配置默认 AI 服务（硅基流动），可直接使用所有功能。你也可以换成自己的 Key。
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm text-[var(--color-muted-foreground)] mb-2 block">
                AI 服务商
              </label>
              <div className="flex flex-wrap gap-2">
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

        {/* Data Backup & Restore */}
        <div className="rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--color-muted-foreground)]" />
            数据管理
          </h2>

          <div className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={handleBackup}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                {backupStatus === "done" ? "已导出" : "备份数据"}
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {restoreStatus === "done" ? "已恢复" : "恢复数据"}
              </button>
            </div>

            {backupStatus === "done" && (
              <p className="text-xs text-green-600">备份文件已下载，请妥善保存。</p>
            )}
            {restoreStatus === "done" && (
              <p className="text-xs text-green-600">数据恢复成功，刷新页面后生效。</p>
            )}
            {(backupStatus === "fail" || restoreStatus === "fail") && (
              <p className="text-xs text-red-600">操作失败，请重试。</p>
            )}

            <p className="text-xs text-[var(--color-muted-foreground)]">
              备份会将所有数据（PRD、待办、术语收藏、原型）导出为 JSON 文件。
              换电脑或清浏览器前记得备份。
              {lastBackupDate && (
                <span className="block mt-1">
                  上次备份: {lastBackupDate}
                </span>
              )}
            </p>

            <div className="border-t border-[var(--color-border)] pt-4">
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" /> 清除所有数据
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 mb-2">
                    确定要清除所有数据吗？此操作不可恢复！
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClear}
                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                    >
                      确认清除
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
              {clearDone && (
                <p className="text-xs text-green-600 mt-2">所有数据已清除。</p>
              )}
            </div>
          </div>
        </div>

        {/* Usage Guide */}
        <div className="rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--color-muted-foreground)]" />
            使用指南
          </h2>
          <div className="space-y-2">
            {guides.map((guide) => (
              <div key={guide.key} className="rounded-lg border border-[var(--color-border)]">
                <button
                  onClick={() => setOpenGuide(openGuide === guide.key ? null : guide.key)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[var(--color-primary)]" />
                    {guide.title}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openGuide === guide.key ? "rotate-180" : ""}`} />
                </button>
                {openGuide === guide.key && (
                  <div className="px-4 pb-4 text-sm text-[var(--color-muted-foreground)] whitespace-pre-line border-t border-[var(--color-border)] pt-3 leading-relaxed">
                    {guide.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
