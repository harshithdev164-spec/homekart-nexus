import { supabase } from '@/integrations/supabase/client';

export interface Organization {
  id: string;
  name: string;
  subdomain?: string;
  domain?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  subscription_status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
  owner_id: string;
  logo_url?: string;
  settings?: any;
  max_users: number;
  max_leads: number;
  max_properties: number;
  features?: any;
  trial_ends_at?: string;
  subscription_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  profile_id: string;
  role: 'admin' | 'employee' | 'manager';
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  is_active: boolean;
  profile?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get organization by subdomain
 */
export const getOrganizationBySubdomain = async (subdomain: string): Promise<Organization | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_organization_by_subdomain', { subdomain_text: subdomain.toLowerCase() })
      .single();

    if (error) {
      // If function doesn't exist, fall back to direct query
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('subdomain', subdomain.toLowerCase())
          .maybeSingle();
        
        if (orgError) {
          console.error('Error getting organization by subdomain:', orgError);
          return null;
        }
        return orgData;
      }
      console.error('Error getting organization by subdomain:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting organization by subdomain:', error);
    return null;
  }
};

/**
 * Get current user's organization
 */
export const getCurrentOrganization = async (): Promise<Organization | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if organizations table exists by trying to query it
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      // Check if it's a table not found error
      if (profileError.code === 'PGRST116' || profileError.message?.includes('does not exist') || profileError.message?.includes('relation') && profileError.message?.includes('does not exist')) {
        console.log('Profiles table or organizations column does not exist yet. Run migrations.');
        return null;
      }
      console.error('Error fetching profile:', profileError);
      return null;
    }

    if (!profile?.organization_id) return null;

    // Check if organizations table exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .maybeSingle();

    if (orgError) {
      // Table might not exist yet - this is okay for now
      if (orgError.code === 'PGRST116' || orgError.message?.includes('does not exist') || (orgError.message?.includes('relation') && orgError.message?.includes('does not exist'))) {
        console.log('Organizations table does not exist yet. Run migrations to enable multi-tenancy.');
        return null;
      }
      console.error('Error getting organization:', orgError);
      return null;
    }

    return organization;
  } catch (error: any) {
    // Handle case where table doesn't exist
    if (error?.code === 'PGRST116' || error?.message?.includes('does not exist') || (error?.message?.includes('relation') && error?.message?.includes('does not exist'))) {
      console.log('Database tables do not exist yet. Run migrations.');
      return null;
    }
    console.error('Error getting current organization:', error);
    return null;
  }
};

/**
 * Get all organizations for current user
 */
export const getUserOrganizations = async (): Promise<Organization[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) return [];

    // Check if organization_members table exists
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('profile_id', profile.id)
      .eq('is_active', true);

    if (error) {
      // Table might not exist yet
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    
    if (!memberships || memberships.length === 0) return [];

    const orgIds = memberships.map(m => m.organization_id);
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds);

    if (orgError) {
      if (orgError.code === 'PGRST116' || orgError.message?.includes('does not exist')) {
        return [];
      }
      throw orgError;
    }
    return organizations || [];
  } catch (error) {
    console.error('Error getting user organizations:', error);
    return [];
  }
};

/**
 * Create a new organization
 */
export const createOrganization = async (
  name: string,
  subdomain?: string,
  plan: 'free' | 'starter' | 'professional' | 'enterprise' = 'free'
): Promise<Organization> => {
  try {
    // First check if organizations table exists
    const { error: tableCheckError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      if (tableCheckError.code === 'PGRST116' || tableCheckError.message?.includes('does not exist') || tableCheckError.message?.includes('schema cache')) {
        throw new Error('Organizations table does not exist. Please run the database migration first. See SETUP_ORGANIZATIONS_TABLE.sql file in the project root for instructions.');
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        subdomain: subdomain?.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        plan,
        owner_id: profile.id,
        subscription_status: 'active',
      })
      .select()
      .single();

    if (orgError) {
      if (orgError.code === 'PGRST116' || orgError.message?.includes('does not exist') || orgError.message?.includes('schema cache')) {
        throw new Error('Organizations table does not exist. Please run the database migration first. See SETUP_ORGANIZATIONS_TABLE.sql file in the project root for instructions.');
      }
      throw orgError;
    }

    // Add owner as admin member
    await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        profile_id: profile.id,
        role: 'admin',
        joined_at: new Date().toISOString(),
        is_active: true,
      });

    // Update profile with organization_id
    await supabase
      .from('profiles')
      .update({ organization_id: organization.id })
      .eq('id', profile.id);

    // Create default settings
    await supabase
      .from('organization_settings')
      .insert({
        organization_id: organization.id,
        branding: {},
        notifications: {},
        integrations: {},
        lead_assignment_rules: {},
        custom_fields: {},
      });

    // Create subscription record
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase
      .from('subscriptions')
      .insert({
        organization_id: organization.id,
        plan,
        status: 'active',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });

    return organization;
  } catch (error: any) {
    console.error('Error creating organization:', error);
    throw new Error(error.message || 'Failed to create organization');
  }
};

