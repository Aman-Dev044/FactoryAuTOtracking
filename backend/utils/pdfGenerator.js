const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper to format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Helper to format currency
const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return `Rs. ${formatted}`;
};

// Draw general page header
const drawHeader = (doc, org, title) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  // Draw primary accent bar at top
  doc.rect(0, 0, 595.28, 15).fill(themeColor);
  
  // Left - Logo
  let logoPlaced = false;
  if (org.settings && org.settings.logo && org.settings.logo !== '/logo.png') {
    try {
      let relativePath = org.settings.logo;
      if (relativePath.includes('/uploads/')) {
        relativePath = relativePath.slice(relativePath.indexOf('/uploads/'));
      }
      const logoPath = path.join(__dirname, '../', relativePath);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 30, { fit: [120, 50] });
        logoPlaced = true;
      } else {
        console.error('PDF Logo path does not exist:', logoPath);
      }
    } catch (err) {
      console.error('PDF Logo placement failed:', err.message);
    }
  }
  
  if (!logoPlaced) {
    // Elegant fallback logo badge
    doc.circle(75, 55, 22).fill(themeColor);
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(org.name ? org.name.charAt(0).toUpperCase() : 'T', 50, 48, { width: 50, align: 'center' });
  }
  
  // Right - Org details
  doc.fillColor('#1f2937');
  doc.font('Helvetica-Bold').fontSize(14).text(org.name || 'TrackBells Enterprise', 200, 30, { align: 'right', width: 345 });
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
  doc.text((org.settings && org.settings.brandSubtitle) || 'Factory Automation', 200, 48, { align: 'right', width: 345 });
  if (org.address) {
    doc.text(org.address, 200, 60, { align: 'right', width: 345 });
  }
  let contactInfo = '';
  if (org.contactPhone) contactInfo += `Phone: ${org.contactPhone}`;
  if (org.contactEmail) contactInfo += (contactInfo ? ' | ' : '') + `Email: ${org.contactEmail}`;
  if (contactInfo) {
    doc.text(contactInfo, 200, 72, { align: 'right', width: 345 });
  }
  
  // Divider
  doc.moveTo(50, 95).lineTo(545.28, 95).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  // Document Title
  doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(16).text(title, 50, 110);
};

// Draw general page footer
const drawFooter = (doc, org) => {
  let footerText = (org.settings && org.settings.footerText) || 'Powered by TrackBells';
  if (footerText.includes('Cyberbells')) {
    footerText = footerText.replace(/Cyberbells ITES services pvt ltd/gi, 'TrackBells').replace(/Cyberbells/gi, 'TrackBells');
  }
  doc.moveTo(50, 765).lineTo(545.28, 765).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  doc.fillColor('#9ca3af').fontSize(8).font('Helvetica');
  doc.text(footerText, 50, 775, { width: 350 });
  doc.text('Authorized Signatory', 400, 775, { width: 145, align: 'right' });
};

/**
 * Generate Sales Order PDF dynamically
 */
