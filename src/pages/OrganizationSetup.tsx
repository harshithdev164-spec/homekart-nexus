import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { createOrganization } from '@/services/organizationService';
import { useToast } from '@/hooks/use-toast';
import { Building2, Check, Loader2, Sparkles, ArrowRight, ArrowLeft, Zap, Shield, TrendingUp } from 'lucide-react';
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
    gradient: 'from-gray-500 to-gray-600',
    popular: false,
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
    gradient: 'from-primary to-cyan-500',
    popular: true,
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
    gradient: 'from-purple-500 to-pink-500',
    popular: false,
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
    gradient: 'from-yellow-500 to-orange-500',
    popular: false,
  },
];

export const OrganizationSetup: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [formData, setFormData] = useState({
    organizationName: '',
    subdomain: '',
    plan: 'free' as 'free' | 'starter' | 'professional' | 'enterprise',
  });

  useEffect(() => {
    // Animated particles background
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }> = [];
    const particleCount = 60;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${particle.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-30"
        style={{ zIndex: 0 }}
      />
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="relative">
                <Building2 className="h-12 w-12 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/50 blur-xl" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Set Up Your Organization
              </span>
            </h1>
            <p className="text-white/60 text-lg">
              Create your workspace and choose a plan to get started
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-white/40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary/20' : 'border-white/40'}`}>
                {step > 1 ? <Check className="h-4 w-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">Company Info</span>
            </div>
            <div className={`w-16 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-white/20'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-white/40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary/20' : 'border-white/40'}`}>
                2
              </div>
              <span className="text-sm font-medium">Choose Plan</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="backdrop-blur-xl bg-white/5 border-white/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {step === 1 ? 'Organization Details' : 'Select Your Plan'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {step === 1 ? 'Tell us about your company' : 'Choose the perfect plan for your needs'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="organizationName" className="text-white/80">
                        Company Name *
                      </Label>
                      <Input
                        id="organizationName"
                        placeholder="Acme Real Estate"
                        value={formData.organizationName}
                        onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                        required
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-primary h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subdomain" className="text-white/80">
                        Subdomain (Optional)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="subdomain"
                          placeholder="acme"
                          value={formData.subdomain}
                          onChange={(e) => handleSubdomainChange(e.target.value)}
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-primary h-12"
                        />
                        <span className="text-white/60">.homekartcrm.com</span>
                      </div>
                      <p className="text-xs text-white/40">
                        Choose a unique subdomain for your organization (letters, numbers, and hyphens only)
                      </p>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!formData.organizationName}
                        className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white border-0 shadow-lg shadow-primary/50"
                      >
                        Next: Choose Plan
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-4">
                      <Label className="text-white/80 text-lg">Select a Plan</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plans.map((plan) => (
                          <Card
                            key={plan.id}
                            className={`cursor-pointer transition-all backdrop-blur-sm bg-white/5 border-white/10 hover:border-primary/50 ${
                              formData.plan === plan.id
                                ? 'ring-2 ring-primary border-primary shadow-lg shadow-primary/50'
                                : ''
                            }`}
                            onClick={() => setFormData(prev => ({ ...prev, plan: plan.id as any }))}
                          >
                            {plan.popular && (
                              <div className="absolute -top-3 right-4">
                                <Badge className="bg-gradient-to-r from-primary to-purple-500 text-white border-0">
                                  Popular
                                </Badge>
                              </div>
                            )}
                            <CardHeader>
                              <div className="flex items-center justify-between mb-2">
                                <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                                {formData.plan === plan.id && (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="mt-4">
                                <span className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                                  {plan.price}
                                </span>
                                {plan.period && (
                                  <span className="text-white/60">/{plan.period}</span>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className="flex items-center gap-2 text-white/80">
                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white border-0 shadow-lg shadow-primary/50"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            Create Organization
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
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
    </div>
  );
};

export default OrganizationSetup;
