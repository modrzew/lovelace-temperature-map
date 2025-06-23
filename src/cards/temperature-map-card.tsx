import { type ReactCardProps } from '@/lib/create-react-card';
import { Card, CardContent } from '@/components/ui/card';
import { useSignals } from '@preact/signals-react/runtime';
import { useEntityStateValue } from '@/lib/hooks/hass-hooks';
import { useEffect, useRef, useMemo } from 'react';

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
    if (lineIntersection(x1, y1, x2, y2, wall.x1, wall.y1, wall.x2, wall.y2)) {
      return true;
    }
  }
  return false;
};


// A* pathfinding implementation for realistic heat diffusion
interface PathNode {
  x: number;
  y: number;
  gScore: number;
  fScore: number;
  parent?: PathNode;
}

const heuristic = (a: PathNode, b: { x: number; y: number }): number => {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};

const getNeighbors = (node: PathNode, walls: Wall[], width: number, height: number): PathNode[] => {
  const neighbors: PathNode[] = [];
  const directions = [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, // Cardinal
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 } // Diagonal
  ];
  
  for (const dir of directions) {
    const newX = node.x + dir.dx * 8; // Step size for performance
    const newY = node.y + dir.dy * 8;
    
    if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
      // Check if this step crosses any wall
      if (!lineIntersectsWalls(node.x, node.y, newX, newY, walls)) {
        const stepCost = Math.sqrt(dir.dx ** 2 + dir.dy ** 2) * 8;
        neighbors.push({
          x: newX,
          y: newY,
          gScore: Infinity,
          fScore: Infinity,
          parent: undefined
        });
      }
    }
  }
  
  return neighbors;
};

const findPath = (
  start: { x: number; y: number },
  goal: { x: number; y: number },
  walls: Wall[],
  width: number,
  height: number
): number => {
  // Quick direct path check first
  if (!lineIntersectsWalls(start.x, start.y, goal.x, goal.y, walls)) {
    return Math.sqrt((goal.x - start.x) ** 2 + (goal.y - start.y) ** 2);
  }
  
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  
  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    gScore: 0,
    fScore: heuristic({ x: start.x, y: start.y, gScore: 0, fScore: 0 }, goal)
  };
  
  openSet.push(startNode);
  
  while (openSet.length > 0) {
    // Find node with lowest fScore
    let current = openSet[0];
    let currentIndex = 0;
    
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].fScore < current.fScore) {
        current = openSet[i];
        currentIndex = i;
      }
    }
    
    openSet.splice(currentIndex, 1);
    const currentKey = `${current.x},${current.y}`;
    closedSet.add(currentKey);
    
    // Check if we reached the goal (within tolerance)
    const distToGoal = Math.sqrt((current.x - goal.x) ** 2 + (current.y - goal.y) ** 2);
    if (distToGoal < 15) {
      // Reconstruct path length
      return current.gScore + distToGoal;
    }
    
    // Explore neighbors
    const neighbors = getNeighbors(current, walls, width, height);
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (closedSet.has(neighborKey)) continue;
      
      const stepCost = Math.sqrt((neighbor.x - current.x) ** 2 + (neighbor.y - current.y) ** 2);
      const tentativeGScore = current.gScore + stepCost;
      
      const existingNeighbor = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
      
      if (!existingNeighbor) {
        neighbor.gScore = tentativeGScore;
        neighbor.fScore = tentativeGScore + heuristic(neighbor, goal);
        neighbor.parent = current;
        openSet.push(neighbor);
      } else if (tentativeGScore < existingNeighbor.gScore) {
        existingNeighbor.gScore = tentativeGScore;
        existingNeighbor.fScore = tentativeGScore + heuristic(existingNeighbor, goal);
        existingNeighbor.parent = current;
      }
    }
    
    // Limit iterations for performance
    if (closedSet.size > 500) break;
  }
  
  // No path found - return high penalty distance
  const directDistance = Math.sqrt((goal.x - start.x) ** 2 + (goal.y - start.y) ** 2);
  return directDistance * 5; // Heavy penalty for blocked paths
};

