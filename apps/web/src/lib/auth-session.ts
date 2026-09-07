export const AUTH_SESSION_EXPIRED_EVENT = 'interviewly:auth-session-expired';

let authenticatedSessionObserved = false;
let expirationEventDispatched = false;

export function markAuthenticatedSession(): void {
    authenticatedSessionObserved = true;
    expirationEventDispatched = false;
}

export function clearObservedSession(): void {
    authenticatedSessionObserved = false;
    expirationEventDispatched = false;
}

export function notifySessionExpired(): void {
    if (
        typeof window === 'undefined' ||
        !authenticatedSessionObserved ||
        expirationEventDispatched
    ) {
        return;
    }

    expirationEventDispatched = true;
    authenticatedSessionObserved = false;
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}
