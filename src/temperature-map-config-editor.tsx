import React, { useState, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as yaml from 'js-yaml';
import type { Wall, TemperatureSensor } from '@/lib/temperature-map/types';

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

interface ConfigEditorProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({ config, onConfigChange }) => {
  const [wallsYaml, setWallsYaml] = useState(yaml.dump(config.walls));
  const [sensorsYaml, setSensorsYaml] = useState(yaml.dump(config.sensors));
  const [wallsError, setWallsError] = useState<string | null>(null);
  const [sensorsError, setSensorsError] = useState<string | null>(null);

  // Update config when form values change
  const updateConfig = (updates: Partial<Config>) => {
    const newConfig = { ...config, ...updates };
    onConfigChange(newConfig);
  };

  const handleWallsChange = (value: string) => {
    setWallsYaml(value);
    try {
      const parsedWalls = yaml.load(value);
      if (Array.isArray(parsedWalls)) {
        updateConfig({ walls: parsedWalls });
        setWallsError(null);
      } else {
        setWallsError('Walls must be an array');
      }
    } catch (error) {
      setWallsError(`YAML Error: ${error instanceof Error ? error.message : 'Invalid YAML'}`);
    }
  };

  const handleSensorsChange = (value: string) => {
    setSensorsYaml(value);
    try {
      const parsedSensors = yaml.load(value);
      if (Array.isArray(parsedSensors)) {
        updateConfig({ sensors: parsedSensors });
        setSensorsError(null);
      } else {
        setSensorsError('Sensors must be an array');
      }
    } catch (error) {
      setSensorsError(`YAML Error: ${error instanceof Error ? error.message : 'Invalid YAML'}`);
    }
  };

  // Update YAML when config changes externally
  useEffect(() => {
    setWallsYaml(yaml.dump(config.walls));
    setSensorsYaml(yaml.dump(config.sensors));
  }, [config.walls, config.sensors]);

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 'bold' }}>Temperature Map Card Configuration</h3>
        
        {/* General Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>General Settings</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Title</label>
              <input
                type="text"
                value={config.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                placeholder="Card title"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Rotation</label>
              <select
                value={config.rotation || 0}
                onChange={(e) => updateConfig({ rotation: parseInt(e.target.value) as 0 | 90 | 180 | 270 })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
              >
                <option value={0}>0°</option>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Width</label>
              <input
                type="number"
                value={config.width || ''}
                onChange={(e) => updateConfig({ width: e.target.value ? parseInt(e.target.value) : undefined })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                placeholder="Auto"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Height</label>
              <input
                type="number"
                value={config.height || ''}
                onChange={(e) => updateConfig({ height: e.target.value ? parseInt(e.target.value) : undefined })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
                placeholder="Auto"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Padding</label>
              <input
                type="number"
                value={config.padding || 0}
                onChange={(e) => updateConfig({ padding: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>

        {/* Temperature Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Temperature Settings</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Min Temperature</label>
              <input
                type="number"
                value={config.min_temp || 15}
                onChange={(e) => updateConfig({ min_temp: parseFloat(e.target.value) || 15 })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Max Temperature</label>
              <input
                type="number"
                value={config.max_temp || 30}
                onChange={(e) => updateConfig({ max_temp: parseFloat(e.target.value) || 30 })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Too Cold Temp</label>
              <input
                type="number"
                value={config.too_cold_temp || 20}
                onChange={(e) => updateConfig({ too_cold_temp: parseFloat(e.target.value) || 20 })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Too Warm Temp</label>
              <input
                type="number"
                value={config.too_warm_temp || 26}
                onChange={(e) => updateConfig({ too_warm_temp: parseFloat(e.target.value) || 26 })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Ambient Temp</label>
              <input
                type="number"
                value={config.ambient_temp || 22}
                onChange={(e) => updateConfig({ ambient_temp: parseFloat(e.target.value) || 22 })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Display Settings</h4>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={config.show_sensor_names !== false}
                onChange={(e) => updateConfig({ show_sensor_names: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Show sensor names
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={config.show_sensor_temperatures !== false}
                onChange={(e) => updateConfig({ show_sensor_temperatures: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Show sensor temperatures
            </label>
          </div>
        </div>

        {/* Walls Configuration */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Walls Configuration</h4>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Walls (YAML Array)</label>
            <textarea
              value={wallsYaml}
              onChange={(e) => handleWallsChange(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: wallsError ? '1px solid #ef4444' : '1px solid #ccc', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                minHeight: '128px'
              }}
              placeholder='- x1: 0\n  y1: 0\n  x2: 200\n  y2: 0'
            />
            {wallsError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{wallsError}</p>}
          </div>
        </div>

        {/* Sensors Configuration */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Sensors Configuration</h4>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>Sensors (YAML Array)</label>
            <textarea
              value={sensorsYaml}
              onChange={(e) => handleSensorsChange(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                border: sensorsError ? '1px solid #ef4444' : '1px solid #ccc', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                minHeight: '128px'
              }}
              placeholder='- entity: sensor.temp\n  x: 100\n  y: 100\n  label: Living Room'
            />
            {sensorsError && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{sensorsError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

class TemperatureMapConfigEditor extends HTMLElement {
  private config: Config = { walls: [], sensors: [] };
  private root: Root | null = null;

  connectedCallback() {
    this.root = createRoot(this);
    this.render();
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
    }
  }

  setConfig(config: Config) {
    this.config = { ...config };
    this.render();
  }

  private configChanged(newConfig: Config) {
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private render() {
    if (this.root) {
      this.root.render(
        <ConfigEditor
          config={this.config}
          onConfigChange={(newConfig) => this.configChanged(newConfig)}
        />
      );
    }
  }
}

customElements.define('temperature-map-card-editor', TemperatureMapConfigEditor);

export { TemperatureMapConfigEditor };