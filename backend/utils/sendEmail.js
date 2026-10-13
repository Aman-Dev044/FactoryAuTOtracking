const nodemailer = require('nodemailer');
const Organization = require('../models/Organization');
const User = require('../models/User');

const sendEmail = async ({ to, subject, html, orgId }) => {
  // 1. Fetch organization settings
  let settings = {
    brandName: 'TrackBells ERP',
    brandSubtitle: 'Factory Automation',
    themeColor: '#f97316',
    footerText: 'Powered by Cyberbells ITES services pvt ltd',
    logo: '🏭'
  };

  try {
    let targetOrgId = orgId;
    if (!targetOrgId && to) {
      // Find user by email to determine organization
      const user = await User.findOne({ email: to.toLowerCase() });
      if (user && user.organizationId) {
        targetOrgId = user.organizationId;
      }
    }

    if (targetOrgId) {
      const org = await Organization.findById(targetOrgId);
      if (org && org.settings) {
        settings = {
          brandName: org.settings.brandName || settings.brandName,
          brandSubtitle: org.settings.brandSubtitle || settings.brandSubtitle,
          themeColor: org.settings.themeColor || settings.themeColor,
          footerText: org.settings.footerText || settings.footerText,
          logo: org.settings.logo || settings.logo
        };
      }
    }
  } catch (err) {
    console.error('Failed to resolve dynamic email branding, using default.', err);
  }

  // Replace default branding elements in the HTML template dynamically
  let formattedHtml = html;
  if (formattedHtml) {
    formattedHtml = formattedHtml.replace(/Welcome to TrackBells ERP/g, `Welcome to ${settings.brandName}`);
    formattedHtml = formattedHtml.replace(/TrackBells ERP —/g, `${settings.brandName} —`);
    formattedHtml = formattedHtml.replace(/TrackBells ERP/g, settings.brandName);
    formattedHtml = formattedHtml.replace(/Factory Automation System/g, settings.brandSubtitle);
    formattedHtml = formattedHtml.replace(/TrackBells ERP System/g, settings.brandSubtitle);
    
    // Replace logo emoji and its container
    let logoHtml = '<span style="font-size:32px;">🏭</span>';
    let logoContainerStyle = 'width:70px;height:70px;background:linear-gradient(135deg,#3b82f6,#a855f7);border-radius:18px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;';

    if (settings.logo && (settings.logo.startsWith('/') || settings.logo.startsWith('http'))) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://49.13.70.253:5455';
      const absoluteLogoUrl = settings.logo.startsWith('/') ? `${frontendUrl}${settings.logo}` : settings.logo;
      logoHtml = `<img src="${absoluteLogoUrl}" alt="Logo" style="max-height:48px;max-width:180px;object-fit:contain;" />`;
      logoContainerStyle = 'margin:0 auto 24px;display:flex;align-items:center;justify-content:center;min-height:50px;';
    }

    formattedHtml = formattedHtml.replace(/width:70px;height:70px;background:linear-gradient\(135deg,#3b82f6,#a855f7\);border-radius:18px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;/g, logoContainerStyle);
    formattedHtml = formattedHtml.replace(/<span style="font-size:32px;">🏭<\/span>/g, logoHtml);

    // Replace footer
    formattedHtml = formattedHtml.replace(/Powered by Cyberbells ITES services pvt ltd/g, settings.footerText);

    // Replace colors (e.g. #3b82f6, #2563eb, #f97316, #ea580c) with settings.themeColor
    formattedHtml = formattedHtml.replace(/#3b82f6/g, settings.themeColor);
    formattedHtml = formattedHtml.replace(/#2563eb/g, settings.themeColor);
    formattedHtml = formattedHtml.replace(/#f97316/g, settings.themeColor);
    formattedHtml = formattedHtml.replace(/#ea580c/g, settings.themeColor);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"${settings.brandName}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: subject.replace(/TrackBells ERP/g, settings.brandName),
    html: formattedHtml
  };

  await transporter.sendMail(mailOptions);
};

// Beautiful HTML email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to TrackBells ERP — Factory Automation',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:linear-gradient(145deg,#1a1f3a,#0d1525);border:1px solid rgba(59,130,246,0.2);border-radius:20px;padding:40px;text-align:center;">
            <div style="width:70px;height:70px;background:linear-gradient(135deg,#3b82f6,#a855f7);border-radius:18px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px;">🏭</span>
            </div>
            <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Welcome to TrackBells ERP</h1>
            <p style="color:#3b82f6;font-size:14px;margin:0 0 30px;letter-spacing:2px;text-transform:uppercase;">Factory Automation System</p>
            <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);border-radius:12px;padding:24px;margin-bottom:30px;text-align:left;">
              <p style="color:#e0e6f0;font-size:16px;margin:0 0 10px;">Hello <strong style="color:#93b4f5;">${name}</strong>,</p>
              <p style="color:#8892b0;font-size:14px;line-height:1.8;margin:0;">
                Your account has been created successfully! You can now access the TrackBells ERP system to manage production, track inventory, monitor quality control, and much more.
              </p>
            </div>
            <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;letter-spacing:1px;">
              LOGIN TO DASHBOARD →
            </a>
            <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#4a5578;font-size:12px;margin:0;">TrackBells ERP — Powered by Cyberbells ITES services pvt ltd</p>
              <p style="color:#4a5578;font-size:11px;margin:4px 0 0;">Integrated. Intelligent. Reliable.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  resetPassword: (name, resetUrl) => ({
    subject: 'TrackBells ERP — Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:linear-gradient(145deg,#1a1f3a,#0d1525);border:1px solid rgba(249,115,22,0.2);border-radius:20px;padding:40px;text-align:center;">
            <div style="width:70px;height:70px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:18px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px;">🔐</span>
            </div>
            <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Password Reset</h1>
            <p style="color:#f97316;font-size:14px;margin:0 0 30px;letter-spacing:2px;text-transform:uppercase;">TrackBells ERP System</p>
            <div style="background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.15);border-radius:12px;padding:24px;margin-bottom:30px;text-align:left;">
              <p style="color:#e0e6f0;font-size:16px;margin:0 0 10px;">Hello <strong style="color:#fb923c;">${name}</strong>,</p>
              <p style="color:#8892b0;font-size:14px;line-height:1.8;margin:0 0 15px;">
                We received a request to reset your password. Click the button below to set a new password. This link is valid for <strong style="color:#fb923c;">15 minutes</strong>.
              </p>
              <p style="color:#6b7a99;font-size:13px;line-height:1.6;margin:0;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </div>
            <a href="${resetUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;letter-spacing:1px;">
              RESET MY PASSWORD →
            </a>
            <p style="color:#4a5578;font-size:12px;margin:20px 0 0;">
              Or copy this link: <br/>
              <span style="color:#6b7a99;word-break:break-all;font-size:11px;">${resetUrl}</span>
            </p>
            <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#4a5578;font-size:12px;margin:0;">TrackBells ERP — Powered by Cyberbells ITES services pvt ltd</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  dispatchNotification: (dispatch, frontendUrl = process.env.FRONTEND_URL || 'http://49.13.70.253:5455') => {
    const stageTitles = {
      assemble: '🔧 Assembly in Progress',
      packing: '📦 Order Packed & Ready',
      dispatched: '🚚 Order Dispatched & In Transit',
      hold: '⏸️ Order on Hold'
    };

    const resolveUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      const apiBase = process.env.API_URL || `${frontendUrl}/api`;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `${apiBase}${cleanPath}`.replace(/\/api\/api\//, '/api/');
    };

    const statusTitle = stageTitles[dispatch.status] || 'Order Status Update';
    const itemsHtml = (dispatch.items || []).map(it => `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="padding:10px;color:#e0e6f0;font-size:13px;font-weight:600;">${it.modelNumber || it.description || 'Product Item'}</td>
        <td style="padding:10px;color:#8892b0;font-size:13px;text-align:right;">${it.quantity} ${it.unit || 'meters'}</td>
      </tr>
    `).join('');

    // Proof Attachments
    const proofs = [];
    if (dispatch.assemblyMediaUrl) {
      proofs.push(`<a href="${resolveUrl(dispatch.assemblyMediaUrl)}" target="_blank" style="display:inline-block;padding:8px 14px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid #f59e0b;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;margin:4px;">🔧 Assembly Photo/Video</a>`);
    }
    if (dispatch.packingMediaUrl) {
      proofs.push(`<a href="${resolveUrl(dispatch.packingMediaUrl)}" target="_blank" style="display:inline-block;padding:8px 14px;background:rgba(59,130,246,0.15);color:#3b82f6;border:1px solid #3b82f6;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;margin:4px;">📦 Packaging Photo/Video</a>`);
    }
    if (dispatch.dispatchMediaUrl) {
      proofs.push(`<a href="${resolveUrl(dispatch.dispatchMediaUrl)}" target="_blank" style="display:inline-block;padding:8px 14px;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid #22c55e;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;margin:4px;">🚚 Dispatch Vehicle Photo/Video</a>`);
    }
    if (dispatch.billingInvoiceUrl) {
      proofs.push(`<a href="${resolveUrl(dispatch.billingInvoiceUrl)}" target="_blank" style="display:inline-block;padding:8px 14px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid #10b981;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;margin:4px;">🧾 Tax Invoice / Bill Document</a>`);
    }
    if (dispatch.lrCopyUrl) {
      proofs.push(`<a href="${resolveUrl(dispatch.lrCopyUrl)}" target="_blank" style="display:inline-block;padding:8px 14px;background:rgba(168,85,247,0.15);color:#a855f7;border:1px solid #a855f7;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;margin:4px;">📄 LR Copy Document</a>`);
    }

    return {
      subject: `${statusTitle} — SO: ${dispatch.salesOrderRef || dispatch.customerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <div style="max-width:620px;margin:0 auto;padding:30px 15px;">
            <div style="background:linear-gradient(145deg,#1a1f3a,#0d1525);border:1px solid rgba(249,115,22,0.25);border-radius:20px;padding:32px;text-align:left;">
              
              <div style="text-align:center;margin-bottom:24px;">
                <div style="width:64px;height:64px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:28px;">📦</span>
                </div>
                <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;">${statusTitle}</h1>
                <p style="color:#f97316;font-size:13px;margin:0;letter-spacing:1.5px;text-transform:uppercase;">TrackBells Factory Dispatch & Logistics</p>
              </div>

              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;margin-bottom:20px;">
                <p style="color:#e0e6f0;font-size:15px;margin:0 0 8px;">Dear <strong style="color:#fb923c;">${dispatch.customerName}</strong>,</p>
                <p style="color:#8892b0;font-size:13.5px;line-height:1.6;margin:0;">
                  We are pleased to inform you that your order status has been updated in our system. Here are the latest order, packing, and dispatch details:
                </p>
              </div>

              <!-- Order Summary -->
              <div style="background:rgba(249,115,22,0.04);border:1px solid rgba(249,115,22,0.15);border-radius:12px;padding:18px;margin-bottom:20px;">
                <h3 style="color:#fb923c;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">📋 Order Information</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
                  <div><span style="color:#6b7a99;">Sales Order Ref:</span> <strong style="color:#ffffff;">${dispatch.salesOrderRef || 'N/A'}</strong></div>
                  <div><span style="color:#6b7a99;">Current Status:</span> <strong style="color:#22c55e;text-transform:capitalize;">${dispatch.status}</strong></div>
                  ${dispatch.totalBoxes ? `<div><span style="color:#6b7a99;">Box Count:</span> <strong style="color:#ffffff;">${dispatch.totalBoxes} Boxes</strong></div>` : ''}
                  ${dispatch.totalWeight ? `<div><span style="color:#6b7a99;">Total Weight:</span> <strong style="color:#ffffff;">${dispatch.totalWeight}</strong></div>` : ''}
                </div>
              </div>

              <!-- Items Table -->
              ${itemsHtml ? `
                <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin-bottom:20px;">
                  <h3 style="color:#ffffff;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;">📦 Dispatched Items</h3>
                  <table style="width:100%;border-collapse:collapse;">
                    <thead>
                      <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                        <th style="padding:8px 10px;text-align:left;color:#6b7a99;font-size:12px;">Item / Model</th>
                        <th style="padding:8px 10px;text-align:right;color:#6b7a99;font-size:12px;">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>
                </div>
              ` : ''}

              <!-- Logistics & Billing Details -->
              ${(dispatch.courier || dispatch.lrNumber || dispatch.invoiceNumber) ? `
                <div style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:18px;margin-bottom:20px;">
                  <h3 style="color:#60a5fa;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">🚚 Logistics & Billing Details</h3>
                  <div style="font-size:13px;line-height:1.8;">
                    ${dispatch.courier ? `<div><span style="color:#6b7a99;">Courier / Transporter:</span> <strong style="color:#ffffff;">${dispatch.courier}</strong></div>` : ''}
                    ${dispatch.trackingNumber ? `<div><span style="color:#6b7a99;">AWB / Tracking No:</span> <strong style="color:#ffffff;">${dispatch.trackingNumber}</strong></div>` : ''}
                    ${dispatch.lrNumber ? `<div><span style="color:#6b7a99;">LR Number (Lorry Receipt):</span> <strong style="color:#60a5fa;">${dispatch.lrNumber}</strong></div>` : ''}
                    ${dispatch.invoiceNumber ? `<div><span style="color:#6b7a99;">Tax Invoice No:</span> <strong style="color:#10b981;">#${dispatch.invoiceNumber}</strong></div>` : ''}
                    ${dispatch.invoiceAmount ? `<div><span style="color:#6b7a99;">Invoice Amount:</span> <strong style="color:#10b981;">₹${Number(dispatch.invoiceAmount).toLocaleString()}</strong></div>` : ''}
                  </div>
                </div>
              ` : ''}

              <!-- Proof Attachments (Photos/Videos/Documents) -->
              ${proofs.length > 0 ? `
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;margin-bottom:20px;text-align:center;">
                  <h3 style="color:#ffffff;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">📎 Photos, Videos & Attached Documents</h3>
                  <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">
                    ${proofs.join('')}
                  </div>
                </div>
              ` : ''}

              <div style="margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                <p style="color:#4a5578;font-size:12px;margin:0;">TrackBells ERP — Factory Automation System</p>
                <p style="color:#4a5578;font-size:11px;margin:4px 0 0;">Powered by Cyberbells ITES services pvt ltd</p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `
    };
  },

  outwardGateNotificationToAccounts: (entry, frontendUrl = process.env.FRONTEND_URL || 'http://49.13.70.253:5455') => {
    const resolveUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      const apiBase = process.env.API_URL || `${frontendUrl}/api`;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `${apiBase}${cleanPath}`.replace(/\/api\/api\//, '/api/');
    };

    const proofs = [];
    if (entry.materialPhotoUrl) {
      proofs.push(`<a href="${resolveUrl(entry.materialPhotoUrl)}" target="_blank" style="display:inline-block;padding:10px 16px;background:rgba(59,130,246,0.15);color:#3b82f6;border:1px solid #3b82f6;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;margin:4px;">📸 View Material / Vehicle Photo</a>`);
    }
    if (entry.thirdBillPhotoUrl) {
      proofs.push(`<a href="${resolveUrl(entry.thirdBillPhotoUrl)}" target="_blank" style="display:inline-block;padding:10px 16px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid #10b981;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;margin:4px;">🧾 View 3rd Bill / Gate Copy Photo</a>`);
    }
    if (entry.invoiceUrl) {
      proofs.push(`<a href="${resolveUrl(entry.invoiceUrl)}" target="_blank" style="display:inline-block;padding:10px 16px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid #f59e0b;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;margin:4px;">📄 View Gate Pass / Invoice Doc</a>`);
    }

    return {
      subject: `🚨 Gate Outward Alert: Finished Goods Dispatched — Bill #${entry.billNumber || 'N/A'} [${entry.vehicleNumber || 'Vehicle'}]`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <div style="max-width:620px;margin:0 auto;padding:30px 15px;">
            <div style="background:linear-gradient(145deg,#1a1f3a,#0d1525);border:1px solid rgba(59,130,246,0.25);border-radius:20px;padding:32px;text-align:left;">
              
              <div style="text-align:center;margin-bottom:24px;">
                <div style="width:64px;height:64px;background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:28px;">🚚</span>
                </div>
                <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px;">Outward Gate Pass Alert</h1>
                <p style="color:#3b82f6;font-size:13px;margin:0;letter-spacing:1.5px;text-transform:uppercase;">Finished Goods Dispatched via Gate Guard</p>
              </div>

              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;margin-bottom:20px;">
                <p style="color:#e0e6f0;font-size:14px;line-height:1.6;margin:0;">
                  This is an automated dispatch notification for the <strong>Accounts & Finance Team</strong>. A finished good shipment has just been verified and cleared through the factory gate.
                </p>
              </div>

              <!-- Vehicle & Driver Details -->
              <div style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:18px;margin-bottom:20px;">
                <h3 style="color:#60a5fa;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">🚛 Vehicle & Driver Details</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
                  <div><span style="color:#6b7a99;">Vehicle Number:</span> <strong style="color:#ffffff;font-size:14px;">${entry.vehicleNumber || 'N/A'}</strong></div>
                  <div><span style="color:#6b7a99;">Exit Timing:</span> <strong style="color:#10b981;">${entry.exitTiming || 'N/A'}</strong></div>
                  <div><span style="color:#6b7a99;">Driver Name:</span> <strong style="color:#ffffff;">${entry.driverName || 'N/A'}</strong></div>
                  <div><span style="color:#6b7a99;">Driver Phone:</span> <strong style="color:#60a5fa;">${entry.driverPhone ? `📞 ${entry.driverPhone}` : 'N/A'}</strong></div>
                </div>
              </div>

              <!-- Shipment & Bill Details -->
              <div style="background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:18px;margin-bottom:20px;">
                <h3 style="color:#10b981;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">📋 Shipment & Bill Information</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
                  <div><span style="color:#6b7a99;">Challan / Bill No:</span> <strong style="color:#10b981;font-size:14px;">${entry.billNumber || 'N/A'}</strong></div>
                  <div><span style="color:#6b7a99;">Customer / Destination:</span> <strong style="color:#ffffff;">${entry.vendorName || 'N/A'}</strong></div>
                  <div><span style="color:#6b7a99;">Material:</span> <strong style="color:#ffffff;">${entry.materialType || 'Finished Good'}</strong></div>
                  <div><span style="color:#6b7a99;">Quantity:</span> <strong style="color:#ffffff;">${entry.quantity || 0} ${entry.unit || 'pcs'}</strong></div>
                  ${entry.remarks ? `<div style="grid-column:1/3;"><span style="color:#6b7a99;">Remarks:</span> <span style="color:#e0e6f0;">${entry.remarks}</span></div>` : ''}
                </div>
              </div>

              <!-- Photo Proofs (Material + 3rd Bill Copy) -->
              ${proofs.length > 0 ? `
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;margin-bottom:20px;text-align:center;">
                  <h3 style="color:#ffffff;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">📸 Photo Proofs & Document Attachments</h3>
                  <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;">
                    ${proofs.join('')}
                  </div>
                </div>
              ` : ''}

              <div style="margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
                <p style="color:#4a5578;font-size:12px;margin:0;">TrackBells ERP — Security Gate Operations</p>
                <p style="color:#4a5578;font-size:11px;margin:4px 0 0;">Powered by Cyberbells ITES services pvt ltd</p>
              </div>

            </div>
          </div>
        </body>
        </html>
      `
    };
  }
};

module.exports = { sendEmail, emailTemplates };
