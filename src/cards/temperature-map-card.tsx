import { type ReactCardProps } from '@/lib/create-react-card';
import { Card, CardContent } from '@/components/ui/card';
import { useSignals } from '@preact/signals-react/runtime';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';

// Import utility functions from new modules
import type { Wall, TemperatureSensor } from '@/lib/temperature-map/types';
import { temperatureToColor, interpolateTemperaturePhysicsWithCircularBlending } from '@/lib/temperature-map/temperature';
import { computeDistanceGridAsync, isPointInsideBoundary } from '@/lib/temperature-map/distance';

// Import config editor
import '@/temperature-map-config-editor';

// Cache for rendered images to improve performance on re-renders
const renderedImageCache = new Map<string, HTMLCanvasElement>();

// Helper function to generate cache key for rendered images
const generateRenderCacheKey = (
  sensors: Array<{ x: number; y: number; temp: number; label: string; entity: string }>,
  walls: Wall[],
  dimensions: { width: number; height: number },
  colorSettings: {
    min_temp: number;
    max_temp: number;
    too_cold_temp: number;
    too_warm_temp: number;
    ambient_temp: number;
  },
  displaySettings: {
    show_sensor_names: boolean;
    show_sensor_temperatures: boolean;
  }
): string => {
  const sensorsKey = sensors.map(s => `${s.x},${s.y},${s.temp},${s.label}`).join('|');
  const wallsKey = walls.map(w => `${w.x1},${w.y1},${w.x2},${w.y2}`).join('|');
  const dimensionsKey = `${dimensions.width}x${dimensions.height}`;
  const colorKey = `${colorSettings.min_temp},${colorSettings.max_temp},${colorSettings.too_cold_temp},${colorSettings.too_warm_temp},${colorSettings.ambient_temp}`;
  const displayKey = `${displaySettings.show_sensor_names},${displaySettings.show_sensor_temperatures}`;
  
  return `${sensorsKey}:${wallsKey}:${dimensionsKey}:${colorKey}:${displayKey}`;
};


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
  rotation?: 0 | 90 | 180 | 270;
}


// Coordinate transformation utilities for rotation
const rotatePoint = (x: number, y: number, width: number, height: number, rotation: 0 | 90 | 180 | 270): { x: number; y: number } => {
  switch (rotation) {
    case 0:
      return { x, y };
    case 90:
      return { x: height - y, y: x };
    case 180:
      return { x: width - x, y: height - y };
    case 270:
      return { x: y, y: width - x };
    default:
      return { x, y };
  }
};

const rotateWall = (wall: Wall, width: number, height: number, rotation: 0 | 90 | 180 | 270): Wall => {
  const point1 = rotatePoint(wall.x1, wall.y1, width, height, rotation);
  const point2 = rotatePoint(wall.x2, wall.y2, width, height, rotation);
  return {
    x1: point1.x,
    y1: point1.y,
    x2: point2.x,
    y2: point2.y,
  };
};

const rotateSensor = (sensor: TemperatureSensor, width: number, height: number, rotation: 0 | 90 | 180 | 270): TemperatureSensor => {
  const rotatedPoint = rotatePoint(sensor.x, sensor.y, width, height, rotation);
  return {
    ...sensor,
    x: rotatedPoint.x,
    y: rotatedPoint.y,
  };
};

// Helper function to get dimensions after rotation
const getRotatedDimensions = (width: number, height: number, rotation: 0 | 90 | 180 | 270): { width: number; height: number } => {
  switch (rotation) {
    case 90:
    case 270:
      return { width: height, height: width };
    case 0:
    case 180:
    default:
      return { width, height };
  }
};

// Custom hook for throttling sensor data to prevent excessive updates
const useThrottledSensorData = (sensorData: Array<{ x: number; y: number; temp: number; label: string; entity: string }>, delay: number = 5 * 60 * 1000) => {
  const [throttledSensorData, setThrottledSensorData] = useState(sensorData);
  const lastUpdateRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const latestDataRef = useRef(sensorData);
  
  // Always keep the latest data in the ref
  latestDataRef.current = sensorData;
  
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    if (timeSinceLastUpdate >= delay) {
      // Enough time has passed, update immediately
      setThrottledSensorData(sensorData);
      lastUpdateRef.current = now;
    } else if (!timerRef.current) {
      // Not enough time has passed, schedule update only if no timer is running
      timerRef.current = setTimeout(() => {
        setThrottledSensorData(latestDataRef.current);
        lastUpdateRef.current = Date.now();
        timerRef.current = null;
      }, delay - timeSinceLastUpdate);
    }
    // If timer is already running, do nothing - let it complete
  }, [sensorData, delay]);
  
  // Separate cleanup effect that only runs on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  return throttledSensorData;
};

