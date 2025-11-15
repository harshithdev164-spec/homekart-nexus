import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Organization, OrganizationMember, Subscription } from '@/services/organizationService';
import {
  getCurrentOrganization,
  getUserOrganizations,
  getOrganizationMembers,
  getOrganizationSubscription,
  getOrganizationSettings,
} from '@/services/organizationService';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  members: OrganizationMember[];
  subscription: Subscription | null;
  settings: any;
  loading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
  refreshMembers: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshOrganization = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    try {
      let org = await getCurrentOrganization();
      
      // If user doesn't have organization, try to assign to Axiss Realty Corp
      if (!org) {
        console.log('User does not have organization, attempting to assign to Axiss Realty Corp...');
        const { ensureUserHasOrganization } = await import('@/utils/organizationHelper');
        const hasOrg = await ensureUserHasOrganization();
        
        if (hasOrg) {
          // Try again after assignment
          org = await getCurrentOrganization();
        }
      }

      setCurrentOrganization(org || null);

      if (org) {
        try {
          // Load subscription
          const sub = await getOrganizationSubscription(org.id);
          setSubscription(sub);

          // Load settings
          const orgSettings = await getOrganizationSettings(org.id);
          setSettings(orgSettings);

          // Load members
          const orgMembers = await getOrganizationMembers(org.id);
          setMembers(orgMembers);
        } catch (error) {
          console.error('Error loading organization data:', error);
          // Continue even if some data fails to load
        }
      }

      // Load all user organizations
      try {
        const userOrgs = await getUserOrganizations();
        setOrganizations(userOrgs || []);
      } catch (error) {
        console.error('Error loading user organizations:', error);
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error refreshing organization:', error);
      // Set defaults to prevent errors
      setCurrentOrganization(null);
      setOrganizations([]);
      setMembers([]);
      setSubscription(null);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const refreshMembers = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      const orgMembers = await getOrganizationMembers(currentOrganization.id);
      setMembers(orgMembers);
    } catch (error) {
      console.error('Error refreshing members:', error);
    }
  }, [currentOrganization]);

  const switchOrganization = useCallback(async (organizationId: string) => {
    try {
      setLoading(true);
      const org = organizations.find(o => o.id === organizationId);
      
      if (!org) {
        throw new Error('Organization not found');
      }

      // Update profile's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: organizationId })
        .eq('id', profile.id);

      if (error) throw error;

      setCurrentOrganization(org);

      // Refresh related data
      const sub = await getOrganizationSubscription(org.id);
      setSubscription(sub);

      const orgSettings = await getOrganizationSettings(org.id);
      setSettings(orgSettings);

      const orgMembers = await getOrganizationMembers(org.id);
      setMembers(orgMembers);

      toast({
        title: 'Organization Switched',
        description: `Now viewing ${org.name}`,
      });
    } catch (error: any) {
      console.error('Error switching organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to switch organization',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [organizations, toast]);

  useEffect(() => {
    refreshOrganization();
  }, [refreshOrganization]);

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    members,
    subscription,
    settings,
    loading,
    switchOrganization,
    refreshOrganization,
    refreshMembers,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

