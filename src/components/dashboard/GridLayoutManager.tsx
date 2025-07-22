import React, { createContext, useContext, useCallback, useState, useRef } from 'react';

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
  checkCollision: (id: string, newPosition: Partial<WidgetPosition>) => WidgetPosition[] | null;
  preventOverlap: (id: string, proposedPosition: Partial<WidgetPosition>) => Partial<WidgetPosition> | null;
  getSnappedPosition: (id: string, position: Partial<WidgetPosition>) => Partial<WidgetPosition>;
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
  React.useEffect(() => {
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
        newWidgets.set(id, { ...current, ...newPosition });
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
  
  const checkCollision = useCallback((id: string, newPosition: Partial<WidgetPosition>): WidgetPosition[] | null => {
    const current = widgetsRef.current.get(id);
    if (!current) return null;

    const proposed = { ...current, ...newPosition };
    const collidingWidgets: WidgetPosition[] = [];

    // Check collision with all other widgets
    for (const [widgetId, widget] of widgetsRef.current) {
      if (widgetId === id) continue;

      const hasCollision = !(
        proposed.x >= widget.x + widget.width ||
        proposed.x + proposed.width <= widget.x ||
        proposed.y >= widget.y + widget.height ||
        proposed.y + proposed.height <= widget.y
      );

      if (hasCollision) {
        collidingWidgets.push(widget);
      }
    }

    return collidingWidgets.length > 0 ? collidingWidgets : null;
  }, []);

  const preventOverlap = useCallback((id: string, proposedPosition: Partial<WidgetPosition>): Partial<WidgetPosition> | null => {
    const current = widgetsRef.current.get(id);
    if (!current) return null;

    const proposed = { ...current, ...proposedPosition };
    let adjustedPosition = { ...proposedPosition };
    let hasCollision = false;

    // Check for collisions with other widgets
    for (const [widgetId, widget] of widgetsRef.current) {
      if (widgetId === id) continue;

      const collision = !(
        proposed.x >= widget.x + widget.width ||
        proposed.x + proposed.width <= widget.x ||
        proposed.y >= widget.y + widget.height ||
        proposed.y + proposed.height <= widget.y
      );

      if (collision) {
        hasCollision = true;
        break;
      }
    }

    // If there's a collision, return null to prevent the move
    return hasCollision ? null : adjustedPosition;
  }, []);

  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / gridSize) * gridSize;
  }, [gridSize]);

  const getSnappedPosition = useCallback((id: string, position: Partial<WidgetPosition>): Partial<WidgetPosition> => {
    const current = widgetsRef.current.get(id);
    if (!current) return position;

    const proposed = { ...current, ...position };
    let snappedX = proposed.x;
    let snappedY = proposed.y;
    let snappedWidth = proposed.width;
    let snappedHeight = proposed.height;

    // Snap to grid
    snappedX = snapToGrid(snappedX);
    snappedY = snapToGrid(snappedY);
    snappedWidth = snapToGrid(snappedWidth);
    snappedHeight = snapToGrid(snappedHeight);

    // Snap to other widgets' edges
    for (const [widgetId, widget] of widgetsRef.current) {
      if (widgetId === id) continue;

      // Horizontal snapping
      const distanceToLeft = Math.abs(proposed.x - widget.x);
      const distanceToRight = Math.abs(proposed.x - (widget.x + widget.width));
      const distanceFromRightToLeft = Math.abs((proposed.x + proposed.width) - widget.x);
      const distanceFromRightToRight = Math.abs((proposed.x + proposed.width) - (widget.x + widget.width));

      if (distanceToLeft < snapThreshold) snappedX = widget.x;
      if (distanceToRight < snapThreshold) snappedX = widget.x + widget.width;
      if (distanceFromRightToLeft < snapThreshold) snappedX = widget.x - proposed.width;
      if (distanceFromRightToRight < snapThreshold) snappedX = widget.x + widget.width - proposed.width;

      // Vertical snapping
      const distanceToTop = Math.abs(proposed.y - widget.y);
      const distanceToBottom = Math.abs(proposed.y - (widget.y + widget.height));
      const distanceFromBottomToTop = Math.abs((proposed.y + proposed.height) - widget.y);
      const distanceFromBottomToBottom = Math.abs((proposed.y + proposed.height) - (widget.y + widget.height));

      if (distanceToTop < snapThreshold) snappedY = widget.y;
      if (distanceToBottom < snapThreshold) snappedY = widget.y + widget.height;
      if (distanceFromBottomToTop < snapThreshold) snappedY = widget.y - proposed.height;
      if (distanceFromBottomToBottom < snapThreshold) snappedY = widget.y + widget.height - proposed.height;
    }

    return {
      x: snappedX,
      y: snappedY,
      width: snappedWidth,
      height: snappedHeight
    };
  }, [snapThreshold, snapToGrid]);

  const value = {
    widgets,
    registerWidget,
    updateWidget,
    removeWidget,
    checkCollision,
    preventOverlap,
    getSnappedPosition,
    gridSize
  };

  return (
    <GridLayoutContext.Provider value={value}>
      {children}
    </GridLayoutContext.Provider>
  );
};
