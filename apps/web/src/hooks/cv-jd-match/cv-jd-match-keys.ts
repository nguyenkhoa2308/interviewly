export const cvJdMatchKeys = {
    all: ['cv-jd-matches'] as const,
    options: () => [...cvJdMatchKeys.all, 'options'] as const,
    lists: () => [...cvJdMatchKeys.all, 'list'] as const,
    list: (params: object = {}) => [...cvJdMatchKeys.lists(), params] as const,
    details: () => [...cvJdMatchKeys.all, 'detail'] as const,
    detail: (id: string) => [...cvJdMatchKeys.details(), id] as const,
};