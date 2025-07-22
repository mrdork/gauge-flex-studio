import { useState, useEffect } from 'react';

// Define types for dashboard data
export interface DashboardData {
  metrics: {
    schedulesToday: string;
    openTickets: { value: string; change?: { value: number; period: string } };
    staleTickets: { value: string; change?: { value: number; period: string } };
    overdue: { value: string; change?: { value: number; period: string } };
    resolvedToday: { value: string; change?: { value: number; period: string } };
  };
  charts: {
    ticketsByCompany: { name: string; value: number }[];
    workedOnToday: { name: string; value: number }[];
    openTicketsCritical: { name: string; value: number }[];
    priorityDistribution: { name: string; value: number }[];
  };
  tables: {
    recentTickets: Array<{
      company: string;
      tickets: number;
      priority: string;
      status: string;
    }>;
  };
}

// Default data
const defaultData: DashboardData = {
  metrics: {
    schedulesToday: "4",
    openTickets: { value: "3.69K" },
    staleTickets: { value: "3.60K", change: { value: -2.5, period: "vs last week" } },
    overdue: { value: "471", change: { value: 15.2, period: "vs last month" } },
    resolvedToday: { value: "182", change: { value: 8.7, period: "vs yesterday" } }
  },
  charts: {
    ticketsByCompany: [
      { name: 'Mon', value: 12 },
      { name: 'Tue', value: 19 },
      { name: 'Wed', value: 15 },
      { name: 'Thu', value: 22 },
      { name: 'Fri', value: 18 },
      { name: 'Sat', value: 8 },
      { name: 'Sun', value: 5 }
    ],
    workedOnToday: [
      { name: 'Critical', value: 4 },
      { name: 'High', value: 15 },
      { name: 'Medium', value: 8 },
      { name: 'Low', value: 3 }
    ],
    openTicketsCritical: [
      { name: 'Urgent', value: 20 },
      { name: 'High', value: 15 },
      { name: 'Medium', value: 8 },
      { name: 'Low', value: 2 }
    ],
    priorityDistribution: [
      { name: 'Critical', value: 4 },
      { name: 'High', value: 15 },
      { name: 'Medium', value: 8 },
      { name: 'Low', value: 3 }
    ]
  },
  tables: {
    recentTickets: [
      { company: 'Tech Corp', tickets: 45, priority: 'High', status: 'Open' },
      { company: 'Data Inc', tickets: 23, priority: 'Medium', status: 'In Progress' },
      { company: 'Cloud Systems', tickets: 67, priority: 'Low', status: 'Resolved' },
      { company: 'AI Solutions', tickets: 12, priority: 'High', status: 'Open' },
      { company: 'Web Dev Co', tickets: 34, priority: 'Medium', status: 'Closed' }
    ]
  }
};

export function useDashboardData(n8nWebhookUrl?: string) {
  const [data, setData] = useState<DashboardData>(defaultData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!n8nWebhookUrl) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(n8nWebhookUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const fetchedData = await response.json();
      
      // Process and map the data from n8n to our dashboard structure
      // This mapping will depend on your n8n webhook output structure
      const mappedData = mapN8nData(fetchedData);
      
      setData(mappedData);
    } catch (err) {
      console.error("Error fetching data from n8n:", err);
      setError("Failed to load data from n8n webhook");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (n8nWebhookUrl) {
      fetchData();
      
      // Set up auto-refresh every 2 minutes to reduce load
      const interval = setInterval(() => {
        fetchData();
      }, 120000);
      
      return () => clearInterval(interval);
    }
  }, [n8nWebhookUrl]);

  return { data, setData, isLoading, error, refreshData: fetchData };
}

// Helper function to map n8n data to dashboard format
function mapN8nData(n8nData: any): DashboardData {
  // Initialize with default data
  const mappedData = { ...defaultData };
  
  try {
    console.log("Raw n8n data received:", n8nData);
    
    // Check if n8n returned just a workflow start message
    if (n8nData.message === "Workflow was started") {
      console.log("n8n workflow started but no data returned yet. Using default data.");
      return defaultData;
    }
    
    // Handle array response from n8n (extract first item)
    let dataToMap = n8nData;
    if (Array.isArray(n8nData) && n8nData.length > 0) {
      dataToMap = n8nData[0];
      console.log("Extracted data from array:", dataToMap);
    }
    
    // Map the data according to n8n structure
    if (dataToMap.metrics) {
      mappedData.metrics = {
        ...mappedData.metrics,
        ...dataToMap.metrics
      };
    }

    if (dataToMap.charts) {
      mappedData.charts = {
        ...mappedData.charts,
        ...dataToMap.charts
      };
    }

    if (dataToMap.tables?.recentTickets) {
      mappedData.tables.recentTickets = dataToMap.tables.recentTickets;
    }
    
    console.log("Mapped dashboard data:", mappedData);
    return mappedData;
  } catch (error) {
    console.error("Error mapping n8n data:", error);
    return defaultData;
  }
}