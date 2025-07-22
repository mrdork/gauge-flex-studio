import React from 'react';
import { cn } from '@/lib/utils';

interface MetricWidgetProps {
  value: string | number;
  label: string;
  change?: {
    value: number;
    period: string;
  };
  variant?: 'primary' | 'secondary' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const MetricWidget: React.FC<MetricWidgetProps> = ({
  value,
  label,
  change,
  variant = 'primary',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  const variantClasses = {
    primary: 'text-metric-primary',
    secondary: 'text-metric-secondary',
    warning: 'text-metric-warning',
    danger: 'text-metric-danger'
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className={cn(
        'font-bold leading-none mb-2',
        sizeClasses[size],
        variantClasses[variant]
      )}>
        {value}
      </div>
      
      <div className="text-sm text-muted-foreground font-medium mb-1">
        {label}
      </div>
      
      {change && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span className={cn(
            'font-medium',
            change.value > 0 ? 'text-metric-secondary' : 'text-metric-danger'
          )}>
            {change.value > 0 ? '+' : ''}{change.value}%
          </span>
          <span>{change.period}</span>
        </div>
      )}
    </div>
  );
};