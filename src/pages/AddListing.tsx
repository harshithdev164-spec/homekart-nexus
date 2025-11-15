import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Upload, MapPin, Home, Bed, Bath, Square, IndianRupee, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ListingPortal {
  id: string;
  name: string;
  icon: string;
  description: string;
  requiredPlan?: string;
}

interface ListingFormData {
  title: string;
  description: string;
  property_type: string;
  category: 'primary' | 'resale' | 'rent';
  source_type: 'agent' | 'owner';
  price: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  location: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  amenities: string;
}

interface PortalListing {
  id: string;
  listing_id: string;
  portal_name: string;
  portal_url?: string;
  status: 'pending' | 'live' | 'failed' | 'expired';
  created_at: string;
  synced_at?: string;
  error_message?: string;
}

const PORTALS: ListingPortal[] = [
  {
    id: 'magicbricks',
    name: 'MagicBricks',
    icon: '🏢',
    description: 'List your property on MagicBricks portal',
    requiredPlan: 'basic'
  },
  {
    id: 'housing',
    name: 'Housing.com',
    icon: '🏠',
    description: 'Reach buyers and renters on Housing.com',
    requiredPlan: 'basic'
  },
  {
    id: '99acres',
    name: '99 Acres',
    icon: '🏘️',
    description: 'Post on 99 Acres platform',
    requiredPlan: 'standard'
  },
];

const PROPERTY_TYPES = ['Apartment', 'Villa', 'House', 'Plot', 'Commercial', 'Office', 'Retail', 'Industrial'];
const AMENITIES = ['WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Garden', 'Security', 'Elevator', 'Balcony', 'AC', 'Furnished'];

