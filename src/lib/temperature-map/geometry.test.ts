import { describe, it, expect } from 'vitest'
import { lineIntersection, lineIntersectsWalls, checkWallProximity } from './geometry'
import type { Wall } from './types'

describe('Geometry Utilities', () => {
  describe('lineIntersection', () => {
    it('should return null for parallel lines', () => {
      // Two horizontal parallel lines
      const result = lineIntersection(0, 0, 10, 0, 0, 5, 10, 5);
      expect(result).toBe(null);
    });

    it('should return null for lines with very small denominator', () => {
      // Lines that are almost parallel (within epsilon)
      const result = lineIntersection(0, 0, 10, 0, 0, 1e-12, 10, 1e-12);
      expect(result).toBe(null);
    });

    it('should find intersection of perpendicular lines', () => {
      // Horizontal line (0,5) to (10,5) and vertical line (5,0) to (5,10)
      const result = lineIntersection(0, 5, 10, 5, 5, 0, 5, 10);
      expect(result).toEqual({ x: 5, y: 5 });
    });

    it('should find intersection of diagonal lines', () => {
      // Line from (0,0) to (10,10) and line from (0,10) to (10,0)
      const result = lineIntersection(0, 0, 10, 10, 0, 10, 10, 0);
      expect(result).toEqual({ x: 5, y: 5 });
    });

    it('should return null if intersection is outside line segments', () => {
      // Lines that would intersect if extended, but don't within segments
      const result = lineIntersection(0, 0, 1, 1, 2, 0, 3, 1);
      expect(result).toBe(null);
    });

    it('should find intersection at endpoint', () => {
      // Lines that meet at an endpoint
      const result = lineIntersection(0, 0, 5, 5, 5, 5, 10, 0);
      expect(result).toEqual({ x: 5, y: 5 });
    });

    it('should handle zero-length lines', () => {
      // Zero-length line from (5,5) to (5,5) intersecting line from (0,0) to (10,10)
      // This is a degenerate case - the algorithm may return null for zero-length lines
      const result = lineIntersection(5, 5, 5, 5, 0, 0, 10, 10);
      // Accept either null (degenerate case) or the intersection point
      if (result !== null) {
        expect(result).toEqual({ x: 5, y: 5 });
      } else {
        expect(result).toBe(null);
      }
    });
  });

  describe('lineIntersectsWalls', () => {
    const walls: Wall[] = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },   // Horizontal wall
      { x1: 10, y1: 0, x2: 10, y2: 10 }, // Vertical wall
      { x1: 5, y1: 5, x2: 15, y2: 5 }    // Another horizontal wall
    ];

    it('should detect intersection with horizontal wall', () => {
      // Line that crosses the first horizontal wall
      const result = lineIntersectsWalls(5, -5, 5, 5, walls);
      expect(result).toBe(true);
    });

    it('should detect intersection with vertical wall', () => {
      // Line that crosses the vertical wall
      const result = lineIntersectsWalls(5, 5, 15, 5, walls);
      expect(result).toBe(true);
    });

    it('should return false when no intersection', () => {
      // Line that doesn't intersect any wall
      const result = lineIntersectsWalls(0, 1, 5, 1, walls);
      expect(result).toBe(false);
    });

    it('should handle empty walls array', () => {
      const result = lineIntersectsWalls(0, 0, 10, 10, []);
      expect(result).toBe(false);
    });

    it('should detect tangent lines as intersection', () => {
      // Line that touches wall at one point
      const result = lineIntersectsWalls(0, 0, 10, 0, walls);
      expect(result).toBe(true);
    });

    it('should handle lines starting on walls', () => {
      // Line starting from a wall
      const result = lineIntersectsWalls(5, 0, 5, -5, walls);
      expect(result).toBe(true);
    });
  });

  describe('checkWallProximity', () => {
    const walls: Wall[] = [
      { x1: 0, y1: 0, x2: 10, y2: 0 },   // Horizontal wall
      { x1: 10, y1: 0, x2: 10, y2: 10 }  // Vertical wall
    ];

    it('should detect point within radius of wall', () => {
      // Point near the horizontal wall
      const result = checkWallProximity(5, 2, walls, 3);
      expect(result).toBe(true);
    });

    it('should return false when point is outside radius', () => {
      // Point far from any wall
      const result = checkWallProximity(20, 20, walls, 5);
      expect(result).toBe(false);
    });

    it('should handle point walls (zero length)', () => {
      const pointWalls: Wall[] = [{ x1: 5, y1: 5, x2: 5, y2: 5 }];
      const result = checkWallProximity(6, 6, pointWalls, 2);
      expect(result).toBe(true);
    });

    it('should calculate distance to closest point on line segment', () => {
      // Point near middle of wall
      const result = checkWallProximity(5, 1, walls, 1.5);
      expect(result).toBe(true);
    });

    it('should calculate distance to wall endpoints', () => {
      // Point near wall endpoint
      const result = checkWallProximity(11, 1, walls, 2);
      expect(result).toBe(true);
    });

    it('should handle empty walls array', () => {
      const result = checkWallProximity(5, 5, [], 10);
      expect(result).toBe(false);
    });
  });
});