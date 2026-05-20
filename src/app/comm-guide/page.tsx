"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search, Star, Trash2, MessageSquare, ChevronDown, ChevronRight,
  Copy, Check, BookOpen, MessageCircle, HelpCircle, Lightbulb,
  Building2, Briefcase,
} from "lucide-react";

// ── Data types ──

interface ScriptItem {
  id: string;
  title: string;
  scenario: string;
  content: string;
  tips?: string;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  followUp?: string;
}

type Perspective = "partyA" | "partyB";

type Category =
  | "opening"
  | "requirement"
  | "rejection"
  | "progress"
  | "objection"
  | "faq";

interface CategoryMeta {
  key: Category;
  label: Record<Perspective, string>;
  icon: typeof MessageSquare;
  color: string;
}

// ── Category definitions ──

const CATEGORIES: CategoryMeta[] = [
  { key: "opening", label: { partyA: "开场白", partyB: "开场白" }, icon: MessageCircle, color: "text-blue-600 bg-blue-50" },
  { key: "requirement", label: { partyA: "提出需求", partyB: "需求确认" }, icon: Lightbulb, color: "text-amber-600 bg-amber-50" },
  { key: "rejection", label: { partyA: "驳回/施压", partyB: "拒绝/拖延" }, icon: MessageSquare, color: "text-red-600 bg-red-50" },
  { key: "progress", label: { partyA: "跟进/催促", partyB: "汇报进展" }, icon: BookOpen, color: "text-green-600 bg-green-50" },
  { key: "objection", label: { partyA: "质疑方案", partyB: "处理异议" }, icon: HelpCircle, color: "text-purple-600 bg-purple-50" },
  { key: "faq", label: { partyA: "医院方 FAQ", partyB: "供应商 FAQ" }, icon: HelpCircle, color: "text-indigo-600 bg-indigo-50" },
];

// ── Preset data: Party A (甲方/医院) scripts ──

