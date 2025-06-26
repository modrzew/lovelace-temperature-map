import { describe, it, expect } from 'vitest'

import type { Wall, TemperatureSensor } from '@/lib/temperature-map/types'

// Import the rotation utility functions from the card component
// Since they're currently inline, we'll need to extract them or duplicate them for testing
// For now, let's duplicate the functions for testing

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

// =============================================================================
// ROTATION UTILITIES TESTS
// =============================================================================

describe('Rotation Utilities', () => {
  
  describe('rotatePoint', () => {
    const width = 100;
    const height = 200;
    
    it('should not rotate point when rotation is 0 degrees', () => {
      const result = rotatePoint(30, 50, width, height, 0);
      expect(result).toEqual({ x: 30, y: 50 });
    });
    
    it('should rotate point 90 degrees clockwise', () => {
      const result = rotatePoint(30, 50, width, height, 90);
      expect(result).toEqual({ x: height - 50, y: 30 }); // { x: 150, y: 30 }
    });
    
    it('should rotate point 180 degrees', () => {
      const result = rotatePoint(30, 50, width, height, 180);
      expect(result).toEqual({ x: width - 30, y: height - 50 }); // { x: 70, y: 150 }
    });
    
    it('should rotate point 270 degrees clockwise', () => {
      const result = rotatePoint(30, 50, width, height, 270);
      expect(result).toEqual({ x: 50, y: width - 30 }); // { x: 50, y: 70 }
    });
    
    it('should handle corner points correctly', () => {
      // Top-left corner (0, 0)
      expect(rotatePoint(0, 0, width, height, 90)).toEqual({ x: height, y: 0 });
      expect(rotatePoint(0, 0, width, height, 180)).toEqual({ x: width, y: height });
      expect(rotatePoint(0, 0, width, height, 270)).toEqual({ x: 0, y: width });
      
      // Bottom-right corner (width, height)
      expect(rotatePoint(width, height, width, height, 90)).toEqual({ x: 0, y: width });
      expect(rotatePoint(width, height, width, height, 180)).toEqual({ x: 0, y: 0 });
      expect(rotatePoint(width, height, width, height, 270)).toEqual({ x: height, y: 0 });
    });
  });
  
  describe('rotateWall', () => {
    const width = 100;
    const height = 200;
    const wall: Wall = { x1: 10, y1: 20, x2: 30, y2: 40 };
    
    it('should not rotate wall when rotation is 0 degrees', () => {
      const result = rotateWall(wall, width, height, 0);
      expect(result).toEqual(wall);
    });
    
    it('should rotate wall 90 degrees clockwise', () => {
      const result = rotateWall(wall, width, height, 90);
      expect(result).toEqual({
        x1: height - 20, // 180
        y1: 10,
        x2: height - 40, // 160
        y2: 30
      });
    });
    
    it('should rotate wall 180 degrees', () => {
      const result = rotateWall(wall, width, height, 180);
      expect(result).toEqual({
        x1: width - 10,  // 90
        y1: height - 20, // 180
        x2: width - 30,  // 70
        y2: height - 40  // 160
      });
    });
    
    it('should rotate wall 270 degrees clockwise', () => {
      const result = rotateWall(wall, width, height, 270);
      expect(result).toEqual({
        x1: 20,
        y1: width - 10, // 90
        x2: 40,
        y2: width - 30  // 70
      });
    });
  });
  
  describe('rotateSensor', () => {
    const width = 100;
    const height = 200;
    const sensor: TemperatureSensor = { 
      entity: 'sensor.test', 
      x: 25, 
      y: 75, 
      label: 'Test Sensor' 
    };
    
    it('should not rotate sensor when rotation is 0 degrees', () => {
      const result = rotateSensor(sensor, width, height, 0);
      expect(result).toEqual(sensor);
    });
    
    it('should rotate sensor 90 degrees clockwise', () => {
      const result = rotateSensor(sensor, width, height, 90);
      expect(result).toEqual({
        entity: 'sensor.test',
        x: height - 75, // 125
        y: 25,
        label: 'Test Sensor'
      });
    });
    
    it('should rotate sensor 180 degrees', () => {
      const result = rotateSensor(sensor, width, height, 180);
      expect(result).toEqual({
        entity: 'sensor.test',
        x: width - 25,  // 75
        y: height - 75, // 125
        label: 'Test Sensor'
      });
    });
    
    it('should rotate sensor 270 degrees clockwise', () => {
      const result = rotateSensor(sensor, width, height, 270);
      expect(result).toEqual({
        entity: 'sensor.test',
        x: 75,
        y: width - 25, // 75
        label: 'Test Sensor'
      });
    });
    
    it('should preserve all sensor properties except coordinates', () => {
      const sensorWithAllProps: TemperatureSensor = {
        entity: 'sensor.complex',
        x: 50,
        y: 60,
        label: 'Complex Sensor'
      };
      
      const result = rotateSensor(sensorWithAllProps, width, height, 90);
      expect(result.entity).toBe('sensor.complex');
      expect(result.label).toBe('Complex Sensor');
      expect(result.x).toBe(height - 60);
      expect(result.y).toBe(50);
    });
  });
  
  describe('getRotatedDimensions', () => {
    const width = 100;
    const height = 200;
    
    it('should not change dimensions for 0 degrees rotation', () => {
      const result = getRotatedDimensions(width, height, 0);
      expect(result).toEqual({ width, height });
    });
    
    it('should swap dimensions for 90 degrees rotation', () => {
      const result = getRotatedDimensions(width, height, 90);
      expect(result).toEqual({ width: height, height: width });
    });
    
    it('should not change dimensions for 180 degrees rotation', () => {
      const result = getRotatedDimensions(width, height, 180);
      expect(result).toEqual({ width, height });
    });
    
    it('should swap dimensions for 270 degrees rotation', () => {
      const result = getRotatedDimensions(width, height, 270);
      expect(result).toEqual({ width: height, height: width });
    });
    
    it('should handle square dimensions correctly', () => {
      const squareSize = 100;
      expect(getRotatedDimensions(squareSize, squareSize, 90)).toEqual({ width: squareSize, height: squareSize });
      expect(getRotatedDimensions(squareSize, squareSize, 180)).toEqual({ width: squareSize, height: squareSize });
      expect(getRotatedDimensions(squareSize, squareSize, 270)).toEqual({ width: squareSize, height: squareSize });
    });
  });
  
  describe('Complex rotation scenarios', () => {
    it('should maintain relationships between walls and sensors after rotation', () => {
      const width = 300;
      const height = 400;
      
      // Create a simple room with a wall and sensor
      const wall: Wall = { x1: 50, y1: 50, x2: 250, y2: 50 }; // horizontal wall
      const sensor: TemperatureSensor = { entity: 'sensor.room', x: 150, y: 100 }; // sensor below wall
      
      // Rotate 90 degrees
      const rotatedWall = rotateWall(wall, width, height, 90);
      const rotatedSensor = rotateSensor(sensor, width, height, 90);
      
      // The wall should become vertical, and the sensor should maintain its relative position
      expect(rotatedWall).toEqual({
        x1: height - 50, // 350
        y1: 50,
        x2: height - 50, // 350
        y2: 250
      });
      
      expect(rotatedSensor).toEqual({
        entity: 'sensor.room',
        x: height - 100, // 300
        y: 150
      });
    });
    
    it('should handle multiple sequential rotations correctly', () => {
      const width = 100;
      const height = 200;
      const originalPoint = { x: 30, y: 50 };
      
      // Rotate 90 degrees four times should return to original position
      let rotated = rotatePoint(originalPoint.x, originalPoint.y, width, height, 90);
      const dims90 = getRotatedDimensions(width, height, 90);
      
      rotated = rotatePoint(rotated.x, rotated.y, dims90.width, dims90.height, 90);
      const dims180 = getRotatedDimensions(dims90.width, dims90.height, 90);
      
      rotated = rotatePoint(rotated.x, rotated.y, dims180.width, dims180.height, 90);
      const dims270 = getRotatedDimensions(dims180.width, dims180.height, 90);
      
      rotated = rotatePoint(rotated.x, rotated.y, dims270.width, dims270.height, 90);
      
      expect(rotated).toEqual(originalPoint);
    });
  });
});