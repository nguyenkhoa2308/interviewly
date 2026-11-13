import { Label } from '@/components/ui/label';

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