const SCRIPTS_PARTY_A: ScriptItem[] = [
  // ── Opening ──
  {
    id: "a-open-1",
    title: "第一次与供应商沟通需求",
    scenario: "opening",
    content: `「你好，我是 XX 医院信息科/医务科的 XXX。我们目前准备做 XX 项目，想先了解一下你们在这方面的能力。

请先简单介绍一下你们公司的背景和类似项目经验，特别是有没有和我们类似规模医院合作过的案例？

另外，今天主要想聊三个方面：产品功能匹配度、实施周期、和后续的服务保障。我们先从功能聊起？」`,
    tips: "先表明身份和项目背景，让供应商知道你是认真的。提出具体关注点，避免被带节奏。",
  },
  {
    id: "a-open-2",
    title: "招标前需求说明会",
    scenario: "opening",
    content: `「各位好，感谢大家来参加这次需求说明会。我先介绍一下我们医院的基本情况和本次项目的目标：

我们医院有 XX 张床位、XX 个科室，目前的 XX 系统已经使用了 X 年，主要问题是 XX 和 XX。

这次项目的核心目标是：
1. 解决 XX 问题
2. 提升 XX 效率
3. 满足 XX 合规要求

接下来我会把具体需求过一遍，各位有问题可以随时提问。」`,
    tips: "说明会要给供应商清晰的项目背景。把核心目标说清楚，避免供应商走偏方向。",
  },
  {
    id: "a-open-3",
    title: "对接新供应商的评估会",
    scenario: "opening",
    content: `「你好，了解到你们在 XX 领域做得不错。我先说明一下我们的情况：

我们目前正在使用 XX 系统，但有几个方面不太满意——XX、XX 和 XX。所以想看看市面上的替代方案。

我想先了解三个问题：
1. 你们的产品是否支持 XX 功能？
2. 能否和我们的 HIS/EMR 系统对接？
3. 实施周期大概多久？

如果各方面合适，我们可以安排一次深入的方案演示。」`,
    tips: "直说痛点但不要过度贬低现有系统。提三个关键问题快速筛选供应商是否值得继续聊。",
  },

  // ── Requirement ──
  {
    id: "a-req-1",
    title: "明确需求并要求可行性评估",
    scenario: "requirement",
    content: `「我来把我们核心需求梳理一下，请你们逐一评估可行性：

**必须实现的功能：**
1. XX 功能——主要用于 XX 场景
2. XX 功能——需要覆盖 XX 科室
3. 和 XX 系统的数据对接

**希望实现的功能：**
4. XX 报表功能
5. 移动端支持

请对每个功能给出：能不能做、大致工期、有没有技术风险。我们下周之前收到评估结果可以吗？」`,
    tips: "分清必须和希望，逼供应商逐项评估。设明确的时间节点，防止拖延。",
  },
  {
    id: "a-req-2",
    title: "质疑功能实现的完整性",
    scenario: "requirement",
    content: `「你们方案里写的是'支持 XX 功能'，我需要确认几个细节：

1. 这个功能是标准产品自带的，还是需要二次开发？
2. 如果需要定制，开发周期多长？额外费用多少？
3. 能不能现场演示一下这个功能？用真实数据场景。

我们之前遇到过方案写得很漂亮，实际交付缩水的情况，所以希望提前确认清楚。」`,
    tips: "别被PPT忽悠。追问是标准功能还是定制，要求现场演示。提过往踩坑经验让对方知道你有经验。",
  },
  {
    id: "a-req-3",
    title: "要求按医院实际流程设计",
    scenario: "requirement",
    content: `「你们演示的是通用版，但我们医院的工作流程有自己的特点：

1. 我们的 XX 科室工作流程是 XX → XX → XX，和标准流程不一样
2. 我们需要 XX 角色有独立的审批节点
3. 报表格式要符合我们 XX 科室的习惯

请问你们的系统支持流程定制吗？定制范围有多大？我建议安排一次到科室实地调研，这样你们能更准确地理解我们的需求。」`,
    tips: "不要接受'标准版就能满足'的说法。强调流程差异，要求供应商实地调研。",
  },
  {
    id: "a-req-4",
    title: "追问技术细节和对接方案",
    scenario: "requirement",
    content: `「关于系统对接，我需要了解：

1. 你们有和 XX 厂商 HIS 系统对接的经验吗？
2. 对接方式是什么？标准接口还是私有接口？
3. 数据同步的实时性能达到什么程度？
4. 对接过程中需要我们 IT 科配合做什么？
5. 对接完成后数据一致性如何保证？

这块对我们非常关键，如果对接做不好，其他功能再好也用不起来。」`,
    tips: "系统对接是医疗信息化最大的坑。提前追问细节，让供应商知道你懂行，不敢含糊。",
  },

  // ── Rejection / Pressure ──
  {
    id: "a-rej-1",
    title: "驳回供应商的技术借口",
    scenario: "rejection",
    content: `「我理解你们说这个功能实现有难度，但我有几个疑问：

1. XX 医院也是用你们的系统，他们是怎么实现的？
2. 我们了解过 XX 公司的方案，他们的同类功能是标准配置
3. 这个功能在需求确认阶段你们是承诺过可以实现的

我建议你们内部再评估一下，下周给我一个明确的答复。如果确实做不了，我们需要重新评估整个方案。」`,
    tips: "用竞品案例和之前的承诺来施压。给一个deadline让对方认真对待，但不要当场翻脸。",
  },
  {
    id: "a-rej-2",
    title: "拒绝供应商的延期请求",
    scenario: "rejection",
    content: `「我理解开发过程中可能遇到一些问题，但是：

1. 这个时间节点是我们双方确认过的
2. 医院这边已经安排了 XX 培训和 XX 上线准备
3. 延期会影响到 XX 科室的日常工作

这样吧，我们把剩余工作拆分一下：
- XX 功能必须在 X 号之前交付，这个不能妥协
- XX 功能可以晚一周，但不能再拖了

请你们今天回去重新排一下开发计划，明天给我确认。」`,
    tips: "理解困难但坚守底线。把功能拆分，核心功能不妥协，次要功能给有限缓冲。",
  },
  {
    id: "a-rej-3",
    title: "施压供应商加快进度",
    scenario: "rejection",
    content: `「张总，已经 X 周了，我们上次确认的几个功能还没有看到进展。

我需要了解一下：
1. 目前卡在哪里？
2. 你们投入了多少开发资源？
3. 有什么需要我们这边配合的吗？

说实话，如果按照目前的进度，按期上线是有风险的。我建议每周固定一次进度同步会，确保问题能及时发现和解决。另外，如果需要加人，请尽快安排。」`,
    tips: "定期施压但不要空施压——要问卡在哪里、要什么配合。建议固定进度会议制度化沟通。",
  },

  // ── Progress / Follow-up ──
  {
    id: "a-prog-1",
    title: "主动跟进项目进展",
    scenario: "progress",
    content: `「王总，距离上次同步已经两周了，我想了解一下目前的进展：

1. 上次说的 XX 功能开发完成了吗？
2. XX 问题的解决方案确定了吗？
3. 和 XX 系统的对接进展如何？

另外，我这边有一个新的情况——XX 科室提出了一个新的需求，可能需要调整一下方案。我们约个时间详细聊聊？」`,
    tips: "不要等供应商主动汇报。定期主动跟进，把问题扼杀在早期。",
  },
  {
    id: "a-prog-2",
    title: "验收交付物并反馈问题",
    scenario: "progress",
    content: `「我们上周测试了一下你们交付的功能，整体来看有几个问题需要反馈：

**需要修改的：**
1. XX 功能在 XX 场景下报错，请修复
2. XX 流程和实际科室流程不一致，需要调整
3. XX 页面加载速度太慢，需要优化

**需要补充的：**
4. XX 功能的权限控制没有实现
5. 操作日志功能缺失

请给一个修复时间表。我们计划 X 号进行第二轮测试。」`,
    tips: "验收反馈要具体——列出问题清单，给出明确的时间节点。不要笼统说'有问题'。",
  },
  {
    id: "a-prog-3",
    title: "要求增加开发资源",
    scenario: "progress",
    content: `「李总，我观察到一个趋势——目前的开发进度比计划慢了大约 XX%。按这个速度，按期上线有困难。

我的建议是：
1. 你们这边增加 1-2 个开发人员投入这个项目
2. 优先保障 XX 和 XX 两个核心模块的开发
3. 其他非核心模块可以适当延后

这个项目对我们医院很重要，希望你们也能匹配相应的重视程度。如果需要我这边向你们的领导反馈，我可以配合。」`,
    tips: "用数据说话（慢了XX%）。给出具体建议，必要时表示可以向上反映——这比单纯施压更有效。",
  },

  // ── Objection ──
  {
    id: "a-obj-1",
    title: "\"报价太高\"",
    scenario: "objection",
    content: `「你们的报价我们看了，坦率说比预期高出不少。我直接说几个问题：

1. XX 模块的报价和市面同类产品比偏高
2. 实施服务费占了 XX%，这个比例是否合理？
3. 后续每年的运维费用是怎么算的？

我们医院的预算是 XX 万，差距比较大。我有两个建议：
1. 看看哪些功能可以调整或分期实施，降低一期投入
2. 给我们一个更透明的成本拆分

如果你能做到 XX 万以内，我们这边推进会更顺利。」`,
    tips: "直说预算差距，要求成本拆分。给出你的心理价位让对方有谈判空间。",
  },
  {
    id: "a-obj-2",
    title: "\"实施周期太长\"",
    scenario: "objection",
    content: `「你们说的 X 个月实施周期有点长。我了解过同类项目，一般 XX 个月就能完成。

我想确认一下时间花在哪里了：
1. 定制开发需要多长时间？哪些是必须定制的？
2. 测试和上线准备要多久？能不能压缩？
3. 有没有可能分阶段实施——先上核心功能，其他的并行推进？

我们希望核心功能在 X 个月内上线，这个目标你们觉得能实现吗？」`,
    tips: "用行业基准质疑周期。要求拆分时间花在哪里，提出分阶段上线的替代方案。",
  },
  {
    id: "a-obj-3",
    title: "\"我们想看现场演示\"",
    scenario: "objection",
    content: `「方案文档和PPT我们看过了，但说实话文档写得都差不多，我们更想看实际效果。

我的要求是：
1. 用我们医院的实际业务场景来演示，不要用通用Demo
2. 重点演示 XX 和 XX 这两个核心功能
3. 让我们 IT 科的人看看后台配置和数据结构
4. 如果有条件，安排一次到你们客户现场的参观

这样我们才能做出准确的判断。你们这周能安排吗？」`,
    tips: "拒绝被PPT忽悠。要求真实场景演示、看后台、甚至参观客户现场。展现专业度。",
  },
  {
    id: "a-obj-4",
    title: "\"合同条款需要调整\"",
    scenario: "objection",
    content: `「合同草案我们法务看过了，有几个条款需要讨论：

1. 付款节点——我们希望按交付里程碑付，不是按时间
2. 验收标准——目前写得太模糊，需要明确到具体功能点
3. 售后服务——SLA 响应时间需要写清楚，不能只说'及时响应'
4. 数据安全——我们医院的数据所有权和处理方式需要明确
5. 违约责任——如果延期交付，需要有对应的处理机制

这些不是刁难，是正常的项目保障。你们调整一下我们再谈。」`,
    tips: "合同谈判要具体。付款按里程碑、验收要量化、SLA要写死。不要接受模糊条款。",
  },
];

