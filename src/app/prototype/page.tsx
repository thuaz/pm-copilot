"use client";

import { useState, useEffect } from "react";
import { callAIStream } from "@/lib/ai";
import { PROTOTYPE_SYSTEM_PROMPT, DESIGN_PROMPT_SYSTEM } from "@/lib/prompts/terms";
import {
  Loader2, Download, Eye, Code, Sparkles, Trash2, FileText,
  Monitor, Smartphone, Save, Copy, Check, Search, Image, ExternalLink,
} from "lucide-react";

interface SavedPrototype {
  id: string;
  title: string;
  description: string;
  htmlCode: string;
  designPrompt: string;
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

type ProgressStep = "idle" | "generating" | "searching" | "prompting" | "done";

export default function PrototypePage() {
  const [input, setInput] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [designPrompt, setDesignPrompt] = useState("");
  const [similarLinks, setSimilarLinks] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressStep>("idle");
  const [error, setError] = useState("");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [savedList, setSavedList] = useState<SavedPrototype[]>([]);
  const [showList, setShowList] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setSavedList(getSavedPrototypes());
  }, []);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    setHtmlCode("");
    setDesignPrompt("");
    setSimilarLinks("");

    try {
      // Step 1: Generate HTML prototype
      setProgress("generating");
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

      // Step 2: Search for similar products
      setProgress("searching");
      const searchStream = callAIStream(
        `用户想做一个页面，描述如下：「${input}」\n\n请推荐 3-5 个有类似功能/界面的知名产品或网站，给出：\n1. 产品名称\n2. 官网或体验链接（如果知道的话）\n3. 哪些设计值得参考\n\n格式简洁，每条一段。如果不确定链接，给出产品名即可。`,
        "你是一位产品设计师，熟悉国内外各类产品的设计。根据用户描述推荐类似的参考产品。"
      );
      const reader2 = searchStream.getReader();
      let searchAcc = "";
      while (true) {
        const { done, value } = await reader2.read();
        if (done) break;
        searchAcc += value;
        setSimilarLinks(searchAcc);
      }

      // Step 3: Generate design prompt for image generation
      setProgress("prompting");
      const promptStream = callAIStream(
        `根据以下页面描述，生成一段适合 AI 生图工具（如豆包、Midjourney、DALL-E）使用的英文提示词（prompt）。\n\n页面描述：${input}\n\n要求：\n1. 描述页面的视觉风格、布局、配色、关键元素\n2. 用英文输出，方便直接粘贴到生图工具\n3. 包含 UI/UX 设计关键词（如 wireframe, mockup, clean design, modern interface 等）\n4. 同时给出一段中文的页面视觉描述（方便用户理解）\n\n输出格式：\n### 英文 Prompt（复制到豆包/Midjourney）\n[英文提示词]\n\n### 中文视觉描述\n[中文描述]`,
        DESIGN_PROMPT_SYSTEM
      );
      const reader3 = promptStream.getReader();
      let promptAcc = "";
      while (true) {
        const { done, value } = await reader3.read();
        if (done) break;
        promptAcc += value;
        setDesignPrompt(promptAcc);
      }

      setProgress("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
      setProgress("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    const content = htmlCode;
    if (!content) return;
    const title = input || "未命名原型";
    const proto: SavedPrototype = {
      id: `proto-${Date.now()}`,
      title: title.substring(0, 50),
      description: input,
      htmlCode: content,
      designPrompt,
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
    setDesignPrompt(proto.designPrompt || "");
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

  // Extract English prompt from design prompt text
  const getEnglishPrompt = () => {
    const match = designPrompt.match(/###\s*英文 Prompt[^]*?\n([\s\S]*?)(?=\n###|$)/i);
    return match ? match[1].trim() : designPrompt;
  };

  const progressLabels: Record<ProgressStep, string> = {
    idle: "",
    generating: "正在生成 HTML 原型...",
    searching: "正在搜索类似产品参考...",
    prompting: "正在生成设计描述词...",
    done: "",
  };

  const progressSteps = [
    { key: "generating", label: "HTML 原型" },
    { key: "searching", label: "产品参考" },
    { key: "prompting", label: "设计描述词" },
  ];

  const stepOrder: Record<string, number> = { generating: 0, searching: 1, prompting: 2, done: 3 };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">原型生成器</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            描述页面功能 → 生成原型 + 产品参考 + 设计描述词
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
              一键生成（原型 + 参考 + 描述词）
            </button>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="mb-4 rounded-xl border border-[var(--color-border)] p-4">
              <div className="flex items-center gap-3 mb-3">
                {progressSteps.map((step, i) => {
                  const currentIdx = stepOrder[progress] ?? 0;
                  const isActive = i === currentIdx;
                  const isDone = i < currentIdx;
                  return (
                    <div key={step.key} className="flex items-center gap-2">
                      {i > 0 && <div className={`w-6 h-0.5 ${isDone ? "bg-green-400" : "bg-gray-200"}`} />}
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          isDone ? "bg-green-500 text-white"
                            : isActive ? "bg-[var(--color-primary)] text-white animate-pulse"
                            : "bg-gray-200 text-gray-400"
                        }`}>
                          {isDone ? "✓" : i + 1}
                        </div>
                        <span className={`text-xs ${isActive ? "text-[var(--color-primary)] font-medium" : isDone ? "text-green-600" : "text-gray-400"}`}>
                          {step.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {progressLabels[progress]}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Output: Prototype Preview */}
          {htmlCode && (
            <div className="rounded-xl border border-[var(--color-border)] mb-4">
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
                  {view === "preview" && (
                    <div className="flex gap-0.5 ml-2 border-l border-[var(--color-border)] pl-2">
                      <button
                        onClick={() => setDevice("desktop")}
                        className={`p-1 rounded ${device === "desktop" ? "bg-[var(--color-accent)] text-[var(--color-primary)]" : "text-gray-400 hover:text-gray-600"}`}
                        title="桌面端"
                      >
                        <Monitor className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDevice("mobile")}
                        className={`p-1 rounded ${device === "mobile" ? "bg-[var(--color-accent)] text-[var(--color-primary)]" : "text-gray-400 hover:text-gray-600"}`}
                        title="移动端"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
                  >
                    <Save className="w-3.5 h-3.5" />
                    保存
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载 HTML
                  </button>
                </div>
              </div>
              <div className={`h-[500px] flex justify-center ${device === "mobile" ? "bg-gray-100 p-4" : ""}`}>
                {view === "preview" ? (
                  <iframe
                    srcDoc={htmlCode}
                    sandbox="allow-scripts"
                    className={`border-0 transition-all ${device === "mobile" ? "w-[375px] rounded-2xl border-4 border-gray-800 shadow-xl" : "w-full"}`}
                    title="原型预览"
                  />
                ) : (
                  <pre className="w-full h-full overflow-auto p-4 text-xs bg-gray-50">
                    <code>{htmlCode}</code>
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Output: Similar Products */}
          {similarLinks && (
            <div className="rounded-xl border border-[var(--color-border)] mb-4">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-[var(--color-primary)]" />
                  类似产品参考
                </span>
              </div>
              <div className="p-4 prose prose-sm max-w-none text-sm">
                {similarLinks}
                {loading && progress === "searching" && (
                  <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
              <div className="px-4 py-2 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  <ExternalLink className="w-3 h-3 inline mr-1" />
                  也可以在墨刀（modao.cc）中导入 HTML 文件，进一步编辑原型
                </p>
              </div>
            </div>
          )}

          {/* Output: Design Prompt for Image Gen */}
          {designPrompt && (
            <div className="rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-purple-500" />
                  设计描述词（生图用）
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleCopy(getEnglishPrompt(), "prompt")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
                  >
                    {copied === "prompt" ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    复制英文 Prompt
                  </button>
                  <button
                    onClick={() => handleCopy(designPrompt, "all")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
                  >
                    {copied === "all" ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    复制全部
                  </button>
                </div>
              </div>
              <div className="p-4 prose prose-sm max-w-none text-sm">
                {designPrompt}
                {loading && progress === "prompting" && (
                  <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-purple-50/50">
                <p className="text-xs text-purple-600">
                  复制英文 Prompt，粘贴到豆包、Midjourney、DALL-E 等 AI 生图工具即可生成页面效果图
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
