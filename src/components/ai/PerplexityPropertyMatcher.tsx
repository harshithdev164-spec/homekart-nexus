import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Sparkles, TrendingUp, MapPin, IndianRupee, Bed, Bath, Square, AlertTriangle, Loader2 } from 'lucide-react';
import { matchPropertiesToLead, PropertyMatch } from '@/services/perplexityService';
import { useToast } from '@/hooks/use-toast';
import { PropertyDetailModal } from '@/components/properties/PropertyDetailModal';

interface PerplexityPropertyMatcherProps {
  leadId: string;
  leadData: any;
  onPropertySelected?: (propertyId: string) => void;
}

export const PerplexityPropertyMatcher: React.FC<PerplexityPropertyMatcherProps> = ({ 
  leadId, 
  leadData, 
  onPropertySelected 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<PropertyMatch[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);

  const findMatches = async () => {
    setLoading(true);
    try {
      const result = await matchPropertiesToLead(leadId);
      setMatches(result.matches || []);
      setSummary(result.summary || '');
      toast({
        title: "AI Property Matching Complete",
        description: `Found ${result.matches?.length || 0} matching properties using Perplexity AI`,
      });
    } catch (error: any) {
      console.error('Error finding property matches:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to find property matches. Please configure Perplexity API key in Supabase secrets.",
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

  const handleViewProperty = (property: any) => {
    setSelectedProperty(property);
    setShowPropertyModal(true);
    onPropertySelected?.(property.id);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Perplexity AI Property Matching
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Advanced AI-powered property matching using Perplexity AI for intelligent recommendations
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
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
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Properties with AI...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Find AI-Matched Properties
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1">AI Analysis Summary</h4>
                <p className="text-sm text-muted-foreground">{summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Matched Properties ({matches.length})</h3>
            <Badge variant="outline">Sorted by Match Score</Badge>
          </div>
          
          {matches.map((match) => (
            <Card key={match.propertyId} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{match.property?.title || 'Property'}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {match.property?.location}, {match.property?.city}
                      </div>
                      <div className="flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />
                        {match.property?.price ? formatPrice(match.property.price) : 'N/A'}
                      </div>
                      {match.property?.property_type && (
                        <Badge variant="outline">{match.property.property_type}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getScoreColor(match.score)} font-bold text-base px-3 py-1`}>
                      {match.score}% Match
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {match.property && (
                  <>
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
                  </>
                )}

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
                        <h5 className="font-medium mb-2 text-green-700 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Key Highlights:
                        </h5>
                        <ul className="space-y-1">
                          {match.highlights.map((highlight, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-green-600 mt-1">•</span>
                              <span className="text-green-700">{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Concerns */}
                    {match.concerns && match.concerns.length > 0 && (
                      <div>
                        <h5 className="font-medium mb-2 text-orange-700 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Potential Concerns:
                        </h5>
                        <ul className="space-y-1">
                          {match.concerns.map((concern, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-orange-600 mt-1">•</span>
                              <span className="text-orange-700">{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amenities */}
                {match.property?.amenities && match.property.amenities.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Amenities:</h5>
                    <div className="flex flex-wrap gap-1">
                      {match.property.amenities.slice(0, 6).map((amenity: string, index: number) => (
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
                    onClick={() => handleViewProperty(match.property)}
                    className="flex-1"
                  >
                    View Property Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && matches.length === 0 && summary && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No suitable property matches found for this lead's preferences.</p>
          </CardContent>
        </Card>
      )}

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={showPropertyModal}
          onClose={() => {
            setShowPropertyModal(false);
            setSelectedProperty(null);
          }}
        />
      )}
    </div>
  );
};

