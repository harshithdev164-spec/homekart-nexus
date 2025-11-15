import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportViewer } from './ReportViewer';
import { generateReport } from '@/services/reportService';
import { ReportConfig, ReportData } from '@/types/reports';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export const PropertyReport: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const generateReportData = async () => {
    setLoading(true);
    try {
      const config: ReportConfig = {
        name: 'Property Inventory Report',
        category: 'property',
        type: 'inventory',
        filters: {},
        fields: ['status', 'count', 'averageDaysOnMarket', 'averagePrice'],
        chartType: 'pie',
        createdBy: profile?.id || '',
      };

      const data = await generateReport(config);
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReportData();
  }, []);

  const handleExport = (format: string) => {
    toast({
      title: 'Export',
      description: `Exporting to ${format}...`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property Inventory Report</CardTitle>
          <CardDescription>Property status, inventory levels, and market metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateReportData} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <ReportViewer
          reportData={reportData}
          loading={loading}
          onExport={handleExport}
          onRefresh={generateReportData}
        />
      )}
    </div>
  );
};

