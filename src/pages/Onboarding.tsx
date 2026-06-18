import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganization } from '@/components/organization/OrganizationProvider';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, Building2, Users, Settings, Sparkles } from 'lucide-react';

const steps = [
  { id: 1, title: 'Company Information', icon: Building2 },
  { id: 2, title: 'Team Setup', icon: Users },
  { id: 3, title: 'Integrations', icon: Settings },
  { id: 4, title: 'Preferences', icon: Sparkles },
];

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization, refreshOrganization } = useOrganization();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: currentOrganization?.name || '',
    industry: '',
    teamSize: '',
    integrations: {
      magicbricks: false,
      acres99: false,
      zoho: false,
    },
    preferences: {
      emailNotifications: true,
      smsNotifications: false,
      weeklyReports: true,
    },
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Save preferences and settings
      // This would typically update organization settings
      toast({
        title: 'Onboarding Complete!',
        description: 'Welcome to Realty OS',
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete onboarding',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      currentStep >= step.id
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <step.icon className="h-6 w-6" />
                    )}
                  </div>
                  <span className="mt-2 text-sm font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Step {currentStep} of {steps.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Acme Real Estate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="Real Estate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    value={formData.teamSize}
                    onChange={(e) => setFormData(prev => ({ ...prev, teamSize: e.target.value }))}
                    placeholder="10"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  You can invite team members later from the Team page. For now, let's continue with the setup.
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Tip:</strong> You can add team members and assign roles after completing onboarding.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  Connect your integrations (optional - you can set these up later)
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="magicbricks"
                      checked={formData.integrations.magicbricks}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          integrations: { ...prev.integrations, magicbricks: checked as boolean },
                        }))
                      }
                    />
                    <Label htmlFor="magicbricks" className="cursor-pointer">
                      MagicBricks Integration
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="acres99"
                      checked={formData.integrations.acres99}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          integrations: { ...prev.integrations, acres99: checked as boolean },
                        }))
                      }
                    />
                    <Label htmlFor="acres99" className="cursor-pointer">
                      99acres Integration
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="zoho"
                      checked={formData.integrations.zoho}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          integrations: { ...prev.integrations, zoho: checked as boolean },
                        }))
                      }
                    />
                    <Label htmlFor="zoho" className="cursor-pointer">
                      Zoho Integration
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  Configure your notification preferences
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="emailNotifications"
                      checked={formData.preferences.emailNotifications}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, emailNotifications: checked as boolean },
                        }))
                      }
                    />
                    <Label htmlFor="emailNotifications" className="cursor-pointer">
                      Email Notifications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="smsNotifications"
                      checked={formData.preferences.smsNotifications}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, smsNotifications: checked as boolean },
                        }))
                      }
                    />
                    <Label htmlFor="smsNotifications" className="cursor-pointer">
                      SMS Notifications
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="weeklyReports"
                      checked={formData.preferences.weeklyReports}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, weeklyReports: checked as boolean },
                        }))
                      }
                    />
                    <Label htmlFor="weeklyReports" className="cursor-pointer">
                      Weekly Reports
                    </Label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
              >
                Skip for Now
              </Button>
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : currentStep === steps.length ? (
                    'Complete Setup'
                  ) : (
                    'Next'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

