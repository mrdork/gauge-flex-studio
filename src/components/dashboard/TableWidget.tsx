import React from 'react';
import { cn } from '@/lib/utils';

interface TableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableData {
  [key: string]: string | number;
}

interface TableWidgetProps {
  columns: TableColumn[];
  data: TableData[];
  title?: string;
  maxRows?: number;
}

export const TableWidget: React.FC<TableWidgetProps> = ({
  columns,
  data,
  title,
  maxRows = 10
}) => {
  const displayData = maxRows ? data.slice(0, maxRows) : data;

  return (
    <div className="w-full h-full flex flex-col">
      {title && (
        <h4 className="text-sm font-medium text-foreground mb-4">{title}</h4>
      )}
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-widget-border">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'py-2 px-3 font-medium text-muted-foreground text-left',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, index) => (
              <tr
                key={index}
                className="border-b border-widget-border/50 hover:bg-muted/50 transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'py-2 px-3 text-foreground',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {data.length > maxRows && (
          <div className="text-xs text-muted-foreground text-center py-2">
            Showing {maxRows} of {data.length} rows
          </div>
        )}
      </div>
    </div>
  );
};