// Custom hook for debouncing computation-triggering values
const useDebouncedComputationConfig = (
  walls: Wall[],
  sensors: Array<{ x: number; y: number; temp: number; label: string; entity: string }>, 
  dimensions: { width: number; height: number },
  delay: number = 1000 // Shorter delay for config changes
) => {
  const [debouncedConfig, setDebouncedConfig] = useState({ walls, sensors, dimensions });
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedConfig({ walls, sensors, dimensions });
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [walls, sensors, dimensions, delay]);
  
  return debouncedConfig;
};


export const TemperatureMapCard = ({ hass, config, previewMode, editMode }: ReactCardProps<Config>) => {
  useSignals();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentConfig = config.value;
  const isPreviewMode = previewMode?.value ?? false;
  const isEditMode = editMode?.value ?? false;
  
  // State for loading indicator
  const [isComputing, setIsComputing] = useState(false);
  
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
    padding = 0,
    rotation = 0
  } = currentConfig;

  // Use provided dimensions or calculate from walls and sensors
  const originalDimensions = currentConfig.width && currentConfig.height 
    ? { width: currentConfig.width, height: currentConfig.height }
    : getCanvasDimensions(currentConfig.walls, currentConfig.sensors, padding);
  
  // Apply rotation to dimensions
  const dimensions = getRotatedDimensions(originalDimensions.width, originalDimensions.height, rotation);
  const { width, height } = dimensions;
  
  // Create rotated walls with stable reference when walls/rotation unchanged
  const rotatedWalls = useMemo(() => 
    currentConfig.walls.map(wall => 
      rotateWall(wall, originalDimensions.width, originalDimensions.height, rotation)
    ), 
    [currentConfig.walls, originalDimensions.width, originalDimensions.height, rotation]
  );
  
  // Create rotated sensors with stable reference when sensor positions/rotation unchanged
  const rotatedSensors = useMemo(() => 
    currentConfig.sensors.map(sensor => 
      rotateSensor(sensor, originalDimensions.width, originalDimensions.height, rotation)
    ), 
    [currentConfig.sensors, originalDimensions.width, originalDimensions.height, rotation]
  );

  const sensorData = useMemo(() => 
    sensorStates
      .filter(sensor => sensor.temperature.value && !isNaN(parseFloat(sensor.temperature.value)))
      .map((sensor, index) => {
        // Use provided label or fallback to entity's friendly name
        const entityState = hass.value?.states?.[sensor.entity];
        const displayLabel = sensor.label || entityState?.attributes?.friendly_name || sensor.entity;
        
        // Use rotated sensor coordinates
        const rotatedSensor = rotatedSensors[index];
        
        return {
          x: rotatedSensor.x,
          y: rotatedSensor.y,
          temp: parseFloat(sensor.temperature.value!), // Non-null assertion since we filtered above
          label: displayLabel,
          entity: sensor.entity,
        };
      }),
    [sensorStates, hass.value?.states, rotatedSensors]
  );

  // Throttle sensor data to prevent excessive updates (at most once every 5 minutes)
  const throttledSensorData = useThrottledSensorData(sensorData, 5 * 60 * 1000); // 5 minutes
  
  // Debounce computation config to prevent excessive computation restarts
  const debouncedComputationConfig = useDebouncedComputationConfig(
    rotatedWalls, 
    throttledSensorData, 
    { width, height },
    1000 // 1 second delay for computation changes
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
    // Use current sensorData for real-time interaction, not debounced
    const hoveredSensor = sensorData.find(sensor => {
      const distance = Math.sqrt((x - sensor.x) ** 2 + (y - sensor.y) ** 2);
      return distance <= 12; // Clickable radius larger than visual radius (6px)
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

  // Helper function to draw walls and sensors
  const drawOverlay = useCallback((
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
      
      // Draw main sensor circle (smaller)
      context.fillStyle = '#fff';
      context.strokeStyle = '#333';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(sensor.x, sensor.y, 6, 0, 2 * Math.PI);
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
  }, [show_sensor_temperatures, show_sensor_names]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || debouncedComputationConfig.sensors.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = debouncedComputationConfig.dimensions.width;
    canvas.height = debouncedComputationConfig.dimensions.height;

    // In preview mode or edit mode, skip expensive heatmap calculations and show simple preview
    if (isPreviewMode || isEditMode) {
      const { width: canvasWidth, height: canvasHeight } = debouncedComputationConfig.dimensions;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Light gray background for preview mode
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw walls and sensors overlay without heatmap
      drawOverlay(ctx, debouncedComputationConfig.walls, debouncedComputationConfig.sensors);
      return;
    }

    // Generate cache key for current configuration
    const cacheKey = generateRenderCacheKey(
      debouncedComputationConfig.sensors,
      debouncedComputationConfig.walls,
      debouncedComputationConfig.dimensions,
      { min_temp, max_temp, too_cold_temp, too_warm_temp, ambient_temp },
      { show_sensor_names, show_sensor_temperatures }
    );

    // Check if we have a cached result
    const cachedCanvas = renderedImageCache.get(cacheKey);
    if (cachedCanvas) {
      // Use cached result - much faster!
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(cachedCanvas, 0, 0);
      return;
    }

    // Show initial loading placeholder with transparent background
    const { width: canvasWidth, height: canvasHeight } = debouncedComputationConfig.dimensions;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = '#666';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Computing temperature map...', canvasWidth / 2, canvasHeight / 2);

    // Set computing state for loading indicator
    setIsComputing(true);

    let cancelDistanceGrid: (() => void) | null = null;
    let isCancelled = false;

    // Create off-screen canvas for rendering
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvasWidth;
    offscreenCanvas.height = canvasHeight;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    // Start distance grid computation
    cancelDistanceGrid = computeDistanceGridAsync(
      debouncedComputationConfig.sensors,
      debouncedComputationConfig.walls,
      canvasWidth,
      canvasHeight,
      (progress: number, stage: string) => {
        // Update progress on main canvas during computation with transparent background
        if (isCancelled) return;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = '#666';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(stage, canvasWidth / 2, canvasHeight / 2 - 10);
        ctx.font = '14px system-ui';
        ctx.fillText(`${Math.round(progress)}% complete`, canvasWidth / 2, canvasHeight / 2 + 10);
      },
      (distanceGrid) => {
        if (isCancelled) return;

        // Distance grid is ready, now render entire map to off-screen canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = '#666';
        ctx.font = '16px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Rendering temperature map...', canvasWidth / 2, canvasHeight / 2);

        // Keep computing state active during rendering phase
        // (isComputing is already true from earlier)

        // Render entire map to off-screen canvas at once
        const imageData = offscreenCtx.createImageData(canvasWidth, canvasHeight);
        const data = imageData.data;

        // Process all pixels at once (no progressive rendering)
        for (let y = 0; y < canvasHeight; y++) {
          for (let x = 0; x < canvasWidth; x++) {
            const index = (y * canvasWidth + x) * 4;
            
            if (!isPointInsideBoundary(x, y, debouncedComputationConfig.walls, canvasWidth, canvasHeight, debouncedComputationConfig.sensors)) {
              // Outside boundary - make it completely transparent
              data[index] = 0;       // Red
              data[index + 1] = 0;   // Green
              data[index + 2] = 0;   // Blue
              data[index + 3] = 0;   // Alpha (transparent)
            } else {
              // Inside boundary - white background with opaque heat map colors
              const temp = interpolateTemperaturePhysicsWithCircularBlending(x, y, debouncedComputationConfig.sensors, distanceGrid, ambient_temp, debouncedComputationConfig.walls);
              const color = temperatureToColor(temp, too_cold_temp, too_warm_temp);
              
              const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
              
              // Blend heat map color with white background for full opacity
              const alpha = 0.7; // Heat map color strength
              data[index] = Math.round(rgb[0] * alpha + 255 * (1 - alpha));     // Red blended with white
              data[index + 1] = Math.round(rgb[1] * alpha + 255 * (1 - alpha)); // Green blended with white
              data[index + 2] = Math.round(rgb[2] * alpha + 255 * (1 - alpha)); // Blue blended with white
              data[index + 3] = 255;    // Alpha (fully opaque)
            }
          }
        }

        // Draw to off-screen canvas
        offscreenCtx.putImageData(imageData, 0, 0);

        // Draw walls and sensors on off-screen canvas
        drawOverlay(offscreenCtx, debouncedComputationConfig.walls, debouncedComputationConfig.sensors);

        // Cache the completed canvas for future use
        const cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = canvasWidth;
        cacheCanvas.height = canvasHeight;
        const cacheCtx = cacheCanvas.getContext('2d');
        if (cacheCtx) {
          cacheCtx.drawImage(offscreenCanvas, 0, 0);
          renderedImageCache.set(cacheKey, cacheCanvas);
          
          // Limit cache size to prevent memory issues
          if (renderedImageCache.size > 10) {
            const firstKey = renderedImageCache.keys().next().value;
            if (firstKey) {
              renderedImageCache.delete(firstKey);
            }
          }
        }

        // Copy completed off-screen canvas to main canvas in one operation
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.drawImage(offscreenCanvas, 0, 0);
        
        // Clear computing state
        setIsComputing(false);
      }
    );

    // Cleanup function
    return () => {
      isCancelled = true;
      if (cancelDistanceGrid) {
        cancelDistanceGrid();
      }
      setIsComputing(false);
    };
  }, [debouncedComputationConfig, min_temp, max_temp, too_cold_temp, too_warm_temp, ambient_temp, show_sensor_names, show_sensor_temperatures, isPreviewMode, isEditMode, drawOverlay]);

  return (
    <Card className="h-full bg-transparent border-transparent shadow-none">
      <CardContent className="p-4">
        {currentConfig.title && (
          <h3 className="text-lg font-semibold mb-4">{currentConfig.title}</h3>
        )}
        
        <div className="flex justify-center relative">
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', height: 'auto', background: 'transparent' }}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
          />
          {isComputing && (
            <div className="absolute bottom-2 right-2 bg-white/80 rounded-full p-2 shadow-lg">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin"></div>
            </div>
          )}
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