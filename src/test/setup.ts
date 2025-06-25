import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Home Assistant globals that might be expected in tests
Object.defineProperty(window, 'customElements', {
  value: {
    define: vi.fn(),
    get: vi.fn(),
  },
})

// Mock requestAnimationFrame for tests
Object.defineProperty(window, 'requestAnimationFrame', {
  value: (cb: FrameRequestCallback) => setTimeout(cb, 0),
})

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: (id: number) => clearTimeout(id),
})