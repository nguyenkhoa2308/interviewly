import { Check } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function Field({
    label,
    hint,
    error,
    children,
    className,
}: {
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className="space-y-2">
            <Label className={className}>{label}</Label>
            {children}
            {hint && !error && (
                <p className="text-muted-foreground text-xs">{hint}</p>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
    );
}

export function OptionGroup({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <fieldset className="space-y-3">
            <legend className="text-sm font-bold">{label}</legend>
            {children}
            {error && <p className="text-destructive text-sm">{error}</p>}
        </fieldset>
    );
}

export function ChoiceButton({
    selected,
    onClick,
    children,
}: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'border-border bg-background hover:border-primary/50 relative min-h-14 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                selected &&
                    'border-primary bg-primary/5 text-secondary-foreground ring-primary/15 ring-2',
            )}
        >
            {children}
            {selected && (
                <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-5 items-center justify-center rounded-full">
                    <Check className="size-3" />
                </span>
            )}
        </button>
    );
}

export function ReviewSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="border-border border-b pb-5 last:border-0">
            <h2 className="mb-3 font-extrabold">{title}</h2>
            <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
        </section>
    );
}

export function ReviewItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-muted-foreground text-xs font-bold">{label}</dt>
            <dd className="mt-1 text-sm font-semibold break-words">{value}</dd>
        </div>
    );
}
