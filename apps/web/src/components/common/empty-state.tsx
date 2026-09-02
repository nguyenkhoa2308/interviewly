import { Inbox } from "lucide-react";

interface EmptyStateProps {
    title?: string;
    description?: string;
}

export function EmptyState({
    title = "Chưa có dữ liệu",
    description = "Hiện chưa có nội dung nào để hiển thị.",
}: EmptyStateProps) {
    return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <Inbox className="text-muted-foreground size-5" />
            </div>

            <div className="space-y-1">
                <h3 className="font-medium">{title}</h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                    {description}
                </p>
            </div>
        </div>
    );
}