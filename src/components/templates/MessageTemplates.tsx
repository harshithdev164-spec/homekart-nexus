import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Send, Copy } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface MessageTemplatesProps {
  selectedClient?: { name: string; phone: string };
  onSendMessage?: (message: string) => void;
}

export const MessageTemplates: React.FC<MessageTemplatesProps> = ({ 
  selectedClient, 
  onSendMessage 
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
  });

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'followup', label: 'Follow Up' },
    { value: 'property_match', label: 'Property Match' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'general', label: 'General' },
  ];

  useEffect(() => {
    fetchTemplates();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('message_templates_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'message_templates' },
        () => fetchTemplates()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        return;
      }

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('message_templates')
        .insert([{
          ...formData,
          created_by: profile.id,
        }]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create template',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Template created successfully',
      });

      setIsCreateDialogOpen(false);
      setFormData({ title: '', content: '', category: 'general' });
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleCopyTemplate = (content: string) => {
    const processedContent = selectedClient 
      ? content.replace(/{name}/g, selectedClient.name)
      : content;
    
    navigator.clipboard.writeText(processedContent);
    toast({
      title: 'Copied',
      description: 'Template copied to clipboard',
    });
  };

  const handleSendTemplate = (content: string) => {
    if (!selectedClient || !onSendMessage) return;
    
    const processedContent = content.replace(/{name}/g, selectedClient.name);
    onSendMessage(processedContent);
    toast({
      title: 'Message Sent',
      description: `Message sent to ${selectedClient.name}`,
    });
  };

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Message Templates</h2>
          <p className="text-muted-foreground">Pre-built messages for client communication</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Message Template</DialogTitle>
              <DialogDescription>
                Create a reusable message template for client communication
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Template Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Welcome Message"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Template Content</Label>
                <Textarea
                  id="content"
                  placeholder="Use {name} for client name, {property_details} for property info..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use placeholders: {'{name}'}, {'{property_details}'}, {'{time}'}
                </p>
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">Create Template</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Label>Filter by category:</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Client Info */}
      {selectedClient && (
        <Card className="bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-sm">
              <strong>Selected Client:</strong> {selectedClient.name} ({selectedClient.phone})
            </p>
          </CardContent>
        </Card>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-medium transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{template.title}</CardTitle>
                <Badge variant="secondary">{template.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.content}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyTemplate(template.content)}
                    className="flex-1 gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                  {selectedClient && onSendMessage && (
                    <Button
                      size="sm"
                      onClick={() => handleSendTemplate(template.content)}
                      className="flex-1 gap-1"
                    >
                      <Send className="h-3 w-3" />
                      Send
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {selectedCategory === 'all' 
                ? 'No templates found. Create your first template to get started.'
                : `No templates found in the ${categories.find(c => c.value === selectedCategory)?.label} category.`
              }
            </p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};