'use client';

import { useState, useMemo } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const REQUIREMENTS = [
    { regex: /.{8,}/, text: 'Ít nhất 8 ký tự' },
    { regex: /[0-9]/, text: 'Ít nhất 1 chữ số' },
    { regex: /[a-z]/, text: 'Ít nhất 1 chữ thường' },
    { regex: /[A-Z]/, text: 'Ít nhất 1 chữ hoa' },
];

interface PasswordInputProps
    extends Omit<React.ComponentProps<typeof Input>, 'type'> {
    showStrength?: boolean;
}

function PasswordInput({
    className,
    showStrength = false,
    onChange,
    value,
    ...props
}: PasswordInputProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [password, setPassword] = useState((value as string) ?? '');

    const strength = useMemo(
        () =>
            REQUIREMENTS.map((req) => ({
                met: req.regex.test(password),
                text: req.text,
            })),
        [password],
    );

    const strengthScore = strength.filter((s) => s.met).length;

    const strengthColor =
        strengthScore === 0
            ? 'bg-border'
            : strengthScore <= 1
              ? 'bg-red-500'
              : strengthScore <= 2
                ? 'bg-orange-500'
                : strengthScore === 3
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

    const strengthText =
        strengthScore === 0
            ? 'Nhập mật khẩu'
            : strengthScore <= 2
              ? 'Mật khẩu yếu'
              : strengthScore === 3
                ? 'Mật khẩu trung bình'
                : 'Mật khẩu mạnh';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        onChange?.(e);
    };

    return (
        <div>
            {/* Input mật khẩu */}
            <div className="relative">
                <Input
                    type={isVisible ? 'text' : 'password'}
                    className={cn('pr-9', className)}
                    value={value ?? password}
                    onChange={handleChange}
                    aria-invalid={showStrength && strengthScore < 4}
                    aria-describedby={
                        showStrength ? 'password-strength' : undefined
                    }
                    {...props}
                />
                <button
                    type="button"
                    onClick={() => setIsVisible((prev) => !prev)}
                    aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    aria-pressed={isVisible}
                    className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center transition-colors outline-none"
                >
                    {isVisible ? (
                        <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                        <Eye className="h-4 w-4" aria-hidden />
                    )}
                </button>
            </div>

            {/* Thanh chỉ thị độ mạnh mật khẩu */}
            {showStrength && (
                <>
                    <div
                        role="progressbar"
                        aria-valuenow={strengthScore}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-label="Độ mạnh mật khẩu"
                        className="bg-border mt-3 mb-4 h-1 w-full overflow-hidden rounded-full"
                    >
                        <div
                            className={cn(
                                'h-full transition-all duration-500 ease-out',
                                strengthColor,
                            )}
                            style={{ width: `${(strengthScore / 4) * 100}%` }}
                        />
                    </div>

                    <p
                        id="password-strength"
                        className="mb-2 text-sm font-medium"
                    >
                        {strengthText}. Phải bao gồm:
                    </p>

                    <ul
                        className="space-y-1.5"
                        aria-label="Yêu cầu mật khẩu"
                    >
                        {strength.map((req, i) => (
                            <li key={i} className="flex items-center gap-2">
                                {req.met ? (
                                    <Check
                                        className="text-emerald-500 h-4 w-4 shrink-0"
                                        aria-hidden
                                    />
                                ) : (
                                    <X
                                        className="text-muted-foreground/80 h-4 w-4 shrink-0"
                                        aria-hidden
                                    />
                                )}
                                <span
                                    className={cn(
                                        'text-xs',
                                        req.met
                                            ? 'text-emerald-500'
                                            : 'text-muted-foreground/80',
                                    )}
                                >
                                    {req.text}
                                </span>
                                <span className="sr-only">
                                    {req.met
                                        ? '- Đã đáp ứng'
                                        : '- Chưa đáp ứng'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

export { PasswordInput };
