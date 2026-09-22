import { z } from 'zod';

const nullableText = (max: number) =>
    z.string().trim().min(1).max(max).nullable();

export const CvStructureLineSchema = z
    .object({
        type: z.enum(['TEXT', 'BULLET', 'TECHNOLOGIES', 'LINKS']),
        content: z.string().trim().min(1).max(2_000),
    })
    .strict();

export const CvStructureItemSchema = z
    .object({
        title: nullableText(300),
        subtitle: nullableText(300),
        dateText: nullableText(150),
        lines: z.array(CvStructureLineSchema).max(100),
    })
    .strict();

export const CvStructureSectionSchema = z
    .object({
        title: z.string().trim().min(1).max(200),
        items: z.array(CvStructureItemSchema).max(100),
    })
    .strict();

export const CvStructuredContentSchema = z
    .object({
        header: z
            .object({
                name: nullableText(200),
                headline: nullableText(300),
                contacts: z.array(z.string().trim().min(1).max(500)).max(30),
            })
            .strict(),
        sections: z.array(CvStructureSectionSchema).max(50),
    })
    .strict();

export type CvStructuredContent = z.infer<typeof CvStructuredContentSchema>;

export const CV_STRUCTURE_RESPONSE_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(CvStructuredContentSchema) as Record<
        string,
        unknown
    >;
    delete schema.$schema;
    return schema;
})();
