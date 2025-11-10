import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Download, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RealtimeIndicator } from '@/components/collaboration/RealtimeIndicator';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { PropertyDetailModal } from '@/components/properties/PropertyDetailModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  profiles?: {
    full_name: string;
    phone?: string;
  };
}

const NinetyNineAcres: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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
    fetch99AcresProperties();
    
    const channel = supabase
      .channel('99acres_properties_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'properties' },
        () => fetch99AcresProperties()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetch99AcresProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          profiles!properties_created_by_fkey(full_name, phone)
        `)
        .eq('source', '99acres')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch 99acres listings',
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

  const handleImportLeads = async () => {
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('99acres-leads', {
        body: { method: 'GET' }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: data.demo 
          ? `Demo lead created: ${data.message}` 
          : `Imported ${data.count} leads from 99acres`,
      });

      fetch99AcresProperties();
    } catch (error: any) {
      toast({
        title: 'Import Error',
        description: error.message || 'Failed to import leads from 99acres',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
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
        source: '99acres',
        created_by: profile.id,
      };

      const { error } = await supabase
        .from('properties')
        .insert([propertyData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: '99acres listing added successfully',
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
      fetch99AcresProperties();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add listing',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProperty = async () => {
    if (!deletePropertyId) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', deletePropertyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Listing deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setDeletePropertyId(null);
      fetch99AcresProperties();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive',
      });
    }
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
        'Posted By': property.profiles?.full_name || 'Unknown',
        'Contact': property.profiles?.phone || 'N/A',
        'Created At': new Date(property.created_at).toLocaleString(),
        'Description': property.description || ''
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '99acres Listings');
      
      XLSX.writeFile(wb, `99acres_Listings_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">99acres Listings</h1>
            <RealtimeIndicator channel="99acres" />
          </div>
          <p className="text-muted-foreground">Manage properties and leads from 99acres platform</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleImportLeads}
            disabled={importing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />
            {importing ? 'Importing...' : 'Import Leads'}
          </Button>
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
                Add Listing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add 99acres Listing</DialogTitle>
                <DialogDescription>
                  Add a new property to 99acres listings
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
                    <Label>Bedrooms</Label>
                    <Input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value as any})} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="resale">Resale</SelectItem>
                        <SelectItem value="rent">Rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Source Type *</Label>
                    <Select value={formData.source_type} onValueChange={(value) => setFormData({...formData, source_type: value as any})} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">Add Listing</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{property.title}</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">{property.property_type}</Badge>
                    <Badge variant="outline">{property.category}</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletePropertyId(property.id);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent onClick={() => {
              setSelectedProperty(property);
              setIsDetailModalOpen(true);
            }}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    ₹{property.price.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {property.location}, {property.city}
                </div>
                {property.area && (
                  <div className="text-sm">{property.area} sq ft</div>
                )}
                {(property.bedrooms || property.bathrooms) && (
                  <div className="flex gap-4 text-sm">
                    {property.bedrooms && <span>{property.bedrooms} Beds</span>}
                    {property.bathrooms && <span>{property.bathrooms} Baths</span>}
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2">
                  Posted by: {property.profiles?.full_name || 'Unknown'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No listings found. Try importing leads or add a new listing.</p>
        </div>
      )}

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedProperty(null);
          }}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NinetyNineAcres;
