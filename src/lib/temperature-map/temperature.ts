// =============================================================================
// TEMPERATURE AND COLOR PROCESSING
// =============================================================================
// Temperature interpolation, color mapping, and physics-based heat flow

import type { DistanceGrid, Wall } from "./types";
import { getInterpolatedDistance } from "./distance";

/**
 * Convert temperature value to RGB color string based on comfort zone
 * @param temp Temperature value
 * @param comfortMin Minimum comfort temperature (below this appears blue/cold)
 * @param comfortMax Maximum comfort temperature (above this appears red/hot)
 * @returns RGB color string like "rgb(255, 0, 0)"
 */
export const temperatureToColor = (
  temp: number,
  comfortMin: number,
  comfortMax: number,
): string => {
  // Define transition zones for smooth boundaries
  const transitionRange = 2; // Degrees for smooth transition

  // Far below comfortMin: Pure blue gradients
  if (temp <= comfortMin - transitionRange) {
    // Create gradient from dark blue to medium blue
    const coldRange = 8; // Range for cold gradient
    const minTemp = comfortMin - transitionRange - coldRange;
    const coldNormalized = Math.max(
      0,
      Math.min(1, (temp - minTemp) / coldRange),
    );

    // Dark blue (0, 0, 128) to medium blue (0, 0, 255)
    const blue = Math.round(128 + (255 - 128) * coldNormalized);
    return `rgb(0, 0, ${blue})`;
  }

  // Transition zone: Blue to green (smooth boundary around comfortMin)
  if (temp <= comfortMin) {
    const transitionNormalized =
      (temp - (comfortMin - transitionRange)) / transitionRange;

    // Transition from blue (0, 0, 255) to blue-green (0, 255, 128)
    const red = 0;
    const green = Math.round(255 * transitionNormalized);
    const blue = Math.round(255 - (255 - 128) * transitionNormalized);

    return `rgb(${red}, ${green}, ${blue})`;
  }

  // Far above comfortMax: Red gradients
  if (temp >= comfortMax + transitionRange) {
    // Create gradient from medium red to dark red
    const warmRange = 8; // Range for warm gradient
    const warmNormalized = Math.max(
      0,
      Math.min(1, (temp - (comfortMax + transitionRange)) / warmRange),
    );

    // Medium red (255, 0, 0) to dark red (180, 0, 0)
    const red = Math.round(255 - (255 - 180) * warmNormalized);
    return `rgb(${red}, 0, 0)`;
  }

  // Transition zone: Yellow to red (smooth boundary around comfortMax)
  if (temp >= comfortMax) {
    const transitionNormalized = (temp - comfortMax) / transitionRange;

    // Transition from yellow (255, 255, 0) to orange-red (255, 128, 0)
    const red = 255;
    const green = Math.round(255 - (255 - 128) * transitionNormalized);
    const blue = 0;

    return `rgb(${red}, ${green}, ${blue})`;
  }

  // Comfort zone: Blue-green -> Green -> Yellow gradient
  const comfortRange = comfortMax - comfortMin;
  const normalizedTemp = (temp - comfortMin) / comfortRange;

  // Start from blue-green (0, 255, 128) -> Green (0, 255, 0) -> Yellow (255, 255, 0)
  if (normalizedTemp <= 0.3) {
    // First part: blue-green to pure green
    const partNormalized = normalizedTemp / 0.3;
    const red = 0;
    const green = 255;
    const blue = Math.round(128 * (1 - partNormalized));
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    // Second part: green to yellow
    const partNormalized = (normalizedTemp - 0.3) / 0.7;
    const red = Math.round(255 * partNormalized);
    const green = 255;
    const blue = 0;
    return `rgb(${red}, ${green}, ${blue})`;
  }
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
  _walls?: Wall[], // eslint-disable-line @typescript-eslint/no-unused-vars
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
        effectiveDistance: Infinity,
      };
    }

    // Sensor dominance radius - within this distance, use exact sensor temperature
    const dominanceRadius = 8; // Smaller radius to match smaller sensor dots
    if (pathDistance <= dominanceRadius) {
      return {
        ...sensor,
        influence: 100, // High but not overwhelming influence
        pathDistance,
        effectiveDistance: pathDistance,
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
      effectiveDistance,
    };
  });

  // Filter out unreachable sensors
  const reachableSensors = sensorInfluences.filter((s) => s.influence > 0);

  // If no sensors can reach this point, use ambient temperature
  if (reachableSensors.length === 0) {
    return ambientTemp;
  }

  // Natural temperature blending - no artificial dominance boosts
  // Heat spreads naturally based on path accessibility
  const totalInfluence = reachableSensors.reduce(
    (sum, s) => sum + s.influence,
    0,
  );

  // Calculate weighted temperature based on natural flow influences
  const weightedTemp =
    reachableSensors.reduce((sum, s) => sum + s.temp * s.influence, 0) /
    totalInfluence;

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
  walls: Wall[],
): number => {
  // First, check if we're very close to any sensor for circular blending
  for (const sensor of sensors) {
    const directDistance = Math.sqrt((x - sensor.x) ** 2 + (y - sensor.y) ** 2);
    const blendRadius = 12; // Circular blending radius around sensor

    if (directDistance <= blendRadius) {
      // Get the base interpolated temperature (without this sensor's direct influence)
      const basTemp = interpolateTemperaturePhysics(
        x,
        y,
        sensors,
        distanceGrid,
        ambientTemp,
        walls,
      );

      // Calculate circular blend factor (1.0 at sensor center, 0.0 at blend radius)
      const blendFactor = Math.max(
        0,
        (blendRadius - directDistance) / blendRadius,
      );

      // Apply smooth circular blending curve
      const smoothBlend = blendFactor * blendFactor * (3 - 2 * blendFactor); // Smoothstep

      // Blend between sensor temperature and base interpolated temperature
      return sensor.temp * smoothBlend + basTemp * (1 - smoothBlend);
    }
  }

  // If not near any sensor, use normal physics interpolation
  return interpolateTemperaturePhysics(
    x,
    y,
    sensors,
    distanceGrid,
    ambientTemp,
    walls,
  );
};

// getInterpolatedDistance is now imported from './distance'