exports.generateSalesOrderPDF = (doc, order, org) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  drawHeader(doc, org, 'SALES ORDER');
  
  // Client info
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('BILL TO / CLIENT:', 50, 150);
  
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12);
  const clientName = order.clientName || 'N/A';
  doc.text(clientName, 50, 165, { width: 230 });
  const clientNameHeight = doc.heightOfString(clientName, { width: 230 });
  
  let leftY = 165 + clientNameHeight + 5;
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('TrackBells Registered Client', 50, leftY, { width: 230 });
  leftY += 14;
  
  // Order meta
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('ORDER DETAILS:', 320, 150);
  
  const rightGridX = 320;
  const rightGridValX = 420;
  let rightY = 165;
  
  const addMetaRow = (label, val, bold = false) => {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(label, rightGridX, rightY);
    doc.fillColor('#1f2937').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(val, rightGridValX, rightY);
    rightY += 16;
  };
  
  addMetaRow('Order Number:', order.orderNumber, true);
  addMetaRow('Order Date:', formatDate(order.createdAt));
  addMetaRow('Delivery By:', formatDate(order.deliveryDate));
  addMetaRow('Status:', (order.status || 'PENDING').toUpperCase(), true);
  
  // Items Table starts dynamically below both columns
  currentY = Math.max(leftY, rightY) + 20;
  
  // Table Header
  doc.rect(50, currentY, 495.28, 24).fill(themeColor);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('Item / Model Number', 60, currentY + 7);
  doc.text('Description', 220, currentY + 7);
  doc.text('Quantity', 450, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Table Row 1
  doc.rect(50, currentY, 495.28, 24).fill('#f9fafb');
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
  doc.text(order.modelNumber, 60, currentY + 7);
  doc.text('Extruded Nylon / Assembly Chain Product', 220, currentY + 7);
  doc.text(`${order.orderQuantity} Meters`, 450, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Divider
  doc.moveTo(50, currentY + 10).lineTo(545.28, currentY + 10).strokeColor('#e5e7eb').lineWidth(1).stroke();
  currentY += 15;
  
  // Summary
  doc.fillColor('#4b5563').font('Helvetica').fontSize(10).text('Total Order Volume:', 320, currentY);
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12).text(`${order.orderQuantity} Meters`, 450, currentY, { align: 'right', width: 80 });
  
  // Note/T&C
  currentY += 50;
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9).text('Terms & Conditions:', 50, currentY);
  currentY += 14;
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text('1. This is a computer generated document and does not require a physical signature.', 50, currentY, { width: 495.28 });
  doc.text('2. Goods once manufactured according to the specifications are not subject to return.', 50, currentY + 12, { width: 495.28 });
  doc.text('3. Expected delivery date is subject to production capacity and raw material availability.', 50, currentY + 24, { width: 495.28 });
  
  drawFooter(doc, org);
};

/**
 * Generate Purchase Order PDF dynamically
 */
exports.generatePurchaseOrderPDF = (doc, po, org) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  drawHeader(doc, org, 'PURCHASE ORDER');
  
  // Vendor details
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('VENDOR / SUPPLIER:', 50, 150);
  
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12);
  const vendorName = po.vendorId?.vendorName || 'N/A';
  doc.text(vendorName, 50, 165, { width: 230 });
  const vendorNameHeight = doc.heightOfString(vendorName, { width: 230 });
  
  let leftY = 165 + vendorNameHeight + 5;
  let vendorGst = po.vendorId?.gstNumber ? `GSTIN: ${po.vendorId.gstNumber}` : 'GSTIN: Not Provided';
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(vendorGst, 50, leftY, { width: 230 });
  leftY += 14;
  doc.text(`Primary Product: ${po.vendorId?.materialSupplied || 'Raw Materials'}`, 50, leftY, { width: 230 });
  leftY += 14;
  
  // PO meta
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text('PURCHASE ORDER DETAILS:', 320, 150);
  
  const rightGridX = 320;
  const rightGridValX = 420;
  let rightY = 165;
  
  const addMetaRow = (label, val, bold = false) => {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(label, rightGridX, rightY);
    doc.fillColor('#1f2937').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).text(val, rightGridValX, rightY);
    rightY += 16;
  };
  
  addMetaRow('PO Number:', po.poNumber || 'N/A', true);
  addMetaRow('PO Date:', formatDate(po.createdAt));
  addMetaRow('Status:', (po.status || 'PENDING').toUpperCase(), true);
  
  // Table starts dynamically below both columns
  currentY = Math.max(leftY, rightY) + 20;
  
  // Table Header
  doc.rect(50, currentY, 495.28, 24).fill(themeColor);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('Material / Description', 60, currentY + 7);
  doc.text('Quantity (kg)', 250, currentY + 7, { align: 'right', width: 80 });
  doc.text('Rate / kg', 350, currentY + 7, { align: 'right', width: 80 });
  doc.text('Total Amount', 450, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Table Row 1
  doc.rect(50, currentY, 495.28, 24).fill('#f9fafb');
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9);
  doc.text(`${po.materialType} Raw Material`, 60, currentY + 7);
  doc.text(`${po.quantityKg} kg`, 250, currentY + 7, { align: 'right', width: 80 });
  doc.text(formatCurrency(po.ratePerKg), 350, currentY + 7, { align: 'right', width: 80 });
  doc.text(formatCurrency(po.totalAmount), 450, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Divider
  doc.moveTo(50, currentY + 10).lineTo(545.28, currentY + 10).strokeColor('#e5e7eb').lineWidth(1).stroke();
  currentY += 15;
  
  // Summary
  const summaryX = 350;
  const summaryValX = 450;
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('Subtotal:', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(po.totalAmount), summaryValX, currentY, { align: 'right', width: 80 });
  currentY += 16;
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('Tax (0%):', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(0), summaryValX, currentY, { align: 'right', width: 80 });
  currentY += 18;
  
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(10).text('Grand Total:', summaryX, currentY);
  doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(11).text(formatCurrency(po.totalAmount), summaryValX, currentY - 1, { align: 'right', width: 80 });
  
  // Note/T&C
  currentY += 60;
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9).text('Terms & Conditions:', 50, currentY);
  currentY += 14;
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text('1. Material delivery must align with the requested parameters and quality norms.', 50, currentY, { width: 495.28 });
  doc.text('2. Please supply the invoice mentioning this Purchase Order Number during dispatch.', 50, currentY + 12, { width: 495.28 });
  doc.text('3. Payment will be processed after quantity validation and quality check approval.', 50, currentY + 24, { width: 495.28 });
  
  drawFooter(doc, org);
};