// ── Preset data: Party B (乙方/供应商) scripts ──

const SCRIPTS_PARTY_B: ScriptItem[] = [
  // ── Opening ──
  {
    id: "b-open-1",
    title: "第一次见面",
    scenario: "opening",
    content: `「王总好，我是 XX 公司的产品经理 XXX。非常感谢您抽出宝贵时间。

我们公司专注于医疗信息化已经 X 年了，服务过 XXX 等医院。今天主要想了解一下贵院目前在 XX 方面的情况，听听您的想法和需求。

之前我了解到贵院在 XX 方面有一些考虑，方便简单聊聊吗？」`,
    tips: "先自我介绍建立信任，提及类似客户案例增强说服力，用开放式问题引导甲方说话。",
  },
  {
    id: "b-open-2",
    title: "老客户续约",
    scenario: "opening",
    content: `「李院长好，好久不见！上次咱们合作的 XX 系统运行了一年多了，今天主要是想回访一下使用情况。

您这边有没有什么新的需求或者对现有系统有什么改进建议？另外我们也准备了一些新功能，正好给您演示一下。」`,
    tips: "先关心老系统的使用情况，体现对客户的重视，再自然过渡到新功能推介。",
  },
  {
    id: "b-open-3",
    title: "需求评审会",
    scenario: "opening",
    content: `「各位领导好，今天的主要目的是把之前沟通的需求做一个正式的梳理和确认。

我会逐一过一遍需求清单，请各位确认哪些是必须的、哪些可以放到后面。过程中如果有什么想法随时提出来。

我们先从最核心的功能开始吧？」`,
    tips: "明确会议目标，给甲方安全感和控制感。建议准备纸质/投影需求清单，逐条确认。",
  },
  {
    id: "b-open-4",
    title: "竞品替换场景",
    scenario: "opening",
    content: `「张总好，了解到贵院目前在使用 XX 系统。我们注意到很多医院在用到一定规模后，会遇到 XX 方面的瓶颈。

我们有不少从 XX 系统迁移过来的客户案例，迁移过程也比较平滑。今天主要想了解一下您目前遇到的主要痛点是什么？」`,
    tips: "不要直接贬低竞品，从甲方痛点出发。强调迁移的便利性降低决策门槛。",
  },

  // ── Requirement confirmation ──
  {
    id: "b-req-1",
    title: "追问具体需求",
    scenario: "requirement",
    content: `「明白，您说的这个需求我理解一下——您是希望系统能够做到 XXX，对吗？

我想确认几个细节：
1. 使用场景是在什么时候？门诊？住院？还是管理端？
2. 主要是哪些角色会使用？
3. 预期的使用频率大概是怎样的？

这样我能更准确地评估技术方案和工作量。」`,
    tips: "永远不要只听需求就立即答应。用复述+追问的方式，搞清楚使用场景、角色和频率。",
  },
  {
    id: "b-req-2",
    title: "确认需求边界",
    scenario: "requirement",
    content: `「好的，我总结一下刚才讨论的需求范围：

**一期（必须交付）：**
- 功能 A：...
- 功能 B：...

**二期（优先考虑）：**
- 功能 C：...

**不在本期范围：**
- 功能 D（需要 XX 前置条件）

这样理解对吗？如果有调整我们现在就改。」`,
    tips: "每次沟通完一定要当场复述确认。分清楚必须/可选/不在范围，避免后续扯皮。",
  },
  {
    id: "b-req-3",
    title: "引导甲方排优先级",
    scenario: "requirement",
    content: `「您刚才提到了好几个需求，我们资源有限，不可能一次性全部做完。我想请您帮忙排个优先级：

- 如果只能先做 3 个，您选哪几个？
- 哪个功能如果没做，会影响日常使用？
- 哪些是可以先用手动方式替代的？

这样我们能把最紧急的先交付，其他的按计划推进。」`,
    tips: "甲方经常什么都想要。用'只做3个'的方式逼迫对方思考真正的优先级。",
  },

  // ── Rejection / Delay ──
  {
    id: "b-rej-1",
    title: "拒绝不合理需求",
    scenario: "rejection",
    content: `「这个需求我理解您的考虑。不过从技术角度来看，实现这个功能需要涉及到 XXX，工作量会比较大。

我有两个建议：
1. 我们可以先用 XX 方式达到类似的效果，成本会低很多
2. 如果确实需要这个功能，我们可以放到二期，专门规划一下

您觉得哪个方案更适合目前的情况？」`,
    tips: "永远不要直接说'不行'。先认可需求，再说明技术难度，最后给替代方案。",
  },
  {
    id: "b-rej-2",
    title: "拒绝免费加功能",
    scenario: "rejection",
    content: `「王总，这个功能确实很有价值。不过这块不在我们目前的合同范围内，属于新增需求。

我可以帮您做一个初步的方案评估，包括工作量和对应费用。如果您确认要做，我们可以走补充协议的流程。

您看我们是先评估一下，还是先把当前合同范围内的功能做好？」`,
    tips: "明确但委婉地指出超出范围。给出正规流程（补充协议），让甲方自己选择。",
  },
  {
    id: "b-rej-3",
    title: "拖延紧急上线要求",
    scenario: "rejection",
    content: `「我理解您希望尽快上线的急切心情。不过为了确保系统稳定运行，我们还是需要一个基本的测试周期。

我建议这样安排：
- X 月 X 日完成核心功能开发和内部测试
- X 月 X 日安排贵院的关键用户试用
- X 月 X 日正式上线

这样既不会太慢，也能保证质量。您看这个时间安排可以接受吗？」`,
    tips: "不要说'来不及'，给出具体的时间节点和理由。让甲方看到你在帮他把控风险。",
  },

  // ── Progress report ──
  {
    id: "b-prog-1",
    title: "定期进展同步",
    scenario: "progress",
    content: `「王总，跟您同步一下项目进展：

**已完成：**
- 功能 A 已经开发完成并通过测试
- 功能 B 正在联调中

**进行中：**
- 功能 C 预计本周完成
- 数据迁移准备工作已启动

**需要您这边配合的：**
- 请确认测试账号的权限配置
- 下周三安排一次 UAT 培训可以吗？

整体进度符合预期，没有延期风险。」`,
    tips: "进展同步要有结构：已完成 + 进行中 + 需要配合。永远主动说进度，不要等甲方问。",
  },
  {
    id: "b-prog-2",
    title: "汇报延期情况",
    scenario: "progress",
    content: `「张总，有个情况需要跟您同步一下。

功能 C 的开发比预期多花了 3 天，原因是我们在测试中发现了一个和数据对接相关的问题，为了保证系统稳定性我们做了额外处理。

目前的调整方案是：
- 功能 C 推迟到 X 号交付
- 其他功能不受影响，仍按原计划
- 我们会通过加班把时间追回来

对整体上线时间没有影响，请您放心。」`,
    tips: "主动坦白延期，不要等甲方发现。一定要带着解决方案来，不能只报问题。",
  },

  // ── Objection handling ──
  {
    id: "b-obj-1",
    title: "\"太贵了\"",
    scenario: "objection",
    content: `「我理解预算是一个重要的考量因素。让我们拆开来看：

1. 这个价格包含了 XX、XX、XX 这些功能和服务
2. 如果按 3 年使用周期算，每月的成本大约是 XXX
3. 我们也有分阶段实施的方案，可以先上核心功能

另外，我们之前有几个客户一开始也有类似的顾虑，但上线后 XX 个月就收回了成本。我可以把他们的案例发给您参考。」`,
    tips: "不要降价。拆解价格、算细账、给分阶段方案、用案例证明价值。",
  },
  {
    id: "b-obj-2",
    title: "\"太慢了\"",
    scenario: "objection",
    content: `「我理解您希望尽快用上系统的心情。我们也不想拖延——毕竟早交付早验收嘛。

目前的排期是基于以下考虑：
- 系统涉及和 HIS/EMR 的对接，需要充分的联调时间
- 医疗系统对稳定性要求高，必须经过完整测试
- 我们已经安排了额外的开发资源来加速

如果确实需要更快，我们可以讨论一下优先级调整——先上最核心的功能，其他后续迭代。您觉得呢？」`,
    tips: "解释为什么需要时间（专业性），给出加速选项（灵活性），让甲方做选择。",
  },
  {
    id: "b-obj-3",
    title: "\"别的公司更便宜\"",
    scenario: "objection",
    content: `「感谢您的坦诚。价格确实是决策的重要因素之一。

我想补充几个信息供您参考：
1. 我们的报价包含了 X 年的运维支持和 X 次免费升级
2. 我们在医疗行业有 XX 家客户的实际案例
3. 系统稳定性和数据安全方面我们通过了 XX 认证

当然，如果您拿到了更详细的竞品方案，我可以帮您做一次对比分析。选择最适合自己的才是最好的。」`,
    tips: "不要攻击竞品。强调自己的差异化价值，主动提出帮忙做对比分析（体现专业度）。",
  },
];

