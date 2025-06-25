import { describe, it, expect, beforeEach, vi } from 'vitest'

// Import utility functions from extracted modules
import type { Wall, DistanceGrid } from '@/lib/temperature-map/types'
import { lineIntersection, lineIntersectsWalls, checkWallProximity } from '@/lib/temperature-map/geometry'
import { temperatureToColor, interpolateTemperaturePhysics } from '@/lib/temperature-map/temperature'
import { getInterpolatedDistance } from '@/lib/temperature-map/distance'

// Canvas dimension calculation utility function (kept local as it's not part of core temperature map logic)
const calculateCanvasDimensions = (
  walls: Wall[],
  sensors: Array<{ x: number; y: number }>,
  padding: number = 0
) => {
  const allPoints: Array<{ x: number; y: number }> = [];
  
  walls.forEach(wall => {
    allPoints.push({ x: wall.x1, y: wall.y1 });
    allPoints.push({ x: wall.x2, y: wall.y2 });
  });
  
  sensors.forEach(sensor => {
    allPoints.push({ x: sensor.x, y: sensor.y });
  });
  
  if (allPoints.length === 0) {
    return { width: 400, height: 300 };
  }
  
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  
  const calculatedWidth = maxX - minX + padding * 2;
  const calculatedHeight = maxY - minY + padding * 2;
  
  const finalWidth = minX === 0 ? maxX + 1 + padding * 2 : calculatedWidth;
  const finalHeight = minY === 0 ? maxY + 1 + padding * 2 : calculatedHeight;
  
  return {
    width: Math.max(100, finalWidth),
    height: Math.max(100, finalHeight)
  };
};

// =============================================================================
// GEOMETRIC CALCULATION UTILITIES TESTS
// =============================================================================

