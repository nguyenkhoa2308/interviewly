export const jobDescriptionKeys = {
    all: ['job-descriptions'] as const,
    lists: () => [...jobDescriptionKeys.all, 'list'] as const,
    list: (
        params: {
            search?: string;
            page?: number;
            limit?: number;
            status?: string;
            sort?: string;
        } = {},
    ) =>
        [
            ...jobDescriptionKeys.lists(),
            {
                search: params.search ?? '',
                page: params.page ?? 1,
                limit: params.limit ?? 20,
                status: params.status ?? 'ALL',
                sort: params.sort ?? 'RECENTLY_UPDATED',
            },
        ] as const,
    details: () => [...jobDescriptionKeys.all, 'detail'] as const,
    detail: (id: string) => [...jobDescriptionKeys.details(), id] as const,
    analyses: (id: string) =>
        [...jobDescriptionKeys.detail(id), 'analyses'] as const,
    latest: (id: string) =>
        [...jobDescriptionKeys.analyses(id), 'latest'] as const,
    histories: (id: string) =>
        [...jobDescriptionKeys.analyses(id), 'history'] as const,
    history: (
        id: string,
        params: { page?: number; limit?: number } = {},
    ) =>
        [
            ...jobDescriptionKeys.histories(id),
            { page: params.page ?? 1, limit: params.limit ?? 20 },
        ] as const,
};
