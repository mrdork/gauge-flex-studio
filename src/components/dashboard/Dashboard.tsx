import React, { useState, useEffect } from 'react';
import { ResizableWidget } from './ResizableWidget';
import { MetricWidget } from './MetricWidget';
import { ChartWidget } from './ChartWidget';
import { TableWidget } from './TableWidget';
import { TimeWidget } from './TimeWidget';
import { N8nConfigModal } from './N8nConfigModal';
import { GridLayoutProvider, useGridLayout } from './GridLayoutManager';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Define initial widget layouts - ensuring no overlaps
const initialWidgets = [
  { id: 'schedules', title: 'Schedules Today', x: 20, y: 20, width: 250, height: 200 },
  { id: 'open-tickets', title: 'Open Tickets', x: 290, y: 20, width: 250, height: 200 },
  { id: 'stale-tickets', title: 'Stale Tickets', x: 560, y: 20, width: 250, height: 200 },
  { id: 'overdue', title: 'Overdue', x: 830, y: 20, width: 250, height: 200 },
  { id: 'current-time', title: 'Current Time (EST)', x: 1100, y: 20, width: 250, height: 160 },
  { id: 'tickets-by-company', title: 'Tickets By Company', x: 20, y: 240, width: 400, height: 300 },
  { id: 'worked-on-today', title: 'Worked On - Today', x: 440, y: 240, width: 300, height: 300 },
  { id: 'resolved-today', title: 'Resolved Today', x: 760, y: 240, width: 250, height: 200 },
  { id: 'open-tickets-critical', title: 'Open Tickets - Critical', x: 20, y: 560, width: 400, height: 320 },
  { id: 'recent-tickets', title: 'Recent Tickets', x: 440, y: 560, width: 500, height: 350 },
  { id: 'priority-distribution', title: 'Priority Distribution', x: 1030, y: 240, width: 350, height: 300 },
];

// Grid size for snapping
const GRID_SIZE = 20;

// Local storage keys
const N8N_URL_KEY = 'tech-dashboard-n8n-url';
const REFRESH_INTERVAL_KEY = 'tech-dashboard-refresh-interval';

