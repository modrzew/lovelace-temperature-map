// =============================================================================
// DISTANCE AND BOUNDARY CALCULATIONS
// =============================================================================
// Flood fill pathfinding, distance grid interpolation, and boundary detection

import type { Wall, DistanceGrid } from './types';
import { lineIntersectsWalls } from './geometry';

// Cache for distance grids to improve performance
const distanceGridCache = new Map<string, DistanceGrid>();

/**
 * Flood fill distance computation using BFS - much faster than A* pathfinding
 * @param sensorX Sensor x coordinate  
 * @param sensorY Sensor y coordinate
 * @param walls Array of walls that block pathfinding
 * @param gridWidth Width of the distance grid
 * @param gridHeight Height of the distance grid  
 * @param gridScale Scale factor for grid resolution
 * @returns 2D array of distances from sensor to each grid point
 */
export const floodFillDistances = (
  sensorX: number,
  sensorY: number,
  walls: Wall[],
  gridWidth: number,
  gridHeight: number,
  gridScale: number
): number[][] => {
  const distances: number[][] = [];
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number; distance: number }> = [];
  
  // Initialize distance grid with infinity
  for (let y = 0; y < gridHeight; y++) {
    distances[y] = [];
    for (let x = 0; x < gridWidth; x++) {
      distances[y][x] = Infinity;
    }
  }
  
  // Convert sensor coordinates to grid coordinates
  const startGx = Math.max(0, Math.min(Math.round(sensorX / gridScale), gridWidth - 1));
  const startGy = Math.max(0, Math.min(Math.round(sensorY / gridScale), gridHeight - 1));
  
  // Start flood fill from sensor position
  distances[startGy][startGx] = 0;
  queue.push({ x: startGx, y: startGy, distance: 0 });
  visited.add(`${startGx},${startGy}`);
  
  // Flood fill with BFS
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Check all 8 directions (including diagonals)
    const directions = [
      { dx: -1, dy: -1, cost: Math.SQRT2 }, { dx: 0, dy: -1, cost: 1 }, { dx: 1, dy: -1, cost: Math.SQRT2 },
      { dx: -1, dy: 0, cost: 1 },                                        { dx: 1, dy: 0, cost: 1 },
      { dx: -1, dy: 1, cost: Math.SQRT2 },  { dx: 0, dy: 1, cost: 1 },  { dx: 1, dy: 1, cost: Math.SQRT2 }
    ];
    
    for (const dir of directions) {
      const newGx = current.x + dir.dx;
      const newGy = current.y + dir.dy;
      const key = `${newGx},${newGy}`;
      
      // Check bounds - ensure we can reach all edge pixels
      if (newGx < 0 || newGx >= gridWidth || newGy < 0 || newGy >= gridHeight) continue;
      if (visited.has(key)) continue;
      
      // Convert back to actual coordinates for wall checking
      const actualX1 = current.x * gridScale;
      const actualY1 = current.y * gridScale;
      const actualX2 = newGx * gridScale;
      const actualY2 = newGy * gridScale;
      
      // Check if path is blocked by walls
      if (!lineIntersectsWalls(actualX1, actualY1, actualX2, actualY2, walls)) {
        const newDistance = current.distance + dir.cost * gridScale;
        
        if (newDistance < distances[newGy][newGx]) {
          distances[newGy][newGx] = newDistance;
          queue.push({ x: newGx, y: newGy, distance: newDistance });
          visited.add(key);
        }
      }
    }
  }
  
  // Ensure edge pixels are properly covered by adding additional boundary propagation
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        // If this pixel is still unreachable (Infinity), try to propagate from reachable neighbors
        if (distances[y][x] === Infinity) {
          let minNeighborDistance = Infinity;
          
          // Check all 8 neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                if (distances[ny][nx] !== Infinity) {
                  // Check if path from neighbor to current pixel is clear
                  const actualX1 = nx * gridScale;
                  const actualY1 = ny * gridScale;
                  const actualX2 = x * gridScale;
                  const actualY2 = y * gridScale;
                  
                  if (!lineIntersectsWalls(actualX1, actualY1, actualX2, actualY2, walls)) {
                    const stepCost = Math.sqrt(dx * dx + dy * dy) * gridScale;
                    const propagatedDistance = distances[ny][nx] + stepCost;
                    minNeighborDistance = Math.min(minNeighborDistance, propagatedDistance);
                  }
                }
              }
            }
          }
          
          if (minNeighborDistance !== Infinity) {
            distances[y][x] = minNeighborDistance;
          }
        }
      }
    }
  }
  
  return distances;
};

