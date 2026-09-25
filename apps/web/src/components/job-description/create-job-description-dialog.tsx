'use client';

import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateJobDescription } from '@/hooks/job-description';

interface CreateJobDescriptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateJobDescriptionDialog({
    open,
    onOpenChange,
}: CreateJobDescriptionDialogProps) {
    const router = useRouter();
    const mutation = useCreateJobDescription();
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [content, setContent] = useState('');

    const reset = () => {
        setTitle('');
        setCompany('');
        setContent('');
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (mutation.isPending) return;
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (title.trim().length < 2) {
            toast.error('Vị trí công việc phải có ít nhất 2 ký tự.');
            return;
        }
        if (content.trim().length < 50) {
            toast.error('Nội dung JD phải có ít nhất 50 ký tự.');
            return;
        }

        try {
            const result = await mutation.mutateAsync({
                title: title.trim(),
                company: company.trim() || null,
                content: content.trim(),
            });
            toast.success('Đã thêm mô tả công việc.');
            onOpenChange(false);
            reset();
            router.push(`/job-descriptions/${result.id}`);
        } catch (error) {
            toast.error('Không thể lưu JD', {
                description:
                    error instanceof Error
                        ? error.message
                        : 'Vui lòng thử lại.',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="max-w-3xl p-0"
                closeButtonDisabled={mutation.isPending}
            >
                <form onSubmit={submit}>
                    <DialogHeader className="border-b border-slate-200 px-6 py-5 pr-14 sm:px-7">
                        <DialogTitle className="text-xl">
                            Thêm mô tả công việc
                        </DialogTitle>
                        <DialogDescription>
                            Nhập thông tin cơ bản và dán nguyên nội dung tuyển
                            dụng.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 px-6 py-6 sm:grid-cols-2 sm:px-7">
                        <Field
                            label="Vị trí tuyển dụng"
                            htmlFor="create-jd-title"
                            required
                        >
                            <Input
                                id="create-jd-title"
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                maxLength={150}
                                placeholder="Ví dụ: Backend Developer"
                                autoFocus
                            />
                        </Field>
                        <Field label="Công ty" htmlFor="create-jd-company">
                            <Input
                                id="create-jd-company"
                                value={company}
                                onChange={(event) =>
                                    setCompany(event.target.value)
                                }
                                maxLength={150}
                                placeholder="Không bắt buộc"
                            />
                        </Field>

                        <div className="sm:col-span-2">
                            <div className="flex items-end justify-between gap-3">
                                <Label
                                    htmlFor="create-jd-content"
                                    className="font-bold"
                                >
                                    Nội dung JD{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <span className="text-xs font-medium text-slate-400">
                                    {content.length.toLocaleString('vi-VN')} /
                                    50.000
                                </span>
                            </div>
                            <textarea
                                id="create-jd-content"
                                value={content}
                                onChange={(event) =>
                                    setContent(event.target.value)
                                }
                                maxLength={50000}
                                rows={11}
                                placeholder="Dán toàn bộ mô tả công việc tại đây..."
                                className="focus-visible:border-primary focus-visible:ring-primary/15 mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 transition outline-none focus-visible:ring-3"
                            />
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                Nên giữ nguyên phần trách nhiệm, yêu cầu và tên
                                công nghệ trong JD.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-slate-200 px-6 py-4 sm:px-7">
                        <Button
                            type="button"
                            variant="outline"
                            className="!h-10 rounded-lg !px-6"
                            disabled={mutation.isPending}
                            onClick={() => handleOpenChange(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            className="!h-10 rounded-lg"
                            type="submit"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? (
                                'Đang lưu...'
                            ) : (
                                <>
                                    <Save className="size-4" />
                                    Lưu mô tả công việc
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Field({
    label,
    htmlFor,
    required,
    children,
}: {
    label: string;
    htmlFor: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <Label htmlFor={htmlFor} className="font-bold">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </Label>
            <div className="mt-2 [&_input]:rounded-lg [&_input]:border-slate-300 [&_input]:shadow-none">
                {children}
            </div>
        </div>
    );
}
