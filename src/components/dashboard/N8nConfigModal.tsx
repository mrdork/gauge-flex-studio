import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Check } from 'lucide-react';

interface N8nConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (url: string, refreshInterval: number) => void;
  currentUrl: string;
  currentRefreshInterval: number;
}

export const N8nConfigModal: React.FC<N8nConfigModalProps> = ({
  open,
  onOpenChange,
  onSave,
  currentUrl,
  currentRefreshInterval
}) => {
  const [url, setUrl] = useState(currentUrl || '');
  const [refreshInterval, setRefreshInterval] = useState(currentRefreshInterval.toString());
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleSave = () => {
    onSave(url, parseInt(refreshInterval));
    onOpenChange(false);
  };

  const handleTest = async () => {
    if (!url) {
      setTestStatus('error');
      setTestMessage('Please enter a webhook URL');
      return;
    }

    setTestStatus('loading');
    setTestMessage('Testing connection...');

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Try to parse the response as JSON to verify it's valid
      await response.json();
      
      setTestStatus('success');
      setTestMessage('Connection successful!');
    } catch (err) {
      console.error("Error testing n8n connection:", err);
      setTestStatus('error');
      setTestMessage('Failed to connect to n8n. Make sure the URL is correct and returns valid JSON.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to n8n</DialogTitle>
          <DialogDescription>
            Enter your n8n webhook URL to fetch data for the dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="n8n-url">n8n Webhook URL</Label>
            <Input 
              id="n8n-url" 
              placeholder="https://your-n8n-instance.com/webhook/..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              This should be a GET webhook endpoint from your n8n workflow that returns JSON data.
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="refresh-interval">Auto-refresh Interval</Label>
            <Select value={refreshInterval} onValueChange={setRefreshInterval}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select refresh interval" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border">
                <SelectItem value="60000">1 Min</SelectItem>
                <SelectItem value="180000">3 Min</SelectItem>
                <SelectItem value="300000">5 Min</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How often to automatically refresh data from n8n.
            </p>
          </div>
          
          {testStatus !== 'idle' && (
            <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
              testStatus === 'loading' ? 'bg-muted' : 
              testStatus === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300' : 
              'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {testStatus === 'loading' ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
              ) : testStatus === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{testMessage}</span>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testStatus === 'loading'}
          >
            Test Connection
          </Button>
          <Button 
            type="button"
            onClick={handleSave}
            disabled={!url || testStatus === 'loading'}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};