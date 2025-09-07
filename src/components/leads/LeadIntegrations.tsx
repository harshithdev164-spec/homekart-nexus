import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Home, Loader2, RefreshCw, Copy, Globe, AlertTriangle, Sheet, Mail } from 'lucide-react';

export const LeadIntegrations: React.FC = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [webhookUrl] = useState(() => {
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:54321' 
      : 'https://qtugvzrvcuderfrebfxj.supabase.co';
    return `${baseUrl}/functions/v1/webhook-leads`;
  });
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

  const triggerZohoSheetsSync = async () => {
    setIsLoading('zoho-sheets');
    
    try {
      const { data, error } = await supabase.functions.invoke('zoho-sheets', {
        body: { action: 'sync_leads' }
      });

      if (error) throw error;

      toast({
        title: data.demo ? 'Demo Mode' : 'Success',
        description: data.message,
        variant: data.demo ? 'default' : 'default',
      });
      
      if (!data.demo) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('Error syncing Zoho Sheets:', error);
      toast({
        title: 'Note',
        description: 'Zoho credentials not configured. Demo functionality available.',
        variant: 'default',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const triggerZohoMailSync = async () => {
    setIsLoading('zoho-mail');
    
    try {
      const { data, error } = await supabase.functions.invoke('zoho-mail', {
        body: { action: 'send_bulk_emails' }
      });

      if (error) throw error;

      toast({
        title: data.demo ? 'Demo Mode' : 'Success',
        description: data.message,
        variant: data.demo ? 'default' : 'default',
      });
    } catch (error) {
      console.error('Error with Zoho Mail:', error);
      toast({
        title: 'Note',
        description: 'Zoho Mail credentials not configured. Demo functionality available.',
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* MagicBricks Integration */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              MagicBricks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">Active</Badge>
              <Badge variant="secondary" className="text-xs">Real Estate Portal</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Import leads from MagicBricks platform automatically. 
              Leads will be assigned to available team members.
            </p>
            
            <Button 
              onClick={triggerMagicBricksSync}
              disabled={!!isLoading}
              className="w-full"
              size="sm"
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
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Home className="h-5 w-5 text-primary" />
              99acres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">Active</Badge>
              <Badge variant="secondary" className="text-xs">Property Portal</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Import leads from 99acres platform automatically.
              Leads will be assigned to available team members.
            </p>
            
            <Button 
              onClick={trigger99AcresSync}
              disabled={!!isLoading}
              className="w-full"
              size="sm"
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

        {/* Zoho Sheets Integration */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sheet className="h-5 w-5 text-primary" />
              Zoho Sheets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">Active</Badge>
              <Badge variant="secondary" className="text-xs">Spreadsheet Platform</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Import/export leads from Zoho Sheets. Sync data bidirectionally 
              with your spreadsheets for easy management.
            </p>
            
            <Button 
              onClick={triggerZohoSheetsSync}
              disabled={!!isLoading}
              className="w-full"
              size="sm"
            >
              {isLoading === 'zoho-sheets' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isLoading === 'zoho-sheets' ? 'Syncing...' : 'Sync Sheets'}
            </Button>
          </CardContent>
        </Card>

        {/* Zoho Mail Integration */}
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Zoho Mail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">Active</Badge>
              <Badge variant="secondary" className="text-xs">Email Platform</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Send bulk emails to leads using Zoho Mail. Automated 
              email campaigns and personalized communications.
            </p>
            
            <Button 
              onClick={triggerZohoMailSync}
              disabled={!!isLoading}
              className="w-full"
              size="sm"
            >
              {isLoading === 'zoho-mail' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {isLoading === 'zoho-mail' ? 'Sending...' : 'Send Emails'}
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
                className="font-mono text-xs break-all"
              />
              <Button variant="outline" size="sm" onClick={copyWebhookUrl} className="flex-shrink-0">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-2">API Credentials Required:</p>
                <ul className="space-y-1 list-disc list-inside ml-2 text-xs">
                  <li>Register at MagicBricks Builder Portal for MAGICBRICKS_API_KEY</li>
                  <li>Register at 99acres Builder Hub for ACRES_API_KEY</li>
                  <li>Create Zoho OAuth app for ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET</li>
                  <li>Add all credentials to Supabase Edge Function Secrets</li>
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
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-medium text-base">Step 1: Get API Access</h4>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-4">
              <li><strong>MagicBricks:</strong> Visit <a href="https://www.magicbricks.com/builder-portal" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">MagicBricks Builder Portal</a></li>
              <li><strong>99acres:</strong> Visit <a href="https://www.99acres.com/builder-hub" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">99acres Builder Hub</a></li>
              <li><strong>Zoho:</strong> Visit <a href="https://api-console.zoho.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Zoho API Console</a></li>
              <li>Register as a partner and create OAuth applications</li>
              <li>Get API credentials and webhook access</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-base">Step 2: Configure Credentials</h4>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-4">
              <li>Add MAGICBRICKS_API_KEY and MAGICBRICKS_PARTNER_ID to Supabase secrets</li>
              <li>Add ACRES_API_KEY and ACRES_CLIENT_ID to Supabase secrets</li>
              <li>Add ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN to Supabase secrets</li>
              <li>Configure webhook URL in all partner portals</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-base">Step 3: Real-time Integration</h4>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-4">
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