// ── Preset data: Party A FAQ ──

const FAQS_PARTY_A: FAQItem[] = [
  {
    id: "a-faq-1",
    question: "\"供应商说这个功能做不了，我该怎么判断？\"",
    answer: `**判断方法：**

1. **追问原因**：「具体是哪方面的技术限制？能详细说说吗？」
   - 如果说不清楚 → 大概率是借口
   - 如果能说清楚但很笼统 → 可能是能力不足
   - 如果说得很具体 → 可能是真的有技术难度

2. **多方验证**：
   - 问其他供应商能不能做
   - 问自己的 IT 科是否了解相关技术
   - 查一下行业里有没有类似功能的案例

3. **要求替代方案**：「如果这个做不了，你们有什么替代方案能达到类似效果？」

4. **底线思维**：如果是核心需求做不了，这个供应商可能不适合`,
    followUp: "核心原则：不要轻信'做不了'。多方验证，找到真实原因后再做判断。",
  },
  {
    id: "a-faq-2",
    question: "\"怎么判断供应商报价是否合理？\"",
    answer: `**评估方法：**

1. **要详细报价单**：不能只有一个总价，必须拆到模块级别
   - 软件授权费 vs 实施服务费 vs 运维费
   - 定制开发的单价和工时

2. **对比维度**：
   - 和 2-3 家竞品做功能价格对比
   - 按人均日工时算，看开发成本是否合理
   - 关注隐藏成本：接口对接费、数据迁移费、培训费

3. **谈判策略**：
   - 让供应商知道你在比价
   - 先谈范围再谈价格
   - 要求按里程碑付款

4. **参考基准**：同类医疗信息化项目，人均日费 1500-3000 元属合理范围`,
    followUp: "核心原则：没有详细拆分的报价不要接受。至少拿三家对比，心里才有数。",
  },
  {
    id: "a-faq-3",
    question: "\"供应商一直拖延交付怎么办？\"",
    answer: `**升级策略（由轻到重）：**

1. **第一步：正式沟通**
   - 书面邮件列明延期事项和要求
   - 要求供应商给出新的时间表和保障措施

2. **第二步：升级到对方管理层**
   - 「这个问题我希望和你们项目负责人或领导沟通一下」
   - 让对方知道你不会被一直拖着

3. **第三步：启动合同条款**
   - 查看合同中的延期违约条款
   - 「按照合同第 X 条，延期超过 XX 天我们需要启动 XX 条款」

4. **第四步：考虑备选方案**
   - 如果严重延期影响业务，考虑部分功能替换或引入第二供应商`,
    followUp: "核心原则：先礼后兵。每一步都要有书面记录，为后续可能的纠纷保留证据。",
  },
  {
    id: "a-faq-4",
    question: "\"怎么验收供应商的交付物？\"",
    answer: `**验收清单：**

1. **功能验收**：
   - 逐条对照需求文档，每个功能点都测一遍
   - 用真实业务场景测试，不要只用演示数据
   - 重点测试边界情况和异常操作

2. **性能验收**：
   - 页面加载速度
   - 并发用户支持数
   - 大数据量下的响应时间

3. **对接验收**：
   - 数据同步的完整性和准确性
   - 异常情况下的容错处理
   - 数据一致性检查

4. **文档验收**：
   - 用户操作手册
   - 系统管理员手册
   - 接口文档
   - 数据字典

5. **安全验收**：
   - 权限控制是否到位
   - 数据加密和脱敏
   - 操作日志完整性`,
    followUp: "核心原则：验收不能走过场。用真实场景测试，列出问题清单，逐一关闭。",
  },
  {
    id: "a-faq-5",
    question: "\"需求变更了怎么和供应商沟通？\"",
    answer: `**沟通策略：**

1. **区分变更类型**：
   - 小调整（不影响架构）→ 口头沟通 + 邮件确认即可
   - 中等变更（涉及功能增减）→ 需要书面变更单，评估影响
   - 大变更（改变项目范围）→ 需要正式变更流程，可能涉及合同调整

2. **沟通模板**：
   「张总，XX 科室这边有一个需求调整。原来是 XX，现在需要改成 XX。请问：
   1. 这个调整对现有功能有影响吗？
   2. 工期需要延长多少？
   3. 是否需要额外费用？
   我们评估一下再决定是否变更。」

3. **注意事项**：
   - 所有变更都要有书面记录
   - 评估影响后再决定是否执行
   - 不要频繁变更，否则项目会失控`,
    followUp: "核心原则：变更是正常的，但要走流程。口头确认 → 书面评估 → 正式决策。",
  },
];

