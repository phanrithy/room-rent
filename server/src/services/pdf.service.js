import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

/**
 * Format cents to dollars string
 * @param {number} cents
 * @returns {string}
 */
function fmt(cents) {
  if (cents === null || cents === undefined) return '$0.00';
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

/**
 * Generate invoice PDF stream/buffer
 * @param {object} invoice
 * @param {object} [options]
 * @returns {Promise<Buffer>}
 */
export async function generateInvoicePdf(invoice, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Invoice-INV-${invoice.month}-${invoice.roomNumber}`,
          Author: invoice.propertyName || 'Sunrise Apartments',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const balance = invoice.total - invoice.paidAmount;

      // Header Banner
      doc.rect(40, 40, 515, 65).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(18).text(invoice.propertyName || 'Sunrise Apartments', 55, 52);
      doc.fontSize(9).fillColor('#94a3b8').text(invoice.propertyAddress || 'Street 271, Boeng Tumpun, Phnom Penh, Cambodia', 55, 75);

      doc.fillColor('#38bdf8').fontSize(16).text('RENT INVOICE', 400, 52, { align: 'right' });
      doc.fontSize(9).fillColor('#ffffff').text(`INV-${invoice.month.replace('-', '')}-${invoice.roomNumber}`, 400, 75, { align: 'right' });

      // Invoice & Tenant Info Boxes
      doc.rect(40, 120, 250, 75).stroke('#e2e8f0');
      doc.fillColor('#64748b').fontSize(8).text('BILLED TO (TENANT):', 50, 128);
      doc.fillColor('#0f172a').fontSize(11).text(invoice.tenantName || 'Tenant', 50, 140);
      doc.fontSize(9).fillColor('#475569').text(`Phone: ${invoice.tenantPhone || '—'}`, 50, 156);
      doc.text(`Room #${invoice.roomNumber} (Floor ${invoice.floor})`, 50, 170);

      doc.rect(305, 120, 250, 75).stroke('#e2e8f0');
      doc.fillColor('#64748b').fontSize(8).text('INVOICE DETAILS:', 315, 128);
      doc.fillColor('#0f172a').fontSize(9).text(`Billing Month: ${invoice.month}`, 315, 140);
      doc.text(`Due Date: ${invoice.dueDate}`, 315, 154);
      doc.text(`Status: ${invoice.status.toUpperCase()}`, 315, 168);

      // Line Items Table Header
      let y = 215;
      doc.rect(40, y, 515, 24).fill('#f1f5f9');
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text('DESCRIPTION', 50, y + 7);
      doc.text('RATE', 340, y + 7, { width: 80, align: 'right' });
      doc.text('AMOUNT ($)', 435, y + 7, { width: 105, align: 'right' });

      doc.font('Helvetica');
      y += 26;

      // 1. Rent
      doc.rect(40, y, 515, 24).stroke('#f1f5f9');
      doc.fillColor('#0f172a').fontSize(9).text(`Monthly Room Rent (Room #${invoice.roomNumber})`, 50, y + 7);
      doc.fillColor('#64748b').text('—', 340, y + 7, { width: 80, align: 'right' });
      doc.fillColor('#0f172a').text(fmt(invoice.rent), 435, y + 7, { width: 105, align: 'right' });
      y += 24;

      // 2. Electricity
      const eUnits = Math.max(0, (invoice.electricCurrent || 0) - (invoice.electricPrev || 0));
      doc.rect(40, y, 515, 24).stroke('#f1f5f9');
      doc.fillColor('#0f172a').text(`Electricity Usage (${eUnits} kWh: ${invoice.electricPrev || 0} -> ${invoice.electricCurrent || 0})`, 50, y + 7);
      doc.fillColor('#64748b').text('$1.50/kWh', 340, y + 7, { width: 80, align: 'right' });
      doc.fillColor('#0f172a').text(fmt(invoice.electricCost), 435, y + 7, { width: 105, align: 'right' });
      y += 24;

      // 3. Water
      const wUnits = Math.max(0, (invoice.waterCurrent || 0) - (invoice.waterPrev || 0));
      doc.rect(40, y, 515, 24).stroke('#f1f5f9');
      doc.fillColor('#0f172a').text(`Water Usage (${wUnits} m³: ${invoice.waterPrev || 0} -> ${invoice.waterCurrent || 0})`, 50, y + 7);
      doc.fillColor('#64748b').text('$0.50/m³', 340, y + 7, { width: 80, align: 'right' });
      doc.fillColor('#0f172a').text(fmt(invoice.waterCost), 435, y + 7, { width: 105, align: 'right' });
      y += 24;

      // 4. Extra charges
      if (invoice.items && invoice.items.length > 0) {
        for (const item of invoice.items) {
          doc.rect(40, y, 515, 24).stroke('#f1f5f9');
          doc.fillColor('#0f172a').text(item.description, 50, y + 7);
          doc.fillColor('#64748b').text('—', 340, y + 7, { width: 80, align: 'right' });
          doc.fillColor('#0f172a').text(fmt(item.amount), 435, y + 7, { width: 105, align: 'right' });
          y += 24;
        }
      }

      // 5. Late Fee
      if (invoice.lateFee > 0) {
        doc.rect(40, y, 515, 24).stroke('#fef2f2');
        doc.fillColor('#dc2626').text('Late Fee Penalty', 50, y + 7);
        doc.text('—', 340, y + 7, { width: 80, align: 'right' });
        doc.text(fmt(invoice.lateFee), 435, y + 7, { width: 105, align: 'right' });
        y += 24;
      }

      // Summary Table
      y += 10;
      doc.fontSize(9);
      doc.fillColor('#64748b').text('Subtotal:', 340, y, { width: 100, align: 'right' });
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(fmt(invoice.total), 440, y, { width: 100, align: 'right' });
      y += 16;

      doc.font('Helvetica').fillColor('#64748b').text('Paid Amount:', 340, y, { width: 100, align: 'right' });
      doc.fillColor('#16a34a').font('Helvetica-Bold').text(fmt(invoice.paidAmount), 440, y, { width: 100, align: 'right' });
      y += 18;

      doc.rect(340, y - 4, 215, 26).fill('#f8fafc');
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Balance Due:', 350, y + 3);
      doc.fillColor('#2563eb').fontSize(12).text(fmt(balance), 440, y + 3, { width: 105, align: 'right' });
      y += 35;

      // Dynamic KHQR Code embed if balance > 0
      if (balance > 0 && invoice.khqrString) {
        try {
          const qrBuffer = await QRCode.toBuffer(invoice.khqrString, {
            width: 140,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          });

          doc.rect(40, y, 220, 155).stroke('#cbd5e1');
          doc.image(qrBuffer, 80, y + 10, { width: 140 });
          doc.fontSize(8).fillColor('#0f172a').font('Helvetica-Bold')
            .text('SCAN TO PAY WITH BAKONG / KHQR', 45, y + 138, { width: 210, align: 'center' });
        } catch (e) {
          console.error('Failed to embed QR in PDF:', e);
        }
      }

      // Footer
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
        .text('Thank you for renting with Sunrise Apartments. For inquiries, please contact management.', 40, 780, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate official payment receipt PDF
 * @param {object} payment
 * @returns {Promise<Buffer>}
 */
export async function generateReceiptPdf(payment) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        margin: 30,
        info: {
          Title: `Receipt-REC-${String(payment.id).padStart(5, '0')}`,
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(30, 30, 360, 50).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(14).text(payment.propertyName || 'Sunrise Apartments', 45, 42);
      doc.fontSize(8).fillColor('#94a3b8').text('Official Payment Receipt / បង្កាន់ដៃទទួលប្រាក់', 45, 60);

      const receiptNo = `REC-${String(payment.id).padStart(5, '0')}`;
      doc.fillColor('#22c55e').fontSize(11).text(receiptNo, 260, 48, { width: 120, align: 'right' });

      let y = 95;
      doc.rect(30, y, 360, 115).stroke('#e2e8f0');

      doc.fillColor('#64748b').fontSize(8);
      doc.text('Date Received:', 45, y + 12);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(payment.paidAt ? payment.paidAt.split('T')[0] : '—', 140, y + 12);

      doc.font('Helvetica').fillColor('#64748b').text('Received From:', 45, y + 32);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(payment.tenantName || 'Tenant', 140, y + 32);

      doc.font('Helvetica').fillColor('#64748b').text('Room Number:', 45, y + 52);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`Room #${payment.roomNumber} (Floor ${payment.floor})`, 140, y + 52);

      doc.font('Helvetica').fillColor('#64748b').text('Payment Method:', 45, y + 72);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${payment.method.toUpperCase()} (${payment.source})`, 140, y + 72);

      doc.font('Helvetica').fillColor('#64748b').text('For Invoice:', 45, y + 92);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`Month ${payment.month}`, 140, y + 92);

      y += 130;
      doc.rect(30, y, 360, 40).fill('#f0fdf4').stroke('#bbf7d0');
      doc.fillColor('#15803d').fontSize(10).font('Helvetica-Bold').text('AMOUNT PAID:', 45, y + 14);
      doc.fontSize(16).text(fmt(payment.amount), 230, y + 10, { width: 150, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
