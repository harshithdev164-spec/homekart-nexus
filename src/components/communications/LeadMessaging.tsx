import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Mail, Phone, Send, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface CommunicationLog {
  id: string;
  lead_id: string;
  communication_type: 'whatsapp' | 'email' | 'sms' | 'call';
  message_content?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string;
  lead?: { name: string; phone: string };
  template?: { title: string };
}

export const LeadMessaging: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [communicationType, setCommunicationType] = useState<string>('whatsapp');
  const [customMessage, setCustomMessage] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [emailUrl, setEmailUrl] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchLeads();
    fetchTemplates();
    fetchCommunications();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, email, status')
      .order('name');
    if (data) setLeads(data);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('is_active', true)
      .order('title');
    if (data) setTemplates(data);
  };

  const fetchCommunications = async () => {
    const { data } = await supabase
      .from('communication_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);
    if (data) {
      // Fetch related data separately to avoid join issues
      const enrichedComms = await Promise.all(
        data.map(async (comm) => {
          const { data: lead } = await supabase
            .from('leads')
            .select('name, phone')
            .eq('id', comm.lead_id)
            .single();
          
          let template = null;
          if (comm.template_id) {
            const { data: templateData } = await supabase
              .from('message_templates')
              .select('title')
              .eq('id', comm.template_id)
              .single();
            template = templateData;
          }

          return {
            ...comm,
            lead,
            template,
            communication_type: comm.communication_type as 'whatsapp' | 'email' | 'sms' | 'call',
            status: comm.status as 'sent' | 'delivered' | 'read' | 'failed'
          };
        })
      );
      setCommunications(enrichedComms);
    }
  };

  const sendMessage = async () => {
    if (!selectedLead || !currentUser) {
      toast({
        title: 'Error',
        description: 'Please select a lead first',
        variant: 'destructive'
      });
      return;
    }

    const lead = leads.find(l => l.id === selectedLead);
    if (!lead) return;

    let message = customMessage;
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        message = template.content.replace(/\{name\}/g, lead.name);
      }
    }

    setIsLoading(true);

    // Log the communication
    const { error: logError } = await supabase
      .from('communication_logs')
      .insert({
        lead_id: selectedLead,
        sent_by: currentUser.id,
        communication_type: communicationType,
        message_content: message,
        template_id: selectedTemplate || null,
        status: 'sent'
      });

    if (logError) {
      toast({
        title: 'Error',
        description: 'Failed to log communication',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    // Generate appropriate URLs
    if (communicationType === 'whatsapp') {
      const phoneNumber = lead.phone.replace(/[^0-9]/g, '');
      const waMessage = encodeURIComponent(message);
      const waUrl = `https://wa.me/${phoneNumber}?text=${waMessage}`;
      
      if (whatsappUrl) {
        // Use webhook if provided
        try {
          await fetch(whatsappUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors',
            body: JSON.stringify({
              phone: phoneNumber,
              message: message,
              lead_id: selectedLead
            })
          });
          toast({
            title: 'Success',
            description: 'WhatsApp message sent via webhook'
          });
        } catch (error) {
          toast({
            title: 'Webhook Error',
            description: 'Failed to send via webhook, opening WhatsApp instead',
            variant: 'destructive'
          });
          window.open(waUrl, '_blank');
        }
      } else {
        window.open(waUrl, '_blank');
        toast({
          title: 'WhatsApp Opened',
          description: 'WhatsApp web opened with pre-filled message'
        });
      }
    } else if (communicationType === 'email') {
      const emailSubject = 'Follow-up from Real Estate Team';
      const emailBody = encodeURIComponent(message);
      const mailtoUrl = `mailto:${lead.email}?subject=${emailSubject}&body=${emailBody}`;
      
      if (emailUrl) {
        // Use webhook if provided
        try {
          await fetch(emailUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors',
            body: JSON.stringify({
              to: lead.email,
              subject: emailSubject,
              message: message,
              lead_id: selectedLead
            })
          });
          toast({
            title: 'Success',
            description: 'Email sent via webhook'
          });
        } catch (error) {
          toast({
            title: 'Webhook Error',
            description: 'Failed to send via webhook, opening email client instead',
            variant: 'destructive'
          });
          window.location.href = mailtoUrl;
        }
      } else {
        window.location.href = mailtoUrl;
        toast({
          title: 'Email Client Opened',
          description: 'Default email client opened with pre-filled message'
        });
      }
    }

    setCustomMessage('');
    setSelectedTemplate('');
    fetchCommunications();
    setIsLoading(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const lead = leads.find(l => l.id === selectedLead);
      const message = template.content.replace(/\{name\}/g, lead?.name || '{name}');
      setCustomMessage(message);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      sent: 'default',
      delivered: 'secondary',
      read: 'outline',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4 text-green-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'sms':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case 'call':
        return <Phone className="h-4 w-4 text-orange-500" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Lead Communications</h2>
        <p className="text-muted-foreground">Send WhatsApp and email messages to leads</p>
      </div>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp Webhook URL (Optional)</label>
              <Input
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
                placeholder="https://your-webhook.com/whatsapp"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use WhatsApp Web directly
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Webhook URL (Optional)</label>
              <Input
                value={emailUrl}
                onChange={(e) => setEmailUrl(e.target.value)}
                placeholder="https://your-webhook.com/email"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use default email client
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Composer */}
      <Card>
        <CardHeader>
          <CardTitle>Send Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Lead</label>
              <Select value={selectedLead} onValueChange={setSelectedLead}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Communication Type</label>
              <Select value={communicationType} onValueChange={setCommunicationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message Template</label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={5}
            />
          </div>

          <Button 
            onClick={sendMessage} 
            disabled={!selectedLead || !customMessage.trim() || isLoading}
            className="w-full md:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? 'Sending...' : `Send via ${communicationType}`}
          </Button>
        </CardContent>
      </Card>

      {/* Communication History */}
      <Card>
        <CardHeader>
          <CardTitle>Communication History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communications.map((comm) => (
                <TableRow key={comm.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getCommunicationIcon(comm.communication_type)}
                      <span className="capitalize">{comm.communication_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{comm.lead?.name}</span>
                      <span className="text-sm text-muted-foreground">{comm.lead?.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate">
                      {comm.template?.title ? (
                        <span className="font-medium">{comm.template.title}</span>
                      ) : (
                        comm.message_content?.substring(0, 50) + '...'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(comm.status)}</TableCell>
                  <TableCell>
                    {new Date(comm.sent_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};