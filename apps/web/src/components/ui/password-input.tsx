'use client';

import { useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const REQUIREMENTS = [
    { regex: /.{8,}/, text: 'Ít nhất 8 ký tự' },
    { regex: /[0-9]/, text: 'Ít nhất 1 chữ số' },
    { regex: /[a-z]/, text: 'Ít nhất 1 chữ thường' },
    { regex: /[A-Z]/, text: 'Ít nhất 1 chữ hoa' },
    { regex: /[^A-Za-z0-9]/, text: 'Ít nhất 1 ký tự đặc biệt' },
];

interface PasswordInputProps extends Omit<
    React.ComponentProps<typeof Input>,
    'type'
> {
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

    const strengthLevel =
        strengthScore === 0
            ? 0
            : strengthScore <= 2
              ? 1
              : strengthScore === 3
                ? 2
                : strengthScore === 4
                  ? 3
                  : 4;

    const strengthColor =
        strengthLevel === 0
            ? 'bg-border'
            : strengthLevel === 1
              ? 'bg-red-500'
              : strengthLevel === 2
                ? 'bg-amber-500'
                : strengthLevel === 3
                  ? 'bg-primary'
                  : 'bg-emerald-500';

    const strengthText =
        strengthLevel === 0
            ? ''
            : strengthLevel === 1
              ? 'Yếu'
              : strengthLevel === 2
                ? 'Trung bình'
                : strengthLevel === 3
                  ? 'Mạnh'
                  : 'Rất mạnh';

    const strengthTextColor =
        strengthLevel <= 1
            ? 'text-red-500'
            : strengthLevel === 2
              ? 'text-amber-600'
              : strengthLevel === 3
                ? 'text-primary'
                : 'text-emerald-600';

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
                    aria-invalid={showStrength && strengthScore < 5}
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
                        <EyeOff className="mr-4 size-5" aria-hidden />
                    ) : (
                        <Eye className="mr-4 size-5" aria-hidden />
                    )}
                </button>
            </div>

            {/* Thanh chỉ thị độ mạnh mật khẩu */}
            {showStrength && (
                <div
                    id="password-strength"
                    className="mt-3 flex items-center gap-1"
                >
                    <span className="text-muted-foreground text-sm font-semibold">
                        Độ mạnh mật khẩu:
                    </span>
                    <span
                        className={cn(
                            'ml-2 min-w-20 text-sm font-bold',
                            strengthTextColor,
                        )}
                    >
                        {strengthText}
                    </span>
                    <div
                        role="progressbar"
                        aria-valuenow={strengthLevel}
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-valuetext={strengthText || 'Chưa đánh giá'}
                        aria-label="Độ mạnh mật khẩu"
                        className="grid flex-1 grid-cols-4 gap-1.5"
                    >
                        {Array.from({ length: 4 }, (_, index) => (
                            <span
                                key={index}
                                className={cn(
                                    'h-1.5 rounded-full bg-slate-200 transition-colors',
                                    index < strengthLevel && strengthColor,
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export { PasswordInput };
