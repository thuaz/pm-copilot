"use client";

import { useState } from "react";
import { callAI, callAIStream } from "@/lib/ai";
import { Loader2, ArrowRightLeft, MessageSquare, BookOpen, Copy, Check } from "lucide-react";

type DevMode = "translate" | "explain" | "template";

export default function DevCommPage() {
  const [mode, setMode] = useState<DevMode>("translate");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      let systemPrompt = "";
      let prompt = input;

      if (mode === "translate") {
        systemPrompt = `你是一位既懂产品又懂技术的翻译官。

用户会给你一段产品需求描述（可能是非专业人士写的），请把它翻译成开发团队能理解的技术语言：

1. 将模糊的需求转化为具体的技术任务
2. 补充开发需要知道的技术细节（数据结构、接口、状态管理等）
3. 列出可能的技术风险或需要确认的点
4. 保持简洁，使用开发术语但不过度复杂

回复格式：
### 技术理解
[用技术语言重述需求]

### 建议实现方式
[简要的技术方案建议]

### 需要确认的问题
[列出需要和开发确认的点]`;
      } else if (mode === "explain") {
        systemPrompt = `你是一位技术翻译官，帮非技术背景的产品经理理解技术术语和开发概念。

用通俗的比喻来解释技术概念，让没有计算机背景的人也能理解。
每次解释控制在 200 字以内。

回复格式：
### 解释
[通俗解释]

### 打个比方
[用日常生活的比喻说明]

### 在项目中的意义
[这个技术概念对当前项目意味着什么]`;
      } else {
        systemPrompt = `你是一位技术 PM，帮助产品经理生成规范的技术沟通模板。

根据用户的场景描述，生成一份结构化的沟通文档，让 PM 可以直接发给开发团队。`;
        prompt = `场景：${input}\n\n请生成一份给开发团队的沟通文档，包含：需求背景、具体要求、期望交付时间、需要开发确认的问题。`;
      }

      const stream = callAIStream(prompt, systemPrompt);
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        setResult(acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modes: { key: DevMode; label: string; icon: typeof ArrowRightLeft; desc: string }[] = [
    { key: "translate", label: "需求翻译", icon: ArrowRightLeft, desc: "把产品需求翻译成开发听得懂的语言" },
    { key: "explain", label: "技术答疑", icon: BookOpen, desc: "不懂的技术术语，AI 帮你通俗解释" },
    { key: "template", label: "沟通模板", icon: MessageSquare, desc: "生成发给开发团队的规范文档" },
  ];

  const placeholders: Record<DevMode, string> = {
    translate: "描述你的产品需求，比如：用户希望能够在手机上查看检查报告...",
    explain: "输入不理解的技术术语，比如：API、数据库、前端、部署、CDN...",
    template: "描述你要和开发沟通的场景，比如：新功能需求评审、Bug 反馈、排期讨论...",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">开发沟通助手</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          帮助你理解技术术语，把需求翻译成开发听得懂的语言
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => {
                setMode(m.key);
                setResult("");
                setInput("");
              }}
              className={`p-3 rounded-xl border text-left transition-colors ${
                mode === m.key
                  ? "border-[var(--color-primary)] bg-[var(--color-accent)]"
                  : "border-[var(--color-border)] hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={`w-4 h-4 ${
                    mode === m.key
                      ? "text-[var(--color-primary)]"
                      : "text-gray-400"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    mode === m.key
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-foreground)]"
                  }`}
                >
                  {m.label}
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {m.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div className="mb-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholders[mode]}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
        />
        <button
          onClick={handleRun}
          disabled={loading || !input.trim()}
          className="mt-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="w-4 h-4" />
          )}
          {mode === "translate"
            ? "翻译"
            : mode === "explain"
            ? "解释"
            : "生成"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
            <span className="text-sm font-medium">
              {mode === "translate"
                ? "技术翻译结果"
                : mode === "explain"
                ? "术语解释"
                : "沟通文档"}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="p-4 prose prose-sm max-w-none whitespace-pre-wrap">
            {result}
            {loading && <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-0.5 align-text-bottom" />}
          </div>
        </div>
      )}
    </div>
  );
}
