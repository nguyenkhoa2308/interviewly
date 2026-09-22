'use client';

import { Eye, FilePenLine, MoreHorizontal, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CvListItem } from '@/types/cv';

export function CvActionsMenu({
    cv,
    actionPending,
    showView = true,
    labeledTrigger = false,
    onRename,
    onSetDefault,
    onDelete,
}: {
    cv: CvListItem;
    actionPending: boolean;
    showView?: boolean;
    labeledTrigger?: boolean;
    onRename: (cv: CvListItem) => void;
    onSetDefault: (cv: CvListItem) => void;
    onDelete: (cv: CvListItem) => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant={labeledTrigger ? 'outline' : 'ghost'}
                    size={labeledTrigger ? 'default' : 'icon'}
                    aria-label={'Mở thao tác cho ' + cv.name}
                    disabled={actionPending}
                    className="shrink-0"
                >
                    <MoreHorizontal className="size-5" />
                    {labeledTrigger && <span>Thao tác</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {showView && (
                    <DropdownMenuItem asChild>
                        <Link href={'/cv/' + cv.id}>
                            <Eye className="size-4" />
                            Xem thông tin
                        </Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => onRename(cv)}>
                    <FilePenLine className="size-4" />
                    Đổi tên
                </DropdownMenuItem>
                <DropdownMenuItem
                    disabled={cv.isDefault || cv.processingStatus !== 'READY'}
                    onSelect={() => onSetDefault(cv)}
                >
                    <Star className="size-4" />
                    {cv.isDefault
                        ? 'Đang là CV mặc định'
                        : cv.processingStatus !== 'READY'
                          ? 'CV chưa sẵn sàng'
                          : 'Đặt làm mặc định'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-600 focus:bg-red-50 focus:text-red-700"
                    onSelect={() => onDelete(cv)}
                >
                    <Trash2 className="size-4" />
                    Xóa CV
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
