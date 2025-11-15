import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Sparkles, TrendingUp, MapPin, IndianRupee, Bed, Bath, Square, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PropertyMatch {
  propertyId: string;
  score: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
  property: {
    id: string;
    title: string;
    price: number;
    location: string;
    city: string;
    state: string;
    property_type: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    amenities?: string[];
    images?: string[];
    description?: string;
  };
}

interface PropertyMatchResult {
  matches: PropertyMatch[];
  summary: string;
}

interface AIPropertyMatcherProps {
  leadId: string;
  leadData: any;
  onPropertySelected?: (propertyId: string) => void;
}

export const AIPropertyMatcher: React.FC<AIPropertyMatcherProps> = ({ 
  leadId, 
  leadData, 
  onPropertySelected 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<PropertyMatchResult | null>(null);

  const findMatches = async () => {
    setLoading(true);
    try {
      // Try Perplexity first, fallback to OpenAI if not configured
      let data;
      let error;
      
      try {
        const response = await supabase.functions.invoke('perplexity-property-matcher', {
          body: { leadId }
        });
        data = response.data;
        error = response.error;
      } catch (e) {
        // Fallback to OpenAI if Perplexity not configured
        const response = await supabase.functions.invoke('ai-property-matcher', {
          body: { leadId }
        });
        data = response.data;
        error = response.error;
      }

      if (error) throw error;

      setMatches(data);
      toast({
        title: "AI Property Matching Complete",
        description: `Found ${data.matches?.length || 0} matching properties`,
      });
    } catch (error: any) {
      console.error('Error finding property matches:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to find property matches. Please configure Perplexity API key.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            AI Property Matching
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Find properties that best match this lead's preferences using AI analysis
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm">
              <strong>Budget:</strong> ₹{leadData.budget_min || 0} - ₹{leadData.budget_max || 'No limit'}
            </div>
            <div className="text-sm">
              <strong>Location:</strong> {leadData.preferred_location || 'Any'}
            </div>
            <div className="text-sm">
              <strong>Type:</strong> {leadData.property_type || 'Any'}
            </div>
          </div>
          
          <Button 
            onClick={findMatches}
            disabled={loading}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? 'Analyzing Properties...' : 'Find AI-Matched Properties'}
          </Button>
        </CardContent>
      </Card>

      {matches && (
        <>
          {/* Summary */}
          {matches.summary && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium mb-1">AI Analysis Summary</h4>
                    <p className="text-sm text-muted-foreground">{matches.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Property Matches */}
          <div className="space-y-4">
            {matches.matches && matches.matches.length > 0 ? (
              matches.matches.map((match) => (
                <Card key={match.propertyId} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{match.property.title}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {match.property.location}, {match.property.city}
                          </div>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {formatPrice(match.property.price)}
                          </div>
                          <Badge variant="outline">{match.property.property_type}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getScoreColor(match.score)} font-bold`}>
                          {match.score}% Match
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Property Details */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {match.property.bedrooms && (
                        <div className="flex items-center gap-2 text-sm">
                          <Bed className="h-4 w-4 text-muted-foreground" />
                          <span>{match.property.bedrooms} Bed</span>
                        </div>
                      )}
                      {match.property.bathrooms && (
                        <div className="flex items-center gap-2 text-sm">
                          <Bath className="h-4 w-4 text-muted-foreground" />
                          <span>{match.property.bathrooms} Bath</span>
                        </div>
                      )}
                      {match.property.area && (
                        <div className="flex items-center gap-2 text-sm">
                          <Square className="h-4 w-4 text-muted-foreground" />
                          <span>{match.property.area} sqft</span>
                        </div>
                      )}
                    </div>

                    {/* AI Analysis */}
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium mb-2">AI Reasoning:</h5>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {match.reasoning}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Highlights */}
                        {match.highlights && match.highlights.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2 text-green-700">Key Highlights:</h5>
                            <ul className="space-y-1">
                              {match.highlights.map((highlight, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <TrendingUp className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                                  <span className="text-green-700">{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Concerns */}
                        {match.concerns && match.concerns.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2 text-orange-700">Potential Concerns:</h5>
                            <ul className="space-y-1">
                              {match.concerns.map((concern, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <AlertTriangle className="h-3 w-3 text-orange-600 mt-1 flex-shrink-0" />
                                  <span className="text-orange-700">{concern}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amenities */}
                    {match.property.amenities && match.property.amenities.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-medium mb-2">Amenities:</h5>
                        <div className="flex flex-wrap gap-1">
                          {match.property.amenities.slice(0, 6).map((amenity, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {amenity}
                            </Badge>
                          ))}
                          {match.property.amenities.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{match.property.amenities.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={() => onPropertySelected?.(match.property.id)}
                        className="flex-1"
                      >
                        View Property Details
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          // Add to lead interests
                          supabase
                            .from('lead_property_interests')
                            .insert({
                              lead_id: leadId,
                              property_id: match.property.id,
                              interest_level: Math.round(match.score / 10),
                              notes: `AI Match: ${match.score}% - ${match.reasoning}`
                            })
                            .then(() => {
                              toast({
                                title: "Property Added",
                                description: "Added to lead's interested properties",
                              });
                            });
                        }}
                      >
                        Add to Interests
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No suitable property matches found for this lead's preferences.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};