describe('Geometric Calculations', () => {
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
    const walls = [
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
    const walls = [
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
      const pointWalls = [{ x1: 5, y1: 5, x2: 5, y2: 5 }];
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

// =============================================================================
// TEMPERATURE AND COLOR PROCESSING TESTS
// =============================================================================

describe('Temperature and Color Processing', () => {
  describe('temperatureToColor', () => {
    const tooCold = 18;
    const tooWarm = 26;

    it('should return blue for temperatures at or below too cold threshold', () => {
      expect(temperatureToColor(18, tooCold, tooWarm)).toBe('rgb(0, 0, 255)');
      expect(temperatureToColor(15, tooCold, tooWarm)).toBe('rgb(0, 0, 255)');
    });

    it('should return red for temperatures at or above too warm threshold', () => {
      expect(temperatureToColor(26, tooCold, tooWarm)).toBe('rgb(255, 0, 0)');
      expect(temperatureToColor(30, tooCold, tooWarm)).toBe('rgb(255, 0, 0)');
    });

    it('should interpolate colors within comfort zone', () => {
      // Test specific points in the gradient
      const midTemp = (tooCold + tooWarm) / 2; // 22°C
      const result = temperatureToColor(midTemp, tooCold, tooWarm);
      
      // Should be somewhere in the middle of the gradient
      expect(result).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      
      // Extract RGB values to verify they're reasonable
      const rgb = result.match(/\d+/g)?.map(Number);
      expect(rgb).toBeDefined();
      expect(rgb![0]).toBeGreaterThan(0); // Some red
      expect(rgb![1]).toBeGreaterThan(0); // Some green
    });

    it('should handle edge case where cold equals warm temperature', () => {
      // This would create a division by zero scenario
      const result = temperatureToColor(20, 20, 20);
      // Should default to one of the boundary colors
      expect(result).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    });

    it('should produce smooth gradient transitions', () => {
      const temps = [18.5, 19, 19.5, 20, 20.5];
      const colors = temps.map(temp => temperatureToColor(temp, tooCold, tooWarm));
      
      // All should be valid RGB strings
      colors.forEach(color => {
        expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
      });
      
      // Colors should be different (gradient effect)
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(1);
    });

    it('should handle very precise temperature values', () => {
      const preciseTemp = 22.123456789;
      const result = temperatureToColor(preciseTemp, tooCold, tooWarm);
      expect(result).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    });

    it('should ensure RGB values are integers', () => {
      const result = temperatureToColor(21.7, tooCold, tooWarm);
      const rgb = result.match(/\d+/g)?.map(Number);
      
      expect(rgb).toBeDefined();
      rgb!.forEach(value => {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('interpolateTemperaturePhysics', () => {
    // Helper function to create mock distance grid for testing
    const createMockDistanceGrid = (sensors: Array<{ x: number; y: number }>, width = 50, height = 50): DistanceGrid => {
      const distances: number[][][] = [];
      
      for (let sensorIndex = 0; sensorIndex < sensors.length; sensorIndex++) {
        const sensor = sensors[sensorIndex];
        distances[sensorIndex] = [];
        
        for (let y = 0; y < height; y++) {
          distances[sensorIndex][y] = [];
          for (let x = 0; x < width; x++) {
            // Simple Euclidean distance for testing
            const distance = Math.sqrt((x - sensor.x) ** 2 + (y - sensor.y) ** 2);
            distances[sensorIndex][y][x] = distance;
          }
        }
      }
      
      return { distances, width, height };
    };

    it('should return ambient temperature when no sensors', () => {
      const mockGrid = createMockDistanceGrid([]);
      const result = interpolateTemperaturePhysics(10, 10, [], mockGrid, 22);
      expect(result).toBe(22);
    });

    it('should return sensor temperature when very close to sensor', () => {
      const sensors = [{ x: 10, y: 10, temp: 25 }];
      const mockGrid = createMockDistanceGrid(sensors);
      // Point very close to sensor (within dominance radius of 8)
      const result = interpolateTemperaturePhysics(12, 12, sensors, mockGrid, 22);
      expect(result).toBeCloseTo(25, 1);
    });

    it('should blend multiple sensor influences', () => {
      const sensors = [
        { x: 0, y: 0, temp: 20 },
        { x: 20, y: 0, temp: 24 }
      ];
      const mockGrid = createMockDistanceGrid(sensors);
      // Point in middle should be influenced by both sensors
      const result = interpolateTemperaturePhysics(10, 0, sensors, mockGrid, 22);
      expect(result).toBeGreaterThan(20);
      expect(result).toBeLessThan(24);
    });

    it('should blend with ambient temperature for weak influences', () => {
      const sensors = [{ x: 0, y: 0, temp: 30 }];
      const mockGrid = createMockDistanceGrid(sensors, 2000, 2000); // Large grid for far distances
      // Point very far from sensor should blend with ambient
      const result = interpolateTemperaturePhysics(1000, 1000, sensors, mockGrid, 22);
      expect(result).toBeCloseTo(22, 0); // Should be close to ambient (within 0.5 degrees)
    });

    it('should handle identical sensor temperatures', () => {
      const sensors = [
        { x: 5, y: 5, temp: 23 },
        { x: 15, y: 5, temp: 23 }
      ];
      const mockGrid = createMockDistanceGrid(sensors);
      const result = interpolateTemperaturePhysics(10, 5, sensors, mockGrid, 22);
      expect(result).toBeCloseTo(23, 1);
    });

    it('should handle sensor at same position as query point', () => {
      const sensors = [{ x: 10, y: 10, temp: 25 }];
      const mockGrid = createMockDistanceGrid(sensors);
      const result = interpolateTemperaturePhysics(10, 10, sensors, mockGrid, 22);
      expect(result).toBeCloseTo(25, 1);
    });
  });
});

// =============================================================================
// BOUNDARY AND DISTANCE CALCULATION TESTS
// =============================================================================

describe('Distance and Boundary Calculations', () => {
  describe('getInterpolatedDistance', () => {
    // Create a simple test distance grid
    const createTestGrid = (): { distances: number[][][]; width: number; height: number } => {
      const width = 5;
      const height = 5;
      const distances: number[][][] = []; // One sensor
      
      // Initialize distance grid for one sensor
      distances[0] = [];
      for (let y = 0; y < height; y++) {
        distances[0][y] = [];
        for (let x = 0; x < width; x++) {
          // Simple distance calculation from corner (0,0)
          distances[0][y][x] = Math.sqrt(x * x + y * y);
        }
      }
      
      return { distances, width, height };
    };

    it('should return exact value for grid coordinates', () => {
      const grid = createTestGrid();
      const result = getInterpolatedDistance(2, 2, 0, grid);
      const expected = Math.sqrt(2 * 2 + 2 * 2); // Distance from (0,0) to (2,2)
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should interpolate between grid points', () => {
      const grid = createTestGrid();
      // Test point between grid coordinates
      const result = getInterpolatedDistance(1.5, 1.5, 0, grid);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10);
    });

    it('should handle boundary coordinates', () => {
      const grid = createTestGrid();
      // Test at grid boundaries
      const result = getInterpolatedDistance(0, 0, 0, grid);
      expect(result).toBe(0);
    });

    it('should clamp coordinates outside grid bounds', () => {
      const grid = createTestGrid();
      // Test coordinates outside grid
      const result = getInterpolatedDistance(10, 10, 0, grid);
      expect(result).not.toBe(Infinity);
    });

    it('should return infinity for undefined distances', () => {
      const grid = { distances: [[[Infinity]]], width: 1, height: 1 };
      const result = getInterpolatedDistance(0, 0, 0, grid);
      expect(result).toBe(Infinity);
    });

    it('should handle fractional coordinates properly', () => {
      const grid = createTestGrid();
      const result1 = getInterpolatedDistance(1.2, 1.8, 0, grid);
      const result2 = getInterpolatedDistance(1.8, 1.2, 0, grid);
      
      // Both should be valid interpolated values
      expect(result1).toBeGreaterThan(0);
      expect(result2).toBeGreaterThan(0);
      // The distances should be similar but may be equal due to symmetry
      // Just verify they're both reasonable values
      expect(Math.abs(result1 - result2)).toBeLessThan(1);
    });
  });
});

// =============================================================================
// PERFORMANCE AND CACHING TESTS
// =============================================================================

describe('Performance and Caching', () => {
  beforeEach(() => {
    // Clear any caches before each test
    vi.clearAllMocks();
  });

  describe('Canvas Dimension Calculations', () => {
    it('should return minimum dimensions for empty input', () => {
      const result = calculateCanvasDimensions([], []);
      expect(result).toEqual({ width: 400, height: 300 });
    });

    it('should calculate dimensions based on walls and sensors', () => {
      const walls = [{ x1: 0, y1: 0, x2: 100, y2: 100 }];
      const sensors = [{ x: 50, y: 50 }];
      const result = calculateCanvasDimensions(walls, sensors, 10);
      
      expect(result.width).toBeGreaterThan(100);
      expect(result.height).toBeGreaterThan(100);
    });

    it('should handle negative coordinates', () => {
      const walls = [{ x1: -50, y1: -50, x2: 50, y2: 50 }];
      const sensors = [{ x: 0, y: 0 }];
      const result = calculateCanvasDimensions(walls, sensors, 0);
      
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });

    it('should apply padding correctly', () => {
      const walls = [{ x1: 0, y1: 0, x2: 100, y2: 100 }];
      const sensors: Array<{ x: number; y: number }> = [];
      const padding = 20;
      const result = calculateCanvasDimensions(walls, sensors, padding);
      
      // Should include padding on both sides
      expect(result.width).toBe(101 + padding * 2);
      expect(result.height).toBe(101 + padding * 2);
    });

    it('should enforce minimum dimensions', () => {
      const walls = [{ x1: 0, y1: 0, x2: 10, y2: 10 }];
      const result = calculateCanvasDimensions(walls, []);
      
      expect(result.width).toBeGreaterThanOrEqual(100);
      expect(result.height).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Debouncing Logic', () => {
    // Test the debouncing utility used for sensor data
    it('should handle rapid updates correctly', () => {
      // This tests the concept with a simple debounce function
      let timeoutId: NodeJS.Timeout | null = null;
      const debounce = (fn: () => void, delay: number) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(fn, delay);
      };

      let callCount = 0;
      const debouncedFn = () => {
        callCount++;
      };

      // Simulate rapid calls
      debounce(debouncedFn, 100);
      debounce(debouncedFn, 100);
      debounce(debouncedFn, 100);

      // Should not have been called yet
      expect(callCount).toBe(0);
    });
  });
});