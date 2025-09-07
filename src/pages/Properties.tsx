import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, MapPin, Home, Bed, Bath, Square, IndianRupee, Filter, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeIndicator } from '@/components/collaboration/RealtimeIndicator';
import { PropertyMap } from '@/components/maps/PropertyMap';
import { PropertyDetailModal } from '@/components/properties/PropertyDetailModal';
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
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: '',
    price: '',
    area: '',
    bedrooms: '',
    bathrooms: '',
    location: '',
    address: '',
    city: '',
    state: '',
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
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles!properties_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch properties',
          variant: 'destructive',
        });
        return;
      }

      setProperties(data || []);
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
        price: '',
        area: '',
        bedrooms: '',
        bathrooms: '',
        location: '',
        address: '',
        city: '',
        state: '',
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
    setEditingProperty(property);
    setFormData({
      title: property.title,
      description: property.description || '',
      property_type: property.property_type,
      price: property.price.toString(),
      area: property.area?.toString() || '',
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      location: property.location,
      address: property.address || '',
      city: property.city,
      state: property.state,
    });
    setIsEditDialogOpen(true);
  };

  const openDetailModal = (property: Property) => {
    console.log('Opening detail modal for property:', property.title);
    setSelectedProperty(property);
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

  const filteredProperties = properties.filter(property =>
    property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase())
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
          <p className="text-muted-foreground">Manage your property inventory and listings</p>
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
                Add a new property to your inventory. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProperty} className="space-y-4 max-h-96 overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-4">
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

              <DialogFooter>
                <Button type="submit" className="w-full">Add Property</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Property Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>
                Update property details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditProperty} className="space-y-4 max-h-96 overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-3 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Property</Button>
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
          onPropertySelect={(property) => setSelectedProperty(property)}
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

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => {
          const PropertyIcon = getPropertyTypeIcon(property.property_type);
          return (
             <Card 
               key={property.id} 
               className={`hover:shadow-medium transition-all duration-300 cursor-pointer ${
                 selectedProperty?.id === property.id ? 'ring-2 ring-primary' : ''
               }`}
               onClick={() => {
                 console.log('Property card clicked:', property.title);
                 openDetailModal(property);
               }}
             >
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-between w-full">
                <span className="text-lg line-clamp-1">{property.title}</span>
                <Badge className={getStatusColor(property.status)}>
                  {property.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardTitle>
            {property.profiles && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Users className="h-3 w-3" />
                Listed by: {property.profiles.full_name}
              </div>
            )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PropertyIcon className="h-4 w-4" />
                  {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-lg font-bold text-primary">
                    <IndianRupee className="h-4 w-4" />
                    {Number(property.price).toLocaleString('en-IN')}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {property.location}, {property.city}
                  </div>

                  {(property.bedrooms || property.bathrooms || property.area) && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {property.bedrooms && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          {property.bedrooms}
                        </div>
                      )}
                      {property.bathrooms && (
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {property.bathrooms}
                        </div>
                      )}
                      {property.area && (
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4" />
                          {property.area} sq ft
                        </div>
                      )}
                    </div>
                  )}

                  {property.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {property.description}
                    </p>
                  )}
                </div>
                 <div className="flex gap-2 mt-4">
                   <Button 
                     size="sm" 
                     variant="outline" 
                     className="flex-1"
                     onClick={(e) => {
                       e.stopPropagation();
                       openEditDialog(property);
                     }}
                   >
                     Edit
                   </Button>
                   <Select 
                     value={property.status} 
                     onValueChange={(newStatus: 'available' | 'under_contract' | 'sold' | 'rented' | 'off_market') => handleStatusUpdate(property.id, newStatus)}
                   >
                     <SelectTrigger className="flex-1" onClick={(e) => e.stopPropagation()}>
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
                 </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProperties.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? 'No properties found matching your search.' : 'No properties yet. Add your first property to get started.'}
            </p>
            {!searchTerm && (
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Property
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProperty(null);
        }}
        onEdit={(property) => {
          setIsDetailModalOpen(false);
          openEditDialog(property);
        }}
      />
    </div>
  );
};

export default Properties;