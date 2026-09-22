export interface GenerateStructuredRequest {
    systemInstruction: string;
    prompt: string;
    responseJsonSchema: Record<string, unknown>;
}

export interface GenerateStructuredResult {
    data: unknown;
    modelName: string;
}

export interface AiProvider {
    readonly providerName: string;
    readonly modelName: string;

    generateStructured(
        request: GenerateStructuredRequest,
    ): Promise<GenerateStructuredResult>;
}
