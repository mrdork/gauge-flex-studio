import React, { useState, useEffect } from 'react';
import { ResizableWidget } from './ResizableWidget';
import { MetricWidget } from './MetricWidget';
import { ChartWidget } from './ChartWidget';
import { TableWidget } from './TableWidget';

// Sample data
const sampleTableData = [
  { company: 'Tech Corp', tickets: 45, priority: 'High', status: 'Open' },
  { company: 'Data Inc', tickets: 23, priority: 'Medium', status: 'In Progress' },
  { company: 'Cloud Systems', tickets: 67, priority: 'Low', status: 'Resolved' },
  { company: 'AI Solutions', tickets: 12, priority: 'High', status: 'Open' },
  { company: 'Web Dev Co', tickets: 34, priority: 'Medium', status: 'Closed' },
];

const sampleChartData = [
  { name: 'Critical', value: 4 },
  { name: 'High', value: 15 },
  { name: 'Medium', value: 8 },
  { name: 'Low', value: 3 },
];

const sampleBarData = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 22 },
  { name: 'Fri', value: 18 },
  { name: 'Sat', value: 8 },
  { name: 'Sun', value: 5 },
];

const tableColumns = [
  { key: 'company', label: 'Company', width: '40%' },
  { key: 'tickets', label: 'Tickets', width: '20%', align: 'center' as const },
  { key: 'priority', label: 'Priority', width: '20%', align: 'center' as const },
  { key: 'status', label: 'Status', width: '20%', align: 'center' as const },
];

// Define initial widget layouts
const initialWidgets = [
  { id: 'schedules', title: 'Schedules Today', x: 20, y: 20, width: 250, height: 200 },
  { id: 'open-tickets', title: 'Open Tickets', x: 290, y: 20, width: 250, height: 200 },
  { id: 'stale-tickets', title: 'Stale Tickets', x: 560, y: 20, width: 250, height: 200 },
  { id: 'overdue', title: 'Overdue', x: 830, y: 20, width: 250, height: 200 },
  { id: 'tickets-by-company', title: 'Tickets By Company', x: 20, y: 240, width: 400, height: 300 },
  { id: 'worked-on-today', title: 'Worked On - Today', x: 440, y: 240, width: 300, height: 300 },
  { id: 'resolved-today', title: 'Resolved Today', x: 760, y: 240, width: 250, height: 200 },
  { id: 'open-tickets-critical', title: 'Open Tickets - Critical', x: 20, y: 560, width: 400, height: 320 },
  { id: 'recent-tickets', title: 'Recent Tickets', x: 440, y: 560, width: 500, height: 350 },
  { id: 'priority-distribution', title: 'Priority Distribution', x: 760, y: 460, width: 350, height: 300 },
];

// Grid size for snapping
const GRID_SIZE = 20;

// Helper to snap to grid
const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

// Check if two widgets overlap
const checkOverlap = (a: any, b: any) => {
  return !(
    a.x >= b.x + b.width ||
    a.x + a.width <= b.x ||
    a.y >= b.y + b.height ||
    a.y + a.height <= b.y
  );
};

// Calculate direction to push widget
const calculatePush = (mover: any, target: any) => {
  // Calculate overlap in each direction
  const right = mover.x + mover.width - target.x;
  const left = target.x + target.width - mover.x;
  const bottom = mover.y + mover.height - target.y;
  const top = target.y + target.height - mover.y;
  
  // Find smallest push direction
  const minPush = Math.min(right, left, bottom, top);
  
  if (minPush === right) return { x: target.x + right, y: target.y };
  if (minPush === left) return { x: target.x - mover.width, y: target.y };
  if (minPush === bottom) return { x: target.x, y: target.y + bottom };
  return { x: target.x, y: target.y - mover.height };
};

