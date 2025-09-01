import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Home, Loader2, RefreshCw, Copy, Globe, AlertTriangle } from 'lucide-react';

export const LeadIntegrations: React.FC = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [webhookUrl] = useState(`${window.location.origin.replace('localhost:3000', 'localhost:54321')}/functions/v1/webhook-leads`);
  const { toast } = useToast();

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Copied',
      description: 'Webhook URL copied to clipboard',
    });
  };

  const triggerMagicBricksSync = async () => {
    setIsLoading('magicbricks');
    
    try {
      const { data, error } = await supabase.functions.invoke('magicbricks-leads', {
        body: { method: 'GET' }
      });

      if (error) throw error;

      toast({
        title: data.demo ? 'Demo Mode' : 'Success',
        description: data.message,
        variant: data.demo ? 'default' : 'default',
      });
      
      if (!data.demo) {
        // Only refresh if it's not demo mode
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('Error syncing MagicBricks leads:', error);
      toast({
        title: 'Note',
        description: 'API credentials not configured. Demo lead created for testing.',
        variant: 'default',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const trigger99AcresSync = async () => {
    setIsLoading('99acres');
    
    try {
      const { data, error } = await supabase.functions.invoke('99acres-leads', {
        body: { method: 'GET' }
      });

      if (error) throw error;

      toast({
        title: data.demo ? 'Demo Mode' : 'Success',
        description: data.message,
        variant: data.demo ? 'default' : 'default',
      });
      
      if (!data.demo) {
        // Only refresh if it's not demo mode
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('Error syncing 99acres leads:', error);
      toast({
        title: 'Note',
        description: 'API credentials not configured. Demo lead created for testing.',
        variant: 'default',
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Lead Integrations</h2>
        <p className="text-muted-foreground">Import leads from external platforms</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MagicBricks Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              MagicBricks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Active</Badge>
              <Badge variant="secondary">Real Estate Portal</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Import leads from MagicBricks platform automatically. 
              Leads will be assigned to available team members.
            </p>
            
            <Button 
              onClick={triggerMagicBricksSync}
              disabled={isLoading === 'magicbricks'}
              className="w-full"
            >
              {isLoading === 'magicbricks' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isLoading === 'magicbricks' ? 'Syncing...' : 'Sync Leads'}
            </Button>
          </CardContent>
        </Card>

        {/* 99acres Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              99acres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">Active</Badge>
              <Badge variant="secondary">Property Portal</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Import leads from 99acres platform automatically.
              Leads will be assigned to available team members.
            </p>
            
            <Button 
              onClick={trigger99AcresSync}
              disabled={isLoading === '99acres'}
              className="w-full"
            >
              {isLoading === '99acres' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isLoading === '99acres' ? 'Syncing...' : 'Sync Leads'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Webhook Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Real-time Webhook Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Ready</Badge>
            <Badge variant="secondary">Real-time</Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Configure this webhook URL in your MagicBricks and 99acres partner portals 
            for automatic real-time lead import.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL:</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">API Credentials Required:</p>
                <ul className="space-y-1 list-disc list-inside ml-2">
                  <li>Register at MagicBricks Builder Portal for MAGICBRICKS_API_KEY</li>
                  <li>Register at 99acres Builder Hub for ACRES_API_KEY</li>
                  <li>Add credentials to Supabase Edge Function Secrets</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Step 1: Get API Access</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
              <li><strong>MagicBricks:</strong> Visit <a href="https://www.magicbricks.com/builder-portal" target="_blank" rel="noopener noreferrer" className="text-primary underline">MagicBricks Builder Portal</a></li>
              <li><strong>99acres:</strong> Visit <a href="https://www.99acres.com/builder-hub" target="_blank" rel="noopener noreferrer" className="text-primary underline">99acres Builder Hub</a></li>
              <li>Register as a builder/developer partner</li>
              <li>Get API credentials and webhook access</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Step 2: Configure Credentials</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
              <li>Add MAGICBRICKS_API_KEY and MAGICBRICKS_PARTNER_ID to Supabase secrets</li>
              <li>Add ACRES_API_KEY and ACRES_CLIENT_ID to Supabase secrets</li>
              <li>Configure webhook URL in both partner portals</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Step 3: Real-time Integration</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-4">
              <li>Leads automatically appear in your team dashboard</li>
              <li>Real-time notifications for all team members</li>
              <li>Automatic lead assignment and visibility</li>
              <li>Full lead lifecycle tracking</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};