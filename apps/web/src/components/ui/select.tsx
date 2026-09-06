'use client';

import * as React from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger
            data-slot="select-trigger"
            className={cn(
                'border-input bg-background text-foreground data-[placeholder]:text-muted-foreground flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-sm font-medium shadow-xs transition-[border-color,box-shadow,background-color] outline-none',
                'focus:border-primary focus:ring-primary/15 hover:bg-slate-50 focus:ring-3',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                '[&_svg]:pointer-events-none [&_svg]:shrink-0',
                className,
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <ChevronDown className="size-4 text-slate-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    );
}

function SelectContent({
    className,
    children,
    position = 'popper',
    sideOffset = 6,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                data-slot="select-content"
                position={position}
                sideOffset={sideOffset}
                className={cn(
                    'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-[0_16px_45px_rgba(31,24,56,0.14)]',
                    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                    position === 'popper' &&
                        'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
                    className,
                )}
                {...props}
            >
                <SelectScrollUpButton />
                <SelectPrimitive.Viewport className="p-1.5">
                    {children}
                </SelectPrimitive.Viewport>
                <SelectScrollDownButton />
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    );
}

function SelectLabel({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
    return (
        <SelectPrimitive.Label
            className={cn(
                'px-2 py-1.5 text-xs font-semibold text-slate-500',
                className,
            )}
            {...props}
        />
    );
}

function SelectItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            data-slot="select-item"
            className={cn(
                'focus:text-primary relative flex cursor-pointer items-center rounded-lg py-2.5 pr-9 pl-3 text-sm outline-none select-none focus:bg-violet-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                className,
            )}
            {...props}
        >
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
            <span className="absolute right-3 flex size-4 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <Check className="text-primary size-4 stroke-[3]" />
                </SelectPrimitive.ItemIndicator>
            </span>
        </SelectPrimitive.Item>
    );
}

function SelectSeparator({
    className,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
    return (
        <SelectPrimitive.Separator
            className={cn('my-1 h-px bg-slate-100', className)}
            {...props}
        />
    );
}

function SelectScrollUpButton(
    props: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>,
) {
    return (
        <SelectPrimitive.ScrollUpButton
            className="flex h-7 items-center justify-center bg-white"
            {...props}
        >
            <ChevronUp className="size-4" />
        </SelectPrimitive.ScrollUpButton>
    );
}

function SelectScrollDownButton(
    props: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>,
) {
    return (
        <SelectPrimitive.ScrollDownButton
            className="flex h-7 items-center justify-center bg-white"
            {...props}
        >
            <ChevronDown className="size-4" />
        </SelectPrimitive.ScrollDownButton>
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
};
