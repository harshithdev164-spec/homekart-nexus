import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin,
  Home,
  Bed,
  Bath,
  Square,
  IndianRupee,
  Edit,
  Calendar,
  User,
  Building,
  Phone,
  Mail,
  Clock,
  Activity,
  Users,
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description?: string;
  price: number;
  property_type: string;
  status: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  location: string;
  address?: string;
  city: string;
  state: string;
  pincode?: string;
  amenities?: string[];
  images?: string[];
  latitude?: number;
  longitude?: number;
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string;
  };
}

interface PropertyInterest {
  id: string;
  lead_id: string;
  interest_level: number;
  notes?: string;
  created_at: string;
  leads: {
    name: string;
    email?: string;
    phone: string;
    status: string;
  };
}

interface VisitSchedule {
  id: string;
  visitor_name: string;
  visitor_email?: string;
  visitor_phone: string;
  visit_date: string;
  status: string;
  notes?: string;
  scheduled_by: string;
  profiles?: {
    full_name: string;
  } | null;
}

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (property: Property) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { toast } = useToast();
  const [interests, setInterests] = useState<PropertyInterest[]>([]);
  const [visits, setVisits] = useState<VisitSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (property && isOpen) {
      fetchPropertyData();
    }
  }, [property, isOpen]);

  const fetchPropertyData = async () => {
    if (!property) return;
    
    setLoading(true);
    try {
      // Fetch property interests
      const { data: interestsData, error: interestsError } = await supabase
        .from('lead_property_interests')
        .select(`
          *,
          leads(name, email, phone, status)
        `)
        .eq('property_id', property.id)
        .order('created_at', { ascending: false });

      if (interestsError) {
        console.error('Error fetching interests:', interestsError);
      } else {
        setInterests(interestsData || []);
      }

      // Fetch visit schedules
      const { data: visitsData, error: visitsError } = await supabase
        .from('visit_schedules')
        .select(`
          *,
          profiles!visit_schedules_scheduled_by_fkey(full_name)
        `)
        .eq('property_id', property.id)
        .order('visit_date', { ascending: false });

      if (visitsError) {
        console.error('Error fetching visits:', visitsError);
      } else {
        setVisits((visitsData as any) || []);
      }
    } catch (error) {
      console.error('Error fetching property data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'under_contract': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'sold': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'rented': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'off_market': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'contacted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'qualified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'converted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'lost': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getVisitStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) { // 1 crore
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    } else if (price >= 100000) { // 1 lakh
      return `₹${(price / 100000).toFixed(2)} L`;
    } else if (price >= 1000) { // 1 thousand
      return `₹${(price / 1000).toFixed(0)}K`;
    }
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const getInterestLevelColor = (level: number) => {
    if (level >= 8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (level >= 6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    if (level >= 4) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  if (!property) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold">{property.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{property.location}, {property.city}, {property.state}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(property.status)}>
                {property.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(property)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="interests">Interests ({interests.length})</TabsTrigger>
              <TabsTrigger value="visits">Visits ({visits.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Price and Key Details */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IndianRupee className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatPrice(property.price)}</p>
                        <p className="text-sm text-muted-foreground">Price</p>
                      </div>
                    </div>
                    
                    {property.area && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Square className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{property.area.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">sq ft</p>
                        </div>
                      </div>
                    )}
                    
                    {property.bedrooms && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bed className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{property.bedrooms}</p>
                          <p className="text-sm text-muted-foreground">Bedrooms</p>
                        </div>
                      </div>
                    )}
                    
                    {property.bathrooms && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bath className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{property.bathrooms}</p>
                          <p className="text-sm text-muted-foreground">Bathrooms</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {property.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{property.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Amenities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <p className="capitalize">{property.property_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Badge className={getStatusColor(property.status)}>
                        {property.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    {property.pincode && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">PIN Code</label>
                        <p>{property.pincode}</p>
                      </div>
                    )}
                    {property.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Full Address</label>
                        <p className="text-sm">{property.address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Created By */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Property Manager
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p>{property.profiles?.full_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{new Date(property.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="interests" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : interests.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Interest Yet</h3>
                    <p className="text-muted-foreground text-center">
                      No leads have shown interest in this property yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {interests.map((interest) => (
                    <Card key={interest.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{interest.leads.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{interest.leads.phone}</span>
                              {interest.leads.email && (
                                <>
                                  <Mail className="h-3 w-3 ml-2" />
                                  <span>{interest.leads.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getLeadStatusColor(interest.leads.status)}>
                              {interest.leads.status}
                            </Badge>
                            <Badge className={getInterestLevelColor(interest.interest_level)}>
                              {interest.interest_level}/10
                            </Badge>
                          </div>
                        </div>
                        {interest.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <p>{interest.notes}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3" />
                          <span>Interested on {new Date(interest.created_at).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="visits" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : visits.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Visits Scheduled</h3>
                    <p className="text-muted-foreground text-center">
                      No property visits have been scheduled yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {visits.map((visit) => (
                    <Card key={visit.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{visit.visitor_name}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{visit.visitor_phone}</span>
                              {visit.visitor_email && (
                                <>
                                  <Mail className="h-3 w-3 ml-2" />
                                  <span>{visit.visitor_email}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge className={getVisitStatusColor(visit.status)}>
                            {visit.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(visit.visit_date).toLocaleDateString()}</span>
                            <span>{new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Scheduled by {visit.profiles?.full_name}</span>
                          </div>
                        </div>
                        {visit.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <p>{visit.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};