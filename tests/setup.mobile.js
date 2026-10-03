import "@testing-library/jest-dom";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// Every `waitFor` in this project inherits this ceiling, and one second is not
// enough once the coverage instrumentation has every core busy: renders cost
// several times what they do uninstrumented, and the tests that failed were not
// broken, they were waiting for a machine that was not there any more. These
// wait on a condition, not on a duration, so a longer ceiling costs nothing
// when things are healthy. `@testing-library/react` forwards this to
// `@testing-library/dom`'s own config, which is what `waitFor` reads.
configure({ asyncUtilTimeout: 10000 });

// Mock localStorage and sessionStorage for testing environment
const createStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
};

const mockLocalStorage = createStorageMock();
const mockSessionStorage = createStorageMock();

Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });
Object.defineProperty(window, "localStorage", { value: mockLocalStorage, writable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: mockSessionStorage, writable: true });
Object.defineProperty(window, "sessionStorage", { value: mockSessionStorage, writable: true });

// Extend Vitest expect assertions
expect.extend(matchers);

// The address bar is now application state: which playlist is open lives in
// `location.hash`. jsdom keeps one location for the whole file, so without
// this a test starts wherever the previous one navigated to.
beforeEach(() => {
  globalThis.history.replaceState(null, "", "#/");
});

// Clean up DOM after each test
afterEach(() => {
  cleanup();
});


// Mock inner dimensions for mobile
Object.defineProperty(window, "innerWidth", {
  writable: true,
  configurable: true,
  value: 375,
});
Object.defineProperty(window, "innerHeight", {
  writable: true,
  configurable: true,
  value: 667,
});

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock matchMedia based on 375px width and touch capabilities
window.matchMedia = vi.fn().mockImplementation((query) => {
  let matches = false;

  if (query.includes("pointer: coarse") || query.includes("hover: none")) {
    matches = true;
  } else {
    const minWidthMatch = query.match(/\(min-width:\s*([0-9.]+)(px|em|rem)\)/);
    const maxWidthMatch = query.match(/\(max-width:\s*([0-9.]+)(px|em|rem)\)/);
    
    let meetsMin = true;
    let meetsMax = true;
    
    if (minWidthMatch) {
      const val = parseFloat(minWidthMatch[1]);
      meetsMin = 375 >= val;
    }
    if (maxWidthMatch) {
      const val = parseFloat(maxWidthMatch[1]);
      meetsMax = 375 <= val;
    }
    matches = meetsMin && meetsMax;
  }

  return {
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
});


