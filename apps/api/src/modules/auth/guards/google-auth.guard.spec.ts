import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { GoogleAuthGuard } from './google-auth.guard';

type GuardInternals = {
    assertValidState(request: Request): void;
    stateCookieOptions(): {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'lax';
        path: string;
    };
};

describe('GoogleAuthGuard OAuth state', () => {
    const createGuard = (nodeEnv: string) =>
        new GoogleAuthGuard({
            get: () => nodeEnv,
        } as unknown as ConfigService) as unknown as GuardInternals;

    const requestWithState = (received?: string, expected?: string) =>
        ({
            query: received === undefined ? {} : { state: received },
            cookies:
                expected === undefined ? {} : { google_oauth_state: expected },
        }) as unknown as Request;

    it('accepts the callback only when query and HttpOnly cookie states match', () => {
        const guard = createGuard('development');
        expect(() =>
            guard.assertValidState(
                requestWithState('secure-state', 'secure-state'),
            ),
        ).not.toThrow();
    });

    it.each([
        [undefined, 'secure-state'],
        ['secure-state', undefined],
        ['attacker-state', 'secure-state'],
    ])(
        'rejects a missing or mismatched callback state',
        (received, expected) => {
            const guard = createGuard('development');
            expect(() =>
                guard.assertValidState(requestWithState(received, expected)),
            ).toThrow(UnauthorizedException);
        },
    );

    it('uses a production-secure, callback-scoped state cookie', () => {
        expect(createGuard('production').stateCookieOptions()).toEqual({
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/api/v1/auth/google/callback',
        });
    });
});
