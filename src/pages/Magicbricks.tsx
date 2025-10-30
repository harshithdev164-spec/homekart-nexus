import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, MapPin, IndianRupee, Users, Clock, Home, Bed, Bath, Square, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeIndicator } from '@/components/collaboration/RealtimeIndicator';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
  wings?: number;
  towers?: number;
  floor?: string;
  is_magicbricks_listing?: boolean;
  profiles?: {
    full_name: string;
    phone?: string;
  };
}

const Magicbricks: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
  });

  useEffect(() => {
    fetchMagicbricksProperties();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('magicbricks_properties_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'properties' },
        (payload) => {
          console.log('Property change detected:', payload);
          fetchMagicbricksProperties();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMagicbricksProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles!properties_created_by_fkey(full_name, phone)
        `)
        .eq('is_magicbricks_listing', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch Magicbricks listings',
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
        is_magicbricks_listing: true,
        created_by: profile.id,
      };

      const { error } = await supabase
        .from('properties')
        .insert([propertyData]);

      if (error) {
        console.error('Error creating property:', error);
        toast({
          title: 'Error',
          description: 'Failed to add Magicbricks listing',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Magicbricks listing added successfully',
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
      });
      fetchMagicbricksProperties();
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
          description: 'Failed to update listing',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Listing updated successfully',
      });

      setIsEditDialogOpen(false);
      setEditingProperty(null);
      fetchMagicbricksProperties();
    } catch (error) {
      console.error('Error updating property:', error);
    }
  };

  const openEditDialog = (property: Property) => {
    setEditingProperty(property);
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
      wings: property.wings?.toString() || '',
      towers: property.towers?.toString() || '',
      floor: property.floor || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDetailModal = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailModalOpen(true);
  };

  const handleDeleteProperty = async () => {
    if (!deletePropertyId) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', deletePropertyId);

      if (error) {
        console.error('Error deleting property:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete listing',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Listing deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setDeletePropertyId(null);
      fetchMagicbricksProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  const openDeleteDialog = (propertyId: string) => {
    setDeletePropertyId(propertyId);
    setIsDeleteDialogOpen(true);
  };

  const exportToExcel = () => {
    try {
      const exportData = properties.map(property => ({
        'Title': property.title,
        'Property Type': property.property_type,
        'Status': property.status,
        'Price': property.price,
        'Location': property.location,
        'City': property.city,
        'State': property.state,
        'Area (sq ft)': property.area,
        'Bedrooms': property.bedrooms,
        'Bathrooms': property.bathrooms,
        'Wings': property.wings,
        'Towers': property.towers,
        'Floor': property.floor,
        'Posted By': property.profiles?.full_name || 'Unknown',
        'Contact': property.profiles?.phone || 'N/A',
        'Source Type': property.source_type,
        'Category': property.category,
        'Created At': new Date(property.created_at).toLocaleString(),
        'Updated At': property.updated_at ? new Date(property.updated_at).toLocaleString() : 'N/A',
        'Description': property.description || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Magicbricks Listings');
      
      XLSX.writeFile(wb, `Magicbricks_Listings_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast({
        title: 'Success',
        description: 'Listings exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export listings',
        variant: 'destructive',
      });
    }
  };

  const filteredProperties = properties.filter(property =>
    property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'primary': return 'bg-blue-100 text-blue-800';
      case 'resale': return 'bg-orange-100 text-orange-800';
      case 'rent': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
            <h1 className="text-3xl font-bold">Magicbricks Active Listings</h1>
            <RealtimeIndicator channel="magicbricks" />
          </div>
          <p className="text-muted-foreground">Manage properties posted on Magicbricks platform</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={exportToExcel}
            className="gap-2"
            disabled={properties.length === 0}
          >
            <Download className="h-4 w-4" />
            Export All
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Magicbricks Listing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Magicbricks Listing</DialogTitle>
                <DialogDescription>
                  Add a new property to Magicbricks active listings
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateProperty} className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type *</Label>
                    <Select value={formData.property_type} onValueChange={(value) => setFormData({...formData, property_type: value})} required>
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label>Price (₹) *</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Area (sq ft)</Label>
                    <Input
                      type="number"
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">Add Listing</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Magicbricks listings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{properties.length}</div>
          <p className="text-xs text-muted-foreground">Active Magicbricks Listings</p>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
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
                  {property.category && (
                    <Badge className={getCategoryColor(property.category)}>
                      {property.category}
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
                  <span>{format(new Date(property.updated_at || property.created_at), 'MMM dd')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDetailModal(property)}
                  className="flex-1"
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
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openDeleteDialog(property.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-muted-foreground mb-4">
            <Home className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Magicbricks listings found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first Magicbricks listing.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Listing
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Magicbricks listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePropertyId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Magicbricks;
