import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SettingsSectionProps {
    title: string;
    description: string;
    icon: LucideIcon;
    children: ReactNode;
    headerAside?: ReactNode;
    tone?: 'default' | 'danger';
}

export function SettingsSection({
    title,
    description,
    icon: Icon,
    children,
    headerAside,
    tone = 'default',
}: SettingsSectionProps) {
    const danger = tone === 'danger';

    return (
        <section
            className={
                danger
                    ? 'overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_12px_32px_rgba(127,29,29,0.04)]'
                    : 'overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_12px_32px_rgba(45,31,89,0.045)]'
            }
        >
            <header
                className={
                    danger
                        ? 'flex gap-3 border-b border-red-100 bg-red-50/55 px-5 py-5 sm:px-6'
                        : 'flex gap-3 border-b border-violet-100 bg-violet-50/45 px-5 py-5 sm:px-6'
                }
            >
                <span
                    className={
                        danger
                            ? 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600'
                            : 'bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl'
                    }
                >
                    <Icon className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                    <h2
                        className={
                            danger
                                ? 'text-destructive text-lg font-extrabold'
                                : 'text-lg font-extrabold text-slate-950'
                        }
                    >
                        {title}
                    </h2>
                    <p
                        className={
                            danger
                                ? 'mt-0.5 text-sm font-medium text-red-700/75'
                                : 'mt-0.5 text-sm font-medium text-slate-500'
                        }
                    >
                        {description}
                    </p>
                </div>
                {headerAside && (
                    <div className="ml-auto shrink-0 self-center">
                        {headerAside}
                    </div>
                )}
            </header>
            <div
                className={
                    danger
                        ? 'divide-y divide-red-100'
                        : 'divide-y divide-slate-100'
                }
            >
                {children}
            </div>
        </section>
    );
}
