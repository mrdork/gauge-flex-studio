import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ResizableWidgetProps {
  children: React.ReactNode;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}

export const ResizableWidget: React.FC<ResizableWidgetProps> = ({
  children,
  title,
  initialWidth = 300,
  initialHeight = 200,
  minWidth = 200,
  minHeight = 150,
  maxWidth = 800,
  maxHeight = 600,
  className
}) => {
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isResizing, setIsResizing] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;

      const deltaX = moveEvent.clientX - resizeRef.current.startX;
      const deltaY = moveEvent.clientY - resizeRef.current.startY;

      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeRef.current.startWidth + deltaX));
      const newHeight = Math.max(minHeight, Math.min(maxHeight, resizeRef.current.startHeight + deltaY));

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [size, minWidth, minHeight, maxWidth, maxHeight]);

  return (
    <div
      ref={widgetRef}
      className={cn(
        'relative bg-widget border border-widget-border rounded-lg shadow-sm overflow-hidden',
        'transition-all duration-200',
        isResizing && 'shadow-lg ring-2 ring-resize-active border-resize-active',
        className
      )}
      style={{ width: size.width, height: size.height }}
    >
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b border-widget-border bg-muted/30">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
      )}

      {/* Content */}
      <div className={cn(
        'p-4 h-full overflow-auto',
        title && 'h-[calc(100%-57px)]'
      )}>
        {children}
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          'absolute bottom-0 right-0 w-4 h-4 cursor-se-resize',
          'bg-resize-handle hover:bg-resize-active transition-colors duration-150',
          'opacity-0 hover:opacity-100',
          isResizing && 'opacity-100 bg-resize-active'
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute bottom-1 right-1 w-3 h-3">
          <div className="absolute bottom-0 right-0 w-1 h-3 bg-current"></div>
          <div className="absolute bottom-0 right-0 w-3 h-1 bg-current"></div>
          <div className="absolute bottom-1 right-1 w-1 h-2 bg-current"></div>
          <div className="absolute bottom-1 right-1 w-2 h-1 bg-current"></div>
        </div>
      </div>

      {/* Resize borders (visible during resize) */}
      {isResizing && (
        <>
          <div className="absolute inset-0 border-2 border-resize-active rounded-lg pointer-events-none"></div>
        </>
      )}
    </div>
  );
};