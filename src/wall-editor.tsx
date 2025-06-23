import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const defaultWalls = `[
  { x1: 0, y1: 0, x2: 400, y2: 0 },     // Top wall
  { x1: 400, y1: 0, x2: 400, y2: 300 }, // Right wall  
  { x1: 400, y1: 300, x2: 0, y2: 300 }, // Bottom wall
  { x1: 0, y1: 300, x2: 0, y2: 0 },     // Left wall
  { x1: 200, y1: 0, x2: 200, y2: 150 }, // Interior wall dividing left/right
  { x1: 0, y1: 175, x2: 200, y2: 175 }, // Interior wall dividing top/bottom left
]`;

const WallEditor: React.FC = () => {
  const [wallsText, setWallsText] = useState(defaultWalls);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [error, setError] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate canvas dimensions based on wall coordinates
  const getCanvasDimensions = (walls: Wall[]) => {
    if (walls.length === 0) {
      return { width: 400, height: 300, offsetX: 0, offsetY: 0 };
    }
    
    // Find min/max coordinates from all walls
    const allPoints = walls.flatMap(wall => [
      { x: wall.x1, y: wall.y1 },
      { x: wall.x2, y: wall.y2 }
    ]);
    
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));
    
    // Add padding around the walls
    const padding = 50;
    const width = Math.max(400, maxX - minX + padding * 2);
    const height = Math.max(300, maxY - minY + padding * 2);
    
    // Calculate offset to center the walls if they don't start at (0,0)
    const offsetX = minX < 0 ? -minX + padding : (minX > 0 ? padding - minX : padding);
    const offsetY = minY < 0 ? -minY + padding : (minY > 0 ? padding - minY : padding);
    
    return { width, height, offsetX, offsetY };
  };
  
  const { width, height, offsetX, offsetY } = getCanvasDimensions(walls);

  // Parse walls from text
  useEffect(() => {
    try {
      const parsed = eval(`(${wallsText})`);
      if (Array.isArray(parsed)) {
        setWalls(parsed);
        setError('');
      } else {
        setError('Input must be an array of wall objects');
      }
    } catch (e) {
      setError(`Parse error: ${e instanceof Error ? e.message : 'Invalid syntax'}`);
      setWalls([]);
    }
  }, [wallsText]);

  // Draw walls on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Clear canvas with light background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw grid for reference
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw walls
    if (walls.length > 0) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      walls.forEach((wall, index) => {
        ctx.beginPath();
        // Apply offset to center walls in the canvas
        ctx.moveTo(wall.x1 + offsetX, wall.y1 + offsetY);
        ctx.lineTo(wall.x2 + offsetX, wall.y2 + offsetY);
        ctx.stroke();

        // Draw wall index numbers
        const midX = (wall.x1 + wall.x2) / 2 + offsetX;
        const midY = (wall.y1 + wall.y2) / 2 + offsetY;
        ctx.fillStyle = '#007bff';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${index}`, midX, midY - 5);
      });
    }

    // Draw coordinate labels showing actual coordinate ranges
    ctx.fillStyle = '#666';
    ctx.font = '10px system-ui';
    
    if (walls.length > 0) {
      const allPoints = walls.flatMap(wall => [
        { x: wall.x1, y: wall.y1 },
        { x: wall.x2, y: wall.y2 }
      ]);
      const minX = Math.min(...allPoints.map(p => p.x));
      const maxX = Math.max(...allPoints.map(p => p.x));
      const minY = Math.min(...allPoints.map(p => p.y));
      const maxY = Math.max(...allPoints.map(p => p.y));
      
      ctx.textAlign = 'left';
      ctx.fillText(`(${minX},${minY})`, 5, 15);
      ctx.textAlign = 'right';
      ctx.fillText(`(${maxX},${minY})`, width - 5, 15);
      ctx.fillText(`(${maxX},${maxY})`, width - 5, height - 5);
      ctx.textAlign = 'left';
      ctx.fillText(`(${minX},${maxY})`, 5, height - 5);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText('(0,0)', 5, 15);
      ctx.textAlign = 'right';
      ctx.fillText(`(${width},0)`, width - 5, 15);
      ctx.fillText(`(${width},${height})`, width - 5, height - 5);
      ctx.textAlign = 'left';
      ctx.fillText(`(0,${height})`, 5, height - 5);
    }
  }, [walls, width, height]);

  const handleReset = () => {
    setWallsText(defaultWalls);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(wallsText);
  };

  const handleLargeExample = () => {
    const largeWalls = `[
  // Large apartment example
  { x1: 100, y1: 100, x2: 800, y2: 100 },   // Top wall
  { x1: 800, y1: 100, x2: 800, y2: 600 },   // Right wall  
  { x1: 800, y1: 600, x2: 100, y2: 600 },   // Bottom wall
  { x1: 100, y1: 600, x2: 100, y2: 100 },   // Left wall
  { x1: 450, y1: 100, x2: 450, y2: 350 },   // Interior wall 1
  { x1: 100, y1: 350, x2: 450, y2: 350 },   // Interior wall 2
  { x1: 650, y1: 100, x2: 650, y2: 400 },   // Interior wall 3
  { x1: 450, y1: 250, x2: 650, y2: 250 },   // Interior wall 4
]`;
    setWallsText(largeWalls);
  };

  const handleNegativeExample = () => {
    const negativeWalls = `[
  // Example with negative coordinates
  { x1: -200, y1: -100, x2: 300, y2: -100 },   // Top wall
  { x1: 300, y1: -100, x2: 300, y2: 200 },     // Right wall  
  { x1: 300, y1: 200, x2: -200, y2: 200 },     // Bottom wall
  { x1: -200, y1: 200, x2: -200, y2: -100 },   // Left wall
  { x1: 50, y1: -100, x2: 50, y2: 50 },        // Interior wall
]`;
    setWallsText(negativeWalls);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Wall Layout Editor</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4">Wall Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Walls Array (JavaScript syntax):
                </label>
                <textarea
                  value={wallsText}
                  onChange={(e) => setWallsText(e.target.value)}
                  className="w-full h-64 p-3 border rounded font-mono text-sm"
                  placeholder="Enter walls configuration..."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleReset}
                  className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                  Reset Default
                </button>
                <button
                  onClick={handleLargeExample}
                  className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  Large Example
                </button>
                <button
                  onClick={handleNegativeExample}
                  className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                >
                  Negative Coords
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4">Visual Preview</h2>
            
            <div className="space-y-4">
              <div className="border rounded p-2 bg-white">
                <canvas
                  ref={canvasRef}
                  className="border"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>

              <div className="text-sm text-gray-600">
                <p><strong>Canvas:</strong> {width} × {height} pixels (auto-sized)</p>
                <p><strong>Walls:</strong> {walls.length} defined</p>
                <p><strong>Grid:</strong> 50px spacing</p>
                <p><strong>Numbers:</strong> Wall indices for reference</p>
                {walls.length > 0 && (
                  <p><strong>Bounds:</strong> 
                    {(() => {
                      const allPoints = walls.flatMap(wall => [
                        { x: wall.x1, y: wall.y1 },
                        { x: wall.x2, y: wall.y2 }
                      ]);
                      const minX = Math.min(...allPoints.map(p => p.x));
                      const maxX = Math.max(...allPoints.map(p => p.x));
                      const minY = Math.min(...allPoints.map(p => p.y));
                      const maxY = Math.max(...allPoints.map(p => p.y));
                      return ` (${minX},${minY}) to (${maxX},${maxY})`;
                    })()}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded text-sm">
                <p><strong>Wall format:</strong></p>
                <code>{'{ x1: startX, y1: startY, x2: endX, y2: endY }'}</code>
                <p className="mt-2"><strong>Auto-sizing:</strong></p>
                <p>• Canvas adjusts to fit all walls</p>
                <p>• 50px padding added around walls</p>
                <p>• Minimum size: 400×300 pixels</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Instructions */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">Usage Instructions</h2>
          <div className="prose text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>Edit the walls array in the left panel using JavaScript syntax</li>
              <li>Each wall is defined by start point (x1, y1) and end point (x2, y2)</li>
              <li>The visual preview updates in real-time as you type</li>
              <li>Use the grid lines (50px spacing) as reference for positioning</li>
              <li>Wall indices are shown as blue numbers for easy identification</li>
              <li>Copy the final configuration to use in your Home Assistant card</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p><strong>Tip:</strong> Start with exterior walls (canvas boundaries) then add interior walls for rooms.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WallEditor;