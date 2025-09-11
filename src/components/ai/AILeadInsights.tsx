import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, MessageSquare, Target, Clock, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIInsightsProps {
  leadId: string;
  leadData: any;
  onInsightsGenerated?: (insights: any) => void;
}

interface LeadScore {
  score: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  recommendations: string[];
}

interface LeadInsights {
  insights: string[];
  strategy: string;
  nextAction: string;
  timeline: string;
}

interface GeneratedMessage {
  subject: string;
  message: string;
  tone: string;
}

export const AILeadInsights: React.FC<AIInsightsProps> = ({ 
  leadId, 
  leadData, 
  onInsightsGenerated 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [leadScore, setLeadScore] = useState<LeadScore | null>(null);
  const [insights, setInsights] = useState<LeadInsights | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<GeneratedMessage | null>(null);

  const generateLeadScore = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-insights', {
        body: {
          leadId,
          action: 'score'
        }
      });

      if (error) throw error;

      setLeadScore(data);
      toast({
        title: "AI Analysis Complete",
        description: `Lead scored: ${data.score}/100 (${data.priority} priority)`,
      });

      onInsightsGenerated?.(data);
    } catch (error) {
      console.error('Error generating lead score:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI lead score",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-insights', {
        body: {
          leadId,
          action: 'insights'
        }
      });

      if (error) throw error;

      setInsights(data);
      toast({
        title: "AI Insights Generated",
        description: "Strategic recommendations ready",
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMessage = async (messageType: string, context?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-lead-insights', {
        body: {
          leadId,
          action: 'message',
          messageType,
          context
        }
      });

      if (error) throw error;

      setGeneratedMessage(data);
      toast({
        title: "Message Generated",
        description: "AI-powered message ready to use",
      });
    } catch (error) {
      console.error('Error generating message:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* AI Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Lead Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button 
              onClick={generateLeadScore}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Score Lead
            </Button>
            <Button 
              onClick={generateInsights}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              Get Insights
            </Button>
            <Button 
              onClick={() => generateMessage('follow-up', 'Initial contact')}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Generate Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lead Score Display */}
      {leadScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Lead Score
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getScoreColor(leadScore.score)}`}>
                  {leadScore.score}/100
                </span>
                <Badge className={getPriorityColor(leadScore.priority)}>
                  {leadScore.priority} priority
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">AI Reasoning:</h4>
                <p className="text-sm text-muted-foreground">{leadScore.reasoning}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Recommendations:</h4>
                <ul className="space-y-1">
                  {leadScore.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strategic Insights */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI Strategic Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Key Insights:</h4>
                <ul className="space-y-2">
                  {insights.insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-1">Recommended Strategy</h4>
                  <p className="text-sm text-blue-700">{insights.strategy}</p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-1 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Next Action
                  </h4>
                  <p className="text-sm text-green-700">{insights.nextAction}</p>
                  <p className="text-xs text-green-600 mt-1">Timeline: {insights.timeline}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Message */}
      {generatedMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Generated Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Subject:</Label>
                <div className="p-2 bg-muted rounded border text-sm font-medium">
                  {generatedMessage.subject}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Message:</Label>
                  <Badge variant="outline" className="text-xs">
                    Tone: {generatedMessage.tone}
                  </Badge>
                </div>
                <div className="p-3 bg-muted rounded border text-sm whitespace-pre-wrap">
                  {generatedMessage.message}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => navigator.clipboard.writeText(generatedMessage.message)}
                >
                  Copy Message
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setGeneratedMessage(null)}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};