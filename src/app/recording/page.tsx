"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { callAI, callAIStream } from "@/lib/ai";
import { transcribeAudio } from "@/lib/whisper";
import { TERMS_BATCH_SYSTEM_PROMPT } from "@/lib/prompts/terms";
import { getAllPRDs, createPRD, iteratePRD, type PRDDocument } from "@/lib/prd-store";
import { exportPRD, type ExportFormat } from "@/lib/export";
import {
  Mic, MicOff, Upload, Loader2, Copy, Check, FileText, BookOpen,
  Sparkles, RefreshCw, AlertCircle, Edit3, CheckCircle, ChevronRight,
  Download, ChevronDown, Eye, Lightbulb, MessageSquare, Brain,
} from "lucide-react";
import { MD } from "@/components/markdown";

type Step = "record" | "transcribing" | "review" | "generating" | "done";

const SUMMARY_PROMPT = `你是一位 ToB 产品经理助手。分析以下会议录音的文字记录，生成一份结构化的会议总结。

要求：
1. 忠实于原始对话内容，不要编造
2. 如果某些内容听不清或不确定，标注「待确认」
3. 把甲方/客户的需求放在最前面，这是最重要的部分

输出格式：

## 会议总结

### 甲方需求（最重要的部分）
（按优先级列出客户提出的需求，每条需求一行）

### 关键业务信息
（重要的背景、流程、数据等）

### 待确认事项
（需要下次沟通确认的问题）

### Action Items
（接下来要做的事，标注负责人）

### 下次沟通建议
（建议下次和客户聊什么）`;

const PRD_SYSTEM_PROMPT = `你是一位资深的 ToB 产品经理助手。根据用户确认过的会议总结，生成一份完整的 PRD 文档。

要求：
1. 严格按照总结中的需求来写，不要遗漏
2. 如果总结中标注了「待确认」，在 PRD 中也标注出来
3. 用规范的 PRD 格式输出
4. 按模块拆分功能需求，标注优先级
5. 补充合理的非功能需求

PRD 结构：
## 项目背景
## 目标用户
## 功能需求（按优先级排列）
## 非功能需求
## 待确认事项
## 下一步计划`;

const ITERATE_SYSTEM_PROMPT = `你是一位资深的 ToB 产品经理助手。

用户会给你：
1. 一份现有的 PRD 文档
2. 一份用户确认过的会议总结

你的任务：
1. 根据总结中的需求变更，更新 PRD
2. 保持 PRD 的完整性和格式
3. 在顶部添加「迭代记录」

输出完整的更新后 PRD。`;

const REALTIME_AI_PROMPT = `你是一位资深的产品经理沟通教练，正在实时辅助 PM 和甲方（医疗行业客户）的会议。

以下是最近一段对话的实时转录内容。请分析甲方说话的内容，给出简明的建议：

1. **甲方意图**：甲方这段话背后的真实需求或担忧是什么？
2. **建议回应**：PM 应该怎么接话？（给出一句具体的话术）
3. **追问要点**：有哪些关键信息需要当场追问确认？

注意：
- 只关注甲方说的话（可能包含"我们想要""能不能""预算""太贵了""太慢了""什么时候""和XX对接"等关键词）
- 如果这段对话主要是 PM 在说话，指出是否遗漏了关键问题
- 回复控制在 200 字以内，简明扼要
- 用中文回复`;

const CLIENT_KEYWORDS = [
  "我们想要", "能不能", "可不可以", "有没有", "需要", "希望",
  "预算", "太贵了", "便宜", "费用", "成本", "价格",
  "太慢了", "什么时候", "多久", "排期", "上线",
  "和XX对接", "对接", "集成", "接口", "数据同步",
  "加个功能", "再加", "还想要", "能不能加",
  "别的公司", "竞品", "XX系统", "参考",
  "领导说", "院长", "主任", "科室",
  "不满意", "不好用", "出问题", "bug", "报错",
  "合同", "验收", "付款",
];

async function readStream(stream: ReadableStream<string>, onChunk: (acc: string) => void) {
  const reader = stream.getReader();
  let acc = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += value;
    onChunk(acc);
  }
}

// ── Types for real-time transcription ──

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  isClient: boolean;
}