// ── Preset data: Party B FAQ ──

const FAQS_PARTY_B: FAQItem[] = [
  {
    id: "b-faq-1",
    question: "\"这个功能能不能加？\"",
    answer: `**标准应对流程：**

1. **先回应**：「好的，我先记下来。您能具体说一下这个功能的使用场景吗？」
2. **评估影响**：回到团队评估工作量和技术可行性
3. **分类处理**：
   - 小功能（1-2 天）：可以加，但需要确认不影响现有排期
   - 中等功能（3-5 天）：需要讨论是否替换其他需求或延期
   - 大功能（1 周以上）：建议放到二期，走补充协议`,
    followUp: "关键：永远不要当场答应或拒绝。记录需求 → 评估 → 给出方案。",
  },
  {
    id: "b-faq-2",
    question: "\"预算有限，能不能便宜点？\"",
    answer: `**应对策略：**

1. **不直接降价**，先了解具体预算范围
2. **拆分方案**：「如果预算确实紧张，我建议可以分两期来做——一期先上最核心的 XX 功能，大概需要 XX 万；二期再做其他功能」
3. **强调价值**：帮助甲方算 ROI——这个系统能帮他们省多少人力、减少多少差错
4. **调整范围**：「如果我们调整一下功能范围，比如先不做 XX 模块，价格可以控制在 XX 万以内」`,
    followUp: "降价是最差的选择。通过分阶段、调范围来匹配预算。",
  },
  {
    id: "b-faq-3",
    question: "\"我们想要和 XX 系统对接\"",
    answer: `**必须确认的问题清单：**

1. 对接的 XX 系统是什么厂商、什么版本？
2. 对接的数据范围是什么？（患者信息？检验报告？影像？）
3. 是单向读取还是双向同步？
4. 对方系统是否提供标准接口？（HL7？FHIR？Web Service？私有接口？）
5. 是否需要对方配合开发？对方配合意愿如何？
6. 数据安全和隐私合规要求是什么？
7. 对接的工作量和费用由谁承担？

**话术**：「系统对接是一个比较专业的部分，我需要先了解一下 XX 系统的接口情况。您方便帮忙联系一下对方的 IT 负责人吗？我们技术对接一下，评估一下方案和工期。」`,
    followUp: "系统对接是风险很高的需求。一定要拿到对方技术负责人的联系方式，不能只听甲方的转述。",
  },
  {
    id: "b-faq-4",
    question: "\"什么时候能上线？\"",
    answer: `**排期沟通话术：**

1. **不要拍脑袋给时间**：「我需要回到团队评估一下具体工作量，X 天内给您一个准确的时间表」
2. **给时间留余量**：内部评估 2 周，对外说 3 周（留 buffer）
3. **分阶段承诺**：
   - 「核心功能预计 X 周后可以进入测试」
   - 「完整上线预计需要 X 个月，分 X 个阶段交付」
4. **明确前提条件**：「这个时间基于以下前提——需求确认不频繁变更、测试配合及时、第三方接口按时到位」`,
    followUp: "承诺时间一定要有余量。甲方永远记住你说的最早时间，不记住你说的前提条件。",
  },
  {
    id: "b-faq-5",
    question: "\"能不能参考 XX 系统/产品做一个一样的？\"",
    answer: `**应对策略：**

1. **了解动机**：「您觉得 XX 系统哪方面做得好？最打动您的功能是什么？」
2. **说明差异**：「我们可以参考 XX 系统的设计理念，但会根据贵院的实际情况做定制化调整，这样更适合你们的工作流程」
3. **注意合规**：不能照搬别人的 UI 和功能设计（版权问题），但可以借鉴交互逻辑
4. **给出方案**：「我建议我们先分析 XX 系统的优缺点，取其精华，再加上我们的行业经验，做一个更适合贵院的方案」`,
    followUp: "参考可以，照搬不行。引导甲方关注'适合自己的'而不是'和别人一样的'。",
  },
  {
    id: "b-faq-6",
    question: "\"我们要领导/其他科室也看一下\"",
    answer: `**应对策略：**

1. **主动配合**：「好的，我可以准备一份简洁的方案汇报材料，方便您给领导和其他科室展示」
2. **争取参与**：「如果方便的话，我可以一起参加汇报，现场解答技术方面的问题」
3. **锁定决策人**：「这个项目最终的决策人是哪位？我这边可以针对性地准备材料」
4. **跟进节奏**：「那我下周二跟您确认一下汇报的时间安排，可以吗？」`,
    followUp: "甲方内部汇报是好信号（说明有意向）。主动提供材料，争取当面汇报的机会。",
  },
];

