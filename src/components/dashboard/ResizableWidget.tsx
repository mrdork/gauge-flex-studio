import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useGridLayout } from './GridLayoutManager';

interface ResizableWidgetProps {
  children: React.ReactNode;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
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
  initialX = 0,
  initialY = 0,
  minWidth = 200,
  minHeight = 150,
  maxWidth = 1200,
  maxHeight = 800,
  className
}) => {
  const widgetId = useRef(`widget-${Math.random().toString(36).substr(2, 9)}`).current;
  const { registerWidget, updateWidget, removeWidget, checkCollision, getSnappedPosition, pushWidgets, preventOverlap } = useGridLayout();
  
  const [position, setPosition] = useState({ x: initialX, y: initialY, width: initialWidth, height: initialHeight });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startMouseX: number; startMouseY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  // Register widget with grid layout
  useEffect(() => {
    registerWidget(widgetId, { ...position, id: widgetId });
    return () => removeWidget(widgetId);
  }, []);

  // Update grid layout when position changes
  useEffect(() => {
    updateWidget(widgetId, position);
  }, [position]);

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return; // Only drag from header
    e.preventDefault();
    setIsDragging(true);
    
    dragRef.current = {
      startX: position.x,
      startY: position.y,
      startMouseX: e.clientX,
      startMouseY: e.clientY
    };

    const handleDragMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;

      const deltaX = moveEvent.clientX - dragRef.current.startMouseX;
      const deltaY = moveEvent.clientY - dragRef.current.startMouseY;

      let newX = Math.max(0, dragRef.current.startX + deltaX);
      let newY = Math.max(0, dragRef.current.startY + deltaY);

      // Get snapped position
      const snapped = getSnappedPosition(widgetId, { x: newX, y: newY });
      if (snapped.x !== undefined) newX = snapped.x;
      if (snapped.y !== undefined) newY = snapped.y;

      // Prevent overlapping with other widgets
      const nonOverlappingPosition = preventOverlap(widgetId, { x: newX, y: newY });
      if (nonOverlappingPosition.x !== undefined) newX = nonOverlappingPosition.x;
      if (nonOverlappingPosition.y !== undefined) newY = nonOverlappingPosition.y;
      
      // Update position
      setPosition(prev => ({ ...prev, x: newX, y: newY }));
    };

    const handleDragUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragUp);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragUp);
  }, [position, widgetId, getSnappedPosition, preventOverlap]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: position.width,
      startHeight: position.height
    };

    const handleResizeMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;

      const deltaX = moveEvent.clientX - resizeRef.current.startX;
      const deltaY = moveEvent.clientY - resizeRef.current.startY;

      let newWidth = Math.max(minWidth, Math.min(maxWidth, resizeRef.current.startWidth + deltaX));
      let newHeight = Math.max(minHeight, Math.min(maxHeight, resizeRef.current.startHeight + deltaY));

      // Get snapped size
      const snapped = getSnappedPosition(widgetId, { width: newWidth, height: newHeight });
      if (snapped.width !== undefined) newWidth = snapped.width;
      if (snapped.height !== undefined) newHeight = snapped.height;

      // Prevent overlapping with other widgets
      const nonOverlappingPosition = preventOverlap(widgetId, { width: newWidth, height: newHeight });
      if (nonOverlappingPosition.width !== undefined) newWidth = nonOverlappingPosition.width;
      if (nonOverlappingPosition.height !== undefined) newHeight = nonOverlappingPosition.height;
      
      // Update size
      setPosition(prev => ({ ...prev, width: newWidth, height: newHeight }));
    };

    const handleResizeUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeUp);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeUp);
  }, [position, minWidth, minHeight, maxWidth, maxHeight, widgetId, getSnappedPosition, preventOverlap]);

  return (
    <div
      ref={widgetRef}
      className={cn(
        'absolute bg-widget border border-widget-border rounded-lg shadow-sm overflow-hidden',
        'transition-all duration-200',
        (isResizing || isDragging) && 'shadow-lg ring-2 ring-resize-active border-resize-active z-50',
        isDragging && 'cursor-move',
        className
      )}
      style={{ 
        left: position.x, 
        top: position.y,
        width: position.width, 
        height: position.height 
      }}
    >
      {/* Header */}
      {title && (
        <div 
          className={cn(
            "px-4 py-3 border-b border-widget-border bg-muted/30 cursor-move",
            isDragging && "cursor-grabbing"
          )}
          onMouseDown={handleDragMouseDown}
        >
          <h3 className="text-sm font-medium text-foreground select-none">{title}</h3>
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
        onMouseDown={handleResizeMouseDown}
      >
        <div className="absolute bottom-1 right-1 w-3 h-3">
          <div className="absolute bottom-0 right-0 w-1 h-3 bg-current"></div>
          <div className="absolute bottom-0 right-0 w-3 h-1 bg-current"></div>
          <div className="absolute bottom-1 right-1 w-1 h-2 bg-current"></div>
          <div className="absolute bottom-1 right-1 w-2 h-1 bg-current"></div>
        </div>
      </div>

      {/* Visual feedback during resize/drag */}
      {(isResizing || isDragging) && (
        <div className="absolute inset-0 border-2 border-resize-active rounded-lg pointer-events-none"></div>
      )}
    </div>
  );
};