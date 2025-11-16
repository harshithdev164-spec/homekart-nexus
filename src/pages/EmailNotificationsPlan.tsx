import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Circle, FileText, Code, Settings, Mail, Database, Zap, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const EmailNotificationsPlan: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const implementationStatus = {
    'Part 1: Email Function': { status: 'completed', items: 2 },
    'Part 2: Database Trigger': { status: 'completed', items: 2 },
    'Part 3: Webhook Functions': { status: 'completed', items: 3 },
    'Part 4: Frontend Components': { status: 'completed', items: 3 },
    'Part 5: Environment Config': { status: 'completed', items: 2 },
    'Part 6: Email Template': { status: 'completed', items: 2 },
  };

  const parts = [
    {
      id: 'part1',
      title: 'Part 1: Enhance Email Function with CRM Link',
      status: 'completed',
      items: [
        {
          title: 'Update Email Template',
          file: 'supabase/functions/send-lead-assignment-email/index.ts',
          description: 'Added CRM_BASE_URL support, direct link to lead, prominent "View Lead in CRM" button',
          status: 'completed',
        },
        {
          title: 'Verify Resend Configuration',
          file: 'supabase/functions/send-lead-assignment-email/index.ts',
          description: 'Added RESEND_API_KEY validation, error handling, logging',
          status: 'completed',
        },
      ],
    },
    {
      id: 'part2',
      title: 'Part 2: Database Trigger for All Assignment Changes',
      status: 'completed',
      items: [
        {
          title: 'Create Database Trigger Function',
          file: 'supabase/migrations/20251116113806_create_lead_assignment_email_trigger.sql',
          description: 'PostgreSQL trigger function that detects assigned_to changes and calls Edge Function',
          status: 'completed',
        },
        {
          title: 'Create Trigger',
          file: 'supabase/migrations/20251116113806_create_lead_assignment_email_trigger.sql',
          description: 'AFTER INSERT OR UPDATE trigger on leads table',
          status: 'completed',
        },
      ],
    },
    {
      id: 'part3',
      title: 'Part 3: Update Webhook Functions',
      status: 'completed',
      items: [
        {
          title: 'Update Webhook Leads Function',
          file: 'supabase/functions/webhook-leads/index.ts',
          description: 'Added email invocation after lead creation and assignment',
          status: 'completed',
        },
        {
          title: 'Update MagicBricks Leads Function',
          file: 'supabase/functions/magicbricks-leads/index.ts',
          description: 'Added email notification for each imported lead',
          status: 'completed',
        },
        {
          title: 'Update 99acres Leads Function',
          file: 'supabase/functions/99acres-leads/index.ts',
          description: 'Added email notification for each imported lead',
          status: 'completed',
        },
      ],
    },
    {
      id: 'part4',
      title: 'Part 4: Update Frontend Components',
      status: 'completed',
      items: [
        {
          title: 'Update NotificationSystem Realtime Listener',
          file: 'src/components/notifications/NotificationSystem.tsx',
          description: 'Added backup email call when assignment change detected via realtime',
          status: 'completed',
        },
        {
          title: 'Update EnhancedNotificationCenter',
          file: 'src/components/notifications/EnhancedNotificationCenter.tsx',
          description: 'Added email call when "Assign to Me" action is clicked',
          status: 'completed',
        },
        {
          title: 'Update Lead Components',
          file: 'src/components/leads/LeadAssignmentIndicator.tsx, LeadTransfer.tsx',
          description: 'Kept email calls as backup/optimistic sending with comments',
          status: 'completed',
        },
      ],
    },
    {
      id: 'part5',
      title: 'Part 5: Environment Configuration',
      status: 'completed',
      items: [
        {
          title: 'Supabase Environment Variables',
          file: 'Supabase Dashboard → Edge Functions → Secrets',
          description: 'RESEND_API_KEY, RESEND_FROM_EMAIL, CRM_BASE_URL',
          status: 'pending',
        },
        {
          title: 'Update Edge Function Configuration',
          file: 'supabase/functions/send-lead-assignment-email/index.ts',
          description: 'Added validation for required environment variables',
          status: 'completed',
        },
      ],
    },
    {
      id: 'part6',
      title: 'Part 6: Email Template Enhancement',
      status: 'completed',
      items: [
        {
          title: 'Add CRM Link Button',
          file: 'supabase/functions/send-lead-assignment-email/index.ts',
          description: 'Prominent CTA button with fallback text link',
          status: 'completed',
        },
        {
          title: 'Improve Email Design',
          file: 'supabase/functions/send-lead-assignment-email/index.ts',
          description: 'Enhanced HTML template with mobile-responsive design, better styling',
          status: 'completed',
        },
      ],
    },
  ];

  const filesModified = [
    'supabase/functions/send-lead-assignment-email/index.ts',
    'supabase/migrations/20251116113806_create_lead_assignment_email_trigger.sql',
    'supabase/functions/webhook-leads/index.ts',
    'supabase/functions/magicbricks-leads/index.ts',
    'supabase/functions/99acres-leads/index.ts',
    'src/components/notifications/NotificationSystem.tsx',
    'src/components/notifications/EnhancedNotificationCenter.tsx',
    'src/components/leads/LeadAssignmentIndicator.tsx',
    'src/components/leads/LeadTransfer.tsx',
    'src/pages/Leads.tsx',
    'supabase/config.toml',
  ];

  const envVars = [
    { name: 'RESEND_API_KEY', required: true, status: 'pending', description: 'Resend API key from resend.com' },
    { name: 'RESEND_FROM_EMAIL', required: false, status: 'pending', description: 'Verified sender email address' },
    { name: 'CRM_BASE_URL', required: false, status: 'pending', description: 'Production CRM URL' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Lead Assignment Email Notifications</h1>
        <p className="text-muted-foreground">
          Complete implementation plan and status for email notification system
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="implementation">Implementation</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                System Overview
              </CardTitle>
              <CardDescription>
                Email notifications for all lead assignment scenarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Features</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>✅ Automatic email notifications for ALL lead assignments</li>
                    <li>✅ Works for manual assignments, transfers, webhook imports</li>
                    <li>✅ Beautiful HTML email template with lead details</li>
                    <li>✅ Direct "View Lead in CRM" button in emails</li>
                    <li>✅ Database trigger ensures emails for direct DB updates</li>
                    <li>✅ Backup client-side calls for immediate delivery</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Implementation Status</h3>
                  <div className="space-y-2">
                    {Object.entries(implementationStatus).map(([part, data]) => (
                      <div key={part} className="flex items-center justify-between text-sm">
                        <span>{part}</span>
                        <Badge variant={data.status === 'completed' ? 'default' : 'secondary'}>
                          {data.status === 'completed' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <Circle className="h-3 w-3 mr-1" />
                          )}
                          {data.items} items
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Dual Email Strategy</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <h5 className="font-medium mb-1">1. Database Trigger (Primary)</h5>
                      <p className="text-sm text-muted-foreground">
                        Automatically fires on any assigned_to change. Works even for direct database updates.
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <h5 className="font-medium mb-1">2. Client-Side Calls (Backup)</h5>
                      <p className="text-sm text-muted-foreground">
                        Called immediately from frontend components. Ensures fast delivery even if trigger fails.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="implementation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Implementation Details</CardTitle>
              <CardDescription>All parts of the email notification system</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {parts.map((part) => (
                  <AccordionItem key={part.id} value={part.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        {part.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="font-semibold">{part.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {part.items.map((item, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-medium">{item.title}</h5>
                              <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <code className="bg-muted px-2 py-1 rounded">{item.file}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Modified Files
              </CardTitle>
              <CardDescription>All files that were modified or created</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filesModified.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <code className="text-sm flex-1">{file}</code>
                    <Badge variant="outline">Modified</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Environment Variables
              </CardTitle>
              <CardDescription>Required configuration for email notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {envVars.map((env) => (
                  <div key={env.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-semibold">{env.name}</code>
                        {env.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <Badge variant={env.status === 'pending' ? 'secondary' : 'default'}>
                        {env.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{env.description}</p>
                    <div className="mt-3 p-2 bg-muted rounded text-xs">
                      <strong>Location:</strong> Supabase Dashboard → Project Settings → Edge Functions → Secrets
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Migration
              </CardTitle>
              <CardDescription>Run this migration to enable automatic email triggers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm mb-2">
                    <strong>File:</strong> <code>supabase/migrations/20251116113806_create_lead_assignment_email_trigger.sql</code>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This migration creates a database trigger that automatically sends emails when leads are assigned or transferred.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Run this in Supabase Dashboard → SQL Editor</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailNotificationsPlan;

