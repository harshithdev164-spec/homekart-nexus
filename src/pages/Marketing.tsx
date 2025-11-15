import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Megaphone,
  Mail,
  MessageSquare,
  Share2,
  Eye,
  Target,
  TrendingUp,
  Users,
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Share,
  Image as ImageIcon,
} from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  campaign_type: 'email' | 'sms' | 'social' | 'whatsapp';
  property_type?: string;
  target_audience: string;
  message_template: string;
  status: 'draft' | 'scheduled' | 'sent' | 'paused';
  scheduled_date?: string;
  created_at: string;
  updated_at: string;
  metrics?: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}

interface MarketingTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'social' | 'whatsapp';
  content: string;
  description: string;
}

const CAMPAIGN_TYPES = [
  { value: 'email', label: 'Email Campaign', icon: Mail },
  { value: 'sms', label: 'SMS Campaign', icon: MessageSquare },
  { value: 'social', label: 'Social Media', icon: Share2 },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
];

const PROPERTY_TYPES = ['Apartment', 'Villa', 'House', 'Plot', 'Commercial', 'Office', 'All Properties'];

const PREDEFINED_TEMPLATES: MarketingTemplate[] = [
  {
    id: '1',
    name: 'Luxury Apartment Launch',
    type: 'email',
    description: 'Perfect for launching premium apartments',
    content: 'Discover our exclusive luxury apartments in {location}. Starting from ₹{price}. Limited units available. Schedule your site visit today!',
  },
  {
    id: '2',
    name: 'Ready to Move Offer',
    type: 'sms',
    description: 'Quick message for ready-to-move properties',
    content: 'Ready to move {property_type} available in {location}. ₹{price}. Zero GST! Limited period offer. Call now: {phone}',
  },
  {
    id: '3',
    name: 'Investment Opportunity',
    type: 'social',
    description: 'Engage investors on social media',
    content: 'Investment Alert! High ROI {property_type} in {location}. Appreciation potential: {appreciation}%. Grab this opportunity now! 🏠💰 #RealEstate #Investment',
  },
  {
    id: '4',
    name: 'Rental Property',
    type: 'email',
    description: 'For showcasing rental properties',
    content: 'Available for Rent: {property_type} in prime location {location}. Rent: ₹{price}/month. Furnished amenities included. Click to view details.',
  },
  {
    id: '5',
    name: 'Follow-up Message',
    type: 'whatsapp',
    description: 'Gentle reminder for interested buyers',
    content: 'Hi! 👋 Checking in about the {property_type} in {location} that interested you. Ready to schedule a visit? Let me know! ✅',
  },
  {
    id: '6',
    name: 'Year-End Deal',
    type: 'sms',
    description: 'Year-end special offer message',
    content: 'Year-end exclusive! {property_type} at {location} with ₹{discount} discount. Offer valid till Dec 31. Book now!',
  },
];

