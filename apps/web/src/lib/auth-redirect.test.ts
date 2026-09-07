import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getAuthRouteDestination,
    getSafePostAuthRedirect,
} from './auth-redirect.ts';

test('accepts allowed internal app routes', () => {
    assert.equal(
        getSafePostAuthRedirect('/dashboard/interviews?page=2'),
        '/dashboard/interviews?page=2',
    );
    assert.equal(getSafePostAuthRedirect('/practice'), '/practice');
});

test('rejects external and protocol-relative redirects', () => {
    assert.equal(getSafePostAuthRedirect('https://evil.com'), null);
    assert.equal(getSafePostAuthRedirect('//evil.com'), null);
    assert.equal(getSafePostAuthRedirect('/\\evil.com'), null);
});

test('rejects public and auth routes as post-login destinations', () => {
    assert.equal(getSafePostAuthRedirect('/sign-in'), null);
    assert.equal(getSafePostAuthRedirect('/forgot-password'), null);
    assert.equal(getSafePostAuthRedirect('/onboarding'), null);
});

test('sends anonymous protected users to sign in with a return URL', () => {
    assert.equal(
        getAuthRouteDestination({
            pathname: '/practice/session',
            isProtected: true,
            isGuest: false,
            isOnboarding: false,
            isAuthenticated: false,
            isUnauthenticated: true,
            onboardingCompletedAt: undefined,
        }),
        '/sign-in?redirect=%2Fpractice%2Fsession',
    );
});

test('onboarding status has priority over protected and guest routes', () => {
    assert.equal(
        getAuthRouteDestination({
            pathname: '/dashboard',
            isProtected: true,
            isGuest: false,
            isOnboarding: false,
            isAuthenticated: true,
            isUnauthenticated: false,
            onboardingCompletedAt: null,
        }),
        '/onboarding',
    );
    assert.equal(
        getAuthRouteDestination({
            pathname: '/sign-in',
            isProtected: false,
            isGuest: true,
            isOnboarding: false,
            isAuthenticated: true,
            isUnauthenticated: false,
            onboardingCompletedAt: '2026-09-07T00:00:00.000Z',
        }),
        '/dashboard',
    );
});
