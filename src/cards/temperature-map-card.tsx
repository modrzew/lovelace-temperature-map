import { type ReactCardProps } from '@/lib/create-react-card';
import { Card, CardContent } from '@/components/ui/card';
import { useSignals } from '@preact/signals-react/runtime';
import { useEntityStateValue } from '@/lib/hooks/hass-hooks';
import { useEffect, useRef, useMemo, useState } from 'react';

interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TemperatureSensor {
  entity: string;
  x: number;
  y: number;
  label?: string;
}

interface Config {
  title?: string;
  width?: number;
  height?: number;
  walls: Wall[];
  sensors: TemperatureSensor[];
  min_temp?: number;
  max_temp?: number;
  too_cold_temp?: number;
  too_warm_temp?: number;
  ambient_temp?: number;
  show_sensor_names?: boolean;
  show_sensor_temperatures?: boolean;
  padding?: number;
}

// Line-line intersection helper
const lineIntersection = (
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): { x: number; y: number } | null => {
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

// Check if line from point A to point B intersects any wall
const lineIntersectsWalls = (
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



// Pre-computed distance grid for major performance improvement
interface DistanceGrid {
  distances: number[][][]; // [sensorIndex][y][x] = distance
  width: number;
  height: number;
}

const distanceGridCache = new Map<string, DistanceGrid>();

// Flood fill distance computation - much faster than A* pathfinding
const floodFillDistances = (
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

// Progressive flood fill computation with requestAnimationFrame
const computeDistanceGridAsync = (
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

// Get interpolated distance from pre-computed grid
const getInterpolatedDistance = (
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

// Heat diffusion that flows like water/air using flood fill distances
const interpolateTemperaturePhysics = (
  x: number,
  y: number,
  sensors: Array<{ x: number; y: number; temp: number }>,
  distanceGrid: DistanceGrid,
  ambientTemp: number = 22,
  walls: Wall[] = []
): number => {
  if (sensors.length === 0) return ambientTemp;
  
  // Calculate influences using flood fill distances only - no direct line checks
  // This ensures heat flows naturally around obstacles like water or air
  const sensorInfluences = sensors.map((sensor, index) => {
    const pathDistance = getInterpolatedDistance(x, y, index, distanceGrid);
    
    // If flood fill couldn't reach this point, the sensor has no influence
    if (pathDistance === Infinity) {
      return {
        ...sensor,
        influence: 0,
        pathDistance: Infinity,
        effectiveDistance: Infinity
      };
    }
    
    // Sensor dominance radius - within this distance, use exact sensor temperature
    const dominanceRadius = 12; // Reduced for more natural blending
    if (pathDistance <= dominanceRadius) {
      return {
        ...sensor,
        influence: 100, // High but not overwhelming influence
        pathDistance,
        effectiveDistance: pathDistance
      };
    }
    
    // Natural heat diffusion with gentler decay to allow flow-like spreading
    const minDistance = 1;
    const effectiveDistance = Math.max(pathDistance, minDistance);
    
    // Gentler exponential decay for more natural heat flow
    const decayFactor = 0.008; // Slower decay for better flow around obstacles
    const influence = Math.exp(-effectiveDistance * decayFactor);
    
    // Additional flow-based influence: heat spreads better in open areas
    // Bonus influence for sensors that can reach via shorter flood fill paths
    const flowBonus = 1 + Math.exp(-pathDistance / 30); // Bonus decreases with path distance
    
    return {
      ...sensor,
      influence: influence * flowBonus,
      pathDistance,
      effectiveDistance
    };
  });
  
  // Filter out unreachable sensors
  const reachableSensors = sensorInfluences.filter(s => s.influence > 0);
  
  // If no sensors can reach this point, use ambient temperature
  if (reachableSensors.length === 0) {
    return ambientTemp;
  }
  
  // Natural temperature blending - no artificial dominance boosts
  // Heat spreads naturally based on path accessibility
  const totalInfluence = reachableSensors.reduce((sum, s) => sum + s.influence, 0);
  
  // Calculate weighted temperature based on natural flow influences
  const weightedTemp = reachableSensors.reduce((sum, s) => 
    sum + (s.temp * s.influence), 0
  ) / totalInfluence;
  
  // Smooth blending with ambient temperature for areas with weak sensor influence
  const influenceThreshold = 0.02; // Higher threshold for more natural transitions
  if (totalInfluence < influenceThreshold) {
    const blendFactor = Math.pow(totalInfluence / influenceThreshold, 0.5); // Gentler blending curve
    return weightedTemp * blendFactor + ambientTemp * (1 - blendFactor);
  }
  
  return weightedTemp;
};

const temperatureToColor = (temp: number, tooCold: number, tooWarm: number): string => {
  // Too cold: blue
  if (temp <= tooCold) {
    return 'rgb(0, 0, 255)';
  }
  
  // Too warm: red
  if (temp >= tooWarm) {
    return 'rgb(255, 0, 0)';
  }
  
  // Comfort zone: blue -> green -> yellow -> red gradient
  const normalizedTemp = (temp - tooCold) / (tooWarm - tooCold);
  
  const colors = [
    { r: 0, g: 0, b: 255 },     // Blue (cold end of comfort)
    { r: 0, g: 255, b: 0 },     // Green
    { r: 255, g: 255, b: 0 },   // Yellow
    { r: 255, g: 0, b: 0 }      // Red (warm end of comfort)
  ];
  
  const scaledTemp = normalizedTemp * (colors.length - 1);
  const index = Math.floor(scaledTemp);
  const fraction = scaledTemp - index;
  
  if (index >= colors.length - 1) {
    const color = colors[colors.length - 1];
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }
  
  const color1 = colors[index];
  const color2 = colors[index + 1];
  
  const r = Math.round(color1.r + (color2.r - color1.r) * fraction);
  const g = Math.round(color1.g + (color2.g - color1.g) * fraction);
  const b = Math.round(color1.b + (color2.b - color1.b) * fraction);
  
  return `rgb(${r}, ${g}, ${b})`;
};

// Cache for boundary checking to improve performance
let boundaryCache: Set<string> | null = null;
let boundaryCacheKey: string = '';

const isPointInsideBoundary = (
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

const computeBoundaryPoints = (
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

// Check if a point is near any wall within the given radius
const checkWallProximity = (x: number, y: number, walls: Wall[], radius: number): boolean => {
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

// Custom hook for debouncing sensor data to prevent flickering
const useDebouncedSensorData = (sensorData: Array<{ x: number; y: number; temp: number; label: string; entity: string }>, delay: number = 2000) => {
  const [debouncedSensorData, setDebouncedSensorData] = useState(sensorData);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSensorData(sensorData);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [sensorData, delay]);
  
  return debouncedSensorData;
};

export const TemperatureMapCard = ({ hass, config }: ReactCardProps<Config>) => {
  useSignals();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentConfig = config.value;
  
  // Get sensor states directly from Home Assistant using the entity IDs
  const sensorStates = useMemo(() => 
    currentConfig.sensors.map(sensor => {
      const entityState = hass.value?.states?.[sensor.entity];
      return {
        ...sensor,
        temperature: { value: entityState?.state || null },
      };
    }),
    [currentConfig.sensors, hass.value?.states]
  );

  // Calculate canvas dimensions based on wall and sensor coordinates
  const getCanvasDimensions = (walls: Wall[], sensors: TemperatureSensor[], padding: number = 0) => {
    // Collect all coordinate points from walls and sensors
    const allPoints: Array<{ x: number; y: number }> = [];
    
    // Add wall endpoints
    walls.forEach(wall => {
      allPoints.push({ x: wall.x1, y: wall.y1 });
      allPoints.push({ x: wall.x2, y: wall.y2 });
    });
    
    // Add sensor positions
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
    
    // Calculate exact size to fit content with minimal padding
    const calculatedWidth = maxX - minX + padding * 2;
    const calculatedHeight = maxY - minY + padding * 2;
    
    // If coordinates start from 0, we need to add 1 to include the final pixel
    const finalWidth = minX === 0 ? maxX + 1 + padding * 2 : calculatedWidth;
    const finalHeight = minY === 0 ? maxY + 1 + padding * 2 : calculatedHeight;
    
    return {
      width: Math.max(100, finalWidth), // Reduced minimum size
      height: Math.max(100, finalHeight)
    };
  };

  const { 
    min_temp = 15, 
    max_temp = 30,
    too_cold_temp = 20,
    too_warm_temp = 26,
    ambient_temp = 22,
    show_sensor_names = true,
    show_sensor_temperatures = true,
    padding = 0
  } = currentConfig;

  // Use provided dimensions or calculate from walls and sensors
  const dimensions = currentConfig.width && currentConfig.height 
    ? { width: currentConfig.width, height: currentConfig.height }
    : getCanvasDimensions(currentConfig.walls, currentConfig.sensors, padding);
  
  const { width, height } = dimensions;

  const sensorData = useMemo(() => 
    sensorStates
      .filter(sensor => sensor.temperature.value && !isNaN(parseFloat(sensor.temperature.value)))
      .map(sensor => {
        // Use provided label or fallback to entity's friendly name
        const entityState = hass.value?.states?.[sensor.entity];
        const displayLabel = sensor.label || entityState?.attributes?.friendly_name || sensor.entity;
        
        return {
          x: sensor.x,
          y: sensor.y,
          temp: parseFloat(sensor.temperature.value!), // Non-null assertion since we filtered above
          label: displayLabel,
          entity: sensor.entity,
        };
      }),
    [sensorStates, hass.value?.states]
  );

  // Debounce sensor data to prevent frequent re-renders and flickering
  const debouncedSensorData = useDebouncedSensorData(sensorData, 2000);

  // Helper function to get mouse position and check if over sensor
  const getMousePositionAndSensor = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, sensor: null };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check if mouse is within any sensor's clickable area
    // Use current sensorData for real-time interaction, not debounced
    const hoveredSensor = sensorData.find(sensor => {
      const distance = Math.sqrt((x - sensor.x) ** 2 + (y - sensor.y) ** 2);
      return distance <= 12; // Clickable radius slightly larger than visual radius (8px)
    });

    return { x, y, sensor: hoveredSensor };
  };

  // Handle mouse move to change cursor
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { sensor } = getMousePositionAndSensor(event);
    canvas.style.cursor = sensor ? 'pointer' : 'default';
  };

  // Handle canvas clicks to detect sensor clicks
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { sensor: clickedSensor } = getMousePositionAndSensor(event);

    if (clickedSensor && hass.value) {
      // Call Home Assistant's more-info dialog
      const event_detail = {
        entityId: clickedSensor.entity,
      };
      
      // Dispatch Home Assistant's more-info event
      const moreInfoEvent = new CustomEvent('hass-more-info', {
        detail: event_detail,
        bubbles: true,
        composed: true,
      });
      
      // Try to dispatch on the canvas element first, then document
      const canvas = canvasRef.current;
      if (canvas && !canvas.dispatchEvent(moreInfoEvent)) {
        document.dispatchEvent(moreInfoEvent);
      }

      // Fallback for development/testing - log the action
      console.log('Sensor clicked:', clickedSensor.entity, 'Temperature:', clickedSensor.temp);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || debouncedSensorData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Show initial loading placeholder
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#666';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Computing temperature map...', width / 2, height / 2);

    let cancelDistanceGrid: (() => void) | null = null;
    let isCancelled = false;

    // Helper function to draw walls and sensors
    const drawOverlay = (
      context: CanvasRenderingContext2D, 
      walls: Wall[], 
      sensors: Array<{ x: number; y: number; temp: number; label?: string }>
    ) => {
      // Draw walls
      context.strokeStyle = '#333';
      context.lineWidth = 2;
      walls.forEach(wall => {
        context.beginPath();
        context.moveTo(wall.x1, wall.y1);
        context.lineTo(wall.x2, wall.y2);
        context.stroke();
      });

      // Draw sensors
      sensors.forEach(sensor => {
        // Draw outer clickable area hint (subtle)
        context.fillStyle = 'rgba(51, 51, 51, 0.1)';
        context.beginPath();
        context.arc(sensor.x, sensor.y, 12, 0, 2 * Math.PI);
        context.fill();
        
        // Draw main sensor circle
        context.fillStyle = '#fff';
        context.strokeStyle = '#333';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(sensor.x, sensor.y, 8, 0, 2 * Math.PI);
        context.fill();
        context.stroke();

        context.fillStyle = '#333';
        context.font = '12px system-ui';
        context.textAlign = 'center';
        
        if (show_sensor_temperatures) {
          context.fillText(`${sensor.temp.toFixed(1)}°`, sensor.x, sensor.y - 12);
        }
        
        if (show_sensor_names && sensor.label) {
          context.fillText(sensor.label, sensor.x, sensor.y + 24);
        }
      });
    };

    // Create off-screen canvas for rendering
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    // Start distance grid computation
    cancelDistanceGrid = computeDistanceGridAsync(
      debouncedSensorData,
      currentConfig.walls,
      width,
      height,
      (progress: number, stage: string) => {
        // Update progress on main canvas during computation
        if (isCancelled) return;
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#666';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(stage, width / 2, height / 2 - 10);
        ctx.font = '14px system-ui';
        ctx.fillText(`${Math.round(progress)}% complete`, width / 2, height / 2 + 10);
      },
      (distanceGrid) => {
        if (isCancelled) return;

        // Distance grid is ready, now render entire map to off-screen canvas
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#666';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Rendering temperature map...', width / 2, height / 2);

        // Render entire map to off-screen canvas at once
        const imageData = offscreenCtx.createImageData(width, height);
        const data = imageData.data;

        // Process all pixels at once (no progressive rendering)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            
            if (!isPointInsideBoundary(x, y, currentConfig.walls, width, height, debouncedSensorData)) {
              // Outside boundary - make it white/transparent
              data[index] = 255;     // Red
              data[index + 1] = 255; // Green
              data[index + 2] = 255; // Blue
              data[index + 3] = 0;   // Alpha (transparent)
            } else {
              // Inside boundary - interpolate temperature and color
              const temp = interpolateTemperaturePhysics(x, y, debouncedSensorData, distanceGrid, ambient_temp, currentConfig.walls);
              const color = temperatureToColor(temp, too_cold_temp, too_warm_temp);
              
              const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
              
              data[index] = rgb[0];     // Red
              data[index + 1] = rgb[1]; // Green
              data[index + 2] = rgb[2]; // Blue
              data[index + 3] = 120;    // Alpha (semi-transparent)
            }
          }
        }

        // Draw to off-screen canvas
        offscreenCtx.putImageData(imageData, 0, 0);

        // Draw walls and sensors on off-screen canvas
        drawOverlay(offscreenCtx, currentConfig.walls, debouncedSensorData);

        // Copy completed off-screen canvas to main canvas in one operation
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(offscreenCanvas, 0, 0);
      }
    );

    // Cleanup function
    return () => {
      isCancelled = true;
      if (cancelDistanceGrid) {
        cancelDistanceGrid();
      }
    };
  }, [debouncedSensorData, currentConfig.walls, width, height, min_temp, max_temp, too_cold_temp, too_warm_temp, ambient_temp, show_sensor_names, show_sensor_temperatures]);

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        {currentConfig.title && (
          <h3 className="text-lg font-semibold mb-4">{currentConfig.title}</h3>
        )}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', height: 'auto' }}
            className="border rounded"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
          />
        </div>
        {sensorData.length === 0 && (
          <div className="text-center text-muted-foreground mt-4">
            No sensor data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};