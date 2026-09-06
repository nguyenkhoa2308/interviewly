import ms from 'ms';
import type { StringValue } from 'ms';

export function calculateTokenExpiration(expiresIn: string): Date {
    return new Date(Date.now() + ms(expiresIn as StringValue));
}
