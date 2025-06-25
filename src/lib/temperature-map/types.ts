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

export interface Config {
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

export interface DistanceGrid {
  distances: number[][][]; // [sensorIndex][y][x] = distance
  width: number;
  height: number;
}

export interface SensorData {
  x: number;
  y: number;
  temp: number;
  label: string;
  entity: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface MousePosition {
  x: number;
  y: number;
  sensor: SensorData | null;
}