// ── AI System prompts per perspective ──

const AI_SYSTEM_PROMPTS: Record<Perspective, string> = {
  partyA: `你是一位专门为医院方（甲方）服务的沟通教练。用户是医院信息科、医务科等科室的工作人员，正在和医疗信息化供应商沟通项目需求、进度和问题。

你的职责：
1. 帮助用户把模糊的想法表达成清晰的技术需求
2. 帮助用户识别供应商话术中的水分和套路
3. 帮助用户在谈判中争取合理利益
4. 用通俗语言解释技术概念，让用户有底气和技术人员对话
5. 提供具体的话术建议和应对策略

沟通原则：
- 站在医院方立场，维护医院利益
- 语言要通俗易懂，但建议要专业
- 既要合理争取，也要理解供应商的难处
- 每次回复控制在 300 字以内，给出可操作的建议`,
  partyB: `你是一位专门为医疗信息化供应商（乙方）服务的沟通教练。用户是产品经理或项目经理，正在和医院客户沟通项目需求、交付和问题。

你的职责：
1. 帮助用户理解医院客户的真实需求和心理
2. 帮助用户用医院能接受的方式表达技术问题
3. 帮助用户管理客户期望，避免过度承诺
4. 帮助用户处理客户的异议和不满
5. 提供具体的话术建议和应对策略

沟通原则：
- 专业但不生硬，让客户感受到诚意
- 管理期望而不是降低服务质量
- 遇到冲突先理解对方立场再解释自己
- 每次回复控制在 300 字以内，给出可操作的建议`,
};

