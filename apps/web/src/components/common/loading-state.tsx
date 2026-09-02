import { Loader2 } from "lucide-react";

interface LoadingStateProps {
    message?: string;
}

export function LoadingState({
    message = "Đang tải dữ liệu...",
}: LoadingStateProps) {
    return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">{message}</p>
        </div>
    );
}