const AddListing: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<PortalListing[]>([]);
  const [userPlan, setUserPlan] = useState<string>('basic');
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPortals, setSelectedPortals] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    property_type: '',
    category: 'resale',
    source_type: 'owner',
    price: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    location: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    amenities: '',
  });

  useEffect(() => {
    fetchUserPlan();
    fetchListings();

    const channel = supabase
      .channel('portal_listings_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portal_listings' as any
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserPlan = async () => {
    try {
      if (profile?.id) {
        const { data } = await (supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', profile.id)
          .single() as any);

        if (data?.subscription_plan) {
          setUserPlan(data.subscription_plan);
        }
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase
        .from('portal_listings' as any)
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false }) as any);

      if (error) {
        console.error('Error fetching listings:', error);
        return;
      }

      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const canAccessPortal = (requiredPlan?: string): boolean => {
    if (!requiredPlan) return true;
    const plans = ['basic', 'standard', 'premium'];
    return plans.indexOf(userPlan) >= plans.indexOf(requiredPlan);
  };

  const togglePortal = (portalId: string) => {
    const portal = PORTALS.find(p => p.id === portalId);
    if (portal && !canAccessPortal(portal.requiredPlan)) {
      toast({
        title: 'Plan Required',
        description: `This portal requires a ${portal.requiredPlan} plan or higher`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedPortals(prev =>
      prev.includes(portalId)
        ? prev.filter(id => id !== portalId)
        : [...prev, portalId]
    );
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return false;
    }
    if (!formData.property_type) {
      toast({ title: 'Error', description: 'Property type is required', variant: 'destructive' });
      return false;
    }
    if (!formData.price.trim()) {
      toast({ title: 'Error', description: 'Price is required', variant: 'destructive' });
      return false;
    }
    if (!formData.city.trim()) {
      toast({ title: 'Error', description: 'City is required', variant: 'destructive' });
      return false;
    }
    if (selectedPortals.length === 0) {
      toast({ title: 'Error', description: 'Select at least one portal', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSubmitListing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Create property listing
      const { data: propertyData, error: propertyError } = await (supabase
        .from('properties')
        .insert({
          title: formData.title,
          description: formData.description,
          property_type: formData.property_type,
          category: formData.category,
          source_type: formData.source_type,
          price: parseInt(formData.price),
          area: formData.area ? parseInt(formData.area) : null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
          location: formData.location || formData.city,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          amenities: selectedAmenities,
          created_by: profile?.id,
          status: 'active'
        } as any)
        .select() as any) as any;

      if (propertyError) {
        console.error('Error creating property:', propertyError);
        toast({
          title: 'Error',
          description: 'Failed to create property listing',
          variant: 'destructive',
        });
        return;
      }

      const listingId = propertyData?.[0]?.id;

      // Create portal listings
      const portalListings = selectedPortals.map(portalId => ({
        listing_id: listingId,
        portal_name: portalId,
        created_by: profile?.id,
        status: 'pending' as const,
      }));

      const { error: portalError } = await (supabase
        .from('portal_listings' as any)
        .insert(portalListings) as any);

      if (portalError) {
        console.error('Error creating portal listings:', portalError);
        toast({
          title: 'Partial Success',
          description: 'Property created but failed to sync to all portals',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Listing created and queued for ${selectedPortals.length} portal(s)`,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        property_type: '',
        category: 'resale',
        source_type: 'owner',
        price: '',
        area: '',
        bedrooms: '',
        bathrooms: '',
        location: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        amenities: '',
      });
      setSelectedPortals([]);
      setSelectedAmenities([]);
      setIsCreateDialogOpen(false);

      fetchListings();
    } catch (error) {
      console.error('Error submitting listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit listing',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-primary"></div>
          <p className="text-muted-foreground">Loading listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Add Listing</h1>
          <p className="text-muted-foreground">Post your properties to multiple real estate portals</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post New Listing</DialogTitle>
              <DialogDescription>
                Fill in the details and select portals where you want to list this property
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitListing} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Property Details</h3>

                <div>
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., 2 BHK Apartment in Whitefield"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your property..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="property_type">Property Type *</Label>
                    <Select value={formData.property_type} onValueChange={(value) => handleSelectChange('property_type', value)}>
                      <SelectTrigger id="property_type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value as any)}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="resale">Resale</SelectItem>
                        <SelectItem value="rent">Rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Pricing & Specifications */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Pricing & Specifications</h3>

                <div>
                  <Label htmlFor="price">Price (₹) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    placeholder="Enter price in rupees"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      name="bedrooms"
                      type="number"
                      placeholder="e.g., 2"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      name="bathrooms"
                      type="number"
                      placeholder="e.g., 2"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="area">Area (sq ft)</Label>
                    <Input
                      id="area"
                      name="area"
                      type="number"
                      placeholder="e.g., 1200"
                      value={formData.area}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Location</h3>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Full address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="location">Locality</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g., Whitefield"
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="e.g., Bangalore"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="e.g., Karnataka"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    name="pincode"
                    placeholder="e.g., 560066"
                    value={formData.pincode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Amenities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {AMENITIES.map(amenity => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`amenity-${amenity}`}
                        checked={selectedAmenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <Label htmlFor={`amenity-${amenity}`} className="text-sm cursor-pointer">
                        {amenity}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Portal Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Select Portals *</h3>
                <p className="text-sm text-muted-foreground">Your current plan: <Badge>{userPlan}</Badge></p>

                <div className="grid grid-cols-1 gap-3">
                  {PORTALS.map(portal => {
                    const hasAccess = canAccessPortal(portal.requiredPlan);
                    const isSelected = selectedPortals.includes(portal.id);

                    return (
                      <div
                        key={portal.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : hasAccess
                            ? 'border-border hover:border-primary/50'
                            : 'border-muted bg-muted/30 opacity-60 cursor-not-allowed'
                        }`}
                        onClick={() => hasAccess && togglePortal(portal.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={isSelected}
                              disabled={!hasAccess}
                              onCheckedChange={() => hasAccess && togglePortal(portal.id)}
                            />
                            <div>
                              <h4 className="font-semibold">{portal.name}</h4>
                              <p className="text-sm text-muted-foreground">{portal.description}</p>
                              {portal.requiredPlan && (
                                <p className="text-xs text-muted-foreground mt-1">Requires: {portal.requiredPlan} plan</p>
                              )}
                            </div>
                          </div>
                          {!hasAccess && (
                            <Badge variant="outline">Upgrade</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Posting...' : 'Post Listing'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Listings */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Active Listings</h2>

        {listings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No listings yet. Create your first listing to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Listing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(listing => (
              <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{listing.portal_name}</CardTitle>
                      <CardDescription>
                        Listed on {format(new Date(listing.created_at), 'MMM dd, yyyy')}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(listing.status)}>
                      {getStatusIcon(listing.status)}
                      <span className="ml-1">{listing.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {listing.portal_url && (
                    <a
                      href={listing.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm flex items-center gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      View on Portal
                    </a>
                  )}

                  {listing.error_message && (
                    <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
                      <p className="font-semibold">Error:</p>
                      <p>{listing.error_message}</p>
                    </div>
                  )}

                  {listing.synced_at && (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {format(new Date(listing.synced_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddListing;
