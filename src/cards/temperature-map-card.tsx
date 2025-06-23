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
}

const interpolateTemperature = (
  x: number,
  y: number,
  sensors: Array<{ x: number; y: number; temp: number }>,
): number => {
  if (sensors.length === 0) return 20;
  
  const distances = sensors.map(sensor => ({
    ...sensor,
    distance: Math.sqrt((x - sensor.x) ** 2 + (y - sensor.y) ** 2),
  }));
  
  const epsilon = 0.001;
  const closeSensor = distances.find(d => d.distance < epsilon);
  if (closeSensor) return closeSensor.temp;
  
  const weights = distances.map(d => 1 / (d.distance ** 2));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  return distances.reduce((sum, d, i) => sum + (d.temp * weights[i]), 0) / totalWeight;
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
  
  // Simple bounding box check - if outside the outer bounds, definitely outside
  if (x < minX || x > maxX || y < minY || y > maxY) {
    return false;
  }
  
  // For now, use simple bounding box. Could be enhanced with proper polygon intersection
  return true;
};

export const TemperatureMapCard = ({ hass, config }: ReactCardProps<Config>) => {
  useSignals();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentConfig = config.value;
  
  const sensorStates = currentConfig.sensors.map(sensor => ({
    ...sensor,
    temperature: useEntityStateValue(hass, sensor.entity),
  }));

  const { 
    width = 400, 
    height = 300, 
    min_temp = 15, 
    max_temp = 30,
    too_cold_temp = 20,
    too_warm_temp = 26
  } = currentConfig;

  const sensorData = useMemo(() => 
    sensorStates
      .filter(sensor => sensor.temperature.value && !isNaN(parseFloat(sensor.temperature.value)))
      .map(sensor => ({
        x: sensor.x,
        y: sensor.y,
        temp: parseFloat(sensor.temperature.value),
        label: sensor.label,
        entity: sensor.entity,
      })),
    [sensorStates]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sensorData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        if (!isPointInsideBoundary(x, y, currentConfig.walls)) {
          // Outside boundary - make it white/transparent
          data[index] = 255;     // Red
          data[index + 1] = 255; // Green
          data[index + 2] = 255; // Blue
          data[index + 3] = 0;   // Alpha (transparent)
        } else {
          // Inside boundary - interpolate temperature and color
          const temp = interpolateTemperature(x, y, sensorData);
          const color = temperatureToColor(temp, too_cold_temp, too_warm_temp);
          
          const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
          
          data[index] = rgb[0];     // Red
          data[index + 1] = rgb[1]; // Green
          data[index + 2] = rgb[2]; // Blue
          data[index + 3] = 120;    // Alpha (semi-transparent)
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    currentConfig.walls.forEach(wall => {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    });

    sensorData.forEach(sensor => {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sensor.x, sensor.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#333';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${sensor.temp.toFixed(1)}°`, sensor.x, sensor.y - 12);
      
      if (sensor.label) {
        ctx.fillText(sensor.label, sensor.x, sensor.y + 24);
      }
    });

  }, [sensorData, currentConfig.walls, width, height, min_temp, max_temp, too_cold_temp, too_warm_temp]);

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