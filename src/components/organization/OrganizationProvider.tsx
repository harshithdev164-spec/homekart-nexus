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
    // Return safe defaults instead of throwing - allows app to work without organization
    return {
      currentOrganization: null,
      organizations: [],
      members: [],
      subscription: null,
      settings: null,
      loading: false,
      switchOrganization: async () => {},
      refreshOrganization: async () => {},
      refreshMembers: async () => {},
    };
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
      // Try to get organization, but don't force it - fail silently if tables don't exist
      const org = await getCurrentOrganization().catch(() => null);
      setCurrentOrganization(org || null);

      if (org) {
        try {
          // Load subscription
          const sub = await getOrganizationSubscription(org.id).catch(() => null);
          setSubscription(sub);

          // Load settings
          const orgSettings = await getOrganizationSettings(org.id).catch(() => null);
          setSettings(orgSettings);

          // Load members
          const orgMembers = await getOrganizationMembers(org.id).catch(() => []);
          setMembers(orgMembers);
        } catch (error) {
          // Silently fail - organization tables might not exist
          console.log('Organization features not available');
        }
      }

      // Load all user organizations
      try {
        const userOrgs = await getUserOrganizations().catch(() => []);
        setOrganizations(userOrgs || []);
      } catch (error) {
        // Silently fail
        setOrganizations([]);
      }
    } catch (error) {
      // Silently fail - organization tables might not exist
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

