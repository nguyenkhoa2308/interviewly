import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
}

export function ErrorState({
    title = "Đã xảy ra lỗi",
    description = "Không thể tải dữ liệu. Vui lòng thử lại.",
    onRetry,
}: ErrorStateProps) {
    return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <div className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
                <AlertCircle className="text-destructive size-5" />
            </div>

            <div className="space-y-1">
                <h3 className="font-medium">{title}</h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                    {description}
                </p>
            </div>

            {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                    Thử lại
                </Button>
            )}
        </div>
    );
}