import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportData, ChartData } from '@/types/reports';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Download, RefreshCw, Share2, Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ReportExporter } from './ReportExporter';
import { ExportFormat } from '@/types/reports';

interface ReportViewerProps {
  reportData: ReportData;
  loading?: boolean;
  onExport?: (format: string) => void;
  onRefresh?: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const ReportViewer: React.FC<ReportViewerProps> = ({
  reportData,
  loading = false,
  onExport,
  onRefresh,
  onShare,
  onFavorite,
  isFavorite = false,
}) => {
  const [selectedChart, setSelectedChart] = useState<number>(0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderChart = (chart: ChartData, index: number) => {
    const { type, title, data, config } = chart;

    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={config?.xKey || 'name'} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey={config?.dataKey || 'value'} fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={config?.xKey || 'date'} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={config?.dataKey || 'value'}
                stroke={COLORS[0]}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey={config?.dataKey || 'value'}
              >
                {data.map((entry: any, idx: number) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={config?.xKey || 'date'} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey={config?.dataKey || 'value'}
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'funnel':
        // Funnel chart using bar chart as fallback
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey={config?.nameKey || 'stage'} type="category" stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey={config?.dataKey || 'count'} fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer key={index} width="100%" height={300}>
            <RadarChart data={data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey={config?.nameKey || 'subject'} stroke="hsl(var(--muted-foreground))" />
              <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
              <Radar
                name="Value"
                dataKey={config?.dataKey || 'value'}
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>{reportData.config.name}</CardTitle>
                <Badge variant="outline">{reportData.config.category.replace('_', ' ')}</Badge>
                {isFavorite && (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              <CardDescription>
                Generated on {format(new Date(reportData.generatedAt), 'PPpp')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onFavorite && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onFavorite}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </Button>
              )}
              {onShare && (
                <Button variant="ghost" size="icon" onClick={onShare} title="Share report">
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {onRefresh && (
                <Button variant="ghost" size="icon" onClick={onRefresh} title="Refresh report">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {onExport && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    ReportExporter.export(reportData, 'excel').catch(console.error);
                    onExport('excel');
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    ReportExporter.export(reportData, 'pdf').catch(console.error);
                    onExport('pdf');
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    ReportExporter.export(reportData, 'csv').catch(console.error);
                    onExport('csv');
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Metrics */}
      {reportData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(reportData.summary.metrics).map(([key, value]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      {reportData.charts && reportData.charts.length > 0 && (
        <div className="space-y-6">
          {reportData.charts.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {reportData.charts.map((chart, index) => (
                <Button
                  key={index}
                  variant={selectedChart === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedChart(index)}
                >
                  {chart.title}
                </Button>
              ))}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>
                {reportData.charts[selectedChart]?.title || 'Chart'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart(reportData.charts[selectedChart], selectedChart)}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      {Array.isArray(reportData.data) && reportData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Table</CardTitle>
            <CardDescription>Detailed data view</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {Object.keys(reportData.data[0]).map((key) => (
                      <th key={key} className="text-left p-2 font-medium">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.slice(0, 100).map((row: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      {Object.values(row).map((value: any, cellIndex: number) => (
                        <td key={cellIndex} className="p-2 text-sm">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.data.length > 100 && (
                <div className="mt-4 text-sm text-muted-foreground text-center">
                  Showing first 100 of {reportData.data.length} records
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {reportData.summary?.insights && reportData.summary.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reportData.summary.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

