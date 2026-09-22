import { z } from 'zod';

export const MAX_CV_FILE_SIZE = 5 * 1024 * 1024;
export const PDF_MIME_TYPE = 'application/pdf';

const cvName = z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên CV.')
    .max(150, 'Tên CV không được vượt quá 150 ký tự.');

export const uploadCvSchema = z.object({
    name: cvName,
    file: z
        .custom<File>(
            (value) => typeof File !== 'undefined' && value instanceof File,
            'Vui lòng chọn một tệp PDF.',
        )
        .refine((file) => file.type === PDF_MIME_TYPE, 'Chỉ chấp nhận tệp PDF.')
        .refine(
            (file) => file.size <= MAX_CV_FILE_SIZE,
            'Tệp PDF không được vượt quá 5 MB.',
        ),
});

export const renameCvSchema = z.object({
    name: cvName,
});

export type UploadCvFormValues = z.infer<typeof uploadCvSchema>;
export type RenameCvFormValues = z.infer<typeof renameCvSchema>;
