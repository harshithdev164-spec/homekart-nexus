import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, MapPin, Home, Bed, Bath, Square, IndianRupee, Filter, Users, Star, Clock, Phone } from 'lucide-react';
import { CallButton } from '@/components/calls/CallButton';
import { useToast } from '@/hooks/use-toast';
import { RealtimeIndicator } from '@/components/collaboration/RealtimeIndicator';
import { PropertyMap } from '@/components/maps/PropertyMap';
import { PropertyDetailModal } from '@/components/properties/PropertyDetailModal';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Property {
  id: string;
  title: string;
  description?: string;
  price: number;
  property_type: string;
  status: string;
  category?: 'primary' | 'resale' | 'rent';
  source_type?: 'agent' | 'owner';
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
  updated_at?: string;
  created_by: string;
  profiles?: {
    full_name: string;
    phone?: string;
  };
}

const Properties: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: '',
    category: 'primary' as 'primary' | 'resale' | 'rent',
    source_type: 'owner' as 'agent' | 'owner',
    price: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    location: '',
    address: '',
    city: '',
    state: '',
    wings: '',
    towers: '',
    floor: '',
    is_magicbricks_listing: false,
  });

  useEffect(() => {
    fetchProperties();
    
    // Set up real-time subscription for properties
    const channel = supabase
      .channel('properties_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'properties' },
        (payload) => {
          console.log('Property change detected:', payload);
          fetchProperties();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles!properties_created_by_fkey(full_name, phone)
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch properties',
          variant: 'destructive',
        });
        return;
      }

      const propertiesWithTypedCategory = (data || []).map(property => ({
        ...property,
        category: (property.category as 'primary' | 'resale' | 'rent') || 'primary',
        source_type: (property.source_type as 'agent' | 'owner') || 'owner',
        updated_at: property.updated_at || property.created_at
      }));
      
      setProperties(propertiesWithTypedCategory);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    try {
      const propertyData = {
        ...formData,
        property_type: formData.property_type as 'apartment' | 'villa' | 'plot' | 'commercial' | 'office' | 'warehouse',
        price: parseFloat(formData.price),
        area: formData.area ? parseFloat(formData.area) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        wings: formData.wings ? parseInt(formData.wings) : null,
        towers: formData.towers ? parseInt(formData.towers) : null,
        floor: formData.floor || null,
        is_magicbricks_listing: formData.is_magicbricks_listing,
        created_by: profile.id,
      };

      const { error } = await supabase
        .from('properties')
        .insert([propertyData]);

      if (error) {
        console.error('Error creating property:', error);
        toast({
          title: 'Error',
          description: 'Failed to create property',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Property created successfully',
      });

      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        property_type: '',
        category: 'primary',
        source_type: 'owner',
        price: '',
        area: '',
        bedrooms: '',
        bathrooms: '',
        location: '',
        address: '',
        city: '',
        state: '',
        wings: '',
        towers: '',
        floor: '',
        is_magicbricks_listing: false,
      });
      fetchProperties();
    } catch (error) {
      console.error('Error creating property:', error);
    }
  };

  const handleEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !editingProperty) return;

    try {
      const propertyData = {
        ...formData,
        property_type: formData.property_type as 'apartment' | 'villa' | 'plot' | 'commercial' | 'office' | 'warehouse',
        price: parseFloat(formData.price),
        area: formData.area ? parseFloat(formData.area) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        wings: formData.wings ? parseInt(formData.wings) : null,
        towers: formData.towers ? parseInt(formData.towers) : null,
        floor: formData.floor || null,
        is_magicbricks_listing: formData.is_magicbricks_listing,
        updated_by: profile.id,
      };

      const { error } = await supabase
        .from('properties')
        .update(propertyData)
        .eq('id', editingProperty.id);

      if (error) {
        console.error('Error updating property:', error);
        toast({
          title: 'Error',
          description: 'Failed to update property',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Property updated successfully',
      });

      setIsEditDialogOpen(false);
      setEditingProperty(null);
      fetchProperties();
    } catch (error) {
      console.error('Error updating property:', error);
    }
  };

  const handleStatusUpdate = async (propertyId: string, newStatus: 'available' | 'under_contract' | 'sold' | 'rented' | 'off_market') => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ 
          status: newStatus,
          updated_by: profile?.id 
        })
        .eq('id', propertyId);

      if (error) {
        console.error('Error updating status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update property status',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Property status updated successfully',
      });

      fetchProperties();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const openEditDialog = (property: Property) => {
    setEditingProperty({
      ...property,
      category: property.category || 'primary',
      updated_at: property.updated_at || property.created_at
    });
    setFormData({
      title: property.title,
      description: property.description || '',
      property_type: property.property_type,
      category: property.category || 'primary',
      source_type: property.source_type || 'owner',
      price: property.price.toString(),
      area: property.area?.toString() || '',
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      location: property.location,
      address: property.address || '',
      city: property.city,
      state: property.state,
      wings: (property as any).wings?.toString() || '',
      towers: (property as any).towers?.toString() || '',
      floor: (property as any).floor || '',
      is_magicbricks_listing: (property as any).is_magicbricks_listing || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleStatusChange = async (propertyId: string, newStatus: 'available' | 'sold' | 'under_contract' | 'rented' | 'off_market') => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('properties')
        .update({ 
          status: newStatus,
          updated_by: profile.id 
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Property status updated',
      });

      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const openDetailModal = (property: Property) => {
    console.log('Opening detail modal for property:', property.title);
    setSelectedProperty({
      ...property,
      category: property.category || 'primary',
      updated_at: property.updated_at || property.created_at
    });
    setIsDetailModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'under_contract': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'rented': return 'bg-purple-100 text-purple-800';
      case 'off_market': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'apartment':
      case 'villa':
        return Home;
      case 'commercial':
      case 'office':
      case 'warehouse':
        return Square;
      default:
        return Home;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'primary': return 'bg-blue-100 text-blue-800';
      case 'resale': return 'bg-orange-100 text-orange-800';
      case 'rent': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    switch (sourceType) {
      case 'agent': return 'bg-purple-100 text-purple-800';
      case 'owner': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'my-properties') return matchesSearch && property.created_by === profile?.id;
    if (activeTab === 'magicbricks') return matchesSearch && (property as any).is_magicbricks_listing === true;
    return matchesSearch && property.category === activeTab;
  });

  // Separate properties by category for better organization
  const primaryProperties = filteredProperties.filter(p => p.category === 'primary');
  const resaleProperties = filteredProperties.filter(p => p.category === 'resale');
  const rentProperties = filteredProperties.filter(p => p.category === 'rent');
  const myProperties = filteredProperties.filter(p => p.created_by === profile?.id);
  const magicbricksProperties = properties.filter(p => (p as any).is_magicbricks_listing === true);

  const renderPropertyCard = (property: Property) => (
    <Card key={property.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 
            className="font-semibold text-lg truncate cursor-pointer hover:text-primary" 
            onClick={() => openDetailModal(property)}
          >
            {property.title}
          </h3>
          <div className="flex gap-1 flex-wrap">
            <Badge className={getCategoryColor(property.category)}>
              {property.category}
            </Badge>
            {property.source_type && (
              <Badge className={getSourceTypeColor(property.source_type)}>
                {property.source_type}
              </Badge>
            )}
            <Badge className={getStatusColor(property.status)}>
              {property.status}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <MapPin className="h-4 w-4" />
          <span className="truncate">{property.location}, {property.city}</span>
        </div>

        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1">
            <IndianRupee className="h-4 w-4" />
            <span className="font-medium">₹{property.price.toLocaleString()}</span>
          </div>
          {property.area && (
            <div className="flex items-center gap-1">
              <Square className="h-4 w-4" />
              <span>{property.area} sq ft</span>
            </div>
          )}
        </div>

        {(property.bedrooms || property.bathrooms) && (
          <div className="flex items-center gap-4 mb-2">
            {property.bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{property.bedrooms} BHK</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{property.bathrooms} Bath</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{property.profiles?.full_name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Updated {format(new Date(property.updated_at), 'MMM dd')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {property.created_by === profile?.id && (
            <Badge variant="outline" className="text-xs">
              <Star className="h-3 w-3 mr-1" />
              Your Property
            </Badge>
          )}
          <div className="flex gap-2 ml-auto">
            {(property.created_by === profile?.id || profile?.role === 'admin') && (
              <Select 
                value={property.status} 
                onValueChange={(value) => handleStatusUpdate(property.id, value as any)}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="off_market">Off Market</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openDetailModal(property)}
            >
              View Details
            </Button>
            {(property.created_by === profile?.id || profile?.role === 'admin') && (
              <Button
                size="sm"
                variant="default"
                onClick={() => openEditDialog(property)}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Property Management</h1>
            <RealtimeIndicator channel="properties" />
          </div>
          <p className="text-muted-foreground">Segmented property inventory with owner highlighting</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowMap(!showMap)}
            className="gap-2"
          >
            <MapPin className="h-4 w-4" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Property
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
              <DialogDescription>
                Specify property details, category (Primary/Resale/Rent), and source type (Agent/Owner).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProperty} className="space-y-4 max-h-96 overflow-y-auto">
              {/* Property Classification Section */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <h4 className="font-medium text-sm text-foreground">Property Classification</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value: 'primary' | 'resale' | 'rent') => setFormData({...formData, category: value})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">🏗️ Primary (New Construction)</SelectItem>
                        <SelectItem value="resale">🔄 Resale (Pre-owned)</SelectItem>
                        <SelectItem value="rent">🏠 Rent (Rental Property)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source_type">Source Type *</Label>
                    <Select value={formData.source_type} onValueChange={(value: 'agent' | 'owner') => setFormData({...formData, source_type: value})} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agent">🏢 Agent (Broker/Agency)</SelectItem>
                        <SelectItem value="owner">👤 Owner (Direct Owner)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Basic Property Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter property title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_type">Property Type *</Label>
                  <Select value={formData.property_type} onValueChange={(value) => setFormData({...formData, property_type: value})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="plot">Plot</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="Property price"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Area (sq ft)</Label>
                  <Input
                    id="area"
                    type="number"
                    placeholder="Area"
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    placeholder="Bedrooms"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    placeholder="Bathrooms"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wings">Wings</Label>
                  <Input
                    id="wings"
                    type="number"
                    placeholder="Number of wings"
                    value={formData.wings}
                    onChange={(e) => setFormData({...formData, wings: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="towers">Towers</Label>
                  <Input
                    id="towers"
                    type="number"
                    placeholder="Number of towers"
                    value={formData.towers}
                    onChange={(e) => setFormData({...formData, towers: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input
                    id="floor"
                    placeholder="e.g., 5th Floor, Ground"
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="Location/Area"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <Input
                    id="address"
                    placeholder="Complete address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Property description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
                <Checkbox
                  id="is_magicbricks_listing"
                  checked={formData.is_magicbricks_listing}
                  onCheckedChange={(checked) => setFormData({...formData, is_magicbricks_listing: checked as boolean})}
                />
                <Label htmlFor="is_magicbricks_listing" className="text-sm font-medium cursor-pointer">
                  🏢 List this property on Magicbricks Active Listing
                </Label>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">Add Property</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties by title, location, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Map View */}
      {showMap && (
        <PropertyMap
          properties={properties}
          selectedProperty={selectedProperty}
          onPropertySelect={(property) => setSelectedProperty({
            ...property,
            category: (property as any).category || 'primary',
            updated_at: (property as any).updated_at || property.created_at
          })}
          height="500px"
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{properties.length}</div>
            <p className="text-xs text-muted-foreground">Total Properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {properties.filter(property => property.status === 'available').length}
            </div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {properties.filter(property => property.status === 'sold').length}
            </div>
            <p className="text-xs text-muted-foreground">Sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ₹{properties.reduce((total, property) => total + Number(property.price), 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Property View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({properties.length})</TabsTrigger>
          <TabsTrigger value="my-properties">My Properties ({myProperties.length})</TabsTrigger>
          <TabsTrigger value="primary">Primary ({primaryProperties.length})</TabsTrigger>
          <TabsTrigger value="resale">Resale ({resaleProperties.length})</TabsTrigger>
          <TabsTrigger value="rent">Rent ({rentProperties.length})</TabsTrigger>
          <TabsTrigger value="magicbricks">Magicbricks ({magicbricksProperties.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(renderPropertyCard)}
          </div>
        </TabsContent>

        <TabsContent value="my-properties" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(renderPropertyCard)}
          </div>
          {myProperties.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">You haven't created any properties yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="primary" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(renderPropertyCard)}
          </div>
        </TabsContent>

        <TabsContent value="resale" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(renderPropertyCard)}
          </div>
        </TabsContent>

        <TabsContent value="rent" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(renderPropertyCard)}
          </div>
        </TabsContent>

        <TabsContent value="magicbricks" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(renderPropertyCard)}
          </div>
          {magicbricksProperties.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No Magicbricks active listings yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-muted-foreground mb-4">
            <Home className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">No properties found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first property.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Property
            </Button>
          )}
        </div>
      )}

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProperty(null);
        }}
        onEdit={openEditDialog}
      />

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update property details and information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProperty} className="space-y-4 max-h-96 overflow-y-auto">
            {/* Property Classification Section */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-4">
              <h4 className="font-medium text-sm text-foreground">Property Classification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value: 'primary' | 'resale' | 'rent') => setFormData({...formData, category: value})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">🏗️ Primary (New Construction)</SelectItem>
                      <SelectItem value="resale">🔄 Resale (Pre-owned)</SelectItem>
                      <SelectItem value="rent">🏠 Rent (Rental Property)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-source_type">Source Type *</Label>
                  <Select value={formData.source_type} onValueChange={(value: 'agent' | 'owner') => setFormData({...formData, source_type: value})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">🏢 Agent (Broker/Agency)</SelectItem>
                      <SelectItem value="owner">👤 Owner (Direct Owner)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Basic Property Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Property Title *</Label>
                <Input
                  id="edit-title"
                  placeholder="Enter property title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-property_type">Property Type *</Label>
                <Select value={formData.property_type} onValueChange={(value) => setFormData({...formData, property_type: value})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="plot">Plot</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (₹) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  placeholder="Property price"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-area">Area (sq ft)</Label>
                <Input
                  id="edit-area"
                  type="number"
                  placeholder="Area"
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bedrooms">Bedrooms</Label>
                <Input
                  id="edit-bedrooms"
                  type="number"
                  placeholder="Bedrooms"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                <Input
                  id="edit-bathrooms"
                  type="number"
                  placeholder="Bathrooms"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                />
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location *</Label>
                  <Input
                    id="edit-location"
                    placeholder="Location/Area"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City *</Label>
                  <Input
                    id="edit-city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-state">State *</Label>
                <Input
                  id="edit-state"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Full Address</Label>
                <Input
                  id="edit-address"
                  placeholder="Complete address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Property description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
              <Checkbox
                id="edit-is_magicbricks_listing"
                checked={formData.is_magicbricks_listing}
                onCheckedChange={(checked) => setFormData({...formData, is_magicbricks_listing: checked as boolean})}
              />
              <Label htmlFor="edit-is_magicbricks_listing" className="text-sm font-medium cursor-pointer">
                🏢 List this property on Magicbricks Active Listing
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Properties;