interface AITip {
  id: string;
  content: string;
  timestamp: number;
  triggerText: string;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// ── Main component ──

export default function RecordingPage() {
  const [step, setStep] = useState<Step>("record");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const [transcript, setTranscript] = useState("");
  const [terms, setTerms] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryConfirmed, setSummaryConfirmed] = useState(false);

  const [selectedPRD, setSelectedPRD] = useState("");
  const [generatedPRD, setGeneratedPRD] = useState("");
  const [prdSaved, setPrdSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef<boolean>(true);
  const stepDoneGuardRef = useRef<boolean>(false);

  // Real-time transcription state
  const [realtimeSegments, setRealtimeSegments] = useState<TranscriptSegment[]>([]);
  const [aiTips, setAiTips] = useState<AITip[]>([]);
  const [currentTip, setCurrentTip] = useState("");
  const [showRealtimePanel, setShowRealtimePanel] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const speechRef = useRef<SpeechRecognition | null>(null);
  const lastTipTimeRef = useRef<number>(0);
  const segmentBufferRef = useRef<string>("");
  const tipAbortRef = useRef<AbortController | null>(null);
  const isRequestingTipRef = useRef<boolean>(false);
  const realtimePanelRef = useRef<HTMLDivElement>(null);

  // Check speech recognition support
  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
  }, []);

  // Auto-scroll realtime panel
  useEffect(() => {
    if (realtimePanelRef.current) {
      realtimePanelRef.current.scrollTop = realtimePanelRef.current.scrollHeight;
    }
  }, [realtimeSegments, currentTip]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (speechRef.current) {
        speechRef.current.abort();
      }
      if (tipAbortRef.current) {
        tipAbortRef.current.abort();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // ── Real-time speech recognition ──

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            const isClient = CLIENT_KEYWORDS.some((kw) => text.includes(kw));
            const seg: TranscriptSegment = {
              id: `seg-${Date.now()}-${i}`,
              text,
              timestamp: Date.now(),
              isClient,
            };
            setRealtimeSegments((prev) => [...prev, seg]);
            segmentBufferRef.current += text + "\n";
          }
        } else {
          interimText += result[0].transcript;
        }
      }

      // Trigger AI analysis every ~15 seconds, but only if not already requesting
      const now = Date.now();
      if (now - lastTipTimeRef.current > 15000 && segmentBufferRef.current.trim().length > 20 && !isRequestingTipRef.current) {
        lastTipTimeRef.current = now;
        triggerAIAnalysis(segmentBufferRef.current.trim());
        segmentBufferRef.current = "";
      }
    };

    recognition.onerror = () => {
      // Restart on error (common with continuous recognition)
    };

    recognition.onend = () => {
      // Auto-restart if still recording
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          recognition.start();
        } catch {
          // Ignore if already started
        }
      }
    };

    speechRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // Ignore
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRef.current) {
      speechRef.current.abort();
      speechRef.current = null;
    }
    if (tipAbortRef.current) {
      tipAbortRef.current.abort();
    }
  }, []);

  const triggerAIAnalysis = async (text: string) => {
    if (!text.trim()) return;
    if (!mountedRef.current) return;

    // Cancel any in-flight request
    if (tipAbortRef.current) {
      tipAbortRef.current.abort();
    }

    // Guard against concurrent requests
    if (isRequestingTipRef.current) return;
    isRequestingTipRef.current = true;

    const abortController = new AbortController();
    tipAbortRef.current = abortController;

    try {
      const stream = callAIStream(
        `以下是会议中最近的对话片段：\n\n${text}`,
        REALTIME_AI_PROMPT
      );
      const reader = stream.getReader();
      let acc = "";
      while (true) {
        // Check abort before each read
        if (abortController.signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        // Only update state if still mounted and not aborted
        if (mountedRef.current && !abortController.signal.aborted) {
          setCurrentTip(acc);
        }
      }
      if (acc && mountedRef.current && !abortController.signal.aborted) {
        setAiTips((prev) => [
          ...prev,
          {
            id: `tip-${Date.now()}`,
            content: acc,
            timestamp: Date.now(),
            triggerText: text.substring(0, 100),
          },
        ]);
      }
    } catch {
      // Silently fail - real-time tips are best-effort
    } finally {
      isRequestingTipRef.current = false;
      if (tipAbortRef.current === abortController) {
        tipAbortRef.current = null;
      }
    }
  };

  // ── Original recording logic (preserved) ──

  useEffect(() => {
    const url = audioUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setDuration(0);
      resetState();

      // Start real-time speech recognition
      setRealtimeSegments([]);
      setAiTips([]);
      setCurrentTip("");
      setShowRealtimePanel(true);
      lastTipTimeRef.current = Date.now();
      segmentBufferRef.current = "";
      isRequestingTipRef.current = false;
      startSpeechRecognition();

      const t = setInterval(() => setDuration((d) => d + 1), 1000);
      timerRef.current = t;
    } catch {
      setError("无法访问麦克风，请检查浏览器权限");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopSpeechRecognition();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioBlob(new Blob([file], { type: file.type }));
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(new Blob([file], { type: file.type })));
    resetState();
  };

  const resetState = () => {
    setTranscript("");
    setTerms("");
    setSummary("");
    setSummaryConfirmed(false);
    setGeneratedPRD("");
    setPrdSaved(false);
    setError("");
    setStep("record");
    setSelectedPRD("");
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setStep("transcribing");
    setError("");
    try {
      const text = await transcribeAudio(audioBlob);
      if (!text.trim()) {
        setError("未能识别到语音内容，请确认录音是否清晰");
        setStep("record");
        return;
      }
      // Use Whisper transcript as primary, merge realtime segments as supplementary
      setTranscript(text);

      const [termsRes] = await Promise.all([
        callAI(text, TERMS_BATCH_SYSTEM_PROMPT).catch(() => "术语分析失败"),
        (async () => {
          const stream = callAIStream(text, SUMMARY_PROMPT);
          await readStream(stream, (acc) => setSummary(acc));
        })(),
      ]);
      setTerms(termsRes);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "转写失败");
      setStep("record");
    }
  };

  const handleGeneratePRD = async () => {
    if (!summary) return;
    stepDoneGuardRef.current = false;
    setStep("generating");
    setGeneratedPRD("");
    setError("");
    try {
      const stream = callAIStream(
        `以下是用户确认过的会议总结，请据此生成 PRD：\n\n${summary}\n\n原始对话记录（供参考）：\n${transcript}`,
        PRD_SYSTEM_PROMPT
      );
      await readStream(stream, (acc) => {
        if (mountedRef.current) {
          setGeneratedPRD(acc);
        }
      });
      if (mountedRef.current && !stepDoneGuardRef.current) {
        stepDoneGuardRef.current = true;
        setStep("done");
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "生成失败");
        setStep("review");
      }
    }
  };

  const handleIteratePRD = async () => {
    if (!summary || !selectedPRD) return;
    const existing = getAllPRDs().find((p) => p.id === selectedPRD);
    if (!existing) return;
    stepDoneGuardRef.current = false;
    setStep("generating");
    setGeneratedPRD("");
    setError("");
    try {
      const stream = callAIStream(
        `## 现有 PRD（v${existing.version}）：\n\n${existing.content}\n\n---\n\n## 用户确认的会议总结：\n\n${summary}`,
        ITERATE_SYSTEM_PROMPT
      );
      let finalContent = "";
      await readStream(stream, (acc) => {
        finalContent = acc;
        if (mountedRef.current) {
          setGeneratedPRD(acc);
        }
      });
      if (mountedRef.current && !stepDoneGuardRef.current) {
        stepDoneGuardRef.current = true;
        setStep("done");
      }
      const iterated = iteratePRD(selectedPRD, finalContent, `会议录音迭代 v${existing.version} → v${existing.version + 1}`);
      if (iterated && mountedRef.current) setGeneratedPRD(iterated.content);
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "迭代失败");
        setStep("review");
      }
    }
  };

  const handleSavePRD = () => {
    if (!generatedPRD) return;
    const title = generatedPRD.split("\n").find((l) => l.trim() && !l.startsWith("```"))?.replace(/^#+\s*/, "") || "未命名 PRD";
    createPRD(title, generatedPRD, selectedPRD ? "iteration" : "recording", summary.substring(0, 100));
    setPrdSaved(true);
    setTimeout(() => setPrdSaved(false), 3000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const existingPRDs = getAllPRDs();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">录音分析</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          开会录音 → 转文字 → 审核/修改总结 → 生成 PRD
        </p>
      </div>

      {/* Recording area + Real-time panel */}
      <div className={`flex gap-4 ${showRealtimePanel && recording ? "flex-row" : ""}`}>
        {/* Left: recording controls */}
        <div className={`${showRealtimePanel && recording ? "flex-1 min-w-0" : "w-full"}`}>
          <div className="rounded-xl border border-[var(--color-border)] p-6 mb-6">
            <div className="flex items-center gap-6">
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shrink-0 shadow-lg ${
                  recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[var(--color-primary)] hover:bg-blue-700"
                }`}
              >
                {recording ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
              </button>
              <div className="flex-1">
                {recording ? (
                  <div>
                    <div className="text-2xl font-mono font-bold text-red-500">{formatDuration(duration)}</div>
                    <p className="text-sm text-[var(--color-muted-foreground)]">正在录音... 点击停止</p>
                    {speechSupported && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> 实时语音识别已启动
                      </p>
                    )}
                  </div>
                ) : audioUrl ? (
                  <div>
                    <audio controls src={audioUrl} className="w-full max-w-md" />
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-1">录音就绪，点击下方分析</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">点击开始录音</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-1">和甲方或工程师开会时点一下</p>
                    {speechSupported && (
                      <p className="text-xs text-blue-600 mt-1">支持 Chrome 浏览器实时语音识别</p>
                    )}
                  </div>
                )}
              </div>
              <div className="shrink-0">
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm hover:bg-gray-50">
                  <Upload className="w-4 h-4" /> 上传录音
                </button>
              </div>
            </div>

            {audioBlob && step === "record" && (
              <button onClick={handleTranscribe} className="mt-4 w-full py-3.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-blue-700 flex items-center justify-center gap-2 text-base font-medium">
                <Sparkles className="w-5 h-5" /> 开始转写并分析
              </button>
            )}

            {step === "transcribing" && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                正在转写语音并分析需求，请稍候...
              </div>
            )}
          </div>

          {/* Post-recording: show realtime transcription summary */}
          {realtimeSegments.length > 0 && !recording && step === "record" && audioBlob && (
            <div className="rounded-xl border border-[var(--color-border)] mb-6">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
                <span className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" /> 实时转录记录
                </span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {realtimeSegments.length} 段 · {aiTips.length} 条 AI 建议
                </span>
              </div>
              <div className="p-4 max-h-[200px] overflow-y-auto">
                <div className="space-y-1.5">
                  {realtimeSegments.map((seg) => (
                    <div
                      key={seg.id}
                      className={`text-sm px-2.5 py-1.5 rounded ${
                        seg.isClient
                          ? "bg-orange-50 text-orange-800 border-l-2 border-orange-400"
                          : "text-gray-600"
                      }`}
                    >
                      {seg.isClient && <span className="text-xs font-medium text-orange-600 mr-1">甲方</span>}
                      {seg.text}
                    </div>
                  ))}
                </div>
              </div>
              {aiTips.length > 0 && (
                <div className="border-t border-[var(--color-border)] p-4">
                  <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-2">AI 建议（录音中）</p>
                  <div className="space-y-2">
                    {aiTips.map((tip) => (
                      <div key={tip.id} className="bg-blue-50 rounded-lg p-2.5 text-xs text-blue-800">
                        {tip.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Real-time panel (only during recording) */}
        {showRealtimePanel && recording && (
          <div className="w-96 shrink-0 rounded-xl border border-blue-200 bg-slate-50 flex flex-col max-h-[600px]">
            <div className="px-4 py-3 border-b border-blue-200 bg-blue-50 rounded-t-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> 实时语音识别
                </span>
                <span className="text-xs text-blue-500">{realtimeSegments.length} 段</span>
              </div>
            </div>

            {/* Transcription area */}
            <div ref={realtimePanelRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {realtimeSegments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  等待语音输入... 请开始说话
                </p>
              )}
              {realtimeSegments.map((seg) => (
                <div
                  key={seg.id}
                  className={`text-sm px-2.5 py-1.5 rounded ${
                    seg.isClient
                      ? "bg-orange-50 text-orange-800 border-l-2 border-orange-400"
                      : "bg-white text-gray-600 border border-gray-100"
                  }`}
                >
                  {seg.isClient && (
                    <span className="text-xs font-medium text-orange-600 block mb-0.5">
                      可能是甲方
                    </span>
                  )}
                  {seg.text}
                </div>
              ))}
            </div>

            {/* AI Tips area */}
            <div className="border-t border-blue-200 p-3 bg-white rounded-b-xl">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="w-3.5 h-3.5 text-purple-500" />
                <span className="text-xs font-medium text-purple-700">AI 实时提示</span>
              </div>
              {currentTip ? (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-xs text-purple-800 leading-relaxed">
                  {currentTip}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  {realtimeSegments.length > 0
                    ? "分析中，约 15 秒后出建议..."
                    : "开始对话后，AI 会自动分析甲方意图"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* ===== Step 2: Review & Edit Summary ===== */}
      {step === "review" && (
        <div className="space-y-5">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> 转写完成</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="flex items-center gap-1 font-medium text-[var(--color-primary)]"><Edit3 className="w-4 h-4" /> 审核总结</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-[var(--color-muted-foreground)]">生成 PRD</span>
          </div>

          {/* Realtime transcription summary (review phase) */}
          {realtimeSegments.length > 0 && (
            <details className="rounded-xl border border-blue-200">
              <summary className="px-4 py-3 text-sm font-medium cursor-pointer hover:bg-blue-50 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" /> 实时转录 + AI 提示（{realtimeSegments.length} 段 / {aiTips.length} 条建议）
              </summary>
              <div className="border-t border-blue-200">
                <div className="p-4 max-h-[300px] overflow-y-auto space-y-1.5">
                  {realtimeSegments.map((seg) => (
                    <div
                      key={seg.id}
                      className={`text-sm px-2.5 py-1.5 rounded ${
                        seg.isClient
                          ? "bg-orange-50 text-orange-800 border-l-2 border-orange-400"
                          : "text-gray-600"
                      }`}
                    >
                      {seg.isClient && <span className="text-xs font-medium text-orange-600 mr-1">甲方</span>}
                      {seg.text}
                    </div>
                  ))}
                </div>
                {aiTips.length > 0 && (
                  <div className="border-t border-blue-200 p-4">
                    <p className="text-xs font-medium text-purple-600 mb-2 flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5" /> 录音中 AI 建议
                    </p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {aiTips.map((tip) => (
                        <div key={tip.id} className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-xs text-purple-800">
                          {tip.content}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Transcript (collapsible) */}
          <details className="rounded-xl border border-[var(--color-border)]">
            <summary className="px-4 py-3 text-sm font-medium cursor-pointer hover:bg-gray-50 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> 原始对话记录（Whisper 完整转写）
            </summary>
            <div className="px-4 pb-4 max-h-[300px] overflow-y-auto text-sm text-[var(--color-muted-foreground)] whitespace-pre-wrap border-t border-[var(--color-border)] pt-3">
              {transcript}
            </div>
          </details>

          {/* Terms (collapsible) */}
          {terms && (
            <details className="rounded-xl border border-[var(--color-border)]">
              <summary className="px-4 py-3 text-sm font-medium cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" /> 术语解析（点击展开）
              </summary>
              <div className="px-4 pb-4 max-h-[300px] overflow-y-auto text-sm border-t border-[var(--color-border)] pt-3">
                <MD>{terms}</MD>
              </div>
            </details>
          )}

          {/* Editable Summary - THE KEY PART */}
          <div className="rounded-xl border-2 border-[var(--color-primary)] bg-blue-50/30">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-primary)]/20 bg-blue-50">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-[var(--color-primary)]">会议总结 — 请审核并修改</span>
              </div>
              <button onClick={() => handleCopy(summary)} className="p-1 rounded hover:bg-blue-100 text-gray-400">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="p-1">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full min-h-[350px] p-3 text-sm bg-white/80 focus:bg-white focus:outline-none resize-y rounded-b-lg"
                placeholder="AI 生成的会议总结会出现在这里，你可以自由修改..."
              />
            </div>
            <div className="px-4 py-3 bg-blue-50 border-t border-[var(--color-primary)]/10 rounded-b-xl">
              <p className="text-xs text-blue-600 mb-3">
                请仔细阅读上面的总结，确认甲方需求是否准确。你可以直接修改内容、补充遗漏、删除错误。
                确认无误后点击下方按钮生成 PRD。
              </p>

              <div className="space-y-2">
                <button
                  onClick={handleGeneratePRD}
                  className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white hover:bg-blue-700 flex items-center justify-center gap-2 font-medium"
                >
                  <CheckCircle className="w-5 h-5" /> 总结没问题，生成新 PRD
                </button>

                {existingPRDs.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={selectedPRD}
                      onChange={(e) => setSelectedPRD(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm bg-white"
                    >
                      <option value="">选择已有 PRD 迭代...</option>
                      {existingPRDs.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}（v{p.version}）</option>
                      ))}
                    </select>
                    {selectedPRD && (
                      <button
                        onClick={handleIteratePRD}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 flex items-center gap-1 shrink-0"
                      >
                        <RefreshCw className="w-4 h-4" /> 迭代更新
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Step 3: Generating (pre-stream) ===== */}
      {step === "generating" && !generatedPRD && (
        <div className="rounded-xl border border-[var(--color-border)] p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)] mx-auto mb-3" />
          <p className="text-sm font-medium">正在根据确认的总结生成 PRD...</p>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">通常需要 10-30 秒</p>
        </div>
      )}

      {/* ===== Step 4: PRD Result (streaming or done) ===== */}
      {(step === "done" || (step === "generating" && generatedPRD)) && generatedPRD && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> 转写</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> 审核总结</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="flex items-center gap-1 font-medium text-green-600"><CheckCircle className="w-4 h-4" /> PRD 已生成</span>
          </div>

          <div className="rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
              <span className="text-sm font-medium">PRD 文档</span>
              <div className="flex gap-2 items-center">
                <button onClick={() => handleCopy(generatedPRD)} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />} 复制
                </button>
                <div className="relative">
                  <ExportDropdown
                    title={generatedPRD.split("\n").find((l) => l.trim() && !l.startsWith("```"))?.replace(/^#+\s*/, "") || "PRD"}
                    content={generatedPRD}
                  />
                </div>
                <button onClick={handleSavePRD} disabled={prdSaved || step === "generating"} className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs text-white ${prdSaved ? "bg-green-500" : "bg-[var(--color-primary)] hover:bg-blue-700"}`}>
                  {prdSaved ? <><Check className="w-3.5 h-3.5" /> 已保存</> : <><FileText className="w-3.5 h-3.5" /> 保存</>}
                </button>
              </div>
            </div>
            <div className="p-5 max-h-[600px] overflow-y-auto prose prose-sm max-w-none whitespace-pre-wrap">
              {generatedPRD}
              {step === "generating" && <span className="inline-block w-2 h-4 bg-[var(--color-primary)] animate-pulse ml-0.5 align-text-bottom" />}
            </div>
          </div>

          <button onClick={resetState} className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] flex items-center gap-1">
            开始新的录音
          </button>
        </div>
      )}

      {/* Tips */}
      {step === "record" && !audioBlob && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">使用流程</p>
          <ol className="space-y-1 text-xs list-decimal list-inside">
            <li><strong>开会时录音</strong>（点红色按钮或上传手机录音）</li>
            <li>AI 自动<strong>转文字并生成总结</strong>（包含甲方需求）</li>
            <li>你<strong>审核/修改</strong>总结（改错、补漏、删错）</li>
            <li>确认后<strong>一键生成 PRD</strong>（或迭代已有 PRD）</li>
          </ol>
          {speechSupported && (
            <p className="mt-2 text-xs">
              <strong>实时辅助：</strong>录音时右侧会显示实时语音识别和 AI 提示，帮助你在会议中更好地应对甲方。仅支持 Chrome 浏览器。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ExportDropdown({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formats: { key: ExportFormat; label: string; desc: string }[] = [
    { key: "md", label: "Markdown (.md)", desc: "通用格式，适合开发团队" },
    { key: "docx", label: "Word (.doc)", desc: "正式文档，适合发给甲方" },
    { key: "pdf", label: "PDF", desc: "打印/存档，适合正式场合" },
    { key: "html", label: "HTML 网页", desc: "浏览器直接打开查看" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
      >
        <Download className="w-3.5 h-3.5" /> 导出 <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {formats.map((f) => (
            <button
              key={f.key}
              onClick={() => { exportPRD(content, title, f.key); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
            >
              <div className="font-medium text-gray-700">{f.label}</div>
              <div className="text-xs text-gray-400">{f.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
