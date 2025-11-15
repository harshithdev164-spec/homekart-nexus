import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/organization/OrganizationProvider';
import { updateOrganizationSubscription, checkPlanLimits } from '@/services/organizationService';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Check, Loader2, TrendingUp, Users, UserCheck, Building2 } from 'lucide-react';
import { format } from 'date-fns';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    features: ['Up to 5 users', '100 leads', '50 properties', 'Basic features'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₹2,999',
    period: 'month',
    features: ['Up to 10 users', '500 leads', '200 properties', 'Advanced features', 'Email support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹7,999',
    period: 'month',
    features: ['Up to 25 users', 'Unlimited leads', 'Unlimited properties', 'All features', 'Priority support', 'API access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Unlimited users', 'Unlimited everything', 'Custom features', 'Dedicated support', 'SLA guarantee', 'White-labeling'],
  },
];

export const Billing: React.FC = () => {
  const { currentOrganization, subscription, refreshOrganization } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState({
    users: { current: 0, limit: 0 },
    leads: { current: 0, limit: 0 },
    properties: { current: 0, limit: 0 },
  });

  useEffect(() => {
    if (currentOrganization) {
      loadUsage();
    }
  }, [currentOrganization]);

  const loadUsage = async () => {
    if (!currentOrganization) return;

    const [users, leads, properties] = await Promise.all([
      checkPlanLimits(currentOrganization.id, 'users'),
      checkPlanLimits(currentOrganization.id, 'leads'),
      checkPlanLimits(currentOrganization.id, 'properties'),
    ]);

    setUsage({
      users: { current: users.current, limit: users.limit },
      leads: { current: leads.current, limit: leads.limit },
      properties: { current: properties.current, limit: properties.limit },
    });
  };

  const handleUpgrade = async (planId: string) => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      await updateOrganizationSubscription(currentOrganization.id, planId as any);
      await refreshOrganization();
      toast({
        title: 'Plan Updated',
        description: `Successfully upgraded to ${planId} plan`,
      });
      await loadUsage();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update plan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentOrganization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No organization found. Please create one first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === currentOrganization.plan);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold">{currentPlan?.name}</h3>
                <Badge variant={currentOrganization.plan === 'free' ? 'secondary' : 'default'}>
                  {currentOrganization.subscription_status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {currentPlan?.price} {currentPlan?.period && `/${currentPlan.period}`}
              </p>
              {subscription && (
                <p className="text-sm text-muted-foreground mt-2">
                  Next billing date: {format(new Date(subscription.current_period_end), 'PP')}
                </p>
              )}
            </div>
            <Button variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Payment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>Current usage against your plan limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Users</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usage.users.current} / {usage.users.limit === -1 ? '∞' : usage.users.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${usage.users.limit === -1 ? 0 : Math.min((usage.users.current / usage.users.limit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Leads</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usage.leads.current} / {usage.leads.limit === -1 ? '∞' : usage.leads.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${usage.leads.limit === -1 ? 0 : Math.min((usage.leads.current / usage.leads.limit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Properties</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {usage.properties.current} / {usage.properties.limit === -1 ? '∞' : usage.properties.limit}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${usage.properties.limit === -1 ? 0 : Math.min((usage.properties.current / usage.properties.limit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentOrganization.plan;
            const isUpgrade = ['free', 'starter', 'professional'].indexOf(plan.id) > ['free', 'starter', 'professional'].indexOf(currentOrganization.plan);

            return (
              <Card
                key={plan.id}
                className={`relative ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <Badge>Current</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : 'default'}
                    disabled={isCurrentPlan || loading}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : isUpgrade ? (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Upgrade
                      </>
                    ) : (
                      'Downgrade'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Billing history will appear here once payments are processed</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

