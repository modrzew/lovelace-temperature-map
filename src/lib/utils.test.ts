import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should combine class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
    })

    it('should handle conditional classes', () => {
      const condition1 = false;
      const condition2 = true;
      const result = cn('always', condition1 && 'never', condition2 && 'sometimes')
      expect(result).toContain('always')
      expect(result).toContain('sometimes')
      expect(result).not.toContain('never')
    })

    it('should handle undefined/null values', () => {
      const result = cn('class1', undefined, null, 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
    })
  })
})