/**
 * Progressive flood fill computation with requestAnimationFrame for smooth UI
 * @param sensors Array of sensor positions and temperatures
 * @param walls Array of walls that block pathfinding
 * @param width Canvas width
 * @param height Canvas height
 * @param onProgress Progress callback function
 * @param onComplete Completion callback with computed grid
 * @returns Cancellation function
 */
export const computeDistanceGridAsync = (
  sensors: Array<{ x: number; y: number; temp: number }>,
  walls: Wall[],
  width: number,
  height: number,
  onProgress: (progress: number, stage: string) => void,
  onComplete: (grid: DistanceGrid) => void
): (() => void) => {
  const cacheKey = `${sensors.map(s => `${s.x},${s.y}`).join('|')}-${width}x${height}`;
  
  if (distanceGridCache.has(cacheKey)) {
    onComplete(distanceGridCache.get(cacheKey)!);
    return () => {}; // No cancellation needed
  }
  
  // Use highest resolution grid for precise wall alignment
  const gridScale = 1; // Maximum resolution for perfect wall detection
  const gridWidth = Math.ceil(width / gridScale);
  const gridHeight = Math.ceil(height / gridScale);
  
  const distances: number[][][] = [];
  
  let currentSensor = 0;
  let animationId: number;
  let isCancelled = false;
  
  const processChunk = () => {
    if (isCancelled) return;
    
    const startTime = performance.now();
    const maxTimePerFrame = 16; // Target 60fps
    
    // Process one sensor per frame to maintain responsiveness
    if (currentSensor < sensors.length && (performance.now() - startTime) < maxTimePerFrame) {
      const sensor = sensors[currentSensor];
      
      // Update progress
      onProgress(
        (currentSensor / sensors.length) * 100, 
        `Flood filling sensor ${currentSensor + 1}/${sensors.length}...`
      );
      
      // Perform flood fill for this sensor
      const sensorDistances = floodFillDistances(
        sensor.x, 
        sensor.y, 
        walls, 
        gridWidth, 
        gridHeight, 
        gridScale
      );
      
      distances[currentSensor] = sensorDistances;
      currentSensor++;
    }
    
    if (currentSensor < sensors.length) {
      // More sensors to process
      animationId = requestAnimationFrame(processChunk);
    } else {
      // All done!
      const grid: DistanceGrid = {
        distances,
        width: gridWidth,
        height: gridHeight
      };
      
      distanceGridCache.set(cacheKey, grid);
      onComplete(grid);
    }
  };
  
  // Start processing
  animationId = requestAnimationFrame(processChunk);
  
  // Return cancellation function
  return () => {
    isCancelled = true;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
};

/**
 * Get interpolated distance from pre-computed grid using bilinear interpolation
 * @param x Point x coordinate
 * @param y Point y coordinate
 * @param sensorIndex Index of the sensor in the distance grid
 * @param grid Pre-computed distance grid
 * @returns Interpolated distance value
 */
export const getInterpolatedDistance = (
  x: number,
  y: number,
  sensorIndex: number,
  grid: DistanceGrid
): number => {
  const gridScale = 1; // Updated to match the new grid scale
  const gx = x / gridScale;
  const gy = y / gridScale;
  
  // Ensure coordinates are within bounds
  const x1 = Math.max(0, Math.min(Math.floor(gx), grid.width - 1));
  const y1 = Math.max(0, Math.min(Math.floor(gy), grid.height - 1));
  const x2 = Math.max(0, Math.min(x1 + 1, grid.width - 1));
  const y2 = Math.max(0, Math.min(y1 + 1, grid.height - 1));
  
  // Clamp fractional parts to valid range
  const fx = Math.max(0, Math.min(gx - x1, 1));
  const fy = Math.max(0, Math.min(gy - y1, 1));
  
  const d11 = grid.distances[sensorIndex][y1]?.[x1];
  const d21 = grid.distances[sensorIndex][y1]?.[x2];
  const d12 = grid.distances[sensorIndex][y2]?.[x1];
  const d22 = grid.distances[sensorIndex][y2]?.[x2];
  
  // Handle infinity values (unreachable areas)
  if (d11 === undefined || d11 === Infinity) return Infinity;
  if (d21 === undefined || d21 === Infinity) return d11;
  if (d12 === undefined || d12 === Infinity) return d11;
  if (d22 === undefined || d22 === Infinity) return d21;
  
  const d1 = d11 * (1 - fx) + d21 * fx;
  const d2 = d12 * (1 - fx) + d22 * fx;
  
  return d1 * (1 - fy) + d2 * fy;
};

// Cache for boundary checking to improve performance
let boundaryCache: Set<string> | null = null;
let boundaryCacheKey: string = '';

/**
 * Check if a point is inside the boundary defined by walls and sensor positions
 * @param x Point x coordinate
 * @param y Point y coordinate
 * @param walls Array of walls defining boundaries
 * @param canvasWidth Canvas width
 * @param canvasHeight Canvas height
 * @param sensors Array of sensor positions for boundary guidance
 * @returns True if point is inside boundary
 */
export const isPointInsideBoundary = (
  x: number, 
  y: number, 
  walls: Wall[], 
  canvasWidth: number, 
  canvasHeight: number, 
  sensors: Array<{ x: number; y: number }> = []
): boolean => {
  if (walls.length === 0) return true;
  
  // Create cache key based on walls and sensor configuration
  const cacheKey = walls.map(w => `${w.x1},${w.y1},${w.x2},${w.y2}`).join('|') + 
                   '|' + sensors.map(s => `${s.x},${s.y}`).join('|');
  
  // If cache is invalid, recompute boundary
  if (!boundaryCache || boundaryCacheKey !== cacheKey) {
    boundaryCache = computeBoundaryPoints(walls, canvasWidth, canvasHeight, sensors);
    boundaryCacheKey = cacheKey;
  }
  
  return boundaryCache.has(`${Math.floor(x)},${Math.floor(y)}`);
};

/**
 * Compute boundary points using flood fill from sensor positions
 * @param walls Array of walls defining boundaries
 * @param canvasWidth Canvas width
 * @param canvasHeight Canvas height
 * @param sensors Array of sensor positions for boundary guidance
 * @returns Set of boundary point coordinates as strings
 */
export const computeBoundaryPoints = (
  walls: Wall[], 
  canvasWidth: number, 
  canvasHeight: number, 
  sensors: Array<{ x: number; y: number }> = []
): Set<string> => {
  const boundaryPoints = new Set<string>();
  
  if (sensors.length === 0) {
    // No sensors to guide us - fall back to bounding box
    const allPoints = walls.flatMap(wall => [
      { x: wall.x1, y: wall.y1 },
      { x: wall.x2, y: wall.y2 }
    ]);
    
    if (allPoints.length === 0) {
      // No walls either - include everything
      for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
          boundaryPoints.add(`${x},${y}`);
        }
      }
      return boundaryPoints;
    }
    
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));
    
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          boundaryPoints.add(`${x},${y}`);
        }
      }
    }
    return boundaryPoints;
  }
  
  // Use flood fill from sensor locations to determine interior areas
  const gridScale = 1; // Use 1:1 pixel accuracy for precise boundary detection
  const gridWidth = Math.ceil(canvasWidth / gridScale);
  const gridHeight = Math.ceil(canvasHeight / gridScale);
  
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [];
  
  // Start flood fill from all sensor locations (they're definitely inside)
  for (const sensor of sensors) {
    const gridX = Math.floor(sensor.x / gridScale);
    const gridY = Math.floor(sensor.y / gridScale);
    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
      queue.push({ x: gridX, y: gridY });
    }
  }
  
  // Flood fill to mark all reachable interior points
  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    
    if (visited.has(key)) continue;
    if (current.x < 0 || current.x >= gridWidth || current.y < 0 || current.y >= gridHeight) continue;
    
    visited.add(key);
    
    // Convert grid coordinates to actual coordinates
    const actualX = current.x * gridScale + gridScale / 2;
    const actualY = current.y * gridScale + gridScale / 2;
    
    // Check all 4 directions
    const directions = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
    ];
    
    for (const dir of directions) {
      const newX = current.x + dir.dx;
      const newY = current.y + dir.dy;
      const newKey = `${newX},${newY}`;
      
      if (visited.has(newKey)) continue;
      if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight) continue;
      
      const newActualX = newX * gridScale + gridScale / 2;
      const newActualY = newY * gridScale + gridScale / 2;
      
      // Check if movement is blocked by a wall
      if (!lineIntersectsWalls(actualX, actualY, newActualX, newActualY, walls)) {
        queue.push({ x: newX, y: newY });
      }
    }
  }
  
  // Mark all points in visited grid cells as interior
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const gridX = Math.floor(x / gridScale);
      const gridY = Math.floor(y / gridScale);
      const gridKey = `${gridX},${gridY}`;
      
      if (visited.has(gridKey)) {
        boundaryPoints.add(`${x},${y}`);
      }
    }
  }
  
  return boundaryPoints;
};