"use client";

import { useState } from "react";
import { callAI, callAIStream } from "@/lib/ai";
import { Loader2, Sparkles, FileText, Copy, Check } from "lucide-react";
import { MD } from "@/components/markdown";

export default function NotesPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      const stream = callAIStream(
        `请分析以下会议记录/沟通内容，提取关键信息：\n\n${input}`,
        `你是一位资深的 ToB 医疗行业产品经理助手。分析用户与医疗客户的沟通记录，提取以下内容：

1. **关键需求**：客户明确提出或暗示的需求
2. **医疗术语**：出现的专业术语及解释
3. **待确认事项**：需要进一步和客户确认的问题
4. **Action Items**：后续需要做的事情
5. **需求摘要**：一段话总结核心需求

请用结构化格式输出。`
      );
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        setResult(acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToPRD = () => {
    if (!result) return;
    localStorage.setItem("prd-draft", result);
    window.location.href = "/prd";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">会议记录助手</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          记录与客户的沟通内容，AI 自动提取需求和待办
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴或输入与医疗客户的沟通内容、会议记录..."
            rows={16}
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !input.trim()}
            className="mt-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            分析内容
          </button>
        </div>

        <div>
          {result ? (
            <div className="rounded-xl border border-[var(--color-border)] h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                <span className="text-sm font-medium">分析结果</span>
                <div className="flex gap-1">
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
              </div>
              <div className="flex-1 overflow-y-auto p-4 prose prose-sm max-w-none">
                <MD>{result}</MD>
                {loading && <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-0.5 align-text-bottom" />}
              </div>
              <div className="px-4 py-2.5 border-t border-[var(--color-border)]">
                <button
                  onClick={handleToPRD}
                  className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  用此结果生成 PRD
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] h-64 flex items-center justify-center text-sm text-[var(--color-muted-foreground)]">
              分析结果将在这里显示
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
