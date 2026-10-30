export const interviewKeys = {
    all: ['interviews'] as const,
    list: (page: number, status?: string, search?: string, sort?: string) =>
        [
            ...interviewKeys.all,
            'list',
            page,
            status ?? 'ALL',
            search ?? '',
            sort ?? 'RECENTLY_UPDATED',
        ] as const,
    options: () => [...interviewKeys.all, 'options'] as const,
    detail: (id: string) => [...interviewKeys.all, 'detail', id] as const,
    runtime: (id: string) => [...interviewKeys.all, 'runtime', id] as const,
    history: (filters: unknown) =>
        [...interviewKeys.all, 'history', filters] as const,
    transcript: (id: string) =>
        [...interviewKeys.all, 'transcript', id] as const,
    progress: (filters: unknown) =>
        [...interviewKeys.all, 'progress', filters] as const,
    evaluation: (id: string) =>
        [...interviewKeys.all, 'evaluation', id] as const,
    questionReviews: (id: string) =>
        [...interviewKeys.all, 'question-reviews', id] as const,
};
