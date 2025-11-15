/**
 * Admin Tools Page
 * Utility page for administrators to run database setup tasks
 * This can be accessed at /admin-tools (add route if needed)
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { setupAxissRealtyOrganization } from '@/utils/organizationHelper';
import { Loader2, CheckCircle, XCircle, Building2 } from 'lucide-react';

export const AdminTools: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSetupOrganization = async () => {
    setLoading(true);
    setResult(null);

    try {
      const result = await setupAxissRealtyOrganization();
      setResult(result);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setResult({ success: false, message: errorMessage });
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <CardTitle>Admin Tools</CardTitle>
          </div>
          <CardDescription>
            Utility functions for database setup and maintenance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Organization Setup</h3>
            <p className="text-sm text-muted-foreground">
              This will create or find "Axiss Realty Corp" organization and assign all existing users to it.
              It will also update all existing data (leads, properties, etc.) to belong to this organization.
            </p>
            <Button
              onClick={handleSetupOrganization}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up organization...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Setup Axiss Realty Corp Organization
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div>
                  <p className={`font-semibold ${
                    result.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                  }`}>
                    {result.success ? 'Success' : 'Error'}
                  </p>
                  <p className={`text-sm ${
                    result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                  }`}>
                    {result.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-2">Note:</p>
            <p className="text-sm text-muted-foreground">
              You can also run this function from the browser console:
            </p>
            <code className="block mt-2 p-2 bg-background rounded text-xs">
              {`import { setupAxissRealtyOrganization } from '@/utils/organizationHelper';
await setupAxissRealtyOrganization();`}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTools;

