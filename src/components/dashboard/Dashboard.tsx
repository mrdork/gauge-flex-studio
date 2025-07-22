import React from 'react';
import { ResizableWidget } from './ResizableWidget';
import { MetricWidget } from './MetricWidget';
import { ChartWidget } from './ChartWidget';
import { TableWidget } from './TableWidget';
import { GridLayoutProvider } from './GridLayoutManager';

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

export const Dashboard: React.FC = () => {
  return (
    <GridLayoutProvider gridSize={20} snapThreshold={15}>
      <div className="min-h-screen bg-dashboard-grid p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Tech Dashboard</h1>
          <p className="text-muted-foreground">Drag widgets to reposition • Resize by dragging the corner • Widgets push each other away automatically</p>
        </div>

        <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden">
          {/* Metric Widgets */}
          <ResizableWidget title="Schedules Today" initialWidth={250} initialHeight={200} initialX={20} initialY={20}>
            <MetricWidget
              value="4"
              label="MINS AGO"
              size="lg"
              variant="primary"
            />
          </ResizableWidget>

          <ResizableWidget title="Open Tickets" initialWidth={250} initialHeight={200} initialX={290} initialY={20}>
            <MetricWidget
              value="3.69K"
              label="4 MINS AGO"
              size="lg"
              variant="primary"
            />
          </ResizableWidget>

          <ResizableWidget title="Stale Tickets" initialWidth={250} initialHeight={200} initialX={560} initialY={20}>
            <MetricWidget
              value="3.60K"
              label="4 MINS AGO"
              change={{ value: -2.5, period: 'vs last week' }}
              size="lg"
              variant="danger"
            />
          </ResizableWidget>

          <ResizableWidget title="Overdue" initialWidth={250} initialHeight={200} initialX={830} initialY={20}>
            <MetricWidget
              value="471"
              label="3 MINS AGO"
              change={{ value: 15.2, period: 'vs last month' }}
              size="lg"
              variant="danger"
            />
          </ResizableWidget>

          {/* Chart Widgets */}
          <ResizableWidget title="Tickets By Company" initialWidth={400} initialHeight={300} initialX={20} initialY={240}>
            <ChartWidget
              type="bar"
              data={sampleBarData}
            />
          </ResizableWidget>

          <ResizableWidget title="Worked On - Today" initialWidth={300} initialHeight={300} initialX={440} initialY={240}>
            <ChartWidget
              type="donut"
              data={sampleChartData}
            />
          </ResizableWidget>

          <ResizableWidget title="Resolved Today" initialWidth={250} initialHeight={200} initialX={760} initialY={240}>
            <MetricWidget
              value="182"
              label="4 MINS AGO"
              change={{ value: 8.7, period: 'vs yesterday' }}
              size="lg"
              variant="secondary"
            />
          </ResizableWidget>

          {/* Critical Tickets Chart */}
          <ResizableWidget title="Open Tickets - Critical" initialWidth={400} initialHeight={320} initialX={20} initialY={560}>
            <ChartWidget
              type="bar"
              data={[
                { name: 'Urgent', value: 20 },
                { name: 'High', value: 15 },
                { name: 'Medium', value: 8 },
                { name: 'Low', value: 2 }
              ]}
            />
          </ResizableWidget>

          {/* Table Widget */}
          <ResizableWidget title="Recent Tickets" initialWidth={500} initialHeight={350} initialX={440} initialY={560}>
            <TableWidget
              columns={tableColumns}
              data={sampleTableData}
              maxRows={8}
            />
          </ResizableWidget>

          {/* Pie Chart */}
          <ResizableWidget title="Priority Distribution" initialWidth={350} initialHeight={300} initialX={760} initialY={460}>
            <ChartWidget
              type="pie"
              data={sampleChartData}
            />
          </ResizableWidget>
        </div>
      </div>
    </GridLayoutProvider>
  );
};