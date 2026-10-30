'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import CharacterCount from '@tiptap/extension-character-count';
import { Extension, type JSONContent } from '@tiptap/core';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
    ArrowRight,
    Bold,
    Code2,
    Italic,
    List,
    LoaderCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_ANSWER_LENGTH = 10_000;

const AnswerKeyboardShortcuts = Extension.create({
    name: 'answerKeyboardShortcuts',
    priority: 1_000,

    addKeyboardShortcuts() {
        return {
            Tab: () => {
                if (this.editor.isActive('listItem')) {
                    this.editor.commands.sinkListItem('listItem');
                    return true;
                }

                return this.editor.commands.insertContent('\t');
            },
            'Shift-Tab': () => {
                if (!this.editor.isActive('listItem')) return false;

                this.editor.commands.liftListItem('listItem');
                return true;
            },
        };
    },
});

const extensions = [
    StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
    }),
    AnswerKeyboardShortcuts,
    CharacterCount.configure({ limit: MAX_ANSWER_LENGTH }),
];

function getPlainText(editor: NonNullable<ReturnType<typeof useEditor>>) {
    return editor.getText({
        blockSeparator: '\n',
        textSerializers: { hardBreak: () => '\n' },
    });
}

function plainTextToDocument(value: string): JSONContent {
    return {
        type: 'doc',
        content: value.split('\n').map((line) => ({
            type: 'paragraph',
            content: line ? [{ type: 'text', text: line }] : [],
        })),
    };
}

type InterviewAnswerEditorProps = {
    value: string;
    error: string | null;
    pending: boolean;
    syncExternalValue?: boolean;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
};

export function InterviewAnswerEditor({
    value,
    error,
    pending,
    syncExternalValue = false,
    onChange,
    onSubmit,
}: InterviewAnswerEditorProps) {
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    const editor = useEditor({
        extensions,
        content: '',
        editable: !pending,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                role: 'textbox',
                'aria-label': 'Câu trả lời của bạn',
                'aria-multiline': 'true',
                class: 'interview-answer-editor min-h-56 p-4 text-base leading-7 focus:outline-none',
            },
        },
        onUpdate: ({ editor: currentEditor }) => {
            onChangeRef.current(
                getPlainText(currentEditor).slice(0, MAX_ANSWER_LENGTH),
            );
        },
    });

    useEffect(() => {
        editor?.setEditable(!pending);
    }, [editor, pending]);

    useEffect(() => {
        if (!editor || !syncExternalValue || getPlainText(editor) === value)
            return;

        editor.commands.setContent(plainTextToDocument(value), {
            emitUpdate: false,
        });
        editor.commands.focus('end');
    }, [editor, syncExternalValue, value]);

    const editorState = useEditorState({
        editor,
        selector: ({ editor: currentEditor }) => ({
            isEmpty: currentEditor?.isEmpty ?? true,
            isBold: currentEditor?.isActive('bold') ?? false,
            isItalic: currentEditor?.isActive('italic') ?? false,
            isCode: currentEditor?.isActive('code') ?? false,
            isBulletList: currentEditor?.isActive('bulletList') ?? false,
        }),
    });

    return (
        <div>
            <div
                className={cn(
                    'border-input bg-background overflow-hidden rounded-xl border transition-[border-color,box-shadow]',
                    'focus-within:border-primary focus-within:ring-ring/20 focus-within:ring-3',
                    error && 'border-destructive',
                )}
            >
                <div className="relative max-h-[32rem] min-h-56 overflow-y-auto">
                    {editorState?.isEmpty && (
                        <span className="text-muted-foreground/70 pointer-events-none absolute top-4 left-4">
                            Nhập câu trả lời của bạn...
                        </span>
                    )}
                    <EditorContent
                        editor={editor}
                        aria-invalid={Boolean(error)}
                        aria-describedby={
                            error
                                ? 'interview-answer-error'
                                : 'interview-answer-help'
                        }
                        aria-disabled={pending}
                    />
                </div>

                <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5">
                    <div
                        className="flex items-center gap-1"
                        role="toolbar"
                        aria-label="Định dạng câu trả lời"
                    >
                        <EditorToolButton
                            label="In đậm"
                            shortcut="Ctrl+B"
                            active={editorState?.isBold}
                            disabled={pending || !editor}
                            onClick={() =>
                                editor?.chain().focus().toggleBold().run()
                            }
                        >
                            <Bold className="size-4" strokeWidth={2.2} />
                        </EditorToolButton>
                        <EditorToolButton
                            label="In nghiêng"
                            shortcut="Ctrl+I"
                            active={editorState?.isItalic}
                            disabled={pending || !editor}
                            onClick={() =>
                                editor?.chain().focus().toggleItalic().run()
                            }
                        >
                            <Italic className="size-4" strokeWidth={2.2} />
                        </EditorToolButton>
                        <EditorToolButton
                            label="Mã nội tuyến"
                            shortcut="Ctrl+E"
                            active={editorState?.isCode}
                            disabled={pending || !editor}
                            onClick={() =>
                                editor?.chain().focus().toggleCode().run()
                            }
                        >
                            <Code2 className="size-4" strokeWidth={2.2} />
                        </EditorToolButton>
                        <EditorToolButton
                            label="Danh sách gạch đầu dòng"
                            shortcut="Ctrl+Shift+8"
                            active={editorState?.isBulletList}
                            disabled={pending || !editor}
                            onClick={() =>
                                editor?.chain().focus().toggleBulletList().run()
                            }
                        >
                            <List className="size-4" strokeWidth={2.2} />
                        </EditorToolButton>
                    </div>

                    <div className="text-muted-foreground flex items-center gap-4 text-xs font-semibold">
                        <span className="hidden sm:inline">
                            Enter tạo đoạn mới · Shift + Enter ngắt dòng · Tab
                            để thụt lề
                        </span>
                        <span className="shrink-0 tabular-nums">
                            {value.length.toLocaleString('vi-VN')} /{' '}
                            {MAX_ANSWER_LENGTH.toLocaleString('vi-VN')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-2 min-h-5 text-xs font-semibold">
                {error ? (
                    <p
                        id="interview-answer-error"
                        className="text-destructive"
                        role="alert"
                    >
                        {error}
                    </p>
                ) : (
                    <p
                        id="interview-answer-help"
                        className="text-muted-foreground sm:hidden"
                    >
                        Enter tạo đoạn mới · Shift + Enter ngắt dòng · Tab để
                        thụt lề.
                    </p>
                )}
            </div>

            <div className="mt-4 flex justify-end">
                <Button
                    type="button"
                    className="min-w-32 rounded-lg px-6 py-5 font-bold"
                    disabled={!value.trim() || pending}
                    onClick={() => onSubmit(editor ? getPlainText(editor) : '')}
                >
                    {pending ? (
                        <>
                            <LoaderCircle className="size-4 animate-spin" />
                            Đang gửi...
                        </>
                    ) : (
                        <>
                            Trả lời
                            <ArrowRight className="size-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

function EditorToolButton({
    label,
    shortcut,
    active = false,
    disabled,
    onClick,
    children,
}: {
    label: string;
    shortcut: string;
    active?: boolean;
    disabled: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            title={`${label} (${shortcut})`}
            className={cn(
                'text-muted-foreground hover:bg-secondary hover:text-primary focus-visible:ring-ring/30 grid size-8 place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                active && 'bg-secondary text-primary',
            )}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
        >
            {children}
        </button>
    );
}
