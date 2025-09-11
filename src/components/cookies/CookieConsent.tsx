import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Cookie, Settings, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(cookieConsent);
        setPreferences(saved);
      } catch (error) {
        console.error('Error parsing cookie preferences:', error);
      }
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
    
    // Initialize analytics if accepted
    if (allAccepted.analytics) {
      // Add your analytics initialization here
      console.log('Analytics cookies accepted');
    }
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    setPreferences(necessaryOnly);
    localStorage.setItem('cookie-consent', JSON.stringify(necessaryOnly));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
  };

  const saveCustomSettings = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
    setShowSettings(false);

    // Initialize services based on preferences
    if (preferences.analytics) {
      console.log('Analytics cookies accepted');
    }
    if (preferences.marketing) {
      console.log('Marketing cookies accepted');
    }
    if (preferences.functional) {
      console.log('Functional cookies accepted');
    }
  };

  const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: key === 'necessary' ? true : value // Necessary cookies can't be disabled
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Consent Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border shadow-lg">
        <Card className="max-w-6xl mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">We use cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies and similar technologies to enhance your browsing experience, 
                    analyze our traffic, and provide personalized content. By clicking "Accept All", 
                    you consent to our use of cookies.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Essential</Badge>
                    <Badge variant="outline" className="text-xs">Analytics</Badge>
                    <Badge variant="outline" className="text-xs">Marketing</Badge>
                    <Badge variant="outline" className="text-xs">Functional</Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Cookie className="h-5 w-5" />
                        Cookie Preferences
                      </DialogTitle>
                      <DialogDescription>
                        Choose which cookies you want to allow. You can change these settings at any time.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Necessary Cookies */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <Label className="text-sm font-medium">Necessary Cookies</Label>
                          <p className="text-xs text-muted-foreground">
                            Required for the website to function properly. Cannot be disabled.
                          </p>
                        </div>
                        <Switch 
                          checked={preferences.necessary} 
                          disabled={true}
                        />
                      </div>

                      {/* Analytics Cookies */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <Label className="text-sm font-medium">Analytics Cookies</Label>
                          <p className="text-xs text-muted-foreground">
                            Help us understand how visitors interact with our website.
                          </p>
                        </div>
                        <Switch 
                          checked={preferences.analytics}
                          onCheckedChange={(checked) => updatePreference('analytics', checked)}
                        />
                      </div>

                      {/* Marketing Cookies */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <Label className="text-sm font-medium">Marketing Cookies</Label>
                          <p className="text-xs text-muted-foreground">
                            Used to track visitors and display relevant ads.
                          </p>
                        </div>
                        <Switch 
                          checked={preferences.marketing}
                          onCheckedChange={(checked) => updatePreference('marketing', checked)}
                        />
                      </div>

                      {/* Functional Cookies */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <Label className="text-sm font-medium">Functional Cookies</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable enhanced functionality and personalization.
                          </p>
                        </div>
                        <Switch 
                          checked={preferences.functional}
                          onCheckedChange={(checked) => updatePreference('functional', checked)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={saveCustomSettings} className="flex-1">
                        <Check className="h-4 w-4 mr-2" />
                        Save Settings
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={acceptNecessary} size="sm" className="w-full sm:w-auto">
                  Necessary Only
                </Button>
                <Button onClick={acceptAll} size="sm" className="w-full sm:w-auto">
                  Accept All
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowBanner(false)}
                  className="w-full sm:w-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};