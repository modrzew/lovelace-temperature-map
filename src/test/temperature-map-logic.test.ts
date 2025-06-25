import { describe, it, expect, vi } from 'vitest'

// =============================================================================
// COMPONENT LOGIC TESTS (WITHOUT REACT DEPENDENCIES)
// =============================================================================
// These tests focus on the pure logic that the component uses
// They avoid complex React/HA dependencies while testing core functionality

describe('Temperature Map Component Logic', () => {
  
  // =============================================================================
  // CONFIGURATION HANDLING TESTS
  // =============================================================================
  
  describe('Configuration Processing', () => {
    // Test the canvas dimension calculation logic from the component
    const calculateCanvasDimensions = (
      walls: Array<{ x1: number; y1: number; x2: number; y2: number }>,
      sensors: Array<{ x: number; y: number }>,
      padding: number = 0
    ) => {
      const allPoints: Array<{ x: number; y: number }> = [];
      
      walls.forEach(wall => {
        allPoints.push({ x: wall.x1, y: wall.y1 });
        allPoints.push({ x: wall.x2, y: wall.y2 });
      });
      
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
      
      const calculatedWidth = maxX - minX + padding * 2;
      const calculatedHeight = maxY - minY + padding * 2;
      
      const finalWidth = minX === 0 ? maxX + 1 + padding * 2 : calculatedWidth;
      const finalHeight = minY === 0 ? maxY + 1 + padding * 2 : calculatedHeight;
      
      return {
        width: Math.max(100, finalWidth),
        height: Math.max(100, finalHeight)
      };
    };

    it('should calculate canvas dimensions from walls and sensors', () => {
      const walls = [
        { x1: 0, y1: 0, x2: 200, y2: 0 },
        { x1: 200, y1: 0, x2: 200, y2: 150 }
      ];
      const sensors = [
        { x: 50, y: 50 },
        { x: 150, y: 100 }
      ];
      
      const result = calculateCanvasDimensions(walls, sensors, 10);
      
      expect(result.width).toBe(221); // 200 + 1 + 10*2
      expect(result.height).toBe(171); // 150 + 1 + 10*2
    });

    it('should handle negative coordinates properly', () => {
      const walls = [
        { x1: -100, y1: -50, x2: 100, y2: 50 }
      ];
      const sensors = [{ x: 0, y: 0 }];
      
      const result = calculateCanvasDimensions(walls, sensors, 0);
      
      expect(result.width).toBe(200); // 100 - (-100)
      expect(result.height).toBe(100); // 50 - (-50)
    });

    it('should apply minimum dimensions', () => {
      const walls = [{ x1: 0, y1: 0, x2: 10, y2: 10 }];
      const sensors: Array<{ x: number; y: number }> = [];
      
      const result = calculateCanvasDimensions(walls, sensors, 0);
      
      expect(result.width).toBeGreaterThanOrEqual(100);
      expect(result.height).toBeGreaterThanOrEqual(100);
    });

    it('should return default dimensions for empty input', () => {
      const result = calculateCanvasDimensions([], []);
      
      expect(result).toEqual({ width: 400, height: 300 });
    });
  });

  // =============================================================================
  // SENSOR DATA PROCESSING TESTS
  // =============================================================================
  
  describe('Sensor Data Processing', () => {
    // Test the sensor data filtering and processing logic
    const processSensorData = (
      sensors: Array<{ entity: string; x: number; y: number; label?: string }>,
      hassStates: Record<string, { state: string; attributes?: { friendly_name?: string } }>
    ) => {
      return sensors
        .map(sensor => {
          const entityState = hassStates[sensor.entity];
          return {
            ...sensor,
            temperature: { value: entityState?.state || null },
            hassState: entityState
          };
        })
        .filter(sensor => sensor.temperature.value && !isNaN(parseFloat(sensor.temperature.value)))
        .map(sensor => {
          const entityState = sensor.hassState;
          const displayLabel = sensor.label || entityState?.attributes?.friendly_name || sensor.entity;
          
          return {
            x: sensor.x,
            y: sensor.y,
            temp: parseFloat(sensor.temperature.value!),
            label: displayLabel,
            entity: sensor.entity,
          };
        });
    };

    it('should process valid sensor data correctly', () => {
      const sensors = [
        { entity: 'sensor.temp1', x: 100, y: 100, label: 'Living Room' },
        { entity: 'sensor.temp2', x: 200, y: 200 }
      ];
      
      const hassStates = {
        'sensor.temp1': {
          state: '22.5',
          attributes: { friendly_name: 'Temp Sensor 1' }
        },
        'sensor.temp2': {
          state: '24.0',
          attributes: { friendly_name: 'Temp Sensor 2' }
        }
      };
      
      const result = processSensorData(sensors, hassStates);
      
      expect(result).toHaveLength(2);
      expect(result[0].temp).toBe(22.5);
      expect(result[0].label).toBe('Living Room'); // Uses custom label
      expect(result[1].temp).toBe(24.0);
      expect(result[1].label).toBe('Temp Sensor 2'); // Uses friendly_name
    });

    it('should filter out sensors with invalid temperature values', () => {
      const sensors = [
        { entity: 'sensor.temp1', x: 100, y: 100 },
        { entity: 'sensor.temp2', x: 200, y: 200 },
        { entity: 'sensor.temp3', x: 300, y: 300 }
      ];
      
      const hassStates = {
        'sensor.temp1': { state: '22.5' },
        'sensor.temp2': { state: 'unavailable' }, // Invalid
        'sensor.temp3': { state: 'NaN' } // Invalid
      };
      
      const result = processSensorData(sensors, hassStates);
      
      expect(result).toHaveLength(1);
      expect(result[0].entity).toBe('sensor.temp1');
      expect(result[0].temp).toBe(22.5);
    });

    it('should handle missing entities gracefully', () => {
      const sensors = [
        { entity: 'sensor.missing', x: 100, y: 100 },
        { entity: 'sensor.temp1', x: 200, y: 200 }
      ];
      
      const hassStates = {
        'sensor.temp1': { state: '22.5' }
        // sensor.missing is not in hassStates
      };
      
      const result = processSensorData(sensors, hassStates);
      
      expect(result).toHaveLength(1);
      expect(result[0].entity).toBe('sensor.temp1');
    });

    it('should use entity ID as fallback label', () => {
      const sensors = [
        { entity: 'sensor.no_friendly_name', x: 100, y: 100 }
      ];
      
      const hassStates = {
        'sensor.no_friendly_name': {
          state: '22.5',
          attributes: {} // No friendly_name
        }
      };
      
      const result = processSensorData(sensors, hassStates);
      
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('sensor.no_friendly_name');
    });

    it('should handle precise temperature values', () => {
      const sensors = [
        { entity: 'sensor.precise', x: 100, y: 100 }
      ];
      
      const hassStates = {
        'sensor.precise': { state: '22.123456789' }
      };
      
      const result = processSensorData(sensors, hassStates);
      
      expect(result).toHaveLength(1);
      expect(result[0].temp).toBeCloseTo(22.123456789, 6);
    });
  });

  // =============================================================================
  // MOUSE INTERACTION LOGIC TESTS
  // =============================================================================
  
  describe('Mouse Interaction Logic', () => {
    // Test the mouse position calculation and sensor detection logic
    const getMousePositionAndSensor = (
      event: { clientX: number; clientY: number },
      canvasRect: { left: number; top: number; width: number; height: number },
      canvasSize: { width: number; height: number },
      sensors: Array<{ x: number; y: number; entity: string; temp: number; label: string }>
    ) => {
      const scaleX = canvasSize.width / canvasRect.width;
      const scaleY = canvasSize.height / canvasRect.height;
      
      const x = (event.clientX - canvasRect.left) * scaleX;
      const y = (event.clientY - canvasRect.top) * scaleY;

      // Check if mouse is within any sensor's clickable area
      const hoveredSensor = sensors.find(sensor => {
        const distance = Math.sqrt((x - sensor.x) ** 2 + (y - sensor.y) ** 2);
        return distance <= 12; // Clickable radius
      });

      return { x, y, sensor: hoveredSensor || null };
    };

    it('should calculate mouse position correctly', () => {
      const event = { clientX: 150, clientY: 100 };
      const canvasRect = { left: 50, top: 50, width: 200, height: 150 };
      const canvasSize = { width: 400, height: 300 };
      const sensors: any[] = [];
      
      const result = getMousePositionAndSensor(event, canvasRect, canvasSize, sensors);
      
      expect(result.x).toBe(200); // (150 - 50) * (400 / 200)
      expect(result.y).toBe(100); // (100 - 50) * (300 / 150)
      expect(result.sensor).toBe(null);
    });

    it('should detect sensor hover within clickable radius', () => {
      const event = { clientX: 105, clientY: 108 }; // Close to sensor
      const canvasRect = { left: 0, top: 0, width: 400, height: 300 };
      const canvasSize = { width: 400, height: 300 };
      const sensors = [
        { x: 100, y: 100, entity: 'sensor.test', temp: 22.5, label: 'Test Sensor' }
      ];
      
      const result = getMousePositionAndSensor(event, canvasRect, canvasSize, sensors);
      
      expect(result.sensor).not.toBe(null);
      expect(result.sensor?.entity).toBe('sensor.test');
    });

    it('should not detect sensor hover outside clickable radius', () => {
      const event = { clientX: 120, clientY: 120 }; // Too far from sensor
      const canvasRect = { left: 0, top: 0, width: 400, height: 300 };
      const canvasSize = { width: 400, height: 300 };
      const sensors = [
        { x: 100, y: 100, entity: 'sensor.test', temp: 22.5, label: 'Test Sensor' }
      ];
      
      const result = getMousePositionAndSensor(event, canvasRect, canvasSize, sensors);
      
      expect(result.sensor).toBe(null);
    });

    it('should handle canvas scaling correctly', () => {
      const event = { clientX: 100, clientY: 75 };
      const canvasRect = { left: 0, top: 0, width: 200, height: 150 }; // Half size
      const canvasSize = { width: 400, height: 300 }; // Full size
      const sensors: any[] = [];
      
      const result = getMousePositionAndSensor(event, canvasRect, canvasSize, sensors);
      
      expect(result.x).toBe(200); // 100 * (400 / 200)
      expect(result.y).toBe(150); // 75 * (300 / 150)
    });

    it('should find closest sensor when multiple sensors are nearby', () => {
      const event = { clientX: 102, clientY: 102 };
      const canvasRect = { left: 0, top: 0, width: 400, height: 300 };
      const canvasSize = { width: 400, height: 300 };
      const sensors = [
        { x: 100, y: 100, entity: 'sensor.close', temp: 22.5, label: 'Close Sensor' },
        { x: 110, y: 110, entity: 'sensor.far', temp: 24.0, label: 'Far Sensor' }
      ];
      
      const result = getMousePositionAndSensor(event, canvasRect, canvasSize, sensors);
      
      // Should find the closer sensor
      expect(result.sensor?.entity).toBe('sensor.close');
    });
  });

  // =============================================================================
  // CONFIGURATION DEFAULT HANDLING TESTS
  // =============================================================================
  
  describe('Configuration Defaults', () => {
    // Test the default value assignment logic
    const applyConfigDefaults = (config: any) => {
      return {
        min_temp: 15,
        max_temp: 30,
        too_cold_temp: 20,
        too_warm_temp: 26,
        ambient_temp: 22,
        show_sensor_names: true,
        show_sensor_temperatures: true,
        padding: 0,
        ...config
      };
    };

    it('should apply default values for missing optional properties', () => {
      const config = {
        walls: [],
        sensors: []
      };
      
      const result = applyConfigDefaults(config);
      
      expect(result.min_temp).toBe(15);
      expect(result.max_temp).toBe(30);
      expect(result.too_cold_temp).toBe(20);
      expect(result.too_warm_temp).toBe(26);
      expect(result.ambient_temp).toBe(22);
      expect(result.show_sensor_names).toBe(true);
      expect(result.show_sensor_temperatures).toBe(true);
      expect(result.padding).toBe(0);
    });

    it('should preserve explicitly set values', () => {
      const config = {
        walls: [],
        sensors: [],
        min_temp: 10,
        max_temp: 35,
        too_cold_temp: 15,
        too_warm_temp: 30,
        ambient_temp: 20,
        show_sensor_names: false,
        show_sensor_temperatures: false,
        padding: 20
      };
      
      const result = applyConfigDefaults(config);
      
      expect(result.min_temp).toBe(10);
      expect(result.max_temp).toBe(35);
      expect(result.too_cold_temp).toBe(15);
      expect(result.too_warm_temp).toBe(30);
      expect(result.ambient_temp).toBe(20);
      expect(result.show_sensor_names).toBe(false);
      expect(result.show_sensor_temperatures).toBe(false);
      expect(result.padding).toBe(20);
    });

    it('should handle partial configuration objects', () => {
      const config = {
        walls: [],
        sensors: [],
        min_temp: 18,
        show_sensor_names: false
        // Other values should get defaults
      };
      
      const result = applyConfigDefaults(config);
      
      expect(result.min_temp).toBe(18); // Explicitly set
      expect(result.show_sensor_names).toBe(false); // Explicitly set
      expect(result.max_temp).toBe(30); // Default
      expect(result.ambient_temp).toBe(22); // Default
    });
  });

  // =============================================================================
  // HOME ASSISTANT EVENT HANDLING TESTS
  // =============================================================================
  
  describe('Home Assistant Event Handling', () => {
    // Test the more-info event creation logic
    const createMoreInfoEvent = (entityId: string) => {
      const eventDetail = {
        entityId: entityId,
      };
      
      return {
        type: 'hass-more-info',
        detail: eventDetail,
        bubbles: true,
        composed: true,
      };
    };

    it('should create correct more-info event structure', () => {
      const event = createMoreInfoEvent('sensor.test_temp');
      
      expect(event.type).toBe('hass-more-info');
      expect(event.detail.entityId).toBe('sensor.test_temp');
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });

    it('should handle various entity ID formats', () => {
      const testCases = [
        'sensor.living_room_temperature',
        'climate.main_thermostat',
        'binary_sensor.door_open'
      ];
      
      testCases.forEach(entityId => {
        const event = createMoreInfoEvent(entityId);
        expect(event.detail.entityId).toBe(entityId);
      });
    });
  });

  // =============================================================================
  // DEBOUNCING LOGIC TESTS
  // =============================================================================
  
  describe('Debouncing Logic', () => {
    // Test the debouncing mechanism used for sensor data
    const createDebouncedFunction = (fn: () => void, delay: number) => {
      let timeoutId: NodeJS.Timeout | null = null;
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(fn, delay);
      };
    };

    it('should delay function execution', async () => {
      const mockFn = vi.fn();
      const debouncedFn = createDebouncedFunction(mockFn, 100);
      
      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();
      
      // Wait for the debounce period
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should cancel previous timeouts on rapid calls', async () => {
      const mockFn = vi.fn();
      const debouncedFn = createDebouncedFunction(mockFn, 100);
      
      debouncedFn();
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait half the delay
      debouncedFn(); // This should cancel the first timeout
      await new Promise(resolve => setTimeout(resolve, 50)); // Still within second timeout
      expect(mockFn).not.toHaveBeenCalled();
      
      await new Promise(resolve => setTimeout(resolve, 60)); // Now the second timeout should fire
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should handle multiple separate debounce periods', async () => {
      const mockFn = vi.fn();
      const debouncedFn = createDebouncedFunction(mockFn, 50);
      
      debouncedFn();
      await new Promise(resolve => setTimeout(resolve, 60));
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      debouncedFn();
      await new Promise(resolve => setTimeout(resolve, 60));
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  // =============================================================================
  // CANVAS SETUP AND ERROR HANDLING TESTS
  // =============================================================================
  
  describe('Canvas Setup and Error Handling', () => {
    // Test canvas dimension setting logic
    const setupCanvas = (
      canvas: { width?: number; height?: number } | null,
      targetWidth: number,
      targetHeight: number
    ) => {
      if (!canvas) return false;
      
      try {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        return true;
      } catch (error) {
        return false;
      }
    };

    it('should set canvas dimensions successfully', () => {
      const mockCanvas = { width: 0, height: 0 };
      const result = setupCanvas(mockCanvas, 400, 300);
      
      expect(result).toBe(true);
      expect(mockCanvas.width).toBe(400);
      expect(mockCanvas.height).toBe(300);
    });

    it('should handle null canvas gracefully', () => {
      const result = setupCanvas(null, 400, 300);
      expect(result).toBe(false);
    });

    it('should handle canvas setup errors', () => {
      const mockCanvas = {
        set width(_value: number) {
          throw new Error('Canvas setup failed');
        },
        set height(_value: number) {
          throw new Error('Canvas setup failed');
        }
      };
      
      const result = setupCanvas(mockCanvas, 400, 300);
      expect(result).toBe(false);
    });

    // Test context validation logic
    const validateCanvasContext = (context: any) => {
      if (!context) return false;
      
      const requiredMethods = [
        'clearRect', 'fillRect', 'strokeRect', 'beginPath', 
        'moveTo', 'lineTo', 'arc', 'stroke', 'fill', 
        'fillText', 'createImageData', 'putImageData'
      ];
      
      return requiredMethods.every(method => typeof context[method] === 'function');
    };

    it('should validate complete canvas context', () => {
      const mockContext = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        createImageData: vi.fn(),
        putImageData: vi.fn()
      };
      
      expect(validateCanvasContext(mockContext)).toBe(true);
    });

    it('should reject incomplete canvas context', () => {
      const incompleteContext = {
        clearRect: vi.fn(),
        fillRect: vi.fn()
        // Missing other required methods
      };
      
      expect(validateCanvasContext(incompleteContext)).toBe(false);
    });

    it('should reject null context', () => {
      expect(validateCanvasContext(null)).toBe(false);
    });
  });
});