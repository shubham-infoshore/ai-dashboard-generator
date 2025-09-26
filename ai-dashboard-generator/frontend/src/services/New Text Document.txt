// frontend/src/services/ExportService.ts
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { fabric } from 'fabric';
import { DashboardConfig, ExportFormat, ExportResponse } from '../../../shared/types/dashboard';

export class ExportService {
  async exportDashboard(
    dashboard: DashboardConfig,
    format: ExportFormat,
    canvas: fabric.Canvas
  ): Promise<ExportResponse> {
    const startTime = Date.now();
    
    try {
      switch (format) {
        case 'jpeg':
          return await this.exportAsImage(canvas, 'jpeg');
        case 'png':
          return await this.exportAsImage(canvas, 'png');
        case 'pdf':
          return await this.exportAsPDF(canvas, dashboard.title);
        case 'pptx':
          return await this.exportAsPowerPoint(dashboard);
        case 'html':
          return await this.exportAsHTML(dashboard);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error.message}`
      };
    }
  }

  private async exportAsImage(canvas: fabric.Canvas, format: 'jpeg' | 'png'): Promise<ExportResponse> {
    const dataURL = canvas.toDataURL({
      format: format,
      quality: 0.9,
      multiplier: 2 // High DPI
    });
    
    return {
      success: true,
      downloadUrl: dataURL,
      filename: `dashboard.${format}`
    };
  }

  private async exportAsPDF(canvas: fabric.Canvas, title: string): Promise<ExportResponse> {
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    
    // A4 landscape dimensions
    const pdfWidth = 297;
    const pdfHeight = 210;
    
    // Calculate aspect ratio (16:9)
    const aspectRatio = 16 / 9;
    let imgWidth = pdfWidth - 20; // 10mm margin on each side
    let imgHeight = imgWidth / aspectRatio;
    
    if (imgHeight > pdfHeight - 20) {
      imgHeight = pdfHeight - 20;
      imgWidth = imgHeight * aspectRatio;
    }
    
    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;
    
    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
    
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    
    return {
      success: true,
      downloadUrl: url,
      filename: `${title.replace(/\s+/g, '_').toLowerCase()}.pdf`
    };
  }

  private async exportAsPowerPoint(dashboard: DashboardConfig): Promise<ExportResponse> {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    
    const slide = pptx.addSlide();
    
    // Add title
    slide.addText(dashboard.title, {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 24,
      fontFace: 'Arial',
      color: dashboard.theme.primaryColor,
      bold: true
    });
    
    // Add components as shapes/charts
    dashboard.components.forEach((component, index) => {
      const x = (component.position.x / 800) * 10; // Scale to slide dimensions
      const y = (component.position.y / 450) * 5.6 + 1.2;
      const w = (component.size.width / 800) * 10;
      const h = (component.size.height / 450) * 5.6;
      
      if (component.type === 'chart' && component.data.datasets) {
        // Add chart data to PowerPoint
        const chartData = component.data.datasets[0];
        slide.addChart('bar', 
          chartData.labels?.map((label, i) => ({
            name: label,
            values: [chartData.data[i]]
          })) || [],
          { x, y, w, h, title: component.title }
        );
      } else if (component.type === 'kpi') {
        // Add KPI as text box
        slide.addText(`${component.data.value} ${component.data.unit || ''}`, {
          x, y, w, h,
          fontSize: 18,
          fontFace: 'Arial',
          color: dashboard.theme.primaryColor,
          bold: true,
          align: 'center'
        });
        
        if (component.title) {
          slide.addText(component.title, {
            x, y: y - 0.3, w, h: 0.3,
            fontSize: 12,
            fontFace: 'Arial',
            color: dashboard.theme.textColor
          });
        }
      }
    });
    
    const pptxBlob = await pptx.write('blob');
    const url = URL.createObjectURL(pptxBlob);
    
    return {
      success: true,
      downloadUrl: url,
      filename: `${dashboard.title.replace(/\s+/g, '_').toLowerCase()}.pptx`
    };
  }

  private async exportAsHTML(dashboard: DashboardConfig): Promise<ExportResponse> {
    const html = this.generateHTMLCode(dashboard);
    
    // Copy to clipboard
    await navigator.clipboard.writeText(html);
    
    return {
      success: true,
      downloadUrl: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      filename: 'dashboard.html'
    };
  }

  private generateHTMLCode(dashboard: DashboardConfig): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${dashboard.title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: ${dashboard.theme.fontFamily};
            background-color: ${dashboard.theme.backgroundColor};
            color: ${dashboard.theme.textColor};
            margin: 0;
            padding: 20px;
        }
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            aspect-ratio: 16/9;
            position: relative;
        }
        .component {
            position: absolute;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .kpi-value {
            font-size: 2rem;
            font-weight: bold;
            color: ${dashboard.theme.primaryColor};
        }
        .component-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 12px;
            color: ${dashboard.theme.textColor};
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <h1>${dashboard.title}</h1>
        ${dashboard.components.map(component => `
        <div class="component" style="
            left: ${(component.position.x / 800) * 100}%;
            top: ${(component.position.y / 450) * 100}%;
            width: ${(component.size.width / 800) * 100}%;
            height: ${(component.size.height / 450) * 100}%;
        ">
            ${component.title ? `<div class="component-title">${component.title}</div>` : ''}
            ${component.type === 'kpi' ? 
                `<div class="kpi-value">${component.data.value} ${component.data.unit || ''}</div>` : 
                `<canvas id="chart-${component.id}"></canvas>`
            }
        </div>
        `).join('')}
    </div>
</body>
</html>`;
  }
}
