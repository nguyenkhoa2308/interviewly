import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
    }),
});

Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    value: class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    },
});

Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    value: class IntersectionObserver {
        readonly root = null;
        readonly rootMargin = '0px';
        readonly thresholds = [0];

        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
            return [];
        }
    },
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value() {},
});

Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: {
        configurable: true,
        value: () => false,
    },
    setPointerCapture: {
        configurable: true,
        value() {},
    },
    releasePointerCapture: {
        configurable: true,
        value() {},
    },
});
