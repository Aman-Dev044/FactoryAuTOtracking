const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    lowercase: true,
    trim: true
  },
  mobile: {
    type: String,
    required: [true, 'Please provide a mobile number'],
    trim: true
  },
  concern: {
    type: String,
    required: [true, 'Please provide your concern'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'replied'],
    default: 'pending'
  },
  replyText: {
    type: String
  },
  repliedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