export const Dashboard: React.FC = () => {
  const [widgets, setWidgets] = useState(initialWidgets);

  // Handle widget movement
  const handleWidgetMove = (id: string, x: number, y: number) => {
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    
    setWidgets(prev => {
      // Create new array with the moved widget
      const updated = prev.map(w => 
        w.id === id ? { ...w, x: snappedX, y: snappedY } : w
      );
      
      // Get the widget that moved
      const movedWidget = updated.find(w => w.id === id);
      if (!movedWidget) return prev;
      
      // Recursively resolve collisions
      const resolveCollisions = (widgetId: string, visited = new Set<string>()) => {
        if (visited.has(widgetId)) return;
        visited.add(widgetId);
        
        const currentWidget = updated.find(w => w.id === widgetId);
        if (!currentWidget) return;
        
        // Check for collisions with other widgets
        for (const widget of updated) {
          if (widget.id === widgetId || visited.has(widget.id)) continue;
          
          if (checkOverlap(currentWidget, widget)) {
            // Calculate new position for collided widget
            const newPos = calculatePush(currentWidget, widget);
            
            // Update position of collided widget
            const index = updated.findIndex(w => w.id === widget.id);
            if (index !== -1) {
              updated[index] = { 
                ...updated[index], 
                x: Math.max(0, snapToGrid(newPos.x)),
                y: Math.max(0, snapToGrid(newPos.y))
              };
              
              // Check if this widget now collides with others
              resolveCollisions(widget.id, visited);
            }
          }
        }
      };
      
      // Start collision resolution from the moved widget
      resolveCollisions(id);
      
      return [...updated];
    });
  };

  // Handle widget resizing
  const handleWidgetResize = (id: string, width: number, height: number) => {
    const snappedWidth = snapToGrid(width);
    const snappedHeight = snapToGrid(height);
    
    setWidgets(prev => {
      // Create new array with the resized widget
      const updated = prev.map(w => 
        w.id === id ? { ...w, width: snappedWidth, height: snappedHeight } : w
      );
      
      // Get the widget that was resized
      const resizedWidget = updated.find(w => w.id === id);
      if (!resizedWidget) return prev;
      
      // Recursively resolve collisions
      const resolveCollisions = (widgetId: string, visited = new Set<string>()) => {
        if (visited.has(widgetId)) return;
        visited.add(widgetId);
        
        const currentWidget = updated.find(w => w.id === widgetId);
        if (!currentWidget) return;
        
        // Check for collisions with other widgets
        for (const widget of updated) {
          if (widget.id === widgetId || visited.has(widget.id)) continue;
          
          if (checkOverlap(currentWidget, widget)) {
            // Calculate new position for collided widget
            const newPos = calculatePush(currentWidget, widget);
            
            // Update position of collided widget
            const index = updated.findIndex(w => w.id === widget.id);
            if (index !== -1) {
              updated[index] = { 
                ...updated[index], 
                x: Math.max(0, snapToGrid(newPos.x)),
                y: Math.max(0, snapToGrid(newPos.y))
              };
              
              // Check if this widget now collides with others
              resolveCollisions(widget.id, visited);
            }
          }
        }
      };
      
      // Start collision resolution from the resized widget
      resolveCollisions(id);
      
      return [...updated];
    });
  };

  // Helper function to render a widget with the right content based on id
  const renderWidgetContent = (id: string) => {
    switch(id) {
      case 'schedules':
        return <MetricWidget value="4" label="MINS AGO" size="lg" variant="primary" />;
        
      case 'open-tickets':
        return <MetricWidget value="3.69K" label="4 MINS AGO" size="lg" variant="primary" />;
        
      case 'stale-tickets':
        return <MetricWidget 
                value="3.60K" 
                label="4 MINS AGO" 
                change={{ value: -2.5, period: 'vs last week' }} 
                size="lg" 
                variant="danger" 
              />;
        
      case 'overdue':
        return <MetricWidget 
                value="471" 
                label="3 MINS AGO" 
                change={{ value: 15.2, period: 'vs last month' }} 
                size="lg" 
                variant="danger" 
              />;
        
      case 'tickets-by-company':
        return <ChartWidget type="bar" data={sampleBarData} />;
        
      case 'worked-on-today':
        return <ChartWidget type="donut" data={sampleChartData} />;
        
      case 'resolved-today':
        return <MetricWidget 
                value="182" 
                label="4 MINS AGO" 
                change={{ value: 8.7, period: 'vs yesterday' }} 
                size="lg" 
                variant="secondary" 
              />;
        
      case 'open-tickets-critical':
        return <ChartWidget 
                type="bar" 
                data={[
                  { name: 'Urgent', value: 20 },
                  { name: 'High', value: 15 },
                  { name: 'Medium', value: 8 },
                  { name: 'Low', value: 2 }
                ]} 
              />;
        
      case 'recent-tickets':
        return <TableWidget columns={tableColumns} data={sampleTableData} maxRows={8} />;
        
      case 'priority-distribution':
        return <ChartWidget type="pie" data={sampleChartData} />;
        
      default:
        return <div>Widget content</div>;
    }
  };

  return (
    <div className="min-h-screen bg-dashboard-grid p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Tech Dashboard</h1>
        <p className="text-muted-foreground">Drag widgets to reposition • Other widgets move out of the way automatically • Resize by dragging the corner</p>
      </div>

      <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden">
        {widgets.map(widget => (
          <ResizableWidget
            key={widget.id}
            id={widget.id}
            title={widget.title}
            initialX={widget.x}
            initialY={widget.y}
            initialWidth={widget.width}
            initialHeight={widget.height}
            onMove={handleWidgetMove}
            onResize={handleWidgetResize}
          >
            {renderWidgetContent(widget.id)}
          </ResizableWidget>
        ))}
      </div>
    </div>
  );
};