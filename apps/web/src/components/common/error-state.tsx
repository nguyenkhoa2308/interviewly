import { DataState } from '@/components/common/data-state';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
}

export function ErrorState({
    title = 'Đã xảy ra lỗi',
    description = 'Không thể tải dữ liệu. Vui lòng thử lại.',
    onRetry,
}: ErrorStateProps) {
    return (
        <DataState
            variant="error"
            size="compact"
            title={title}
            description={description}
            action={
                onRetry ? (
                    <Button variant="outline" onClick={onRetry}>
                        Thử lại
                    </Button>
                ) : undefined
            }
        />
    );
}
