import * as XLSX from 'xlsx';
import { ReportData, ExportFormat } from '@/types/reports';
import { format } from 'date-fns';

export class ReportExporter {
  static async exportToExcel(reportData: ReportData): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    if (reportData.summary) {
      const summaryData = [
        ['Metric', 'Value'],
        ...Object.entries(reportData.summary.metrics).map(([key, value]) => [
          key.replace(/([A-Z])/g, ' $1').trim(),
          typeof value === 'number' ? value : String(value),
        ]),
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Data sheet
    if (Array.isArray(reportData.data) && reportData.data.length > 0) {
      const dataSheet = XLSX.utils.json_to_sheet(reportData.data);
      XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');
    }

    // Generate filename
    const filename = `${reportData.config.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, filename);
  }

  static async exportToCSV(reportData: ReportData): Promise<void> {
    if (!Array.isArray(reportData.data) || reportData.data.length === 0) {
      throw new Error('No data to export');
    }

    const worksheet = XLSX.utils.json_to_sheet(reportData.data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportData.config.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static async exportToJSON(reportData: ReportData): Promise<void> {
    const json = JSON.stringify(reportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportData.config.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static async exportToPDF(reportData: ReportData): Promise<void> {
    // PDF export would require a library like jsPDF or pdfmake
    // For now, we'll use window.print() as a fallback
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    const html = this.generatePDFHTML(reportData);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  private static generatePDFHTML(reportData: ReportData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportData.config.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin: 20px 0; }
            .metric { margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>${reportData.config.name}</h1>
          <p>Generated on: ${format(new Date(reportData.generatedAt), 'PPpp')}</p>
          
          ${reportData.summary ? `
            <div class="summary">
              <h2>Summary</h2>
              ${Object.entries(reportData.summary.metrics).map(([key, value]) => `
                <div class="metric">
                  <strong>${key.replace(/([A-Z])/g, ' $1').trim()}:</strong> 
                  ${typeof value === 'number' ? value.toLocaleString() : value}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${Array.isArray(reportData.data) && reportData.data.length > 0 ? `
            <h2>Data</h2>
            <table>
              <thead>
                <tr>
                  ${Object.keys(reportData.data[0]).map(key => `<th>${key.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${reportData.data.map(row => `
                  <tr>
                    ${Object.values(row).map(value => `
                      <td>${typeof value === 'number' ? value.toLocaleString() : String(value)}</td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
        </body>
      </html>
    `;
  }

  static async export(reportData: ReportData, format: ExportFormat): Promise<void> {
    switch (format) {
      case 'excel':
        await this.exportToExcel(reportData);
        break;
      case 'csv':
        await this.exportToCSV(reportData);
        break;
      case 'json':
        await this.exportToJSON(reportData);
        break;
      case 'pdf':
        await this.exportToPDF(reportData);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

