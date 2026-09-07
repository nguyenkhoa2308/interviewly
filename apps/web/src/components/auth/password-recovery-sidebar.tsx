import { Check, Mail, ShieldCheck } from 'lucide-react';

import { Logo } from '@/components/common/logo';
import { cn } from '@/lib/utils';

type RecoveryStage =
    'request' | 'email-sent' | 'reset' | 'expired' | 'unavailable' | 'done';

const steps = [
    {
        title: 'Gửi yêu cầu',
        description:
            'Chúng tôi đã gửi liên kết đặt lại mật khẩu đến email của bạn.',
    },
    {
        title: 'Đặt lại mật khẩu',
        description: 'Thiết lập mật khẩu mới cho tài khoản.',
    },
    {
        title: 'Hoàn tất',
        description: 'Bạn có thể đăng nhập bằng mật khẩu mới.',
    },
];

const stageStep: Record<RecoveryStage, number> = {
    request: 1,
    'email-sent': 1,
    reset: 2,
    expired: 2,
    unavailable: 2,
    done: 3,
};

export function PasswordRecoverySidebar({ stage }: { stage: RecoveryStage }) {
    const currentStep = stageStep[stage];

    return (
        <aside className="relative hidden h-full overflow-hidden border-r border-violet-100/80 bg-violet-50/55 lg:flex lg:flex-col">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(124,58,237,0.09),transparent_28%),radial-gradient(circle_at_70%_90%,rgba(99,102,241,0.08),transparent_30%)]" />
            <div className="relative flex h-full flex-col px-10 py-9 xl:px-12 xl:py-11">
                <Logo variant="default" className="w-50" />

                <div className="mt-16">
                    <h1 className="text-2xl font-extrabold tracking-tight">
                        {stage === 'reset'
                            ? 'Tạo mật khẩu mới'
                            : stage === 'done'
                              ? 'Khôi phục hoàn tất'
                              : 'Đặt lại mật khẩu'}
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-[28ch] text-sm leading-7 font-semibold">
                        {stage === 'reset'
                            ? 'Thiết lập mật khẩu mới an toàn cho tài khoản Interviewly của bạn.'
                            : stage === 'done'
                              ? 'Mật khẩu mới đã sẵn sàng cho tài khoản Interviewly của bạn.'
                              : 'Làm theo các bước để khôi phục tài khoản Interviewly một cách an toàn.'}
                    </p>
                </div>

                <ol className="mt-12">
                    {steps.map((step, index) => {
                        const number = index + 1;
                        const completed =
                            number < currentStep ||
                            (stage === 'email-sent' && number === 1);
                        const active = number === currentStep;

                        return (
                            <li
                                key={step.title}
                                className="relative flex min-h-32 gap-5 last:min-h-0"
                            >
                                {number < steps.length && (
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute top-9 left-[17px] h-[calc(100%-1rem)] w-[2px]',
                                            completed
                                                ? 'bg-primary/50'
                                                : 'bg-violet-200',
                                        )}
                                    />
                                )}
                                <span
                                    className={cn(
                                        'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border bg-white text-sm font-extrabold',
                                        completed || active
                                            ? 'border-primary bg-primary text-white shadow-[0_8px_22px_rgba(109,40,217,0.22)]'
                                            : 'border-slate-200 bg-white text-slate-700',
                                    )}
                                >
                                    {completed ? (
                                        <Check className="size-5 stroke-3" />
                                    ) : (
                                        number
                                    )}
                                </span>
                                <div className="pt-1.5">
                                    <h2
                                        className={cn(
                                            'font-bold',
                                            active
                                                ? 'text-primary'
                                                : 'text-foreground',
                                        )}
                                    >
                                        {step.title}
                                    </h2>
                                    <p className="text-muted-foreground mt-2 max-w-[22ch] text-sm leading-6 font-semibold">
                                        {step.description}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <div className="relative mt-auto rounded-2xl border border-violet-200/80 bg-white/55 p-5 shadow-[0_12px_30px_rgba(91,33,182,0.06)]">
                    <div className="flex gap-3">
                        <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                            {stage === 'email-sent' ? (
                                <Mail className="h-5 w-5" />
                            ) : (
                                <ShieldCheck className="h-5 w-5" />
                            )}
                        </span>
                        <div>
                            <p className="font-bold">
                                {stage === 'email-sent'
                                    ? 'Vẫn chưa thấy email?'
                                    : stage === 'reset'
                                      ? 'Mẹo tạo mật khẩu an toàn'
                                      : stage === 'done'
                                        ? 'Bạn không thực hiện yêu cầu này?'
                                        : stage === 'expired' ||
                                            stage === 'unavailable'
                                          ? 'Bạn cần một liên kết mới?'
                                          : 'Tài khoản của bạn được bảo vệ'}
                            </p>
                            {stage === 'reset' ? (
                                <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4 text-sm leading-5 font-medium">
                                    <li>Dùng ít nhất 8 ký tự</li>
                                    <li>Kết hợp chữ hoa và chữ thường</li>
                                    <li>Thêm ít nhất một chữ số</li>
                                    <li>Thêm ít nhất một ký tự đặc biệt</li>
                                </ul>
                            ) : (
                                <>
                                    <p className="text-muted-foreground mt-1 text-sm leading-6 font-medium">
                                        {stage === 'email-sent'
                                            ? 'Email có thể mất vài phút để được gửi đến. Đừng quên kiểm tra cả mục Spam hoặc Thư rác nhé.'
                                            : stage === 'done'
                                              ? 'Nếu đây không phải bạn, hãy bảo vệ tài khoản và liên hệ với chúng tôi.'
                                              : stage === 'expired' ||
                                                  stage === 'unavailable'
                                                ? 'Liên kết không còn khả dụng để bảo vệ tài khoản. Bạn có thể yêu cầu một liên kết mới bất cứ lúc nào.'
                                                : 'Liên kết chỉ dùng một lần và hết hạn sau 30 phút.'}
                                    </p>
                                    {(stage === 'done' ||
                                        stage === 'expired' ||
                                        stage === 'unavailable') && (
                                        <a
                                            href={
                                                stage === 'done'
                                                    ? 'mailto:interviewly.support@gmail.com'
                                                    : '/forgot-password'
                                            }
                                            className="text-primary mt-3 inline-flex font-bold transition-opacity hover:opacity-75"
                                        >
                                            {stage === 'done'
                                                ? 'Liên hệ hỗ trợ'
                                                : 'Yêu cầu liên kết mới'}
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export type { RecoveryStage };
