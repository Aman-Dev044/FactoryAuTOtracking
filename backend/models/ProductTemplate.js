const mongoose = require('mongoose');
const tenantPlugin = require('../utils/tenantPlugin');

const ProductTemplateSchema = new mongoose.Schema({
  modelNumber: {
    type: String,
    required: [true, 'Model number is required'],
    trim: true
  },
  name: {
    type: String,
    trim: true,
    default: 'Nylon Drag Chain'
  },
  type: {
    type: String,
    enum: ['raw_material', 'finished_good', 'hardware', 'custom'],
    default: 'finished_good'
  },
  rack: {
    type: String,
    trim: true,
    default: 'Unassigned'
  },
  unit: {
    type: String,
    default: 'pcs'
  },
  radius: {
    type: String,
    trim: true
  },
  // Width (Inner Width) - from image: "INNER WIDTH"
  width: {
    type: String,
    trim: true
  },
  innerSize: {
    type: String,
    trim: true
  },
  outerSize: {
    type: String,
    trim: true
  },
  designType: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  // Chain Type: OP (Open), CP (Closed), SEMI (Semi-Closed)
  chainType: {
    type: String,
    enum: ['OP', 'CP', 'SEMI', ''],
    trim: true,
    default: 'OP'
  },
  series: {
    type: String,
    trim: true
  },
  vs: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  hs: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  sr: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  // Number of Links per meter, Pitch & Rate
  pitch: {
    type: Number
  },
  numberOfLinks: {
    type: String,
    trim: true
  },
  linksPerMeter: {
    type: String,
    trim: true
  },
  ratePerMeter: {
    type: Number
  },
  lengthPerMeter: {
    type: Number
  },
  // Mounting Bracket Type: B-BOX, L-ANGULAR, LSR(P), LSR(M), SRP-25, SRP-35, SRP-50
  mountingBracketType: {
    type: String,
    trim: true
  },
  // Accessories/Separator: HS (Horizontal), VS (Vertical)
  accessories: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  warehouseLocation: {
    type: String,
    trim: true,
    default: ''
  },
  almirahCatalog: {
    type: String,
    trim: true,
    default: ''
  },
  rackShelfCatalog: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProductTemplate', ProductTemplateSchema);
