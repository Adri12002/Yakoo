import { useRef, useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';

interface HandwritingCanvasProps {
  width?: string | number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export default function HandwritingCanvas({
  // width = '100%', // Removed unused width
  height = 300,
  strokeColor = '#374151',
  strokeWidth = 4,
}: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high-DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      contextRef.current = ctx;
    }
    
    // Maintain visual size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;

  }, [height, strokeColor, strokeWidth]);

  const startDrawing = ({ nativeEvent }: { nativeEvent: MouseEvent | TouchEvent }) => {
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }: { nativeEvent: MouseEvent | TouchEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(nativeEvent);
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  const getCoordinates = (event: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };

    if ('touches' in event) {
      const rect = canvas.getBoundingClientRect();
      const touch = event.touches[0];
      return {
        offsetX: touch.clientX - rect.left,
        offsetY: touch.clientY - rect.top
      };
    } else {
      return {
        offsetX: (event as MouseEvent).offsetX,
        offsetY: (event as MouseEvent).offsetY
      };
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && contextRef.current) {
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="relative w-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 touch-none">
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); clearCanvas(); }}
          className="p-2 bg-white text-gray-600 rounded shadow-sm hover:bg-gray-100 transition-colors"
          title="Clear"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={finishDrawing}
        onTouchMove={draw}
        className="block cursor-crosshair"
        style={{ width: '100%', height: `${height}px` }}
      />
      <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-400 pointer-events-none select-none">
        Draw Hanzi Here
      </div>
    </div>
  );
}

