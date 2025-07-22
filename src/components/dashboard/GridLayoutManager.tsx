import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';

export interface WidgetPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GridLayoutContextType {
  widgets: Map<string, WidgetPosition>;
  registerWidget: (id: string, position: WidgetPosition) => void;
  updateWidget: (id: string, position: Partial<WidgetPosition>) => void;
  removeWidget: (id: string) => void;
  moveWidget: (id: string, newX: number, newY: number) => void;
  resizeWidget: (id: string, newWidth: number, newHeight: number) => void;
  getSnappedPosition: (x: number, y: number) => { x: number, y: number };
  getSnappedSize: (width: number, height: number) => { width: number, height: number };
  gridSize: number;
}

const GridLayoutContext = createContext<GridLayoutContextType | null>(null);

export const useGridLayout = () => {
  const context = useContext(GridLayoutContext);
  if (!context) {
    throw new Error('useGridLayout must be used within a GridLayoutProvider');
  }
  return context;
};

interface GridLayoutProviderProps {
  children: React.ReactNode;
  gridSize?: number;
  snapThreshold?: number;
}

export const GridLayoutProvider: React.FC<GridLayoutProviderProps> = ({
  children,
  gridSize = 20,
  snapThreshold = 10
}) => {
  const [widgets, setWidgets] = useState<Map<string, WidgetPosition>>(new Map());
  const widgetsRef = useRef<Map<string, WidgetPosition>>(new Map());

  // Keep ref in sync with state
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const registerWidget = useCallback((id: string, position: WidgetPosition) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev);
      newWidgets.set(id, position);
      return newWidgets;
    });
  }, []);

  const updateWidget = useCallback((id: string, newPosition: Partial<WidgetPosition>) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev);
      const current = newWidgets.get(id);
      if (current) {
        const updatedWidget = { ...current, ...newPosition };
        newWidgets.set(id, updatedWidget);
        
        // Dispatch event to notify the widget of position update
        window.dispatchEvent(new CustomEvent('widget-update', {
          detail: updatedWidget
        }));
      }
      return newWidgets;
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev);
      newWidgets.delete(id);
      return newWidgets;
    });
  }, []);

  const getSnappedPosition = useCallback((x: number, y: number) => {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }, [gridSize]);

  const getSnappedSize = useCallback((width: number, height: number) => {
    return {
      width: Math.round(width / gridSize) * gridSize,
      height: Math.round(height / gridSize) * gridSize
    };
  }, [gridSize]);

  const checkCollision = useCallback((widgetId: string, newBox: { x: number, y: number, width: number, height: number }): WidgetPosition[] => {
    const collisions: WidgetPosition[] = [];
    
    for (const [id, widget] of widgetsRef.current.entries()) {
      if (id === widgetId) continue;
      
      // Check if the boxes overlap
      if (!(
        newBox.x >= widget.x + widget.width ||
        newBox.x + newBox.width <= widget.x ||
        newBox.y >= widget.y + widget.height ||
        newBox.y + newBox.height <= widget.y
      )) {
        collisions.push(widget);
      }
    }
    
    return collisions;
  }, []);

  // Calculate the direction to push a widget
  const calculatePushDirection = useCallback((movingWidget: { x: number, y: number, width: number, height: number }, targetWidget: WidgetPosition) => {
    // Calculate overlap in each direction
    const overlapRight = movingWidget.x + movingWidget.width - targetWidget.x;
    const overlapLeft = targetWidget.x + targetWidget.width - movingWidget.x;
    const overlapBottom = movingWidget.y + movingWidget.height - targetWidget.y;
    const overlapTop = targetWidget.y + targetWidget.height - movingWidget.y;
    
    // Find the smallest overlap
    const minOverlap = Math.min(overlapRight, overlapLeft, overlapBottom, overlapTop);
    
    if (minOverlap === overlapRight) return { dx: overlapRight, dy: 0 };
    if (minOverlap === overlapLeft) return { dx: -overlapLeft, dy: 0 };
    if (minOverlap === overlapBottom) return { dx: 0, dy: overlapBottom };
    return { dx: 0, dy: -overlapTop };
  }, []);

  // Push all affected widgets
  const pushAffectedWidgets = useCallback((widgetsToPush: Map<string, { dx: number, dy: number }>) => {
    // Process all pushes at once
    setWidgets(prev => {
      const newWidgets = new Map(prev);
      
      for (const [id, push] of widgetsToPush.entries()) {
        const widget = newWidgets.get(id);
        if (widget) {
          newWidgets.set(id, {
            ...widget,
            x: Math.max(0, widget.x + push.dx),
            y: Math.max(0, widget.y + push.dy)
          });
        }
      }
      
      return newWidgets;
    });
  }, []);

  // Move a widget and push others out of the way
  const moveWidget = useCallback((widgetId: string, newX: number, newY: number) => {
    const widget = widgetsRef.current.get(widgetId);
    if (!widget) return;
    
    // Snap to grid
    const snapped = getSnappedPosition(newX, newY);
    
    // First, update the position of the moving widget
    const updatedWidget = { ...widget, x: snapped.x, y: snapped.y };
    
    // Update widget immediately
    updateWidget(widgetId, { x: snapped.x, y: snapped.y });
    
    // Check for collisions
    const collisions = checkCollision(widgetId, updatedWidget);
    
    if (collisions.length > 0) {
      // Prepare a map of all widgets to push
      const widgetsToPush = new Map<string, { dx: number, dy: number }>();
      const processedWidgets = new Set<string>([widgetId]);
      
      // Process widgets in queue to handle cascading pushes
      const pushQueue = [...collisions];
      
      while (pushQueue.length > 0) {
        const targetWidget = pushQueue.shift()!;
        if (processedWidgets.has(targetWidget.id)) continue;
        
        processedWidgets.add(targetWidget.id);
        
        // Calculate how to push this widget
        const movingBox = widgetsRef.current.get(widgetId) || updatedWidget;
        const pushDirection = calculatePushDirection(movingBox, targetWidget);
        
        // Adjust push direction if needed to avoid negative positions
        const finalPush = {
          dx: targetWidget.x + pushDirection.dx < 0 ? -targetWidget.x : pushDirection.dx,
          dy: targetWidget.y + pushDirection.dy < 0 ? -targetWidget.y : pushDirection.dy
        };
        
        // Store the push
        widgetsToPush.set(targetWidget.id, finalPush);
        
        // Check if this push creates new collisions
        const pushedTargetPosition = {
          x: targetWidget.x + finalPush.dx,
          y: targetWidget.y + finalPush.dy,
          width: targetWidget.width,
          height: targetWidget.height
        };
        
        const secondaryCollisions = checkCollision(targetWidget.id, pushedTargetPosition);
        
        // Add any new collisions to the queue
        for (const collision of secondaryCollisions) {
          if (!processedWidgets.has(collision.id)) {
            pushQueue.push(collision);
          }
        }
      }
      
      // Apply all pushes at once
      if (widgetsToPush.size > 0) {
        pushAffectedWidgets(widgetsToPush);
      }
    }
  }, [getSnappedPosition, updateWidget, checkCollision, calculatePushDirection, pushAffectedWidgets]);

  // Resize a widget and push others out of the way
  const resizeWidget = useCallback((widgetId: string, newWidth: number, newHeight: number) => {
    const widget = widgetsRef.current.get(widgetId);
    if (!widget) return;
    
    // Snap to grid
    const snapped = getSnappedSize(newWidth, newHeight);
    
    // Enforce minimum and maximum sizes
    const finalWidth = Math.max(100, Math.min(1200, snapped.width));
    const finalHeight = Math.max(100, Math.min(800, snapped.height));
    
    // First, update the size of the resizing widget
    const updatedWidget = { ...widget, width: finalWidth, height: finalHeight };
    
    // Update widget immediately
    updateWidget(widgetId, { width: finalWidth, height: finalHeight });
    
    // Check for collisions
    const collisions = checkCollision(widgetId, updatedWidget);
    
    if (collisions.length > 0) {
      // Prepare a map of all widgets to push
      const widgetsToPush = new Map<string, { dx: number, dy: number }>();
      const processedWidgets = new Set<string>([widgetId]);
      
      // Process widgets in queue to handle cascading pushes
      const pushQueue = [...collisions];
      
      while (pushQueue.length > 0) {
        const targetWidget = pushQueue.shift()!;
        if (processedWidgets.has(targetWidget.id)) continue;
        
        processedWidgets.add(targetWidget.id);
        
        // Calculate how to push this widget
        const movingBox = widgetsRef.current.get(widgetId) || updatedWidget;
        const pushDirection = calculatePushDirection(movingBox, targetWidget);
        
        // Adjust push direction if needed to avoid negative positions
        const finalPush = {
          dx: targetWidget.x + pushDirection.dx < 0 ? -targetWidget.x : pushDirection.dx,
          dy: targetWidget.y + pushDirection.dy < 0 ? -targetWidget.y : pushDirection.dy
        };
        
        // Store the push
        widgetsToPush.set(targetWidget.id, finalPush);
        
        // Check if this push creates new collisions
        const pushedTargetPosition = {
          x: targetWidget.x + finalPush.dx,
          y: targetWidget.y + finalPush.dy,
          width: targetWidget.width,
          height: targetWidget.height
        };
        
        const secondaryCollisions = checkCollision(targetWidget.id, pushedTargetPosition);
        
        // Add any new collisions to the queue
        for (const collision of secondaryCollisions) {
          if (!processedWidgets.has(collision.id)) {
            pushQueue.push(collision);
          }
        }
      }
      
      // Apply all pushes at once
      if (widgetsToPush.size > 0) {
        pushAffectedWidgets(widgetsToPush);
      }
    }
  }, [getSnappedSize, updateWidget, checkCollision, calculatePushDirection, pushAffectedWidgets]);

  const value = {
    widgets,
    registerWidget,
    updateWidget,
    removeWidget,
    moveWidget,
    resizeWidget,
    getSnappedPosition,
    getSnappedSize,
    gridSize
  };

  return (
    <GridLayoutContext.Provider value={value}>
      {children}
    </GridLayoutContext.Provider>
  );
};
