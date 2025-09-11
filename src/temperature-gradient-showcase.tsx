import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { temperatureToColor } from "@/lib/temperature-map/temperature";
import { interpolateTemperaturePhysicsWithCircularBlending } from "@/lib/temperature-map/temperature";
import { computeDistanceGridAsync } from "@/lib/temperature-map/distance";
import type { Wall, DistanceGrid } from "@/lib/temperature-map/types";

// Helper function to promisify the distance grid computation
const computeDistanceGridPromise = (
  sensors: Array<{ x: number; y: number }>,
  walls: Wall[],
  dimensions: { width: number; height: number },
): Promise<DistanceGrid> => {
  return new Promise((resolve) => {
    // Add temp property to sensors (required by the function)
    const sensorsWithTemp = sensors.map((s) => ({ ...s, temp: 0 }));

    computeDistanceGridAsync(
      sensorsWithTemp,
      walls,
      dimensions.width,
      dimensions.height,
      () => {}, // onProgress - we don't need progress for the showcase
      (grid) => resolve(grid), // onComplete
    );
  });
};

interface DiscreteColorStripProps {
  comfortMinTemp: number;
  comfortMaxTemp: number;
  minTemp?: number;
  maxTemp?: number;
}

const DiscreteColorStrip: React.FC<DiscreteColorStripProps> = ({
  comfortMinTemp,
  comfortMaxTemp,
  minTemp = 18,
  maxTemp = 30,
}) => {
  const [hoveredTemp, setHoveredTemp] = useState<number | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  // Generate temperature steps (0.2°C increments for performance)
  const temperatures = [];
  for (let temp = minTemp; temp <= maxTemp; temp += 0.2) {
    temperatures.push(Math.round(temp * 10) / 10); // Round to 1 decimal
  }

  const handleMouseEnter = (temp: number) => {
    const color = temperatureToColor(temp, comfortMinTemp, comfortMaxTemp);
    setHoveredTemp(temp);
    setHoveredColor(color);
  };

  const handleMouseLeave = () => {
    setHoveredTemp(null);
    setHoveredColor(null);
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2">
        Direct Temperature Color Mapping
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Hover over any section to see the exact temperature and RGB color value
      </p>

      <div className="relative">
        {/* Color strip */}
        <div
          className="flex border border-gray-300 rounded overflow-hidden"
          style={{ height: "40px" }}
        >
          {temperatures.map((temp) => {
            const color = temperatureToColor(
              temp,
              comfortMinTemp,
              comfortMaxTemp,
            );
            const width = `${100 / temperatures.length}%`;

            return (
              <div
                key={temp}
                style={{
                  backgroundColor: color,
                  width,
                  height: "100%",
                  cursor: "pointer",
                }}
                onMouseEnter={() => handleMouseEnter(temp)}
                onMouseLeave={handleMouseLeave}
                title={`${temp}°C: ${color}`}
              />
            );
          })}
        </div>

        {/* Temperature labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>{minTemp}°C</span>
          <span className="text-blue-600 font-medium">
            {comfortMinTemp}°C (Comfort Min)
          </span>
          <span className="text-red-600 font-medium">
            {comfortMaxTemp}°C (Comfort Max)
          </span>
          <span>{maxTemp}°C</span>
        </div>

        {/* Hover info */}
        {hoveredTemp !== null && hoveredColor && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
            <strong>Temperature:</strong> {hoveredTemp}°C <br />
            <strong>Color:</strong> {hoveredColor}
            <div
              className="inline-block w-4 h-4 ml-2 border border-gray-300"
              style={{ backgroundColor: hoveredColor }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

interface InterpolatedHeatMapDemoProps {
  comfortMinTemp: number;
  comfortMaxTemp: number;
  ambientTemp?: number;
}

const InterpolatedHeatMapDemo: React.FC<InterpolatedHeatMapDemoProps> = ({
  comfortMinTemp,
  comfortMaxTemp,
  ambientTemp = 22,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clickedPoint, setClickedPoint] = useState<{
    x: number;
    y: number;
    temp: number;
  } | null>(null);

  const width = 400;
  const height = 200;

  // Dummy sensors in a line - memoized to prevent unnecessary re-renders
  const dummySensors = useMemo(
    () => [
      { x: 50, y: 100, temp: 18, label: "18°C" },
      { x: 100, y: 100, temp: 20, label: "20°C" },
      { x: 150, y: 100, temp: 22, label: "22°C" },
      { x: 200, y: 100, temp: 24, label: "24°C" },
      { x: 250, y: 100, temp: 26, label: "26°C" },
      { x: 300, y: 100, temp: 28, label: "28°C" },
      { x: 350, y: 100, temp: 30, label: "30°C" },
    ],
    [],
  );

  const walls = useMemo(() => [] as Wall[], []); // No walls for this demo

  const drawHeatMap = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Compute distance grid
    const distanceGrid = await computeDistanceGridPromise(
      dummySensors.map((s) => ({ x: s.x, y: s.y })),
      walls,
      { width, height },
    );

    // Create image data
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Render temperature field
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;

        const temp = interpolateTemperaturePhysicsWithCircularBlending(
          x,
          y,
          dummySensors,
          distanceGrid,
          ambientTemp,
          walls,
        );

        const color = temperatureToColor(temp, comfortMinTemp, comfortMaxTemp);
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];

        // Blend with white background for visibility
        const alpha = 0.8;
        data[index] = Math.round(rgb[0] * alpha + 255 * (1 - alpha)); // Red
        data[index + 1] = Math.round(rgb[1] * alpha + 255 * (1 - alpha)); // Green
        data[index + 2] = Math.round(rgb[2] * alpha + 255 * (1 - alpha)); // Blue
        data[index + 3] = 255; // Alpha
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw sensor points
    dummySensors.forEach((sensor) => {
      // Sensor circle
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.arc(sensor.x, sensor.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Temperature label
      ctx.fillStyle = "#000";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(sensor.label, sensor.x, sensor.y - 15);
    });
  }, [comfortMinTemp, comfortMaxTemp, ambientTemp, dummySensors, walls]);

  useEffect(() => {
    const runDrawHeatMap = async () => {
      await drawHeatMap();
    };
    runDrawHeatMap();
  }, [drawHeatMap]);

  const handleCanvasClick = async (
    event: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Compute distance grid for interpolation
    const distanceGrid = await computeDistanceGridPromise(
      dummySensors.map((s) => ({ x: s.x, y: s.y })),
      walls,
      { width, height },
    );

    const temp = interpolateTemperaturePhysicsWithCircularBlending(
      x,
      y,
      dummySensors,
      distanceGrid,
      ambientTemp,
      walls,
    );

    setClickedPoint({ x, y, temp: Math.round(temp * 10) / 10 });
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-2">Interpolated Heat Map Demo</h3>
      <p className="text-sm text-gray-600 mb-4">
        Click anywhere on the heat map to see the interpolated temperature at
        that point
      </p>

      <div className="border border-gray-300 rounded p-4 bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          className="cursor-crosshair border border-gray-200"
        />

        {clickedPoint && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
            <strong>Clicked Point:</strong> ({clickedPoint.x}, {clickedPoint.y}){" "}
            <br />
            <strong>Interpolated Temperature:</strong> {clickedPoint.temp}°C
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          Black circles represent temperature sensors. The colors show how
          temperatures blend between sensors.
        </div>
      </div>
    </div>
  );
};

interface ComfortZoneControlsProps {
  comfortMinTemp: number;
  comfortMaxTemp: number;
  onComfortMinChange: (value: number) => void;
  onComfortMaxChange: (value: number) => void;
}

const ComfortZoneControls: React.FC<ComfortZoneControlsProps> = ({
  comfortMinTemp,
  comfortMaxTemp,
  onComfortMinChange,
  onComfortMaxChange,
}) => {
  return (
    <div className="mb-8 p-4 bg-gray-50 rounded">
      <h3 className="text-lg font-semibold mb-4">Comfort Zone Controls</h3>
      <p className="text-sm text-gray-600 mb-4">
        Adjust the comfort zone boundaries to see how the gradients change in
        real-time
      </p>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Minimum Comfort Temperature: {comfortMinTemp}°C
          </label>
          <input
            type="range"
            min="15"
            max="25"
            step="0.5"
            value={comfortMinTemp}
            onChange={(e) => onComfortMinChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>15°C</span>
            <span>25°C</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Maximum Comfort Temperature: {comfortMaxTemp}°C
          </label>
          <input
            type="range"
            min="23"
            max="32"
            step="0.5"
            value={comfortMaxTemp}
            onChange={(e) => onComfortMaxChange(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>23°C</span>
            <span>32°C</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>Current Comfort Zone:</strong> {comfortMinTemp}°C to{" "}
        {comfortMaxTemp}°C
        <br />
        <span className="text-blue-600">Blue (Cold):</span> Below{" "}
        {comfortMinTemp}°C |{" "}
        <span className="text-green-600">Green-Yellow (Comfortable):</span>{" "}
        {comfortMinTemp}°C - {comfortMaxTemp}°C |{" "}
        <span className="text-red-600">Red (Hot):</span> Above {comfortMaxTemp}
        °C
      </div>
    </div>
  );
};

export const TemperatureGradientShowcase: React.FC = () => {
  const [comfortMinTemp, setComfortMinTemp] = useState(20);
  const [comfortMaxTemp, setComfortMaxTemp] = useState(26);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">
        Temperature Color Gradient Showcase
      </h2>

      <ComfortZoneControls
        comfortMinTemp={comfortMinTemp}
        comfortMaxTemp={comfortMaxTemp}
        onComfortMinChange={setComfortMinTemp}
        onComfortMaxChange={setComfortMaxTemp}
      />

      <DiscreteColorStrip
        comfortMinTemp={comfortMinTemp}
        comfortMaxTemp={comfortMaxTemp}
      />

      <InterpolatedHeatMapDemo
        comfortMinTemp={comfortMinTemp}
        comfortMaxTemp={comfortMaxTemp}
      />
    </div>
  );
};

export default TemperatureGradientShowcase;
