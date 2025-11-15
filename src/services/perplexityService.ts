import { supabase } from '@/integrations/supabase/client';

export interface PropertyMatch {
  propertyId: string;
  score: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
  property?: any;
}

export interface PropertyMatchingResult {
  matches: PropertyMatch[];
  summary: string;
}

export interface MarketInsight {
  location: string;
  trend: 'rising' | 'stable' | 'declining';
  averagePrice: number;
  priceChange: number;
  demandLevel: 'high' | 'medium' | 'low';
  insights: string[];
}

export interface LeadQualification {
  score: number;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  recommendations: string[];
  estimatedCloseProbability: number;
}

export interface LocationIntelligence {
  location: string;
  demographics: string;
  infrastructure: string[];
  nearbyAmenities: string[];
  marketTrends: string;
  investmentPotential: 'high' | 'medium' | 'low';
}

/**
 * Match properties to a lead using Perplexity AI
 */
export const matchPropertiesToLead = async (
  leadId: string
): Promise<PropertyMatchingResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('perplexity-property-matcher', {
      body: { leadId }
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error matching properties:', error);
    throw new Error(error.message || 'Failed to match properties');
  }
};

/**
 * Get market insights for a location using Perplexity AI
 */
export const getMarketInsights = async (
  location: string
): Promise<MarketInsight> => {
  try {
    const { data, error } = await supabase.functions.invoke('perplexity-market-insights', {
      body: { location }
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error getting market insights:', error);
    throw new Error(error.message || 'Failed to get market insights');
  }
};

/**
 * Qualify a lead using Perplexity AI
 */
export const qualifyLead = async (
  leadId: string
): Promise<LeadQualification> => {
  try {
    const { data, error } = await supabase.functions.invoke('perplexity-lead-qualification', {
      body: { leadId }
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error qualifying lead:', error);
    throw new Error(error.message || 'Failed to qualify lead');
  }
};

/**
 * Get location intelligence using Perplexity AI
 */
export const getLocationIntelligence = async (
  location: string
): Promise<LocationIntelligence> => {
  try {
    const { data, error } = await supabase.functions.invoke('perplexity-location-intelligence', {
      body: { location }
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error getting location intelligence:', error);
    throw new Error(error.message || 'Failed to get location intelligence');
  }
};

/**
 * Get competitive analysis for a property using Perplexity AI
 */
export const getCompetitiveAnalysis = async (
  propertyId: string
): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('perplexity-competitive-analysis', {
      body: { propertyId }
    });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error getting competitive analysis:', error);
    throw new Error(error.message || 'Failed to get competitive analysis');
  }
};

/**
 * Generate property recommendations based on lead preferences
 */
export const generatePropertyRecommendations = async (
  leadId: string,
  limit: number = 5
): Promise<PropertyMatch[]> => {
  try {
    const result = await matchPropertiesToLead(leadId);
    return result.matches.slice(0, limit);
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
};

