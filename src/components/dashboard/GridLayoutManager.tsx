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
  preventOverlap: (id: string, proposedPosition: Partial<WidgetPosition>) => Partial<WidgetPosition>;
  getSnappedPosition: (id: string, position: Partial<WidgetPosition>) => Partial<WidgetPosition>;
  pushWidgets: (movingWidgetId: string, newPosition: WidgetPosition) => void;
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

  const preventOverlap = useCallback((id: string, proposedPosition: Partial<WidgetPosition>): Partial<WidgetPosition> => {
    const current = widgetsRef.current.get(id);
    if (!current) return proposedPosition;

    const proposed = { ...current, ...proposedPosition };
    let adjustedPosition = { ...proposedPosition };
    let needsAdjustment = false;

    // Check for collisions with other widgets
    for (const [widgetId, widget] of widgetsRef.current) {
      if (widgetId === id) continue;

      const hasCollision = !(
        proposed.x >= widget.x + widget.width ||
        proposed.x + proposed.width <= widget.x ||
        proposed.y >= widget.y + widget.height ||
        proposed.y + proposed.height <= widget.y
      );

      if (hasCollision) {
        needsAdjustment = true;
        
        // Calculate the minimum adjustments needed in each direction
        const adjustRight = widget.x + widget.width - proposed.x;
        const adjustLeft = proposed.x + proposed.width - widget.x;
        const adjustDown = widget.y + widget.height - proposed.y;
        const adjustUp = proposed.y + proposed.height - widget.y;
        
        // Find the smallest adjustment needed
        const minAdjustment = Math.min(adjustRight, adjustLeft, adjustDown, adjustUp);
        
        // Apply the minimum adjustment to prevent overlap
        if (minAdjustment === adjustRight && 'x' in adjustedPosition) {
          adjustedPosition.x = widget.x + widget.width + 1; // Push right
        } else if (minAdjustment === adjustLeft && 'x' in adjustedPosition) {
          adjustedPosition.x = widget.x - proposed.width - 1; // Push left
        } else if (minAdjustment === adjustDown && 'y' in adjustedPosition) {
          adjustedPosition.y = widget.y + widget.height + 1; // Push down
        } else if (minAdjustment === adjustUp && 'y' in adjustedPosition) {
          adjustedPosition.y = widget.y - proposed.height - 1; // Push up
        }
      }
    }

    return needsAdjustment ? adjustedPosition : proposedPosition;
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

  const pushWidgets = useCallback((movingWidgetId: string, newPosition: WidgetPosition) => {
    const collisions = checkCollision(movingWidgetId, newPosition);
    if (!collisions) return;

    // Map to track widgets that have been moved in this operation to avoid infinite loops
    const movedWidgets = new Set([movingWidgetId]);
    
    // Queue to handle cascading pushes
    const pushQueue: { id: string, position: WidgetPosition }[] = 
      collisions.map(widget => ({ id: widget.id, position: { ...widget } }));
    
    // Process queue in a breadth-first manner
    while (pushQueue.length > 0) {
      const current = pushQueue.shift();
      if (!current || movedWidgets.has(current.id)) continue;
      
      const movingWidget = widgetsRef.current.get(movingWidgetId);
      const targetWidget = widgetsRef.current.get(current.id);
      
      if (!movingWidget || !targetWidget) continue;
      
      // Mark as moved to prevent revisiting
      movedWidgets.add(current.id);
      
      // Determine direction to push (horizontal or vertical)
      const overlapX = Math.min(
        movingWidget.x + movingWidget.width - targetWidget.x,
        targetWidget.x + targetWidget.width - movingWidget.x
      );
      
      const overlapY = Math.min(
        movingWidget.y + movingWidget.height - targetWidget.y,
        targetWidget.y + targetWidget.height - movingWidget.y
      );
      
      // Push in the direction of least overlap
      let newWidgetPosition: WidgetPosition;
      
      if (overlapX < overlapY) {
        // Push horizontally
        if (movingWidget.x < targetWidget.x) {
          // Push right
          newWidgetPosition = {
            ...targetWidget,
            x: movingWidget.x + movingWidget.width + 10 // Add a gap
          };
        } else {
          // Push left
          newWidgetPosition = {
            ...targetWidget,
            x: movingWidget.x - targetWidget.width - 10 // Add a gap
          };
        }
      } else {
        // Push vertically
        if (movingWidget.y < targetWidget.y) {
          // Push down
          newWidgetPosition = {
            ...targetWidget,
            y: movingWidget.y + movingWidget.height + 10 // Add a gap
          };
        } else {
          // Push up
          newWidgetPosition = {
            ...targetWidget,
            y: movingWidget.y - targetWidget.height - 10 // Add a gap
          };
        }
      }
      
      // Ensure widget stays in view (non-negative coordinates)
      newWidgetPosition.x = Math.max(0, newWidgetPosition.x);
      newWidgetPosition.y = Math.max(0, newWidgetPosition.y);
      
      // Apply the snapped position
      const snapped = getSnappedPosition(current.id, newWidgetPosition);
      newWidgetPosition = { ...newWidgetPosition, ...snapped };
      
      // Update the widget position
      updateWidget(current.id, newWidgetPosition);
      
      // Check if this widget now collides with others
      const subsequentCollisions = checkCollision(current.id, newWidgetPosition);
      if (subsequentCollisions) {
        subsequentCollisions.forEach(widget => {
          if (!movedWidgets.has(widget.id)) {
            pushQueue.push({ id: widget.id, position: { ...widget } });
          }
        });
      }
    }
  }, [checkCollision, getSnappedPosition, updateWidget]);

  const value = {
    widgets,
    registerWidget,
    updateWidget,
    removeWidget,
    checkCollision,
    preventOverlap,
    getSnappedPosition,
    pushWidgets,
    gridSize
  };

  return (
    <GridLayoutContext.Provider value={value}>
      {children}
    </GridLayoutContext.Provider>
  );
};