// Dashboard content component that uses GridLayoutManager
const DashboardContent: React.FC = () => {
  const { widgets, registerWidget, moveWidget, resizeWidget } = useGridLayout();
  const [widgetLayout, setWidgetLayout] = useState(initialWidgets);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [n8nUrl, setN8nUrl] = useState<string>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem(N8N_URL_KEY) || '';
    }
    return '';
  });
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem(REFRESH_INTERVAL_KEY) || '300000'); // Default to 5 minutes
    }
    return 300000;
  });

  // Register all widgets with the grid layout manager on mount
  useEffect(() => {
    widgetLayout.forEach(widget => {
      registerWidget(widget.id, widget);
    });
  }, [registerWidget]);
  
  const { data, isLoading, error, refreshData, lastRefreshTime } = useDashboardData(n8nUrl);
  const { toast } = useToast();

  // Save n8n URL and refresh interval to localStorage when they change
  useEffect(() => {
    if (n8nUrl) {
      localStorage.setItem(N8N_URL_KEY, n8nUrl);
    }
  }, [n8nUrl]);

  useEffect(() => {
    localStorage.setItem(REFRESH_INTERVAL_KEY, refreshInterval.toString());
  }, [refreshInterval]);

  // Handle fullscreen changes and wake lock
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      
      if (!document.fullscreenElement && wakeLock) {
        // Exit fullscreen - release wake lock
        wakeLock.release();
        setWakeLock(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [wakeLock]);

  // Auto-refresh data based on selected interval
  useEffect(() => {
    if (!n8nUrl) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [n8nUrl, refreshInterval, refreshData]);

  // Handle n8n config save
  const handleSaveConfig = (url: string, interval: number) => {
    setN8nUrl(url);
    setRefreshInterval(interval);
    toast({
      title: "Configuration Saved",
      description: "The n8n webhook URL and refresh interval have been saved.",
    });
  };

  // Handle refresh button click
  const handleRefresh = () => {
    refreshData();
    toast({
      title: "Refreshing Data",
      description: "Fetching latest data from n8n...",
    });
  };

  // Handle fullscreen toggle
  const handleFullscreenToggle = async () => {
    try {
      if (!isFullscreen) {
        // Enter fullscreen
        await document.documentElement.requestFullscreen();
        
        // Request wake lock to prevent screen from sleeping
        if ('wakeLock' in navigator) {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLock(lock);
          
          toast({
            title: "Fullscreen Activated",
            description: "Dashboard is now fullscreen with screen wake lock enabled.",
          });
        } else {
          toast({
            title: "Fullscreen Activated",
            description: "Dashboard is now fullscreen. Wake lock not supported in this browser.",
          });
        }
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        
        toast({
          title: "Fullscreen Deactivated",
          description: "Dashboard returned to normal view.",
        });
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      toast({
        title: "Fullscreen Error",
        description: "Unable to toggle fullscreen mode.",
        variant: "destructive"
      });
    }
  };

  // Reset widgets to fit on screen optimally
  const handleResetLayout = () => {
    const containerWidth = window.innerWidth - 60; // Account for padding
    const containerHeight = window.innerHeight - 200; // Account for header and padding
    
    // Calculate optimal grid layout
    const cols = 4;
    const rows = Math.ceil(widgetLayout.length / cols);
    
    const cellWidth = Math.floor((containerWidth - (cols - 1) * 20) / cols); // 20px gap between widgets
    const cellHeight = Math.floor((containerHeight - (rows - 1) * 20) / rows);
    
    // Snap to grid
    const snappedCellWidth = Math.max(200, Math.round(cellWidth / GRID_SIZE) * GRID_SIZE);
    const snappedCellHeight = Math.max(150, Math.round(cellHeight / GRID_SIZE) * GRID_SIZE);
    
    const resetWidgets = widgetLayout.map((widget, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      const newWidget = {
        ...widget,
        x: 20 + col * (snappedCellWidth + 20),
        y: 20 + row * (snappedCellHeight + 20),
        width: snappedCellWidth,
        height: snappedCellHeight
      };
      
      registerWidget(widget.id, newWidget);
      return newWidget;
    });
    
    setWidgetLayout(resetWidgets);
    
    toast({
      title: "Layout Reset",
      description: "All widgets have been resized and repositioned to fit the screen.",
    });
  };

  // Handle widget movement using GridLayoutManager
  const handleWidgetMove = (id: string, x: number, y: number) => {
    moveWidget(id, x, y);
  };

  // Handle widget resizing using GridLayoutManager
  const handleWidgetResize = (id: string, width: number, height: number) => {
    resizeWidget(id, width, height);
  };

  // Helper function to render a widget with the right content based on id
  const renderWidgetContent = (id: string) => {
    switch(id) {
      case 'schedules':
        return <MetricWidget 
                value={data.metrics.schedulesToday} 
                label="MINS AGO" 
                size="lg" 
                variant="primary" 
              />;
        
      case 'open-tickets':
        return <MetricWidget 
                value={data.metrics.openTickets.value} 
                label="4 MINS AGO" 
                change={data.metrics.openTickets.change}
                size="lg" 
                variant="primary" 
              />;
        
      case 'stale-tickets':
        return <MetricWidget 
                value={data.metrics.staleTickets.value}
                label="4 MINS AGO" 
                change={data.metrics.staleTickets.change}
                size="lg" 
                variant="danger" 
              />;
        
      case 'overdue':
        return <MetricWidget 
                value={data.metrics.overdue.value}
                label="3 MINS AGO" 
                change={data.metrics.overdue.change}
                size="lg" 
                variant="danger" 
              />;
        
      case 'tickets-by-company':
        return <ChartWidget type="bar" data={data.charts.ticketsByCompany} />;
        
      case 'worked-on-today':
        return <ChartWidget type="donut" data={data.charts.workedOnToday} />;
        
      case 'resolved-today':
        return <MetricWidget 
                value={data.metrics.resolvedToday.value}
                label="4 MINS AGO" 
                change={data.metrics.resolvedToday.change}
                size="lg" 
                variant="secondary" 
              />;
        
      case 'open-tickets-critical':
        return <ChartWidget type="bar" data={data.charts.openTicketsCritical} />;
        
      case 'recent-tickets':
        return <TableWidget 
                columns={[
                  { key: 'company', label: 'Company', width: '40%' },
                  { key: 'tickets', label: 'Tickets', width: '20%', align: 'center' as const },
                  { key: 'priority', label: 'Priority', width: '20%', align: 'center' as const },
                  { key: 'status', label: 'Status', width: '20%', align: 'center' as const },
                ]} 
                data={data.tables.recentTickets} 
                maxRows={8} 
              />;
        
      case 'priority-distribution':
        return <ChartWidget type="pie" data={data.charts.priorityDistribution} />;
        
      case 'current-time':
        return <TimeWidget />;
        
      default:
        return <div>Widget content</div>;
    }
  };

  return (
    <div className="min-h-screen bg-dashboard-grid p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Tech Dashboard</h1>
          <p className="text-muted-foreground">
            {n8nUrl ? 'Connected to n8n webhook' : 'Using sample data - Connect to n8n for live data'}
          </p>
        </div>
        {!isFullscreen && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleFullscreenToggle}>
              <Maximize className="h-4 w-4 mr-1" />
              Fullscreen
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetLayout}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset Layout
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || !n8nUrl}>
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setConfigModalOpen(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Configure n8n
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300 p-3 rounded-md mb-4">
          Error loading data: {error}
        </div>
      )}

      <div className="relative w-full h-[calc(100vh-140px)] overflow-hidden">
        {widgetLayout.map(widget => {
          const currentWidget = widgets.get(widget.id) || widget;
          return (
            <ResizableWidget
              key={widget.id}
              id={widget.id}
              title={widget.title}
              initialX={currentWidget.x}
              initialY={currentWidget.y}
              initialWidth={currentWidget.width}
              initialHeight={currentWidget.height}
              gridSize={GRID_SIZE}
              onMove={handleWidgetMove}
              onResize={handleWidgetResize}
            >
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full"></div>
                </div>
              ) : (
                renderWidgetContent(widget.id)
              )}
            </ResizableWidget>
          );
        })}
      </div>

      {/* Last refresh time - only show if there's new data and n8n is connected */}
      {lastRefreshTime && n8nUrl && (
        <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 text-[10px] text-muted-foreground/50">
          Last updated: {lastRefreshTime.toLocaleString()}
        </div>
      )}

      <N8nConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        onSave={handleSaveConfig}
        currentUrl={n8nUrl}
        currentRefreshInterval={refreshInterval}
      />
    </div>
  );
};

// Main Dashboard component with GridLayoutProvider
export const Dashboard: React.FC = () => {
  return (
    <GridLayoutProvider gridSize={GRID_SIZE}>
      <DashboardContent />
    </GridLayoutProvider>
  );
};