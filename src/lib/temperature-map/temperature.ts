// =============================================================================
// TEMPERATURE AND COLOR PROCESSING
// =============================================================================
// Temperature interpolation, color mapping, and physics-based heat flow

import type { DistanceGrid, Wall } from './types';
import { getInterpolatedDistance } from './distance';

/**
 * Convert temperature value to RGB color string
 * @param temp Temperature value
 * @param tooCold Temperature threshold for "too cold" (blue)
 * @param tooWarm Temperature threshold for "too warm" (red)
 * @returns RGB color string like "rgb(255, 0, 0)"
 */
export const temperatureToColor = (temp: number, tooCold: number, tooWarm: number): string => {
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

/**
 * Physics-based temperature interpolation using flood fill distances
 * Heat flows naturally around obstacles like water or air
 * @param x Point x coordinate
 * @param y Point y coordinate
 * @param sensors Array of sensor data with positions and temperatures
 * @param distanceGrid Pre-computed distance grid from flood fill
 * @param ambientTemp Default ambient temperature
 * @param walls Array of walls (for future extensions)
 * @returns Interpolated temperature at the given point
 */
export const interpolateTemperaturePhysics = (
  x: number,
  y: number,
  sensors: Array<{ x: number; y: number; temp: number }>,
  distanceGrid: DistanceGrid,
  ambientTemp: number = 22,
  _walls?: Wall[]
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
    const dominanceRadius = 8; // Smaller radius to match smaller sensor dots
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

/**
 * Enhanced interpolation with circular blending around sensors to prevent square artifacts
 * @param x Point x coordinate
 * @param y Point y coordinate 
 * @param sensors Array of sensor data with positions and temperatures
 * @param distanceGrid Pre-computed distance grid from flood fill
 * @param ambientTemp Default ambient temperature
 * @param walls Array of walls
 * @returns Interpolated temperature with circular blending
 */
export const interpolateTemperaturePhysicsWithCircularBlending = (
  x: number, 
  y: number, 
  sensors: Array<{ x: number; y: number; temp: number }>, 
  distanceGrid: DistanceGrid,
  ambientTemp: number,
  walls: Wall[]
): number => {
  // First, check if we're very close to any sensor for circular blending
  for (const sensor of sensors) {
    const directDistance = Math.sqrt((x - sensor.x) ** 2 + (y - sensor.y) ** 2);
    const blendRadius = 12; // Circular blending radius around sensor
    
    if (directDistance <= blendRadius) {
      // Get the base interpolated temperature (without this sensor's direct influence)
      const basTemp = interpolateTemperaturePhysics(x, y, sensors, distanceGrid, ambientTemp, walls);
      
      // Calculate circular blend factor (1.0 at sensor center, 0.0 at blend radius)
      const blendFactor = Math.max(0, (blendRadius - directDistance) / blendRadius);
      
      // Apply smooth circular blending curve
      const smoothBlend = blendFactor * blendFactor * (3 - 2 * blendFactor); // Smoothstep
      
      // Blend between sensor temperature and base interpolated temperature
      return sensor.temp * smoothBlend + basTemp * (1 - smoothBlend);
    }
  }
  
  // If not near any sensor, use normal physics interpolation
  return interpolateTemperaturePhysics(x, y, sensors, distanceGrid, ambientTemp, walls);
};

// getInterpolatedDistance is now imported from './distance'