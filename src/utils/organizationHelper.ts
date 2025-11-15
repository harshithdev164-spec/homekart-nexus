/**
 * Organization Helper Utilities
 * Functions to help with organization setup and user assignment
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Create or get "Axiss Realty Corp" organization and assign all users to it
 * This can be called from the browser console or as a one-time setup
 */
export const setupAxissRealtyOrganization = async (): Promise<{ success: boolean; message: string; organizationId?: string }> => {
  try {
    // Step 1: Check if organization exists
    let { data: existingOrg, error: orgCheckError } = await supabase
      .from('organizations')
      .select('*')
      .or('name.ilike.%axiss realty corp%,name.ilike.%axiss realty%')
      .maybeSingle();

    if (orgCheckError && orgCheckError.code !== 'PGRST116') {
      console.error('Error checking for organization:', orgCheckError);
    }

    let organizationId: string;

    if (existingOrg) {
      organizationId = existingOrg.id;
      console.log('Found existing organization:', existingOrg.name);
    } else {
      // Step 2: Get first admin user as owner
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: firstProfile } = adminProfile 
        ? { data: adminProfile }
        : await supabase
            .from('profiles')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

      if (!firstProfile) {
        return { success: false, message: 'No profiles found in database' };
      }

      // Step 3: Create organization
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Axiss Realty Corp',
          subdomain: 'axissrealty',
          plan: 'enterprise',
          owner_id: firstProfile.id,
          subscription_status: 'active',
          max_users: -1,
          max_leads: -1,
          max_properties: -1,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating organization:', createError);
        return { success: false, message: `Failed to create organization: ${createError.message}` };
      }

      organizationId = newOrg.id;
      console.log('Created organization:', newOrg.name);

      // Create organization settings
      await supabase
        .from('organization_settings')
        .insert({
          organization_id: organizationId,
          branding: {},
          notifications: {},
          integrations: {},
          lead_assignment_rules: {},
          custom_fields: {},
        });

      // Create subscription
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      await supabase
        .from('subscriptions')
        .insert({
          organization_id: organizationId,
          plan: 'enterprise',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        });
    }

    // Step 4: Get all profiles without organization_id or with different organization
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, organization_id, role')
      .or(`organization_id.is.null,organization_id.neq.${organizationId}`);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return { success: false, message: `Failed to fetch profiles: ${profilesError.message}` };
    }

    if (!profiles || profiles.length === 0) {
      return { success: true, message: 'All users are already assigned to the organization', organizationId };
    }

    // Step 5: Update all profiles with organization_id
    const profileIds = profiles.map(p => p.id);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ organization_id: organizationId })
      .in('id', profileIds);

    if (updateError) {
      console.error('Error updating profiles:', updateError);
      return { success: false, message: `Failed to update profiles: ${updateError.message}` };
    }

    // Step 6: Add all profiles to organization_members
    const membersToInsert = profiles.map(profile => ({
      organization_id: organizationId,
      profile_id: profile.id,
      role: (profile.role || 'employee') as 'admin' | 'employee' | 'manager',
      joined_at: new Date().toISOString(),
      is_active: true,
    }));

    // Insert in batches to avoid payload size issues
    const batchSize = 50;
    for (let i = 0; i < membersToInsert.length; i += batchSize) {
      const batch = membersToInsert.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('organization_members')
        .upsert(batch, {
          onConflict: 'organization_id,profile_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
      }
    }

    // Step 7: Update all existing data with organization_id
    const tablesToUpdate = [
      'leads',
      'properties',
      'activities',
      'teams',
      'communication_logs',
      'tasks',
      'visit_schedules',
      'lead_transfers',
    ];

    for (const table of tablesToUpdate) {
      const { error: dataUpdateError } = await supabase
        .from(table)
        .update({ organization_id: organizationId })
        .is('organization_id', null);

      if (dataUpdateError) {
        console.warn(`Warning: Could not update ${table}:`, dataUpdateError.message);
      }
    }

    return {
      success: true,
      message: `Successfully assigned ${profiles.length} users to Axiss Realty Corp`,
      organizationId,
    };
  } catch (error: any) {
    console.error('Error in setupAxissRealtyOrganization:', error);
    return { success: false, message: error.message || 'Unknown error occurred' };
  }
};

/**
 * Check if current user has an organization
 */
export const ensureUserHasOrganization = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) return false;

    // If user has organization_id, check if organization exists
    if (profile.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', profile.organization_id)
        .maybeSingle();

      if (org) return true;
    }

    // User doesn't have organization, try to assign to Axiss Realty Corp
    const result = await setupAxissRealtyOrganization();
    if (result.success) {
      // Refresh profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      return !!updatedProfile?.organization_id;
    }

    return false;
  } catch (error) {
    console.error('Error ensuring user has organization:', error);
    return false;
  }
};

