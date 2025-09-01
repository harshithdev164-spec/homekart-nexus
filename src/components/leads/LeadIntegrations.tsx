import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Home, Loader2, RefreshCw } from 'lucide-react';

export const LeadIntegrations: React.FC = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const triggerMagicBricksSync = async () => {
    setIsLoading('magicbricks');
    
    try {
      const { data, error } = await supabase.functions.invoke('magicbricks-leads', {
        body: { 
          url: 'https://api.magicbricks.com/leads', // Replace with actual endpoint
          method: 'GET'
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'MagicBricks leads synced successfully',
      });
      
      // Refresh the page or update lead list
      window.location.reload();
    } catch (error) {
      console.error('Error syncing MagicBricks leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync MagicBricks leads',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const trigger99AcresSync = async () => {
    setIsLoading('99acres');
    
    try {
      const { data, error } = await supabase.functions.invoke('99acres-leads', {
        body: { 
          url: 'https://api.99acres.com/leads', // Replace with actual endpoint
          method: 'GET'
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: '99acres leads synced successfully',
      });
      
      // Refresh the page or update lead list
      window.location.reload();
    } catch (error) {
      console.error('Error syncing 99acres leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync 99acres leads',
        variant: 'destructive',
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

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Click "Sync Leads" to manually import new leads from the platforms</li>
              <li>Leads are automatically assigned to available team members</li>
              <li>All team members get real-time notifications when leads are assigned</li>
              <li>Lead status and ownership are visible to the entire team</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Next Steps:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Configure API credentials for MagicBricks and 99acres</li>
              <li>Set up webhook endpoints for automatic lead import</li>
              <li>Configure lead assignment rules and team preferences</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};