// ── Favorites helpers ──

interface FavoriteItem {
  id: string;
  type: "script" | "faq";
  savedAt: string;
}

function getFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("comm-guide-favorites") || "[]");
  } catch {
    return [];
  }
}

function saveFavorites(items: FavoriteItem[]) {
  localStorage.setItem("comm-guide-favorites", JSON.stringify(items));
}

// ── Component ──

export default function CommGuidePage() {
  const [perspective, setPerspective] = useState<Perspective>("partyA");
  const [activeCategory, setActiveCategory] = useState<Category>("opening");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>(getFavorites);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Get scripts/FAQs based on perspective
  const currentScripts = perspective === "partyA" ? SCRIPTS_PARTY_A : SCRIPTS_PARTY_B;
  const currentFAQs = perspective === "partyA" ? FAQS_PARTY_A : FAQS_PARTY_B;

  const isFavorite = (id: string) => favorites.some((f) => f.id === id);

  const toggleFavorite = (id: string, type: "script" | "faq") => {
    if (isFavorite(id)) {
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } else {
      setFavorites((prev) => [...prev, { id, type, savedAt: new Date().toISOString() }]);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatLoading(true);

    try {
      const systemPrompt = AI_SYSTEM_PROMPTS[perspective];
      const conversationHistory = chatMessages.map((m) => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system" as const, content: systemPrompt },
            ...conversationHistory,
            { role: "user" as const, content: userMessage },
          ],
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;
          setChatMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: assistantContent };
            return updated;
          });
        }
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "抱歉，AI 助手暂时无法回复，请稍后再试。" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredScripts = useMemo(() => {
    if (activeCategory === "faq") return [];
    let items = currentScripts.filter((s) => s.scenario === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q) ||
          (s.tips && s.tips.toLowerCase().includes(q))
      );
    }
    if (showFavoritesOnly) {
      items = items.filter((s) => isFavorite(s.id));
    }
    return items;
  }, [perspective, activeCategory, searchQuery, showFavoritesOnly, favorites, currentScripts]);

  const filteredFAQs = useMemo(() => {
    if (activeCategory !== "faq") return [];
    let items = currentFAQs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      );
    }
    if (showFavoritesOnly) {
      items = items.filter((f) => isFavorite(f.id));
    }
    return items;
  }, [perspective, activeCategory, searchQuery, showFavoritesOnly, favorites, currentFAQs]);

  const currentCategoryMeta = CATEGORIES.find((c) => c.key === activeCategory)!;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {perspective === "partyA" ? "医院方沟通教练" : "供应商沟通教练"}
        </h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          {perspective === "partyA"
            ? "帮助医院工作人员与供应商高效沟通的需求表达、方案评估和谈判话术库"
            : "帮助供应商 PM 与医院客户沟通的参考话术库，包含各类场景的应对模板和行业 FAQ"}
        </p>
      </div>

      {/* Perspective toggle */}
      <div className="mb-5">
        <div className="inline-flex rounded-xl border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => {
              setPerspective("partyA");
              setActiveCategory("opening");
              setSearchQuery("");
              setShowFavoritesOnly(false);
              setExpandedId(null);
              setShowChat(false);
              setChatMessages([]);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
              perspective === "partyA"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white text-[var(--color-muted-foreground)] hover:bg-gray-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            我是甲方（医院方）
          </button>
          <button
            onClick={() => {
              setPerspective("partyB");
              setActiveCategory("opening");
              setSearchQuery("");
              setShowFavoritesOnly(false);
              setExpandedId(null);
              setShowChat(false);
              setChatMessages([]);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors border-l border-[var(--color-border)] ${
              perspective === "partyB"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white text-[var(--color-muted-foreground)] hover:bg-gray-50"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            我是乙方（供应商）
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key);
                setSearchQuery("");
                setShowFavoritesOnly(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeCategory === cat.key
                  ? `${cat.color} font-medium`
                  : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label[perspective]}
            </button>
          );
        })}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showChat
              ? "bg-cyan-50 text-cyan-600 font-medium"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          AI 助手
        </button>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showFavoritesOnly
              ? "bg-amber-50 text-amber-600 font-medium"
              : "text-[var(--color-muted-foreground)] hover:bg-gray-50"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-amber-400" : ""}`} />
          收藏 ({favorites.length})
        </button>
      </div>

      {/* AI Chat panel */}
      {showChat && (
        <div className="mb-5 rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-600" />
              <span className="font-medium text-sm text-cyan-800">
                {perspective === "partyA" ? "医院方 AI 沟通助手" : "供应商 AI 沟通助手"}
              </span>
              <span className="text-xs text-cyan-600">
                ({perspective === "partyA" ? "甲方视角" : "乙方视角"})
              </span>
            </div>
            <p className="text-xs text-cyan-700 mt-1">
              {perspective === "partyA"
                ? "告诉我你遇到什么沟通场景，我帮你组织话术、分析供应商策略"
                : "告诉我你遇到什么客户沟通难题，我帮你分析客户心理、组织专业回复"}
            </p>
          </div>
          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-white">
            {chatMessages.length === 0 && (
              <div className="text-center text-sm text-[var(--color-muted-foreground)] pt-8">
                {perspective === "partyA" ? (
                  <>
                    <p className="mb-2">试试问我：</p>
                    <p className="text-xs">「供应商说需求做不了，怎么判断是不是在忽悠我？」</p>
                    <p className="text-xs">「怎么跟供应商谈价格？」</p>
                    <p className="text-xs">「供应商一直拖延上线怎么办？」</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2">试试问我：</p>
                    <p className="text-xs">「甲方提了一个很离谱的需求怎么拒绝？」</p>
                    <p className="text-xs">「客户说我们太贵了怎么应对？」</p>
                    <p className="text-xs">「甲方一直加需求但不加钱怎么办？」</p>
                  </>
                )}
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {chatLoading && chatMessages[chatMessages.length - 1]?.role === "assistant" && !chatMessages[chatMessages.length - 1]?.content && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-400">
                  正在思考...
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-[var(--color-border)] p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                placeholder={
                  perspective === "partyA"
                    ? "描述你遇到的问题，比如：供应商说做不了..."
                    : "描述你遇到的问题，比如：甲方一直加需求..."
                }
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                onClick={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索话术、场景、关键词..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Scripts */}
        {filteredScripts.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[var(--color-border)] overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              {expandedId === item.id ? (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <span className="flex-1 font-medium text-sm">{item.title}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.id, "script");
                  }}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFavorite(item.id)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              </div>
            </button>
            {expandedId === item.id && (
              <div className="border-t border-[var(--color-border)]">
                <div className="px-4 py-3">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 rounded-lg p-4">
                    {item.content}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleCopy(item.content, item.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
                    >
                      {copiedId === item.id ? (
                        <><Check className="w-3.5 h-3.5 text-green-500" /> 已复制</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> 复制话术</>
                      )}
                    </button>
                  </div>
                </div>
                {item.tips && (
                  <div className="px-4 pb-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                      <span className="font-medium">小贴士：</span> {item.tips}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* FAQ */}
        {filteredFAQs.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[var(--color-border)] overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              {expandedId === item.id ? (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <span className="flex-1 font-medium text-sm text-indigo-700">
                {item.question}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id, "faq");
                }}
                className="p-1 rounded hover:bg-gray-100"
              >
                <Star
                  className={`w-4 h-4 ${
                    isFavorite(item.id)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            </button>
            {expandedId === item.id && (
              <div className="border-t border-[var(--color-border)]">
                <div className="px-4 py-3">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {item.answer}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleCopy(item.answer, item.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
                    >
                      {copiedId === item.id ? (
                        <><Check className="w-3.5 h-3.5 text-green-500" /> 已复制</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> 复制</>
                      )}
                    </button>
                  </div>
                </div>
                {item.followUp && (
                  <div className="px-4 pb-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                      <span className="font-medium">注意事项：</span> {item.followUp}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {filteredScripts.length === 0 && filteredFAQs.length === 0 && (
          <div className="text-center py-12 text-[var(--color-muted-foreground)]">
            {showFavoritesOnly
              ? "还没有收藏的内容"
              : searchQuery
                ? "没有找到匹配的内容"
                : "该分类暂无内容"}
          </div>
        )}
      </div>
    </div>
  );
}
