import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createOrganization } from '@/services/organizationService';
import { useToast } from '@/hooks/use-toast';
import { Building2, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    features: ['Up to 5 users', '100 leads', '50 properties', 'Basic features'],
    maxUsers: 5,
    maxLeads: 100,
    maxProperties: 50,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₹2,999',
    period: 'month',
    features: ['Up to 10 users', '500 leads', '200 properties', 'Advanced features', 'Email support'],
    maxUsers: 10,
    maxLeads: 500,
    maxProperties: 200,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹7,999',
    period: 'month',
    features: ['Up to 25 users', 'Unlimited leads', 'Unlimited properties', 'All features', 'Priority support', 'API access'],
    maxUsers: 25,
    maxLeads: -1,
    maxProperties: -1,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Unlimited users', 'Unlimited everything', 'Custom features', 'Dedicated support', 'SLA guarantee', 'White-labeling'],
    maxUsers: -1,
    maxLeads: -1,
    maxProperties: -1,
  },
];

export const OrganizationSetup: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationName: '',
    subdomain: '',
    plan: 'free' as 'free' | 'starter' | 'professional' | 'enterprise',
  });

  const handleSubdomainChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData(prev => ({ ...prev, subdomain: sanitized }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const organization = await createOrganization(
        formData.organizationName,
        formData.subdomain || undefined,
        formData.plan
      );

      toast({
        title: 'Organization Created',
        description: `Welcome to ${organization.name}!`,
      });

      // Redirect to onboarding or dashboard
      navigate('/onboarding');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold mb-2">Set Up Your Organization</h1>
          <p className="text-muted-foreground">
            Create your workspace and choose a plan to get started
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Step {step} of 2: {step === 1 ? 'Company Information' : 'Choose Plan'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Company Name *</Label>
                    <Input
                      id="organizationName"
                      placeholder="Acme Real Estate"
                      value={formData.organizationName}
                      onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdomain (Optional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="subdomain"
                        placeholder="acme"
                        value={formData.subdomain}
                        onChange={(e) => handleSubdomainChange(e.target.value)}
                      />
                      <span className="text-muted-foreground">.homekartcrm.com</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Choose a unique subdomain for your organization (letters, numbers, and hyphens only)
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!formData.organizationName}
                    >
                      Next: Choose Plan
                    </Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-4">
                    <Label>Select a Plan</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plans.map((plan) => (
                        <Card
                          key={plan.id}
                          className={`cursor-pointer transition-all ${
                            formData.plan === plan.id
                              ? 'ring-2 ring-primary border-primary'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, plan: plan.id as any }))}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{plan.name}</CardTitle>
                              {formData.plan === plan.id && (
                                <Check className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div className="mt-2">
                              <span className="text-2xl font-bold">{plan.price}</span>
                              {plan.period && (
                                <span className="text-muted-foreground">/{plan.period}</span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2 text-sm">
                              {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-600" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Organization'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

