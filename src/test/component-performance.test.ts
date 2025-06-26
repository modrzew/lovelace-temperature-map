import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test that the component memoization is working
describe('Component Performance Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should have useMemo for rotatedWalls in the component', async () => {
    // Read the component source code to verify useMemo is used
    const fs = await import('fs/promises');
    const componentPath = join(__dirname, '../cards/temperature-map-card.tsx');
    const componentSource = await fs.readFile(componentPath, 'utf-8');
    
    // Check that rotatedWalls uses useMemo
    expect(componentSource).toContain('const rotatedWalls = useMemo(');
    expect(componentSource).toContain('[currentConfig.walls, originalDimensions.width, originalDimensions.height, rotation]');
  });

  it('should have useMemo for rotatedSensors in the component', async () => {
    const fs = await import('fs/promises');
    const componentPath = join(__dirname, '../cards/temperature-map-card.tsx');
    const componentSource = await fs.readFile(componentPath, 'utf-8');
    
    // Check that rotatedSensors uses useMemo
    expect(componentSource).toContain('const rotatedSensors = useMemo(');
    expect(componentSource).toContain('[currentConfig.sensors, originalDimensions.width, originalDimensions.height, rotation]');
  });

  it('should have debounced computation config', async () => {
    const fs = await import('fs/promises');
    const componentPath = join(__dirname, '../cards/temperature-map-card.tsx');
    const componentSource = await fs.readFile(componentPath, 'utf-8');
    
    // Check that debouncedComputationConfig is used
    expect(componentSource).toContain('useDebouncedComputationConfig');
    expect(componentSource).toContain('debouncedComputationConfig');
  });

  it('should use debouncedComputationConfig in useEffect', async () => {
    const fs = await import('fs/promises');
    const componentPath = join(__dirname, '../cards/temperature-map-card.tsx');
    const componentSource = await fs.readFile(componentPath, 'utf-8');
    
    // Check that useEffect uses debouncedComputationConfig
    expect(componentSource).toContain('debouncedComputationConfig.sensors');
    expect(componentSource).toContain('debouncedComputationConfig.walls');
    expect(componentSource).toContain('debouncedComputationConfig.dimensions');
    
    // Check that useEffect dependency array uses debouncedComputationConfig
    expect(componentSource).toContain('[debouncedComputationConfig, min_temp,');
  });

  it('should have reduced useEffect dependencies', async () => {
    const fs = await import('fs/promises');
    const componentPath = join(__dirname, '../cards/temperature-map-card.tsx');
    const componentSource = await fs.readFile(componentPath, 'utf-8');
    
    // Check that the old problematic dependencies are removed
    expect(componentSource).not.toContain('], [debouncedSensorData, rotatedWalls, width, height,');
    
    // Should use the new optimized dependency array
    expect(componentSource).toContain('[debouncedComputationConfig,');
  });
});