const Marketing: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    campaign_type: 'email' as const,
    property_type: 'All Properties',
    target_audience: '',
    message_template: '',
    scheduled_date: '',
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase
        .from('marketing_campaigns' as any)
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false }) as any);

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }

      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
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

  const applyTemplate = (template: MarketingTemplate) => {
    setFormData(prev => ({
      ...prev,
      campaign_type: template.type as any,
      message_template: template.content,
    }));
    setSelectedTemplate(template);
    setIsTemplateDialogOpen(false);
    toast({
      title: 'Template Applied',
      description: `${template.name} template has been applied to your campaign.`,
    });
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Campaign title is required', variant: 'destructive' });
      return false;
    }
    if (!formData.message_template.trim()) {
      toast({ title: 'Error', description: 'Campaign message is required', variant: 'destructive' });
      return false;
    }
    if (!formData.target_audience.trim()) {
      toast({ title: 'Error', description: 'Target audience is required', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { error } = await (supabase
        .from('marketing_campaigns' as any)
        .insert({
          title: formData.title,
          description: formData.description,
          campaign_type: formData.campaign_type,
          property_type: formData.property_type,
          target_audience: formData.target_audience,
          message_template: formData.message_template,
          scheduled_date: formData.scheduled_date || null,
          created_by: profile?.id,
          status: formData.scheduled_date ? 'scheduled' : 'draft',
          metrics: {
            sent: 0,
            opened: 0,
            clicked: 0,
            converted: 0,
          },
        } as any) as any);

      if (error) {
        console.error('Error creating campaign:', error);
        toast({
          title: 'Error',
          description: 'Failed to create campaign',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });

      setFormData({
        title: '',
        description: '',
        campaign_type: 'email',
        property_type: 'All Properties',
        target_audience: '',
        message_template: '',
        scheduled_date: '',
      });
      setIsCreateDialogOpen(false);
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await (supabase
        .from('marketing_campaigns' as any)
        .delete()
        .eq('id', campaignId) as any);

      if (error) {
        console.error('Error deleting campaign:', error);
        return;
      }

      toast({
        title: 'Success',
        description: 'Campaign deleted successfully',
      });

      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'draft':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getCampaignIcon = (type: string) => {
    const campaign = CAMPAIGN_TYPES.find(c => c.value === type);
    return campaign ? <campaign.icon className="h-5 w-5" /> : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-primary"></div>
          <p className="text-muted-foreground">Loading marketing campaigns...</p>
        </div>
      </div>
    );
  }

  const totalSent = campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.metrics?.opened || 0), 0);
  const totalConverted = campaigns.reduce((sum, c) => sum + (c.metrics?.converted || 0), 0);
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Marketing Campaigns</h1>
          <p className="text-muted-foreground">Create and manage real estate marketing campaigns</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Marketing Campaign</DialogTitle>
              <DialogDescription>
                Set up a new real estate marketing campaign
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateCampaign} className="space-y-6">
              {/* Campaign Basics */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Campaign Details</h3>

                <div>
                  <Label htmlFor="title">Campaign Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., Luxury Apartments Q4 Launch"
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
                    placeholder="Describe your campaign objectives..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="campaign_type">Campaign Type *</Label>
                    <Select value={formData.campaign_type} onValueChange={(value) => handleSelectChange('campaign_type', value)}>
                      <SelectTrigger id="campaign_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMPAIGN_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="property_type">Property Type</Label>
                    <Select value={formData.property_type} onValueChange={(value) => handleSelectChange('property_type', value)}>
                      <SelectTrigger id="property_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Target Audience</h3>

                <div>
                  <Label htmlFor="target_audience">Target Audience *</Label>
                  <Input
                    id="target_audience"
                    name="target_audience"
                    placeholder="e.g., First-time homebuyers, investors, NRIs"
                    value={formData.target_audience}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Message Template */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Message Template *</h3>
                  <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Copy className="h-4 w-4" />
                        Use Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Select Template</DialogTitle>
                        <DialogDescription>
                          Choose a predefined template for your real estate campaign
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                        {PREDEFINED_TEMPLATES.map(template => (
                          <div
                            key={template.id}
                            className="p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                            onClick={() => applyTemplate(template)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{template.name}</h4>
                              <Badge variant="outline">{template.type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">{template.content}</p>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Textarea
                  name="message_template"
                  placeholder="Write your marketing message here. You can use: {property_type}, {location}, {price}, {phone}, {discount}, {appreciation}"
                  value={formData.message_template}
                  onChange={handleInputChange}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available variables: property_type, location, price, phone, discount, appreciation
                </p>
              </div>

              {/* Scheduling */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Schedule (Optional)</h3>

                <div>
                  <Label htmlFor="scheduled_date">Schedule Date & Time</Label>
                  <Input
                    id="scheduled_date"
                    name="scheduled_date"
                    type="datetime-local"
                    value={formData.scheduled_date}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to save as draft
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Campaign'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                <p className="text-3xl font-bold">{campaigns.length}</p>
              </div>
              <Megaphone className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messages Sent</p>
                <p className="text-3xl font-bold">{totalSent.toLocaleString()}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-3xl font-bold">{openRate}%</p>
              </div>
              <Eye className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversions</p>
                <p className="text-3xl font-bold">{totalConverted.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Campaigns</h2>

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No campaigns yet. Create your first marketing campaign to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(campaign => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{getCampaignIcon(campaign.campaign_type)}</div>
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{campaign.title}</CardTitle>
                        <CardDescription className="line-clamp-1">{campaign.description}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>
                      {getStatusIcon(campaign.status)}
                      <span className="ml-1">{campaign.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{campaign.campaign_type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium">{campaign.target_audience}</span>
                    </div>
                    {campaign.property_type && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Properties:</span>
                        <span className="font-medium">{campaign.property_type}</span>
                      </div>
                    )}
                  </div>

                  {campaign.metrics && (
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{campaign.metrics.sent}</p>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{campaign.metrics.opened}</p>
                        <p className="text-xs text-muted-foreground">Opened</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => {
                        setFormData({
                          title: campaign.title,
                          description: campaign.description || '',
                          campaign_type: campaign.campaign_type as any,
                          property_type: campaign.property_type || 'All Properties',
                          target_audience: campaign.target_audience,
                          message_template: campaign.message_template,
                          scheduled_date: campaign.scheduled_date || '',
                        });
                        setEditingCampaign(campaign);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="space-y-4 mt-12 pt-8 border-t">
        <h2 className="text-2xl font-bold">Marketing Features for Real Estate</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Email Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Send personalized emails to buyers and investors with property details, virtual tours, and special offers.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                SMS & WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Quick follow-ups and property notifications via SMS and WhatsApp to reach customers instantly.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-purple-600" />
                Social Media
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create engaging social media campaigns with property images, videos, and investment highlights.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-50 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-600" />
                Targeted Segments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Segment audiences by buyer type, location preferences, budget range, and investment goals.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                Analytics & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track open rates, click-through rates, conversions, and ROI for every campaign.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-50 border-cyan-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="h-5 w-5 text-cyan-600" />
                Pre-built Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use ready-made templates optimized for luxury properties, investments, rentals, and more.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Marketing;