/**
 * Generate Sales Invoice / Delivery Challan PDF dynamically
 */
exports.generateSalesInvoicePDF = (doc, invoice, org) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  const isChallan = invoice.documentType === 'delivery_challan' || Boolean(invoice.challanNumber);
  const isNonGST = invoice.documentType === 'non_gst_bill' || Boolean(invoice.isNonGST);

  const docTitle = isChallan
    ? 'DELIVERY CHALLAN / DELIVERY NOTE'
    : isNonGST
    ? 'INVOICE / BILL (NON-GST)'
    : 'TAX INVOICE';
  
  drawHeader(doc, org, docTitle);

  // Client details
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text(isChallan ? 'CONSIGNEE / DELIVER TO:' : 'BILL TO / CLIENT:', 50, 135);
  
  let clientDetailsY = 150;
  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(12);
  const clientName = invoice.clientName || 'N/A';
  doc.text(clientName, 50, clientDetailsY, { width: 230 });
  const clientNameHeight = doc.heightOfString(clientName, { width: 230 });
  clientDetailsY += clientNameHeight + 5;
  
  if (invoice.clientAddress) {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9);
    doc.text(invoice.clientAddress, 50, clientDetailsY, { width: 230 });
    const clientAddressHeight = doc.heightOfString(invoice.clientAddress, { width: 230 });
    clientDetailsY += clientAddressHeight + 5;
  }
  if (invoice.clientGST) {
    doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9);
    const clientGSTText = `GSTIN: ${invoice.clientGST}`;
    doc.text(clientGSTText, 50, clientDetailsY, { width: 230 });
    const clientGSTHeight = doc.heightOfString(clientGSTText, { width: 230 });
    clientDetailsY += clientGSTHeight + 5;
  }
  
  // Invoice / Challan meta (Aligned to the right)
  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(9).text(isChallan ? 'CHALLAN DETAILS:' : 'INVOICE DETAILS:', 300, 135, { align: 'right', width: 245 });
  
  let rightColumnY = 150;
  
  const addMetaRow = (label, val, bold = false) => {
    if (!val) return;
    const valFont = bold ? 'Helvetica-Bold' : 'Helvetica';
    doc.font(valFont).fontSize(9);
    const valWidth = doc.widthOfString(String(val));
    
    // Draw the value right-aligned at X=545
    doc.fillColor('#1f2937').text(String(val), 545 - valWidth, rightColumnY);
    
    // Draw the label right-aligned directly to the left of the value (leaving 6px gap)
    doc.font('Helvetica').fillColor('#4b5563').text(label, 300, rightColumnY, { align: 'right', width: 245 - valWidth - 6 });
    rightColumnY += 16;
  };
  
  if (isChallan) {
    addMetaRow('Challan Number:', invoice.challanNumber || invoice.invoiceNumber || 'N/A', true);
    addMetaRow('Dispatch Date:', formatDate(invoice.dispatchDate || invoice.invoiceDate));
    if (invoice.vehicleNumber) addMetaRow('Vehicle Number:', invoice.vehicleNumber, true);
    if (invoice.transporter) addMetaRow('Transporter:', invoice.transporter);
    if (invoice.challanReason) addMetaRow('Supply Purpose:', invoice.challanReason);
  } else {
    addMetaRow('Invoice Number:', invoice.invoiceNumber || 'N/A', true);
    addMetaRow('Invoice Date:', formatDate(invoice.invoiceDate));
    if (invoice.dueDate) {
      addMetaRow('Due Date:', formatDate(invoice.dueDate));
    }
  }
  
  // Table starts below both columns dynamically
  let currentY = Math.max(clientDetailsY, rightColumnY) + 20;
  
  // Table Header
  doc.rect(50, currentY, 495.28, 24).fill(themeColor);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('S.No', 55, currentY + 7);
  doc.text('Item Description', 90, currentY + 7);
  doc.text('Qty', 270, currentY + 7, { align: 'right', width: 40 });
  doc.text('Rate', 320, currentY + 7, { align: 'right', width: 60 });
  doc.text('GST %', 390, currentY + 7, { align: 'right', width: 40 });
  doc.text('Total (INR)', 445, currentY + 7, { align: 'right', width: 100 });
  
  currentY += 24;
  
  // Table Rows
  (invoice.items || []).forEach((item, idx) => {
    doc.font('Helvetica').fontSize(9);
    const descHeight = doc.heightOfString(item.description || 'N/A', { width: 175 });
    const rowHeight = Math.max(22, descHeight + 12);
    
    // Zebra striping
    if (idx % 2 === 0) {
      doc.rect(50, currentY, 495.28, rowHeight).fill('#f9fafb');
    }
    
    doc.fillColor('#1f2937');
    const textY = currentY + (rowHeight - 9) / 2;
    doc.text(String(idx + 1), 55, textY);
    doc.text(item.description || 'N/A', 90, textY, { width: 175 });
    doc.text(String(item.quantity), 270, textY, { align: 'right', width: 40 });
    doc.text(formatCurrency(item.rate).replace('Rs.', '').replace('₹', '').trim(), 320, textY, { align: 'right', width: 60 });
    doc.text(`${item.taxRate || 18}%`, 390, textY, { align: 'right', width: 40 });
    doc.text(formatCurrency(item.amount).replace('Rs.', '').replace('₹', '').trim(), 445, textY, { align: 'right', width: 100 });
    
    currentY += rowHeight;
  });
  
  // Divider
  doc.moveTo(50, currentY + 5).lineTo(545.28, currentY + 5).strokeColor('#e5e7eb').lineWidth(1).stroke();
  currentY += 5;
  
  // Summary
  const summaryX = 350;
  const summaryValX = 445;
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('Subtotal:', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(invoice.subtotal), summaryValX, currentY, { align: 'right', width: 100 });
  currentY += 16;

  if (invoice.discountAmount && invoice.discountAmount > 0) {
    doc.fillColor('#dc2626').font('Helvetica').fontSize(9).text('Discount (-):', summaryX, currentY);
    doc.fillColor('#dc2626').font('Helvetica').fontSize(9).text(`- ${formatCurrency(invoice.discountAmount)}`, summaryValX, currentY, { align: 'right', width: 100 });
    currentY += 16;
  }
  
  if (invoice.isNonGST) {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('GST Tax (Non-GST Bill):', summaryX, currentY);
    doc.fillColor('#107c41').font('Helvetica-Bold').fontSize(9).text('₹0.00 (Exempt)', summaryValX, currentY, { align: 'right', width: 100 });
    currentY += 18;
  } else {
    doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('GST Tax Amount:', summaryX, currentY);
    doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(invoice.taxAmount), summaryValX, currentY, { align: 'right', width: 100 });
    currentY += 18;
  }

  
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(10).text('Grand Total:', summaryX, currentY);
  doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(11).text(formatCurrency(invoice.grandTotal), summaryValX, currentY - 1, { align: 'right', width: 100 });

  
  // Note/T&C
  currentY += 30;
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9).text('Notes:', 50, currentY);
  currentY += 14;
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text(invoice.notes || 'Thank you for your business!', 50, currentY, { width: 495.28 });
  
  currentY += 18;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280').text('Terms & Conditions:', 50, currentY);
  doc.font('Helvetica').fontSize(7).fillColor('#9ca3af');
  doc.text('1. Payment is due within the stipulated time frame.', 50, currentY + 12, { width: 495.28 });
  doc.text('2. Interest of 18% p.a. will be charged for payments delayed beyond the due date.', 50, currentY + 20, { width: 495.28 });
  
  // Resolve footer text from org, sanitizing Cyberbells if present
  let footerText = (org.settings && org.settings.footerText) || 'Powered by TrackBells';
  if (footerText.includes('Cyberbells')) {
    footerText = footerText.replace(/Cyberbells ITES services pvt ltd/gi, 'TrackBells').replace(/Cyberbells/gi, 'TrackBells');
  }

  // Draw Dynamic Footer immediately below terms
  currentY += 45;
  doc.moveTo(50, currentY).lineTo(545.28, currentY).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  currentY += 10;
  doc.fillColor('#9ca3af').fontSize(8).font('Helvetica');
  doc.text(footerText, 50, currentY, { width: 350 });
  doc.text('Authorized Signatory', 400, currentY, { width: 145, align: 'right' });
};

