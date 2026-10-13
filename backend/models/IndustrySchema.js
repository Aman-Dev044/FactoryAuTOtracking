const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, required: true, enum: ['text', 'number', 'select', 'checkbox', 'radio'] },
  placeholder: { type: String },
  options: [{ type: String }],
  required: { type: Boolean, default: false }
});

const industrySchemaDef = new mongoose.Schema({
  industryId: { type: String, required: true, index: true },
  moduleKey: { type: String, required: true }, // e.g. 'inventoryFields', 'orderFields'
  fields: [fieldSchema]
}, { timestamps: true });

industrySchemaDef.index({ industryId: 1, moduleKey: 1 }, { unique: true });

module.exports = mongoose.model('IndustrySchema', industrySchemaDef);
