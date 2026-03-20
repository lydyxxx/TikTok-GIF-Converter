import { vi } from 'vitest';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock IndexedDB for tests
const mockIndexedDB = {
  open: vi.fn(),
};

(global as any).indexedDB = mockIndexedDB;

// Mock fetch
global.fetch = vi.fn();