// Cache for pathfinding results to improve performance
const pathCache = new Map<string, number>();

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
  const startGx = Math.round(sensorX / gridScale);
  const startGy = Math.round(sensorY / gridScale);
  
  // Start flood fill from sensor position
  if (startGx >= 0 && startGx < gridWidth && startGy >= 0 && startGy < gridHeight) {
    distances[startGy][startGx] = 0;
    queue.push({ x: startGx, y: startGy, distance: 0 });
    visited.add(`${startGx},${startGy}`);
  }
  
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
      
      // Check bounds
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
  
  // Use larger grid scale for even better performance
  const gridScale = 8; // Increased from 4 for 4x speedup
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
  const gridScale = 8; // Updated to match the new grid scale
  const gx = x / gridScale;
  const gy = y / gridScale;
  
  const x1 = Math.floor(gx);
  const y1 = Math.floor(gy);
  const x2 = Math.min(x1 + 1, grid.width - 1);
  const y2 = Math.min(y1 + 1, grid.height - 1);
  
  // Bilinear interpolation
  const fx = gx - x1;
  const fy = gy - y1;
  
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

// Optimized heat diffusion using pre-computed distance grid
const interpolateTemperaturePhysics = (
  x: number,
  y: number,
  sensors: Array<{ x: number; y: number; temp: number }>,
  distanceGrid: DistanceGrid,
  ambientTemp: number = 22
): number => {
  if (sensors.length === 0) return ambientTemp;
  
  // Calculate influences using pre-computed distances
  const sensorInfluences = sensors.map((sensor, index) => {
    const pathDistance = getInterpolatedDistance(x, y, index, distanceGrid);
    
    // Skip sensors that are unreachable (infinite distance)
    if (pathDistance === Infinity) {
      return {
        ...sensor,
        influence: 0,
        pathDistance: Infinity,
        effectiveDistance: Infinity
      };
    }
    
    // Heat diffusion with path-based distance
    const minDistance = 10; // Minimum effective distance
    const effectiveDistance = Math.max(pathDistance, minDistance);
    
    // Exponential decay for heat diffusion
    const decayFactor = 0.02;
    const influence = Math.exp(-effectiveDistance * decayFactor);
    
    return {
      ...sensor,
      influence,
      pathDistance,
      effectiveDistance
    };
  });
  
  const totalInfluence = sensorInfluences.reduce((sum, s) => sum + s.influence, 0);
  
  if (totalInfluence < 0.001) return ambientTemp;
  
  // Calculate weighted temperature based on path-distance influences
  const weightedTemp = sensorInfluences.reduce((sum, s) => 
    sum + (s.temp * s.influence), 0
  ) / totalInfluence;
  
  // Blend with ambient temperature based on total influence strength
  const maxPossibleInfluence = 1.0;
  const influenceFactor = Math.min(totalInfluence / maxPossibleInfluence, 1);
  
  return weightedTemp * influenceFactor + ambientTemp * (1 - influenceFactor);
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

const isPointInsideBoundary = (x: number, y: number, walls: Wall[]): boolean => {
  if (walls.length === 0) return true;
  
  // Find the bounding box from all walls
  const allPoints = walls.flatMap(wall => [
    { x: wall.x1, y: wall.y1 },
    { x: wall.x2, y: wall.y2 }
  ]);
  
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  
  // Inset boundary slightly to account for wall thickness
  // This prevents the off-by-one error at the boundary
  const wallThickness = 1;
  const insideMinX = minX + wallThickness;
  const insideMaxX = maxX - wallThickness;
  const insideMinY = minY + wallThickness;
  const insideMaxY = maxY - wallThickness;
  
  // Check if point is inside the inset boundary
  if (x < insideMinX || x > insideMaxX || y < insideMinY || y > insideMaxY) {
    return false;
  }
  
  // For now, use simple bounding box. Could be enhanced with proper polygon intersection
  return true;
};

export const TemperatureMapCard = ({ hass, config }: ReactCardProps<Config>) => {
  useSignals();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentConfig = config.value;
  
  // Create individual hook calls for each sensor to avoid calling hooks in callbacks
  const sensor1Temp = useEntityStateValue(hass, currentConfig.sensors[0]?.entity);
  const sensor2Temp = useEntityStateValue(hass, currentConfig.sensors[1]?.entity);
  const sensor3Temp = useEntityStateValue(hass, currentConfig.sensors[2]?.entity);
  const sensor4Temp = useEntityStateValue(hass, currentConfig.sensors[3]?.entity);
  const sensor5Temp = useEntityStateValue(hass, currentConfig.sensors[4]?.entity);
  const sensor6Temp = useEntityStateValue(hass, currentConfig.sensors[5]?.entity);
  
  const sensorTemperatures = [sensor1Temp, sensor2Temp, sensor3Temp, sensor4Temp, sensor5Temp, sensor6Temp];
  
  const sensorStates = currentConfig.sensors.map((sensor, index) => ({
    ...sensor,
    temperature: sensorTemperatures[index] || { value: null },
  }));

  // Calculate canvas dimensions based on wall coordinates
  const getCanvasDimensions = (walls: Wall[], padding: number = 50) => {
    if (walls.length === 0) {
      return { width: 400, height: 300 };
    }
    
    // Find min/max coordinates from all walls
    const allPoints = walls.flatMap(wall => [
      { x: wall.x1, y: wall.y1 },
      { x: wall.x2, y: wall.y2 }
    ]);
    
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));
    
    // Calculate size with padding
    const calculatedWidth = maxX - minX + padding * 2;
    const calculatedHeight = maxY - minY + padding * 2;
    
    return {
      width: Math.max(400, calculatedWidth),
      height: Math.max(300, calculatedHeight)
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
    padding = 50
  } = currentConfig;

  // Use provided dimensions or calculate from walls
  const dimensions = currentConfig.width && currentConfig.height 
    ? { width: currentConfig.width, height: currentConfig.height }
    : getCanvasDimensions(currentConfig.walls, padding);
  
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
          temp: parseFloat(sensor.temperature.value),
          label: displayLabel,
          entity: sensor.entity,
        };
      }),
    [sensorStates, hass.value?.states]
  );

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
    if (!canvas || sensorData.length === 0) return;

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
    ctx.fillText('Starting computation...', width / 2, height / 2);

    let cancelDistanceGrid: (() => void) | null = null;
    let renderAnimationId: number | null = null;
    let isCancelled = false;

    // Progress update function
    const updateProgress = (progress: number, stage: string) => {
      if (isCancelled) return;
      
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#666';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(stage, width / 2, height / 2 - 10);
      ctx.font = '14px system-ui';
      ctx.fillText(`${Math.round(progress)}% complete`, width / 2, height / 2 + 10);
    };

    // Start distance grid computation
    cancelDistanceGrid = computeDistanceGridAsync(
      sensorData,
      currentConfig.walls,
      width,
      height,
      updateProgress,
      (distanceGrid) => {
        if (isCancelled) return;

        // Distance grid is ready, now start progressive map rendering
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#666';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Generating temperature map...', width / 2, height / 2);

        // Progressive rendering state
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        let currentRow = 0;

        const processChunk = () => {
          if (isCancelled) return;

          const startTime = performance.now();
          const maxTimePerFrame = 16; // Target 60fps

          // Process rows until we hit our time budget
          while (currentRow < height && (performance.now() - startTime) < maxTimePerFrame) {
            for (let x = 0; x < width; x++) {
              const index = (currentRow * width + x) * 4;
              
              if (!isPointInsideBoundary(x, currentRow, currentConfig.walls)) {
                // Outside boundary - make it white/transparent
                data[index] = 255;     // Red
                data[index + 1] = 255; // Green
                data[index + 2] = 255; // Blue
                data[index + 3] = 0;   // Alpha (transparent)
              } else {
                // Inside boundary - interpolate temperature and color using pre-computed grid
                const temp = interpolateTemperaturePhysics(x, currentRow, sensorData, distanceGrid, ambient_temp);
                const color = temperatureToColor(temp, too_cold_temp, too_warm_temp);
                
                const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
                
                data[index] = rgb[0];     // Red
                data[index + 1] = rgb[1]; // Green
                data[index + 2] = rgb[2]; // Blue
                data[index + 3] = 120;    // Alpha (semi-transparent)
              }
            }
            currentRow++;
          }

          // Update canvas with current progress
          ctx.putImageData(imageData, 0, 0);

          // Draw walls and sensors on top (so they're always visible)
          drawOverlay(ctx, currentConfig.walls, sensorData);

          if (currentRow < height) {
            // More work to do, schedule next chunk
            renderAnimationId = requestAnimationFrame(processChunk);
          }
        };

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

        // Start progressive rendering
        renderAnimationId = requestAnimationFrame(processChunk);
      }
    );

    // Cleanup function
    return () => {
      isCancelled = true;
      if (cancelDistanceGrid) {
        cancelDistanceGrid();
      }
      if (renderAnimationId) {
        cancelAnimationFrame(renderAnimationId);
      }
    };
  }, [sensorData, currentConfig.walls, width, height, min_temp, max_temp, too_cold_temp, too_warm_temp, ambient_temp, show_sensor_names, show_sensor_temperatures]);

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