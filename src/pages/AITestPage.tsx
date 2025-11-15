import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, CheckCircle, XCircle, Loader2, Brain, Home } from 'lucide-react';

const AITestPage: React.FC = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<any>({});
  const [leadId, setLeadId] = useState('');
  const [testApiKey, setTestApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Clear error when component mounts or when user interacts
  useEffect(() => {
    setError(null);
  }, []);

  // Test OpenAI API Key directly
  const testOpenAIKey = async () => {
    if (!testApiKey) {
      toast({
        title: 'Error',
        description: 'Please enter an API key to test',
        variant: 'destructive',
      });
      return;
    }

    setTesting('openai');
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(prev => ({
          ...prev,
          openai: {
            success: true,
            message: `API Key is valid! Found ${data.data?.length || 0} models.`,
            models: data.data?.slice(0, 5).map((m: any) => m.id) || [],
          },
        }));
        toast({
          title: 'Success',
          description: 'OpenAI API key is valid!',
        });
      } else {
        const error = await response.json();
        setResults(prev => ({
          ...prev,
          openai: {
            success: false,
            message: error.error?.message || 'API key is invalid',
          },
        }));
        toast({
          title: 'Error',
          description: 'OpenAI API key is invalid',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        openai: {
          success: false,
          message: error.message || 'Failed to test API key',
        },
      }));
      toast({
        title: 'Error',
        description: error.message || 'Failed to test API key',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  // Test AI Lead Insights function
  const testLeadInsights = async () => {
    if (!leadId) {
      toast({
        title: 'Error',
        description: 'Please enter a lead ID',
        variant: 'destructive',
      });
      return;
    }

    setTesting('lead-insights');
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-insights', {
        body: {
          leadId,
          action: 'score',
        },
      });

      if (error) throw error;

      setResults(prev => ({
        ...prev,
        leadInsights: {
          success: true,
          data,
        },
      }));

      toast({
        title: 'Success',
        description: `Lead scored: ${data.score}/100 (${data.priority} priority)`,
      });
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        leadInsights: {
          success: false,
          message: error.message || 'Failed to generate lead insights',
        },
      }));
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate lead insights. Make sure OPENAI_API_KEY is set in Supabase secrets.',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  // Test AI Property Matcher function
  const testPropertyMatcher = async () => {
    if (!leadId) {
      toast({
        title: 'Error',
        description: 'Please enter a lead ID',
        variant: 'destructive',
      });
      return;
    }

    setTesting('property-matcher');
    try {
      const { data, error } = await supabase.functions.invoke('ai-property-matcher', {
        body: {
          leadId,
        },
      });

      if (error) throw error;

      setResults(prev => ({
        ...prev,
        propertyMatcher: {
          success: true,
          data,
        },
      }));

      toast({
        title: 'Success',
        description: `Found ${data.matches?.length || 0} matching properties`,
      });
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        propertyMatcher: {
          success: false,
          message: error.message || 'Failed to match properties',
        },
      }));
      toast({
        title: 'Error',
        description: error.message || 'Failed to match properties. Make sure OPENAI_API_KEY is set in Supabase secrets.',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  // Get sample lead ID
  const getSampleLead = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setLeadId(data.id);
        toast({
          title: 'Success',
          description: `Loaded lead: ${data.name}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No leads found. Please create a lead first.',
        variant: 'destructive',
      });
    }
  };

  // Show error if any
  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
              <h2 className="text-xl font-bold mb-2">Error Loading Page</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => setError(null)}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Features Test Page</h1>
        <p className="text-muted-foreground mt-2">
          Test and verify your AI integrations are working correctly
        </p>
      </div>

      {/* API Key Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Test OpenAI API Key
          </CardTitle>
          <CardDescription>
            Verify your OpenAI API key is valid before testing AI features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
              />
              <Button onClick={testOpenAIKey} disabled={!!testing || !testApiKey}>
                {testing === 'openai' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Key'
                )}
              </Button>
            </div>
          </div>

          {results.openai && (
            <div className={`p-4 rounded-lg border ${
              results.openai.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {results.openai.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  {results.openai.success ? 'API Key Valid' : 'API Key Invalid'}
                </span>
              </div>
              <p className="text-sm">{results.openai.message}</p>
              {results.openai.models && results.openai.models.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-1">Available Models:</p>
                  <div className="flex flex-wrap gap-1">
                    {results.openai.models.map((model: string) => (
                      <Badge key={model} variant="outline">{model}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead ID Input */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Enter a lead ID to test AI features, or load a sample lead
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leadId">Lead ID</Label>
            <div className="flex gap-2">
              <Input
                id="leadId"
                placeholder="Enter lead ID or click to load sample"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
              />
              <Button variant="outline" onClick={getSampleLead}>
                Load Sample
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Lead Insights Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Test AI Lead Insights
          </CardTitle>
          <CardDescription>
            Test the AI lead scoring and insights generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testLeadInsights}
            disabled={!!testing || !leadId}
            className="w-full"
          >
            {testing === 'lead-insights' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Insights...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Lead Score
              </>
            )}
          </Button>

          {results.leadInsights && (
            <div className={`p-4 rounded-lg border ${
              results.leadInsights.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {results.leadInsights.success ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Lead Insights Generated</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Score:</strong> {results.leadInsights.data.score}/100
                    </div>
                    <div>
                      <strong>Priority:</strong>{' '}
                      <Badge variant="outline">{results.leadInsights.data.priority}</Badge>
                    </div>
                    <div>
                      <strong>Reasoning:</strong> {results.leadInsights.data.reasoning}
                    </div>
                    {results.leadInsights.data.recommendations && (
                      <div>
                        <strong>Recommendations:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {results.leadInsights.data.recommendations.map((rec: string, i: number) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>{results.leadInsights.message}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Property Matcher Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Test AI Property Matcher
          </CardTitle>
          <CardDescription>
            Test the AI property matching functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testPropertyMatcher}
            disabled={!!testing || !leadId}
            className="w-full"
          >
            {testing === 'property-matcher' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Matching Properties...
              </>
            ) : (
              <>
                <Home className="h-4 w-4 mr-2" />
                Find Matching Properties
              </>
            )}
          </Button>

          {results.propertyMatcher && (
            <div className={`p-4 rounded-lg border ${
              results.propertyMatcher.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {results.propertyMatcher.success ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">
                      Found {results.propertyMatcher.data.matches?.length || 0} Matches
                    </span>
                  </div>
                  {results.propertyMatcher.data.summary && (
                    <p className="text-sm mb-2">{results.propertyMatcher.data.summary}</p>
                  )}
                  {results.propertyMatcher.data.matches && results.propertyMatcher.data.matches.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {results.propertyMatcher.data.matches.slice(0, 3).map((match: any, i: number) => (
                        <div key={i} className="p-2 bg-white rounded border text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <strong>Property {i + 1}</strong>
                            <Badge>{match.score}% Match</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{match.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>{results.propertyMatcher.message}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>To set up OpenAI API key in Supabase:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to your Supabase Dashboard: https://app.supabase.com</li>
            <li>Select your project</li>
            <li>Navigate to: <strong>Project Settings</strong> → <strong>Edge Functions</strong> → <strong>Secrets</strong></li>
            <li>Click <strong>Add Secret</strong></li>
            <li>Name: <code>OPENAI_API_KEY</code></li>
            <li>Value: Your OpenAI API key</li>
            <li>Click <strong>Save</strong></li>
            <li>Restart your Supabase project or redeploy edge functions</li>
          </ol>
          <p className="mt-4 text-muted-foreground">
            <strong>Note:</strong> For local development, you can also use Supabase CLI:
            <code className="block mt-1 p-2 bg-muted rounded">
              supabase secrets set OPENAI_API_KEY=your-key-here
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITestPage;