/**
 * Get organization members
 */
export const getOrganizationMembers = async (
  organizationId: string
): Promise<OrganizationMember[]> => {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profile:profiles(id, full_name, email)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(member => ({
      ...member,
      profile: member.profile as any,
    }));
  } catch (error) {
    console.error('Error getting organization members:', error);
    return [];
  }
};

/**
 * Invite user to organization
 */
export const inviteUserToOrganization = async (
  organizationId: string,
  email: string,
  role: 'admin' | 'employee' | 'manager' = 'employee'
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!inviterProfile) throw new Error('Profile not found');

    // Find profile by email
    const { data: inviteeProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!inviteeProfile) {
      throw new Error('User with this email not found. They need to sign up first.');
    }

    // Add as member
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        profile_id: inviteeProfile.id,
        role,
        invited_by: inviterProfile.id,
        is_active: true,
      });

    if (error) throw error;
  } catch (error: any) {
    console.error('Error inviting user:', error);
    throw new Error(error.message || 'Failed to invite user');
  }
};

/**
 * Update organization member role
 */
export const updateMemberRole = async (
  organizationId: string,
  profileId: string,
  role: 'admin' | 'employee' | 'manager'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('profile_id', profileId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating member role:', error);
    throw new Error(error.message || 'Failed to update member role');
  }
};

/**
 * Remove member from organization
 */
export const removeMemberFromOrganization = async (
  organizationId: string,
  profileId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('organization_members')
      .update({ is_active: false })
      .eq('organization_id', organizationId)
      .eq('profile_id', profileId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error removing member:', error);
    throw new Error(error.message || 'Failed to remove member');
  }
};

/**
 * Update organization settings
 */
export const updateOrganizationSettings = async (
  organizationId: string,
  settings: any
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('organization_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating organization settings:', error);
    throw new Error(error.message || 'Failed to update settings');
  }
};

/**
 * Get organization settings
 */
export const getOrganizationSettings = async (
  organizationId: string
): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting organization settings:', error);
    return null;
  }
};

/**
 * Get organization subscription
 */
export const getOrganizationSubscription = async (
  organizationId: string
): Promise<Subscription | null> => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

/**
 * Update organization subscription
 */
export const updateOrganizationSubscription = async (
  organizationId: string,
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
): Promise<void> => {
  try {
    // Update organization plan
    await supabase
      .from('organizations')
      .update({ plan })
      .eq('id', organizationId);

    // Update or create subscription
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('organization_id', organizationId)
      .single();

    if (existing) {
      await supabase
        .from('subscriptions')
        .update({
          plan,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          organization_id: organizationId,
          plan,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
    }
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    throw new Error(error.message || 'Failed to update subscription');
  }
};

/**
 * Check if organization has reached plan limits
 */
export const checkPlanLimits = async (
  organizationId: string,
  resource: 'users' | 'leads' | 'properties'
): Promise<{ withinLimit: boolean; current: number; limit: number }> => {
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select(`max_${resource}`)
      .eq('id', organizationId)
      .single();

    if (!org) {
      return { withinLimit: false, current: 0, limit: 0 };
    }

    let current = 0;
    const limit = org[`max_${resource}` as keyof typeof org] as number;

    switch (resource) {
      case 'users':
        const { count: userCount } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true);
        current = userCount || 0;
        break;
      case 'leads':
        const { count: leadCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
        current = leadCount || 0;
        break;
      case 'properties':
        const { count: propertyCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
        current = propertyCount || 0;
        break;
    }

    return {
      withinLimit: current < limit,
      current,
      limit,
    };
  } catch (error) {
    console.error('Error checking plan limits:', error);
    return { withinLimit: false, current: 0, limit: 0 };
  }
};