/**
 * Generate Purchase Order PDF dynamically
 */
exports.generatePurchaseOrderPDF = (doc, po, org) => {
  const themeColor = (org.settings && org.settings.themeColor) || '#1e3a8a';
  
  drawHeader(doc, org, 'PURCHASE ORDER (PO)');
  
  // Left Column - Vendor Details
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1f2937').text('VENDOR DETAILS (SUPPLIER)', 50, 130);
  
  let vendorY = 150;
  const addVendorLine = (label, val, bold = false) => {
    if (!val) return;
    doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(label, 50, vendorY);
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#1f2937').text(val, 140, vendorY, { width: 160 });
    vendorY += Math.max(16, doc.heightOfString(val, { width: 160 }) + 3);
  };
  
  const vendor = po.vendorId || {};
  addVendorLine('Vendor Name:', po.vendorName || vendor.vendorName || 'N/A', true);
  if (po.vendorCode || vendor.vendorCode) {
    addVendorLine('Vendor Code:', po.vendorCode || vendor.vendorCode, true);
  }
  addVendorLine('Contact Person:', vendor.contactPerson || 'N/A');
  addVendorLine('Phone:', vendor.phone || 'N/A');
  addVendorLine('Email:', vendor.email || 'N/A');
  addVendorLine('GSTIN:', po.vendorGst || vendor.gstNumber || 'N/A');
  addVendorLine('Address:', po.vendorAddress || vendor.address || 'N/A');

  // Right Column - PO Meta
  let rightColumnY = 150;
  const addMetaRow = (label, val, bold = false) => {
    const valFont = bold ? 'Helvetica-Bold' : 'Helvetica';
    doc.font(valFont).fontSize(9);
    const valWidth = doc.widthOfString(val || 'N/A');
    
    doc.fillColor('#1f2937').text(val || 'N/A', 545 - valWidth, rightColumnY);
    doc.font('Helvetica').fillColor('#4b5563').text(label, 300, rightColumnY, { align: 'right', width: 245 - valWidth - 6 });
    rightColumnY += 16;
  };
  
  addMetaRow('PO Number:', po.poNumber || 'N/A', true);
  addMetaRow('PO Date:', formatDate(po.orderDate || po.createdAt));
  if (po.expectedDeliveryDate) {
    addMetaRow('Delivery Due:', formatDate(po.expectedDeliveryDate));
  }
  if (po.quotationNumber) {
    addMetaRow('Quotation Ref:', po.quotationNumber);
  }
  addMetaRow('Payment Terms:', po.paymentTerms || '30 Days Net');
  addMetaRow('Delivery Terms:', po.deliveryTerms || 'Factory Gate');
  
  let currentY = Math.max(vendorY, rightColumnY) + 20;
  
  // Table Header
  doc.rect(50, currentY, 495.28, 24).fill(themeColor);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('S.No', 55, currentY + 7);
  doc.text('Material / Item Description', 90, currentY + 7);
  doc.text('Qty', 270, currentY + 7, { align: 'right', width: 40 });
  doc.text('Unit', 315, currentY + 7, { align: 'left', width: 35 });
  doc.text('Rate (INR)', 355, currentY + 7, { align: 'right', width: 60 });
  doc.text('GST %', 420, currentY + 7, { align: 'right', width: 35 });
  doc.text('Total (INR)', 465, currentY + 7, { align: 'right', width: 80 });
  
  currentY += 24;
  
  // Table Items
  const items = po.items && po.items.length > 0 ? po.items : [{
    description: po.materialType || 'Material Supply',
    quantity: po.quantityKg || 1,
    unit: 'kg',
    rate: po.ratePerKg || po.totalAmount || 0,
    gstRate: 18,
    amount: po.totalAmount || 0
  }];

  items.forEach((item, idx) => {
    doc.font('Helvetica').fontSize(9);
    const desc = item.description || item.materialType || 'N/A';
    const descHeight = doc.heightOfString(desc, { width: 175 });
    const rowHeight = Math.max(22, descHeight + 12);
    
    if (idx % 2 === 0) {
      doc.rect(50, currentY, 495.28, rowHeight).fill('#f9fafb');
    }
    
    doc.fillColor('#1f2937');
    const textY = currentY + (rowHeight - 9) / 2;
    doc.text(String(idx + 1), 55, textY);
    doc.text(desc, 90, textY, { width: 175 });
    doc.text(String(item.quantity || item.quantityKg || 0), 270, textY, { align: 'right', width: 40 });
    doc.text(item.unit || 'kg', 315, textY, { align: 'left', width: 35 });
    doc.text(formatCurrency(item.rate || item.ratePerKg || 0).replace('Rs.', '').replace('₹', '').trim(), 355, textY, { align: 'right', width: 60 });
    doc.text(`${item.gstRate || 18}%`, 420, textY, { align: 'right', width: 35 });
    doc.text(formatCurrency(item.amount || item.totalAmount || (item.quantity * item.rate) || 0).replace('Rs.', '').replace('₹', '').trim(), 465, textY, { align: 'right', width: 80 });
    
    currentY += rowHeight;
  });
  
  doc.moveTo(50, currentY + 5).lineTo(545.28, currentY + 5).strokeColor('#e5e7eb').lineWidth(1).stroke();
  currentY += 5;
  
  // Summary
  const summaryX = 350;
  const summaryValX = 445;
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('Subtotal:', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(po.subTotal || po.totalAmount || 0), summaryValX, currentY, { align: 'right', width: 100 });
  currentY += 16;

  if (po.discountAmount && po.discountAmount > 0) {
    doc.fillColor('#dc2626').font('Helvetica').fontSize(9).text('Discount (-):', summaryX, currentY);
    doc.fillColor('#dc2626').font('Helvetica').fontSize(9).text(`- ${formatCurrency(po.discountAmount)}`, summaryValX, currentY, { align: 'right', width: 100 });
    currentY += 16;
  }
  
  doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text('GST Tax Amount (18%):', summaryX, currentY);
  doc.fillColor('#1f2937').font('Helvetica').fontSize(9).text(formatCurrency(po.gstAmount || ((po.subTotal || po.totalAmount || 0) * 0.18)), summaryValX, currentY, { align: 'right', width: 100 });
  currentY += 18;

  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(10).text('Grand Total:', summaryX, currentY);
  doc.fillColor(themeColor).font('Helvetica-Bold').fontSize(11).text(formatCurrency(po.grandTotal || po.totalAmount || 0), summaryValX, currentY - 1, { align: 'right', width: 100 });

  // PO Terms & Conditions
  currentY += 30;
  doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9).text('PO Instructions & Terms:', 50, currentY);
  currentY += 14;
  doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
  doc.text(po.notes || 'Goods must match quality specifications. Submit delivery challan and tax invoice at factory gate.', 50, currentY, { width: 495.28 });
  
  currentY += 18;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280').text('Standard Procurement Terms:', 50, currentY);
  doc.font('Helvetica').fontSize(7).fillColor('#9ca3af');
  doc.text('1. Material delivery is subject to inspection and quality approval at our factory gate.', 50, currentY + 12, { width: 495.28 });
  doc.text('2. Please mention the PO Number on all delivery challans, invoices, and shipping packages.', 50, currentY + 20, { width: 495.28 });
  
  let footerText = (org.settings && org.settings.footerText) || 'Powered by TrackBells ERP';
  if (footerText.includes('Cyberbells')) {
    footerText = footerText.replace(/Cyberbells ITES services pvt ltd/gi, 'TrackBells').replace(/Cyberbells/gi, 'TrackBells');
  }

  currentY += 45;
  doc.moveTo(50, currentY).lineTo(545.28, currentY).strokeColor('#e5e7eb').lineWidth(1).stroke();
  
  currentY += 10;
  doc.fillColor('#9ca3af').fontSize(8).font('Helvetica');
  doc.text(footerText, 50, currentY, { width: 350 });
  doc.text('Purchase Manager / Signatory', 380, currentY, { width: 165, align: 'right' });
};
