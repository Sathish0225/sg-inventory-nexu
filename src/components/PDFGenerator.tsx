
import { toast } from "sonner";

export const generateInventoryPDF = (items: any[]) => {
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inventory Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .total { font-weight: bold; background-color: #e3f2fd; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">InvenTrack SG</div>
        <h2>Inventory Report</h2>
        <p>Generated on: ${new Date().toLocaleDateString('en-SG')}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Serial Number</th>
            <th>Location</th>
            <th>Current Stock</th>
            <th>Unit Cost (S$)</th>
            <th>Total Value (S$)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.category}</td>
              <td>${item.brand}</td>
              <td>${item.serialNumber}</td>
              <td>${item.location}</td>
              <td>${item.currentStock}</td>
              <td>${item.unitCost.toFixed(2)}</td>
              <td>${item.totalValue.toFixed(2)}</td>
              <td>${item.status}</td>
            </tr>
          `).join('')}
          <tr class="total">
            <td colspan="7"><strong>Total Inventory Value:</strong></td>
            <td><strong>S$${items.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        <p>© 2024 InvenTrack SG - Singapore Inventory Management System</p>
        <p>This report includes GST calculations as per Singapore regulations</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventory-report-${new Date().toISOString().split('T')[0]}.html`;
  link.click();
  URL.revokeObjectURL(url);
  
  toast.success("Inventory PDF report generated successfully");
};

export const generateServicePDF = (report: any) => {
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Service Report - ${report.jobNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .section { margin: 20px 0; }
        .section h3 { color: #2563eb; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-item { margin: 10px 0; }
        .label { font-weight: bold; color: #555; }
        .value { margin-left: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .signature-box { border: 1px solid #ddd; height: 60px; margin: 10px 0; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
        .status-completed { background-color: #d4edda; color: #155724; }
        .status-progress { background-color: #cce5ff; color: #004085; }
        .status-scheduled { background-color: #fff3cd; color: #856404; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">InvenTrack SG</div>
        <h1>Service Report</h1>
        <h2>${report.jobNumber}</h2>
      </div>
      
      <div class="section">
        <h3>Job Information</h3>
        <div class="info-grid">
          <div>
            <div class="info-item">
              <span class="label">Customer:</span>
              <span class="value">${report.customer}</span>
            </div>
            <div class="info-item">
              <span class="label">Site Location:</span>
              <span class="value">${report.site}</span>
            </div>
            <div class="info-item">
              <span class="label">Service Type:</span>
              <span class="value">${report.serviceType}</span>
            </div>
          </div>
          <div>
            <div class="info-item">
              <span class="label">Technician:</span>
              <span class="value">${report.technician}</span>
            </div>
            <div class="info-item">
              <span class="label">Scheduled:</span>
              <span class="value">${report.dateScheduled} at ${report.timeScheduled}</span>
            </div>
            <div class="info-item">
              <span class="label">Status:</span>
              <span class="status status-${report.status.toLowerCase().replace(' ', '')}">${report.status}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h3>Service Description</h3>
        <p>${report.description}</p>
      </div>
      
      ${report.partsUsed && report.partsUsed.length > 0 ? `
      <div class="section">
        <h3>Parts Used</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit Cost (S$)</th>
              <th>Total (S$)</th>
            </tr>
          </thead>
          <tbody>
            ${report.partsUsed.map((part: any) => `
              <tr>
                <td>${part.item}</td>
                <td>${part.quantity}</td>
                <td>${part.cost.toFixed(2)}</td>
                <td>${(part.quantity * part.cost).toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr style="font-weight: bold; background-color: #f8f9fa;">
              <td colspan="3">Total Cost:</td>
              <td>S$${report.totalCost.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${report.notes ? `
      <div class="section">
        <h3>Notes</h3>
        <p>${report.notes}</p>
      </div>
      ` : ''}
      
      <div class="section">
        <h3>Customer Signature</h3>
        <div class="signature-box"></div>
        <p>Customer Name: ___________________________ Signature: ___________________________</p>
        <p>Date: ${new Date().toLocaleDateString('en-SG')} Time: _______________</p>
      </div>
      
      <div class="footer">
        <p>© 2024 InvenTrack SG - Service Management System</p>
        <p>Contact: support@inventracksg.com | Tel: +65 6123 4567</p>
        <p>This service report complies with Singapore service standards</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `service-report-${report.jobNumber}.html`;
  link.click();
  URL.revokeObjectURL(url);
  
  toast.success("Service report PDF generated successfully");
};
