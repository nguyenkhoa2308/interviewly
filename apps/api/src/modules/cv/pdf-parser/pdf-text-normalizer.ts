const EXCESSIVE_BLANK_LINES = /\n[\t ]*\n(?:[\t ]*\n)+/g;

function removeDisallowedControlCharacters(text: string): string {
    return Array.from(text)
        .filter((character) => {
            const code = character.charCodeAt(0);
            return (
                code === 9 ||
                code === 10 ||
                code === 13 ||
                (code >= 32 && code !== 127)
            );
        })
        .join('');
}

export function normalizePdfText(text: string): string {
    return removeDisallowedControlCharacters(text)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[\t ]+/g, ' ').trim())
        .join('\n')
        .replace(EXCESSIVE_BLANK_LINES, '\n\n')
        .trim();
}
