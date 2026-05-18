import Link from "next/link";
import { BookOpen, FileText, Monitor, Mic, StickyNote, ArrowRightLeft, ArrowRight, Lightbulb } from "lucide-react";
import { getAIConfig, hasDefaultAI } from "@/lib/ai";

const quickActions = [
  {
    href: "/recording",
    label: "录音分析",
    desc: "开会录音，自动转文字、提取术语",
    icon: Mic,
    color: "bg-red-50 text-red-600",
    tip: "开会点一下，会后自动整理",
  },
  {
    href: "/terms",
    label: "医学术语",
    desc: "不懂的医疗词汇？输入即解释",
    icon: BookOpen,
    color: "bg-blue-50 text-blue-600",
    tip: "和甲方开会前预习一下",
  },
  {
    href: "/prd",
    label: "写 PRD",
    desc: "像聊天一样写产品需求文档",
    icon: FileText,
    color: "bg-green-50 text-green-600",
    tip: "不知道怎么写？直接说想法就行",
  },
  {
    href: "/prototype",
    label: "出原型",
    desc: "描述功能，自动生成页面",
    icon: Monitor,
    color: "bg-purple-50 text-purple-600",
    tip: "不用会画图，打字就行",
  },
  {
    href: "/dev-comm",
    label: "开发沟通",
    desc: "和程序员说话的翻译器",
    icon: ArrowRightLeft,
    color: "bg-pink-50 text-pink-600",
    tip: "把你的话翻译成开发听得懂的",
  },
  {
    href: "/notes",
    label: "会议记录",
    desc: "粘贴沟通内容，自动提炼要点",
    icon: StickyNote,
    color: "bg-orange-50 text-orange-600",
    tip: "开完会直接粘贴进来整理",
  },
];

const workflow = [
  { step: "1", label: "开会前", desc: "用「医学术语」预习专业词汇" },
  { step: "2", label: "开会时", desc: "用「录音分析」一键录音" },
  { step: "3", label: "开会后", desc: "录音自动转文字 + 提取要点" },
  { step: "4", label: "写需求", desc: "用「PRD 生成」写需求文档" },
  { step: "5", label: "出原型", desc: "用「原型生成」出页面效果" },
  { step: "6", label: "交开发", desc: "用「开发沟通」把需求翻译给程序员" },
];

export default function Dashboard() {
  const hasAI = hasDefaultAI() || !!getAIConfig();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">工作台</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          你的 PM 日常工作助手，点一下就能开始
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-start gap-3.5 p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all"
            >
              <div className={`p-2 rounded-lg ${action.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  {action.desc}
                </div>
                <div className="text-xs text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Lightbulb className="w-3 h-3 inline mr-0.5" />
                  {action.tip}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--color-primary)] transition-colors mt-1 shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* Workflow Guide */}
      <div className="rounded-xl border border-[var(--color-border)] p-5 mb-6">
        <h2 className="font-medium text-sm mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          新手工作流程
        </h2>
        <div className="flex flex-wrap gap-3">
          {workflow.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-xs flex items-center justify-center">
                  {item.step}
                </span>
                <div>
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    {item.desc}
                  </div>
                </div>
              </div>
              {i < workflow.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* First Time Setup */}
      {!hasAI && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-5">
          <h2 className="font-medium text-sm text-blue-800 mb-2">
            首次使用？
          </h2>
          <p className="text-sm text-blue-700">
            请先到「设置」页面配置你的 AI API Key（OpenAI 或 Claude 都行），然后就可以使用所有功能了。
          </p>
          <Link
            href="/settings"
            className="inline-block mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            去设置
          </Link>
        </div>
      )}
    </div>
  );
}
