import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

const steps = [
    ['Thiết lập phỏng vấn', 'Thông tin cơ bản'],
    ['Ngữ cảnh và tài liệu', 'Chọn CV và mô tả công việc'],
    ['Xem lại và tạo', 'Kiểm tra kế hoạch trước khi bắt đầu'],
] as const;

export function InterviewWizardStepper({ current }: { current: 1 | 2 | 3 }) {
    const [activeTitle, activeSubtitle] = steps[current - 1];
    return (
        <>
            <div
                className="mt-5 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 sm:hidden"
                aria-label={`Bước ${current} trên 3: ${activeTitle}`}
            >
                <div className="flex items-center gap-3">
                    <span className="bg-primary grid size-9 shrink-0 place-items-center rounded-full text-sm font-black text-white shadow-[0_6px_16px_rgba(109,60,220,.2)]">
                        {current}
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold text-violet-600">
                            Bước {current}/3
                        </p>
                        <p className="mt-0.5 truncate text-sm font-extrabold text-slate-950">
                            {activeTitle}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            {activeSubtitle}
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-6 hidden sm:block lg:hidden">
                <ol
                    className="flex items-center"
                    aria-label="Tiến trình tạo phỏng vấn"
                >
                    {steps.map((_, index) => {
                        const number = (index + 1) as 1 | 2 | 3;
                        const completed = number < current;
                        const active = number === current;
                        return (
                            <li
                                key={number}
                                className="flex min-w-0 flex-1 items-center last:flex-none"
                            >
                                <StepCircle
                                    number={number}
                                    completed={completed}
                                    active={active}
                                />
                                {index < steps.length - 1 && (
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'mx-2 h-0.5 min-w-4 flex-1 rounded-full transition-colors duration-300 sm:mx-4',
                                            completed
                                                ? 'bg-primary/35'
                                                : 'bg-slate-300',
                                        )}
                                    />
                                )}
                            </li>
                        );
                    })}
                </ol>
                <div className="mt-3 text-center">
                    <p className="text-sm font-extrabold text-slate-950">
                        {activeTitle}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {activeSubtitle}
                    </p>
                </div>
            </div>
            <ol
                className="relative mt-8 hidden items-center gap-0 lg:flex"
                aria-label="Tiến trình tạo phỏng vấn"
            >
                {steps.map(([title, subtitle], index) => {
                    const number = (index + 1) as 1 | 2 | 3;
                    const completed = number < current;
                    const active = number === current;
                    return (
                        <li
                            key={title}
                            className={cn(
                                'relative flex min-w-0 items-center gap-4',
                                index < steps.length - 1
                                    ? 'lg:flex-1'
                                    : 'lg:flex-none',
                            )}
                        >
                            <StepCircle
                                number={number}
                                completed={completed}
                                active={active}
                                desktop
                            />
                            <span className="min-w-0">
                                <span
                                    className={cn(
                                        'block truncate text-sm font-extrabold',
                                        active
                                            ? 'text-slate-950'
                                            : completed
                                              ? 'text-slate-800'
                                              : 'text-slate-500',
                                    )}
                                >
                                    {title}
                                </span>
                                <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                                    {subtitle}
                                </span>
                            </span>
                            {index < steps.length - 1 && (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'mx-5 hidden h-0.5 min-w-8 flex-1 rounded-full transition-colors duration-300 lg:block',
                                        completed
                                            ? 'bg-primary/35'
                                            : 'bg-slate-300',
                                    )}
                                />
                            )}
                        </li>
                    );
                })}
            </ol>
        </>
    );
}

function StepCircle({
    number,
    completed,
    active,
    desktop = false,
}: {
    number: 1 | 2 | 3;
    completed: boolean;
    active: boolean;
    desktop?: boolean;
}) {
    return (
        <span
            className={cn(
                'relative z-10 grid shrink-0 place-items-center rounded-full border text-sm font-black transition-[color,background-color,border-color,box-shadow] duration-300',
                desktop ? 'size-12 text-base' : 'size-10',
                completed &&
                    'text-primary border-primary/20 bg-primary/10 shadow-[0_3px_10px_rgba(109,60,220,.08)]',
                active &&
                    'border-primary bg-primary text-white shadow-[0_8px_22px_rgba(109,60,220,.22)]',
                !completed &&
                    !active &&
                    'border-slate-300 bg-white text-slate-600 shadow-[0_3px_10px_rgba(15,23,42,.07)]',
            )}
            aria-current={active ? 'step' : undefined}
        >
            {completed ? (
                <Check className="size-4.5" strokeWidth={3} />
            ) : (
                number
            )}
        </span>
    );
}
