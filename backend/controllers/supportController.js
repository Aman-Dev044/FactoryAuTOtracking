const SupportTicket = require('../models/SupportTicket');
const { sendEmail } = require('../utils/sendEmail');

// @desc    Submit a support ticket from landing page
// @route   POST /api/support/ticket
// @access  Public
exports.createTicket = async (req, res) => {
  try {
    const { name, email, mobile, concern } = req.body;

    if (!name || !email || !mobile || !concern) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, email, mobile, concern) are required'
      });
    }

    // Save to Database
    const ticket = await SupportTicket.create({
      name,
      email,
      mobile,
      concern
    });

    // Send email to Super Admin
    const superAdminEmail = process.env.PLATFORM_ADMIN_EMAIL || process.env.SMTP_EMAIL;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Verdana,sans-serif;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;padding:30px 20px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(15,23,42,0.03);">
            <div style="width:50px;height:50px;background:rgba(245,130,32,0.1);color:#f58220;border-radius:12px;margin-bottom:20px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;">
              💬
            </div>
            <h1 style="color:#0f172a;font-size:20px;margin:0 0 4px;font-weight:700;">New Support Concern Received</h1>
            <p style="color:#f58220;font-size:12px;margin:0 0 24px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">TrackBells Drag Chain ERP</p>
            
            <div style="background:#f1f5f9;border-radius:8px;padding:20px;margin-bottom:24px;">
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr>
                  <td style="padding:6px 0;color:#64748b;width:120px;font-weight:600;">Sender Name:</td>
                  <td style="padding:6px 0;color:#0f172a;font-weight:700;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600;">Email Address:</td>
                  <td style="padding:6px 0;color:#0f172a;"><a href="mailto:${email}" style="color:#f58220;text-decoration:none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600;">Mobile No:</td>
                  <td style="padding:6px 0;color:#0f172a;">${mobile}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-weight:600;vertical-align:top;">Concern:</td>
                  <td style="padding:6px 0;color:#334155;line-height:1.6;font-style:italic;">"${concern}"</td>
                </tr>
              </table>
            </div>

            <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 24px;">
              This ticket has been logged in the ERP Database. Please log in to your Super Admin dashboard under the <strong>Help & Support</strong> menu to reply to this query.
            </p>

            <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
               <p style="color:#94a3b8;font-size:11px;margin:0;">TrackBells ERP System • Automated Alert</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: superAdminEmail,
      subject: `[Support Ticket] New Concern from ${name}`,
      html: emailHtml
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully. Super Admin has been notified!',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting support ticket',
      error: error.message
    });
  }
};

// @desc    Get all support tickets
// @route   GET /api/support/tickets
// @access  Private (Super Admin / Admin)
exports.getTickets = async (req, res) => {
  try {
    // Only allow platform admin
    if (req.user.role !== 'super_admin' || req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform Admin privileges required.'
      });
    }

    const tickets = await SupportTicket.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving support tickets',
      error: error.message
    });
  }
};

// @desc    Reply to a support ticket
// @route   PUT /api/support/tickets/:id/reply
// @access  Private (Super Admin / Admin)
exports.replyTicket = async (req, res) => {
  try {
    // Only allow platform admin
    if (req.user.role !== 'super_admin' || req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform Admin privileges required.'
      });
    }

    const { replyText } = req.body;

    if (!replyText || !replyText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply content cannot be empty'
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(444).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Update DB
    ticket.replyText = replyText;
    ticket.status = 'replied';
    ticket.repliedAt = Date.now();
    await ticket.save();

    // Send Reply Email back to user using SMTP
    const replyHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Verdana,sans-serif;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;padding:30px 20px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 4px 12px rgba(15,23,42,0.03);">
            <div style="width:50px;height:50px;background:rgba(245,130,32,0.1);color:#f58220;border-radius:12px;margin-bottom:20px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;">
              ✉️
            </div>
            <h1 style="color:#0f172a;font-size:20px;margin:0 0 4px;font-weight:700;">Reply to your Support Ticket</h1>
            <p style="color:#f58220;font-size:12px;margin:0 0 24px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">TrackBells Drag Chain ERP</p>
            
            <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">
              Hello <strong style="color:#0f172a;">${ticket.name}</strong>,
            </p>

            <div style="background:#f8fafc;border-left:4px solid #cbd5e1;padding:12px 16px;margin-bottom:24px;font-size:14px;color:#475569;font-style:italic;">
              <strong>Your original concern:</strong><br/>
              "${ticket.concern}"
            </div>

            <div style="background:rgba(249,115,22,0.03);border:1px solid rgba(249,115,22,0.1);border-radius:10px;padding:20px;margin-bottom:24px;">
              <p style="color:#0f172a;font-weight:600;font-size:14px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Support Team Response:</p>
              <p style="color:#334155;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${replyText}</p>
            </div>

            <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 24px;">
              If you have any further questions, please do not hesitate to contact us.
            </p>

            <div style="border-top:1px solid #e2e8f0;padding-top:20px;text-align:center;">
               <p style="color:#94a3b8;font-size:11px;margin:0;">TrackBells ERP System • Powered by Cyberbells</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: ticket.email,
      subject: `TrackBells Support Ticket Reply (INV-${ticket._id.toString().substring(18).toUpperCase()})`,
      html: replyHtml
    });

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully and email dispatched to user!',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error replying to support ticket',
      error: error.message
    });
  }
};
