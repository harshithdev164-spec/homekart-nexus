import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AdminSetup() {
  const [email, setEmail] = useState("shalini@homekart.co");
  const [password, setPassword] = useState("Homekart@123");
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { email, password }
      });

      if (error) throw error;

      toast.success("Password updated successfully! You can now log in.");
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-bold">Admin Password Setup</h1>
        <p className="text-sm text-muted-foreground">
          Update the password for an existing admin account
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <Button 
            onClick={handleUpdatePassword} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>

          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/auth'}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </Card>
    </div>
  );
}
