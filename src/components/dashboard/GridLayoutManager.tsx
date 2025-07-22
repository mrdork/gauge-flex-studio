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
  pushWidgets: (movingWidgetId: string, proposedPosition: WidgetPosition) => void;
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

  // Push other widgets out of the way when a collision occurs
  const pushWidgets = useCallback((movingWidgetId: string, proposedPosition: WidgetPosition) => {
    // Keep track of widgets that have been moved
    const movedWidgetIds = new Set<string>([movingWidgetId]);
    
    // Create a queue for widgets that need to be moved
    let widgetsToMove: Array<{id: string, widget: WidgetPosition}> = [];
    
    // Check if the moving widget collides with any others
    for (const [widgetId, widget] of widgetsRef.current.entries()) {
      if (widgetId === movingWidgetId) continue;
      
      // Check for collision
      const hasCollision = !(
        proposedPosition.x >= widget.x + widget.width ||
        proposedPosition.x + proposedPosition.width <= widget.x ||
        proposedPosition.y >= widget.y + widget.height ||
        proposedPosition.y + proposedPosition.height <= widget.y
      );
      
      if (hasCollision) {
        widgetsToMove.push({id: widgetId, widget});
      }
    }
    
    // Process each colliding widget
    while (widgetsToMove.length > 0) {
      const {id: targetId, widget: targetWidget} = widgetsToMove.shift()!;
      
      // Skip if already moved
      if (movedWidgetIds.has(targetId)) continue;
      
      // Mark as moved
      movedWidgetIds.add(targetId);
      
      // Calculate the minimum movement needed in each direction
      const pushRight = proposedPosition.x + proposedPosition.width - targetWidget.x + 10;
      const pushLeft = targetWidget.x + targetWidget.width - proposedPosition.x + 10;
      const pushDown = proposedPosition.y + proposedPosition.height - targetWidget.y + 10;
      const pushUp = targetWidget.y + targetWidget.height - proposedPosition.y + 10;
      
      // Find the smallest push distance
      const minPush = Math.min(pushRight, pushLeft, pushDown, pushUp);
      
      // Create new position based on minimal push
      let newPosition: WidgetPosition;
      
      if (minPush === pushRight) {
        // Push right
        newPosition = { ...targetWidget, x: targetWidget.x + pushRight };
      } else if (minPush === pushLeft) {
        // Push left
        newPosition = { ...targetWidget, x: targetWidget.x - pushLeft };
      } else if (minPush === pushDown) {
        // Push down
        newPosition = { ...targetWidget, y: targetWidget.y + pushDown };
      } else {
        // Push up
        newPosition = { ...targetWidget, y: targetWidget.y - pushUp };
      }
      
      // Ensure the widget stays in view (non-negative position)
      newPosition.x = Math.max(0, newPosition.x);
      newPosition.y = Math.max(0, newPosition.y);
      
      // Update the widget position
      updateWidget(targetId, newPosition);
      
      // Check if this newly positioned widget now collides with others
      for (const [widgetId, widget] of widgetsRef.current.entries()) {
        if (widgetId === movingWidgetId || widgetId === targetId || movedWidgetIds.has(widgetId)) continue;
        
        // Check for collision with the newly positioned widget
        const hasCollision = !(
          newPosition.x >= widget.x + widget.width ||
          newPosition.x + newPosition.width <= widget.x ||
          newPosition.y >= widget.y + widget.height ||
          newPosition.y + newPosition.height <= widget.y
        );
        
        if (hasCollision) {
          widgetsToMove.push({id: widgetId, widget});
        }
      }
    }
  }, [updateWidget]);

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
