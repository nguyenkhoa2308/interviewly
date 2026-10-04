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
};
