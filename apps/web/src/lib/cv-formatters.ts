export function formatFileSize(bytes: number | null): string {
    if (bytes === null) return 'Không rõ dung lượng';
    if (bytes < 1024) return bytes + ' B';

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const precision = value >= 10 ? 0 : 1;
    return value.toFixed(precision).replace('.0', '') + ' ' + units[unitIndex];
}

export function formatCvDate(value: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

export function formatCvDateTime(value: string): string {
    const date = new Date(value);
    const time = new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);

    return `${formatCvDate(value)} · ${time}`;
}
