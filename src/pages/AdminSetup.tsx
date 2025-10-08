import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function AdminSetup() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const updatePassword = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('update-user-password', {
          body: { 
            email: "shalini@homekart.co", 
            password: "Homekart@123" 
          }
        });

        if (error) throw error;

        setSuccess(true);
        toast.success("Password updated successfully!");
        
        // Auto-redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      } catch (error: any) {
        console.error('Error updating password:', error);
        toast.error(error.message || "Failed to update password");
      } finally {
        setLoading(false);
      }
    };

    updatePassword();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-4 text-center">
        <h1 className="text-2xl font-bold">Admin Setup</h1>
        
        {loading && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Updating admin password...</p>
          </>
        )}

        {!loading && success && (
          <>
            <div className="text-6xl">✓</div>
            <p className="text-lg font-medium text-green-600">Password Updated Successfully!</p>
            <p className="text-sm text-muted-foreground">
              Email: shalini@homekart.co<br />
              Password: Homekart@123
            </p>
            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          </>
        )}

        {!loading && !success && (
          <>
            <div className="text-6xl">✗</div>
            <p className="text-lg font-medium text-red-600">Update Failed</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Go to Login
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
