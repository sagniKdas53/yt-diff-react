import "@testing-library/jest-dom";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

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

// Clean up DOM after each test
afterEach(() => {
  cleanup();
});


// Mock inner dimensions for desktop
Object.defineProperty(window, "innerWidth", {
  writable: true,
  configurable: true,
  value: 1280,
});
Object.defineProperty(window, "innerHeight", {
  writable: true,
  configurable: true,
  value: 720,
});

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock matchMedia based on 1280px width
window.matchMedia = vi.fn().mockImplementation((query) => {
  let matches = false;

  if (query.includes("pointer: coarse") || query.includes("hover: none")) {
    matches = false;
  } else {
    const minWidthMatch = query.match(/\(min-width:\s*([0-9.]+)(px|em|rem)\)/);
    const maxWidthMatch = query.match(/\(max-width:\s*([0-9.]+)(px|em|rem)\)/);
    
    let meetsMin = true;
    let meetsMax = true;
    
    if (minWidthMatch) {
      const val = parseFloat(minWidthMatch[1]);
      meetsMin = 1280 >= val;
    }
    if (maxWidthMatch) {
      const val = parseFloat(maxWidthMatch[1]);
      meetsMax = 1280 <= val;
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
