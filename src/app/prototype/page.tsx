"use client";

import { useState } from "react";
import { callAI, callAIStream } from "@/lib/ai";
import { PROTOTYPE_SYSTEM_PROMPT } from "@/lib/prompts/terms";
import { Loader2, Download, Eye, Code, Sparkles } from "lucide-react";

const templates = [
  { label: "登录页", desc: "用户登录界面" },
  { label: "列表页", desc: "数据列表 + 筛选 + 分页" },
  { label: "表单页", desc: "信息录入表单" },
  { label: "详情页", desc: "数据详情展示" },
  { label: "仪表盘", desc: "数据统计看板" },
];

export default function PrototypePage() {
  const [input, setInput] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"preview" | "code">("preview");

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setHtmlCode("");
    try {
      const stream = callAIStream(
        `请根据以下描述生成一个页面原型（线框图）：\n\n${input}`,
        PROTOTYPE_SYSTEM_PROMPT
      );
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        const htmlMatch = acc.match(/<!DOCTYPE html>[\s\S]*<\/html>/i) ||
          acc.match(/<html[\s\S]*<\/html>/i);
        setHtmlCode(htmlMatch ? htmlMatch[0] : acc);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!htmlCode) return;
    const blob = new Blob([htmlCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prototype-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">原型生成器</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          用文字描述页面功能，AI 生成可预览的线框图
        </p>
      </div>

      {/* Template Quick Pick */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="text-sm text-[var(--color-muted-foreground)] leading-8">
          快速模板：
        </span>
        {templates.map((t) => (
          <button
            key={t.label}
            onClick={() =>
              setInput(
                `生成一个医疗行业的${t.label}，${t.desc}。适合 ToB 产品风格，简洁专业。`
              )
            }
            className="px-3 py-1 rounded-full text-xs border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="mb-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="描述你想要的页面，比如：一个患者管理列表页，包含搜索、筛选、表格、分页..."
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-y"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !input.trim()}
          className="mt-2 px-4 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          生成原型
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Output */}
      {htmlCode && (
        <div className="rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
            <div className="flex gap-1">
              <button
                onClick={() => setView("preview")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs ${
                  view === "preview"
                    ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)]"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                预览
              </button>
              <button
                onClick={() => setView("code")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs ${
                  view === "code"
                    ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)]"
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                代码
              </button>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
            >
              <Download className="w-3.5 h-3.5" />
              下载 HTML
            </button>
          </div>
          <div className="h-[500px]">
            {view === "preview" ? (
              <iframe
                srcDoc={htmlCode}
                className="w-full h-full border-0"
                title="原型预览"
              />
            ) : (
              <pre className="h-full overflow-auto p-4 text-xs bg-gray-50">
                <code>{htmlCode}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
