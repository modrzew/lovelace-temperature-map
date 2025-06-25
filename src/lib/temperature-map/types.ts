// =============================================================================
// TEMPERATURE MAP TYPES
// =============================================================================
// Shared type definitions for the temperature map functionality

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TemperatureSensor {
  entity: string;
  x: number;
  y: number;
  label?: string;
}


export interface DistanceGrid {
  distances: number[][][]; // [sensorIndex][y][x] = distance
  width: number;
  height: number;
}


export interface Point {
  x: number;
  y: number;
}

