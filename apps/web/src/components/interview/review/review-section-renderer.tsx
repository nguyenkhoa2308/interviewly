import {
    ArrowRight,
    BookOpenCheck,
    Braces,
    Check,
    CheckCircle2,
    Code2,
    GitBranch,
    Lightbulb,
    MessageSquareText,
    Minus,
    Route,
    Scale,
    SearchCheck,
    TriangleAlert,
    X,
    XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { InterviewReviewSection } from '@/types/interview';
import { parseInterviewReviewSections } from './interview-review-section.schema';

type SectionOf<T extends InterviewReviewSection['type']> = Extract<
    InterviewReviewSection,
    { type: T }
>;
type SectionRenderer = (section: InterviewReviewSection) => ReactNode;

const sectionRegistry = {
    CRITERIA_ANALYSIS: (section) => (
        <CriteriaAnalysis section={section as SectionOf<'CRITERIA_ANALYSIS'>} />
    ),
    ANSWER_STRUCTURE: (section) => (
        <AnswerStructure section={section as SectionOf<'ANSWER_STRUCTURE'>} />
    ),
    KNOWLEDGE_EXPLANATION: (section) => (
        <KnowledgeExplanation
            section={section as SectionOf<'KNOWLEDGE_EXPLANATION'>}
        />
    ),
    CODE_EXAMPLE: (section) => (
        <CodeExample section={section as SectionOf<'CODE_EXAMPLE'>} />
    ),
    SCENARIO_APPROACH: (section) => (
        <ScenarioApproach section={section as SectionOf<'SCENARIO_APPROACH'>} />
    ),
    TRADEOFF_ANALYSIS: (section) => (
        <TradeoffAnalysis section={section as SectionOf<'TRADEOFF_ANALYSIS'>} />
    ),
    STAR_ANALYSIS: (section) => (
        <StarAnalysis section={section as SectionOf<'STAR_ANALYSIS'>} />
    ),
    INTERVIEWER_PERSPECTIVE: (section) => (
        <InterviewerPerspective
            section={section as SectionOf<'INTERVIEWER_PERSPECTIVE'>}
        />
    ),
    IMPROVED_ANSWER: (section) => (
        <ImprovedAnswer section={section as SectionOf<'IMPROVED_ANSWER'>} />
    ),
    ANSWER_COMPARISON: (section) => (
        <AnswerComparison section={section as SectionOf<'ANSWER_COMPARISON'>} />
    ),
    SCENARIO_ANALYSIS: (section) => (
        <LegacyScenarioAnalysis
            section={section as SectionOf<'SCENARIO_ANALYSIS'>}
        />
    ),
} satisfies Record<InterviewReviewSection['type'], SectionRenderer>;

export function ReviewSectionRenderer({ sections }: { sections: unknown }) {
    const validSections = parseInterviewReviewSections(sections);
    if (validSections.length === 0) return null;

    return (
        <div className="grid max-w-full min-w-0 gap-4">
            {validSections.map((section, index) => (
                <div
                    key={`${section.type}-${index}`}
                    className="max-w-full min-w-0"
                >
                    {sectionRegistry[section.type](section)}
                </div>
            ))}
        </div>
    );
}

function SectionFrame({
    title,
    icon,
    children,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="max-w-full min-w-0">
            <div className="flex min-w-0 items-center gap-3">
                <span className="text-primary bg-primary/8 grid size-10 shrink-0 place-items-center rounded-xl">
                    {icon}
                </span>
                <h4 className="min-w-0 text-lg font-black tracking-[-0.01em] [overflow-wrap:anywhere] break-words text-slate-950">
                    {title}
                </h4>
            </div>
            <div className="mt-4 max-w-full min-w-0">{children}</div>
        </section>
    );
}

const statusPresentation = {
    DEMONSTRATED: {
        label: 'Đã thể hiện',
        className: 'bg-emerald-50 text-emerald-700',
        iconClassName: 'bg-emerald-500 text-white',
        icon: Check,
    },
    PARTIALLY_DEMONSTRATED: {
        label: 'Một phần',
        className: 'bg-amber-50 text-amber-700',
        iconClassName: 'bg-amber-500 text-white',
        icon: Minus,
    },
    NOT_DEMONSTRATED: {
        label: 'Chưa thể hiện',
        className: 'bg-rose-50 text-rose-700',
        iconClassName: 'bg-rose-500 text-white',
        icon: X,
    },
    INCORRECT: {
        label: 'Sai kiến thức',
        className: 'bg-rose-50 text-rose-700',
        iconClassName: 'bg-rose-500 text-white',
        icon: X,
    },
    INSUFFICIENT_EVIDENCE: {
        label: 'Chưa đủ bằng chứng',
        className: 'bg-slate-100 text-slate-600',
        iconClassName: 'bg-slate-400 text-white',
        icon: Minus,
    },
} as const;

function CriteriaAnalysis({
    section,
}: {
    section: SectionOf<'CRITERIA_ANALYSIS'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<SearchCheck className="size-5" aria-hidden="true" />}
        >
            <p className="max-w-5xl text-sm leading-7 text-slate-600">
                {section.data.overallAssessment}
            </p>
            <div className="mt-5 border-y border-slate-200">
                {section.data.criteria.map((criterion, index) => {
                    const presentation = statusPresentation[criterion.status];
                    const Icon = presentation.icon;
                    const details = [
                        criterion.evidence
                            ? `Bằng chứng: ${criterion.evidence}`
                            : null,
                        criterion.missing,
                        criterion.explanation,
                    ].filter((value): value is string => Boolean(value));

                    return (
                        <div
                            key={criterion.id ?? `${criterion.name}-${index}`}
                            className="grid gap-3 border-b border-slate-200 py-5 last:border-b-0 md:grid-cols-[minmax(190px,0.8fr)_minmax(150px,auto)_minmax(0,1.7fr)] md:items-start md:gap-6"
                        >
                            <div className="flex min-w-0 items-start gap-3">
                                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full text-sm font-black tabular-nums">
                                    {index + 1}
                                </span>
                                <p className="pt-1 text-sm font-black text-slate-950">
                                    {criterion.name}
                                </p>
                            </div>
                            <span
                                className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${presentation.className}`}
                            >
                                <span
                                    className={`grid size-5 shrink-0 place-items-center rounded-full ${presentation.iconClassName}`}
                                >
                                    <Icon
                                        className="size-3 stroke-[3]"
                                        aria-hidden="true"
                                    />
                                </span>
                                {presentation.label}
                            </span>
                            <div className="text-sm leading-6 text-slate-600 md:border-l md:border-slate-200 md:pl-6">
                                {details.length > 0 ? (
                                    <ul className="grid gap-1.5">
                                        {details.map((detail) => (
                                            <li
                                                key={detail}
                                                className="flex gap-2"
                                            >
                                                <span className="mt-2.5 size-1 shrink-0 rounded-full bg-slate-400" />
                                                <span>{detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>Không có nhận xét bổ sung.</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </SectionFrame>
    );
}
function AnswerStructure({
    section,
}: {
    section: SectionOf<'ANSWER_STRUCTURE'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<Route className="size-5" aria-hidden="true" />}
        >
            <p className="text-sm leading-7 text-slate-600">
                Bạn có thể triển khai câu trả lời theo trình tự dưới đây để rõ ý
                và tự nhiên hơn khi nói.
            </p>
            <ol className="mt-5 grid gap-3">
                {section.data.steps.map((step, index) => (
                    <li
                        key={`${step.label}-${index}`}
                        className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
                    >
                        <span className="bg-primary/12 text-primary grid size-9 shrink-0 place-items-center rounded-full text-sm font-black">
                            {index + 1}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-950">
                                {step.label}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                {step.guidance}
                            </p>
                            {step.expectedContent && (
                                <p className="mt-1.5 text-sm leading-6 text-slate-700">
                                    {step.expectedContent}
                                </p>
                            )}
                        </div>
                        {step.speakingTimeSeconds && (
                            <span className="bg-primary/8 text-primary w-fit rounded-full px-2.5 py-1 text-xs font-bold">
                                Khoảng {step.speakingTimeSeconds} giây
                            </span>
                        )}
                    </li>
                ))}
            </ol>
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
                <Lightbulb
                    className="mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                />
                <p>
                    Hãy điều chỉnh nội dung theo kinh nghiệm thật của bạn. Không
                    cần học thuộc từng câu, chỉ cần giữ đúng mạch ý.
                </p>
            </div>
        </SectionFrame>
    );
}

function KnowledgeExplanation({
    section,
}: {
    section: SectionOf<'KNOWLEDGE_EXPLANATION'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<BookOpenCheck className="size-5" aria-hidden="true" />}
        >
            <p className="text-sm leading-7 text-slate-700">
                {section.data.explanation}
            </p>
            {!!section.data.concepts?.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {section.data.concepts.map((concept) => (
                        <span
                            key={concept}
                            className="bg-primary/8 text-primary rounded-full px-2.5 py-1 text-xs font-bold"
                        >
                            {concept}
                        </span>
                    ))}
                </div>
            )}
            <BulletList title="Điểm cốt lõi" items={section.data.keyPoints} />
            {!!section.data.examples?.length && (
                <BulletList title="Ví dụ" items={section.data.examples} />
            )}
            {!!section.data.caveats?.length && (
                <BulletList
                    title="Lưu ý"
                    items={section.data.caveats}
                    tone="danger"
                />
            )}
            {section.data.commonMisconception && (
                <div className="mt-4 flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-900">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{section.data.commonMisconception}</span>
                </div>
            )}
        </SectionFrame>
    );
}

function CodeExample({ section }: { section: SectionOf<'CODE_EXAMPLE'> }) {
    return (
        <SectionFrame
            title={section.title}
            icon={<Code2 className="size-5" aria-hidden="true" />}
        >
            <div className="max-w-full min-w-0 overflow-hidden rounded-xl bg-slate-950">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs font-bold text-slate-400">
                    <span>{section.data.language}</span>
                    <Braces className="size-4" aria-hidden="true" />
                </div>
                <pre className="max-w-full overflow-x-auto p-4 text-sm leading-6 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-100">
                    <code className="whitespace-inherit">
                        {section.data.code}
                    </code>
                </pre>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
                {section.data.explanation}
            </p>
            {section.data.expectedBehavior && (
                <p className="mt-2 text-sm leading-6 text-slate-700">
                    <span className="font-bold">Kết quả mong đợi: </span>
                    {section.data.expectedBehavior}
                </p>
            )}
        </SectionFrame>
    );
}

function ScenarioApproach({
    section,
}: {
    section: SectionOf<'SCENARIO_APPROACH'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<GitBranch className="size-5" aria-hidden="true" />}
        >
            <ol className="grid gap-3 md:grid-cols-2">
                {section.data.steps.map((step, index) => (
                    <li
                        key={`${step.label}-${index}`}
                        className="rounded-lg bg-white p-4"
                    >
                        <span className="text-primary text-xs font-black">
                            BƯỚC {index + 1}
                        </span>
                        <p className="mt-1 font-bold text-slate-950">
                            {step.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            {step.detail}
                        </p>
                    </li>
                ))}
            </ol>
            {section.data.reasoning && (
                <p className="mt-4 text-sm leading-6 text-slate-700">
                    <span className="font-bold">Lý do: </span>
                    {section.data.reasoning}
                </p>
            )}
            {!!section.data.alternatives?.length && (
                <div className="mt-4">
                    <p className="text-sm font-black text-slate-900">
                        Phương án khác
                    </p>
                    {section.data.alternatives.map((alternative) => (
                        <p
                            key={alternative.option}
                            className="mt-2 text-sm leading-6 text-slate-600"
                        >
                            <span className="font-bold text-slate-800">
                                {alternative.option}:{' '}
                            </span>
                            {alternative.whenToUse}
                        </p>
                    ))}
                </div>
            )}
            {section.data.validation && (
                <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
                    <span className="font-bold">Cách kiểm chứng: </span>
                    {section.data.validation}
                </p>
            )}
        </SectionFrame>
    );
}

function TradeoffAnalysis({
    section,
}: {
    section: SectionOf<'TRADEOFF_ANALYSIS'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<Scale className="size-5" aria-hidden="true" />}
        >
            <div className="grid gap-3 lg:grid-cols-2">
                {section.data.options.map((option, index) => (
                    <div
                        key={`${option.name}-${index}`}
                        className="rounded-lg bg-white p-4"
                    >
                        <p className="font-black text-slate-950">
                            {option.name}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <BulletList
                                title="Ưu điểm"
                                items={option.advantages}
                                tone="success"
                            />
                            <BulletList
                                title="Hạn chế"
                                items={option.disadvantages}
                                tone="danger"
                            />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            <span className="font-bold text-slate-800">
                                Phù hợp khi:{' '}
                            </span>
                            {option.whenToUse}
                        </p>
                    </div>
                ))}
            </div>
            {!!section.data.decisionCriteria?.length && (
                <div className="mt-4">
                    <BulletList
                        title="Tiêu chí quyết định"
                        items={section.data.decisionCriteria}
                    />
                </div>
            )}
            {section.data.recommendation && (
                <p className="border-primary/20 bg-primary/5 mt-4 rounded-lg border p-3 text-sm leading-6 text-slate-700">
                    <span className="text-primary font-bold">
                        Khuyến nghị:{' '}
                    </span>
                    {section.data.recommendation}
                </p>
            )}
        </SectionFrame>
    );
}

function StarAnalysis({ section }: { section: SectionOf<'STAR_ANALYSIS'> }) {
    const entries = [
        ['S', 'Tình huống', section.data.situation],
        ['T', 'Nhiệm vụ', section.data.task],
        ['A', 'Hành động', section.data.action],
        ['R', 'Kết quả', section.data.result],
    ] as const;
    return (
        <SectionFrame
            title={section.title}
            icon={<GitBranch className="size-5" aria-hidden="true" />}
        >
            {section.data.contentSource === 'GUIDANCE_PLACEHOLDER' && (
                <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                    Đây là khung gợi ý; hãy thay nội dung mẫu bằng trải nghiệm
                    thật của bạn.
                </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
                {entries.map(([key, label, value]) => (
                    <div
                        key={key}
                        className={`rounded-lg p-3 ${value ? 'bg-white' : 'border border-dashed border-rose-200 bg-rose-50/40'}`}
                    >
                        <p className="text-xs font-black tracking-wide text-slate-500 uppercase">
                            {key} · {label}
                        </p>
                        <p className="mt-1.5 text-sm leading-6 text-slate-700">
                            {value ?? 'Chưa thể hiện trong câu trả lời.'}
                        </p>
                    </div>
                ))}
            </div>
        </SectionFrame>
    );
}

function InterviewerPerspective({
    section,
}: {
    section: SectionOf<'INTERVIEWER_PERSPECTIVE'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<MessageSquareText className="size-5" aria-hidden="true" />}
        >
            <div className="grid gap-4 lg:grid-cols-3">
                <BulletList
                    title="Tín hiệu tích cực"
                    items={section.data.positiveSignals}
                    tone="success"
                />
                <BulletList
                    title="Điểm còn băn khoăn"
                    items={section.data.concerns}
                    tone="danger"
                />
                <BulletList
                    title="Có thể được hỏi tiếp"
                    items={section.data.likelyFollowUps}
                />
            </div>
        </SectionFrame>
    );
}

function ImprovedAnswer({
    section,
}: {
    section: SectionOf<'IMPROVED_ANSWER'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<Lightbulb className="size-5" aria-hidden="true" />}
        >
            <p className="mb-3 text-xs font-bold text-slate-500">
                {section.data.answerType === 'PERSONALIZED_VERIFIED'
                    ? 'C\u00e1 nh\u00e2n h\u00f3a t\u1eeb th\u00f4ng tin \u0111\u00e3 x\u00e1c minh'
                    : section.data.answerType === 'TEMPLATE'
                      ? 'M\u1eabu \u0111\u1ec3 b\u1ea1n t\u1ef1 \u0111i\u1ec1n th\u00f4ng tin'
                      : 'V\u00ed d\u1ee5 minh h\u1ecda gi\u1ea3 \u0111\u1ecbnh'}
            </p>
            <p className="border-primary/30 min-w-0 border-l-2 pl-4 text-sm leading-7 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-700">
                {section.data.answer}
            </p>
            {!!section.data.improvements?.length && (
                <div className="mt-4">
                    <BulletList
                        title="Điểm đã cải thiện"
                        items={section.data.improvements}
                    />
                </div>
            )}
        </SectionFrame>
    );
}

function AnswerComparison({
    section,
}: {
    section: SectionOf<'ANSWER_COMPARISON'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<ArrowRight className="size-5" aria-hidden="true" />}
        >
            <p className="text-sm leading-7 text-slate-700">
                {section.data.summary}
            </p>
            {(section.data.originalAnswer || section.data.improvedAnswer) && (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-black text-slate-500 uppercase">
                            Câu trả lời gốc
                        </p>
                        <p className="mt-2 min-w-0 text-sm leading-6 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-700">
                            {section.data.originalAnswer ||
                                'Chưa có câu trả lời.'}
                        </p>
                    </div>
                    {section.data.improvedAnswer && (
                        <div className="bg-primary/5 rounded-lg p-3">
                            <p className="text-primary text-xs font-black uppercase">
                                Câu trả lời cải thiện
                            </p>
                            <p className="mt-2 min-w-0 text-sm leading-6 [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-slate-700">
                                {section.data.improvedAnswer}
                            </p>
                        </div>
                    )}
                </div>
            )}
            <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {section.data.changes.map((change, index) => (
                    <div key={`${change.area}-${index}`} className="p-4">
                        <p className="font-bold text-slate-950">
                            {change.area}
                        </p>
                        <div className="mt-2 grid gap-3 lg:grid-cols-2">
                            {change.original && (
                                <p className="text-sm leading-6 text-slate-500">
                                    <span className="font-bold">Trước: </span>
                                    {change.original}
                                </p>
                            )}
                            <p className="text-sm leading-6 text-slate-700">
                                <span className="text-primary font-bold">
                                    Cải thiện:{' '}
                                </span>
                                {change.improved}
                            </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            <span className="font-bold text-slate-800">
                                Vì sao:{' '}
                            </span>
                            {change.reason}
                        </p>
                    </div>
                ))}
            </div>
        </SectionFrame>
    );
}

function LegacyScenarioAnalysis({
    section,
}: {
    section: SectionOf<'SCENARIO_ANALYSIS'>;
}) {
    return (
        <SectionFrame
            title={section.title}
            icon={<GitBranch className="size-5" aria-hidden="true" />}
        >
            <p className="text-sm leading-6 text-slate-700">
                {section.data.approach}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <BulletList
                    title="Điểm cần cân nhắc"
                    items={section.data.considerations}
                />
                {section.data.tradeOffs.length > 0 && (
                    <BulletList
                        title="Đánh đổi"
                        items={section.data.tradeOffs}
                    />
                )}
            </div>
        </SectionFrame>
    );
}

function BulletList({
    items,
    title,
    tone = 'default',
}: {
    items: string[];
    title?: string;
    tone?: 'default' | 'success' | 'danger';
}) {
    const Icon = tone === 'danger' ? XCircle : CheckCircle2;
    const iconClass =
        tone === 'danger'
            ? 'text-rose-500'
            : tone === 'success'
              ? 'text-emerald-500'
              : 'text-primary';
    if (items.length === 0) return null;
    return (
        <div>
            {title && (
                <p className="text-xs font-black tracking-wide text-slate-500 uppercase">
                    {title}
                </p>
            )}
            <ul className={title ? 'mt-2 space-y-2' : 'mt-3 space-y-2'}>
                {items.map((item, index) => (
                    <li
                        key={`${item}-${index}`}
                        className="flex gap-2 text-sm leading-6 text-slate-600"
                    >
                        <Icon
                            className={`mt-1 size-4 shrink-0 ${iconClass}`}
                            aria-hidden="true"
                        />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
