"use client";

import { useState, useEffect } from "react";
import { callAIStream } from "@/lib/ai";
import { PROTOTYPE_SYSTEM_PROMPT } from "@/lib/prompts/terms";
import { Loader2, Download, Eye, Code, Sparkles, Trash2, FileText, Plus } from "lucide-react";

interface SavedPrototype {
  id: string;
  title: string;
  description: string;
  htmlCode: string;
  createdAt: string;
}

function getSavedPrototypes(): SavedPrototype[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("prototypes") || "[]");
  } catch {
    return [];
  }
}

function savePrototypes(list: SavedPrototype[]) {
  localStorage.setItem("prototypes", JSON.stringify(list));
}

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
  const [savedList, setSavedList] = useState<SavedPrototype[]>([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    setSavedList(getSavedPrototypes());
  }, []);

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
      // Auto-save after generation completes
      const finalCode = (() => {
        const m = acc.match(/<!DOCTYPE html>[\s\S]*<\/html>/i) ||
          acc.match(/<html[\s\S]*<\/html>/i);
        return m ? m[0] : acc;
      })();
      handleSave(finalCode, input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (code?: string, desc?: string) => {
    const content = code || htmlCode;
    if (!content) return;
    const title = desc || input || "未命名原型";
    const proto: SavedPrototype = {
      id: `proto-${Date.now()}`,
      title: title.substring(0, 50),
      description: desc || input,
      htmlCode: content,
      createdAt: new Date().toISOString(),
    };
    const updated = [proto, ...savedList];
    setSavedList(updated);
    savePrototypes(updated);
  };

  const handleDelete = (id: string) => {
    const updated = savedList.filter((p) => p.id !== id);
    setSavedList(updated);
    savePrototypes(updated);
  };

  const handleOpen = (proto: SavedPrototype) => {
    setHtmlCode(proto.htmlCode);
    setInput(proto.description);
    setShowList(false);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">原型生成器</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            用文字描述页面功能，AI 生成可预览的线框图
          </p>
        </div>
        <button
          onClick={() => setShowList(!showList)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showList
              ? "bg-[var(--color-accent)] text-[var(--color-primary)]"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          历史原型 ({savedList.length})
        </button>
      </div>

      {showList ? (
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          {savedList.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">
              还没有保存的原型
            </p>
          ) : (
            <div className="space-y-2">
              {savedList.map((proto) => (
                <div
                  key={proto.id}
                  className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleOpen(proto)}
                >
                  <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{proto.title}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {new Date(proto.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(proto.id); }}
                    className="p-1.5 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
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
                    sandbox="allow-scripts"
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
        </>
      )}
    </div>
  );
}
