// =============================================================================
// GEOMETRIC CALCULATIONS
// =============================================================================
// Line intersection, wall collision detection, and proximity calculations

import type { Wall, Point } from './types';

/**
 * Calculate intersection point between two line segments
 * @param x1 Start x of first line
 * @param y1 Start y of first line  
 * @param x2 End x of first line
 * @param y2 End y of first line
 * @param x3 Start x of second line
 * @param y3 Start y of second line
 * @param x4 End x of second line
 * @param y4 End y of second line
 * @returns Intersection point or null if no intersection
 */
export const lineIntersection = (
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): Point | null => {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }
  return null;
};

/**
 * Check if a line intersects any wall
 * @param x1 Start x of line
 * @param y1 Start y of line
 * @param x2 End x of line  
 * @param y2 End y of line
 * @param walls Array of walls to check against
 * @returns True if line intersects any wall
 */
export const lineIntersectsWalls = (
  x1: number, y1: number, x2: number, y2: number,
  walls: Wall[]
): boolean => {
  for (const wall of walls) {
    const intersection = lineIntersection(x1, y1, x2, y2, wall.x1, wall.y1, wall.x2, wall.y2);
    if (intersection) {
      // Check if intersection is within both line segments (including endpoints)
      const t1 = Math.abs(x2 - x1) > 0.001 ? (intersection.x - x1) / (x2 - x1) : 0;
      const t2 = Math.abs(y2 - y1) > 0.001 ? (intersection.y - y1) / (y2 - y1) : 0;
      const tWall1 = Math.abs(wall.x2 - wall.x1) > 0.001 ? (intersection.x - wall.x1) / (wall.x2 - wall.x1) : 0;
      const tWall2 = Math.abs(wall.y2 - wall.y1) > 0.001 ? (intersection.y - wall.y1) / (wall.y2 - wall.y1) : 0;
      
      // Use consistent parameter for both x and y calculations
      const t = Math.abs(x2 - x1) > Math.abs(y2 - y1) ? t1 : t2;
      const tWall = Math.abs(wall.x2 - wall.x1) > Math.abs(wall.y2 - wall.y1) ? tWall1 : tWall2;
      
      // Include endpoints in intersection detection (0 <= t <= 1)
      if (t >= 0 && t <= 1 && tWall >= 0 && tWall <= 1) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Check if a point is within a given radius of any wall
 * @param x Point x coordinate
 * @param y Point y coordinate
 * @param walls Array of walls to check
 * @param radius Distance threshold
 * @returns True if point is within radius of any wall
 */
export const checkWallProximity = (
  x: number, 
  y: number, 
  walls: Wall[], 
  radius: number
): boolean => {
  for (const wall of walls) {
    // Calculate distance from point to line segment
    const A = x - wall.x1;
    const B = y - wall.y1;
    const C = wall.x2 - wall.x1;
    const D = wall.y2 - wall.y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Wall is a point
      const distance = Math.sqrt(A * A + B * B);
      if (distance <= radius) return true;
      continue;
    }
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param)); // Clamp to line segment
    
    const xx = wall.x1 + param * C;
    const yy = wall.y1 + param * D;
    
    const dx = x - xx;
    const dy = y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= radius) return true;
  }
  return false;
};