/**
 * Advanced Indian GST E-Way Bill, Tax Invoice & Material Receipt Challan AI Parser
 * Combines Google Gemini LLM Intelligence with High-Precision Indian Logistics NLP Heuristics.
 * 
 * FIELD MAPPING (must match frontend form exactly):
 *   billNumber, billDate, vendorName, vendorContact, vendorGstin,
 *   materialType, materialDescription, quantity, unit,
 *   vehicleNumber, driverName, driverPhone,
 *   poNumber, totalAmount, taxAmount, remarks, invoiceUrl
 */

// Safe import — won't crash server if package not installed
let GoogleGenerativeAI;
try {
  ({ GoogleGenerativeAI } = require('@google/generative-ai'));
} catch (e) {
  console.warn('[ebillParser] @google/generative-ai not installed. AI parsing disabled, using NLP fallback.');
  GoogleGenerativeAI = null;
}

// ─── REGEX PATTERNS ──────────────────────────────────────────────────────────

// Indian Vehicle Registration (MH-12-AB-1234, DL 01 EA 5566, GJ06XX9999, HR26DQ5555)
const VEHICLE_REGEX = /\b([A-Z]{2}[\s\-]?[0-9]{1,2}[\s\-]?[A-Z]{1,3}[\s\-]?[0-9]{4})\b/gi;

// 12-digit E-Way Bill Number
const EWAY_BILL_REGEX = /(?:E[\s\-]?Way\s*Bill\s*(?:No\.?|Number|#)?|EWB\s*(?:No\.?|#)?|E-?WAYBILL\s*(?:No\.?)?)[:\s.\-]*([0-9]{4}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}|[0-9]{12})\b/i;

// Invoice / Challan / DC Number
const INVOICE_REGEX = /(?:Invoice\s*(?:No\.?|Number|#)|Inv\.?\s*(?:No\.?|#)|Tax\s*Invoice\s*(?:No\.?|#))[:\s.\-]*([A-Z0-9][\w\-\/]{2,29})/i;
const CHALLAN_REGEX = /(?:Challan\s*(?:No\.?|Number|#)|DC\s*(?:No\.?|#)|Delivery\s*Challan\s*(?:No\.?|#)|Material\s*Receipt\s*(?:No\.?|#)|Doc(?:ument)?\s*(?:No\.?|#)|Receipt\s*(?:No\.?|#)|Bill\s*(?:No\.?|#))[:\s.\-]*([A-Z0-9][\w\-\/]{2,29})/i;

// GSTIN (15 chars: 2 digits + 5 alpha + 4 digits + 1 alpha + 1 alphanum + Z + 1 alphanum)
const GSTIN_REGEX = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/g;

// Phone (10-digit Indian mobile)
const PHONE_REGEX = /(?:\+91[\s\-]?)?([6-9]\d{9})\b/g;

// Date patterns
const DATE_DD_MM_YYYY = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;
const DATE_YYYY_MM_DD = /\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g;

// PO / Purchase Order
const PO_REGEX = /(?:P\.?O\.?\s*(?:Ref\.?|No\.?|Number|#)?|Purchase\s*Order\s*(?:Ref\.?|No\.?|Number|#)?|Order\s*(?:Ref\.?|No\.?|#))[:\s.\-]*([A-Z0-9][\w\-\/]{2,24})/i;

// Quantity with unit
const QTY_LABELED = /(?:Quantity|Qty\.?|Total\s*Qty\.?|Net\s*(?:Weight|Wt\.?)|Gross\s*(?:Weight|Wt\.?))[:\s]*([0-9,]+(?:\.\d+)?)\s*(kg|kgs|pcs|nos|meters?|mtrs?|bags?|boxes?|tons?|sets?|rolls?|litres?|ltrs?|numbers?|units?)?/i;
const QTY_INLINE = /\b(\d{1,7}(?:\.\d+)?)\s*(kg|kgs|pcs|nos|meters|mtrs|bags|boxes|tons|sets|rolls)\b/gi;

// Amount
const AMOUNT_REGEX = /(?:Total\s*(?:Amount|Value)|Grand\s*Total|Invoice\s*(?:Value|Amount)|Challan\s*Value|Net\s*(?:Amount|Value)|Taxable\s*Value)[:\s]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i;
const TAX_REGEX = /(?:Total\s*Tax|Tax\s*Amount|GST\s*(?:Amount)?|IGST|CGST\s*\+?\s*SGST)[:\s]*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i;

// Vendor / Supplier patterns
const VENDOR_PATTERNS = [
  /(?:Consignor|Supplier\s*(?:Name)?|Vendor\s*(?:Name)?|Billed?\s*(?:From|By)|Sold\s*By|Issued\s*By|Shipped?\s*(?:From|By)|Dispatched?\s*(?:From|By)|From\s*(?:M\/s\.?)?)[:\s.\-]+([^\n\r,;|]{3,60})/i,
  /(?:M\/s\.?\s+)([A-Z][^\n\r,;|]{3,55})/i,
  /(?:Name\s*(?:of\s*)?(?:Supplier|Vendor|Consignor|Party))[:\s.\-]+([^\n\r,;|]{3,60})/i
];

// Driver patterns
const DRIVER_NAME_REGEX = /(?:Driver\s*(?:Name)?|Transporter\s*(?:Name)?|Delivered\s*By|Carried\s*By|Transport(?:er)?)[:\s.\-]+([^\n\r,;|]{2,40})/i;
const DRIVER_PHONE_REGEX = /(?:Driver\s*(?:Mobile|Phone|Contact)|Mobile\s*(?:No\.?)?|Phone\s*(?:No\.?)?|Contact\s*(?:No\.?)?)[:\s]*(?:\+91[\s\-]?)?([6-9]\d{9})/i;

// Material Description
const MATERIAL_DESC_PATTERNS = [
  /(?:Description\s*(?:of\s*)?(?:Goods|Materials?|Items?|Products?)|Item\s*(?:Description|Name)|Product\s*(?:Description|Name)|Material\s*(?:Description|Name)|Goods\s*(?:Description)?|Particulars)[:\s.\-]+([^\n\r|]{3,120})/i,
  /(?:HSN.*?)\d{4,8}\s*[|\s]+([A-Za-z][^\n\r|]{3,100})/i
];

// Material Classification
const MATERIAL_KEYWORDS = [
  { type: 'nylon', match: /nylon|pa66|pa6|polyamide|plastic\s*granules|polymer|virgin\s*resin|engineering\s*plastic|poly\s*amide/i, defaultUnit: 'kg', defaultDesc: 'Nylon Polymer Granules' },
  { type: 'pigment', match: /pigment|masterbatch|black\s*mb|white\s*mb|dye|colorant|carbon\s*black|colour|color/i, defaultUnit: 'kg', defaultDesc: 'Masterbatch Pigment' },
  { type: 'packaging', match: /packaging|corrugated|carton|stretch\s*film|bubble\s*wrap|poly\s*bag|packing|box(?:es)?/i, defaultUnit: 'boxes', defaultDesc: 'Corrugated Packaging Boxes' },
  { type: 'hardware', match: /hardware|screw|bolt|nut|washer|pin|bearing|rivet|fastener|spring|steel\s*link|chain\s*pin|stainless/i, defaultUnit: 'pcs', defaultDesc: 'Stainless Steel Fasteners & Hardware' },
  { type: 'other', match: /.*/, defaultUnit: 'kg', defaultDesc: 'Raw Material' }
];

// ─── UNIT NORMALIZER ─────────────────────────────────────────────────────────

function normalizeUnit(raw) {
  if (!raw) return '';
  const u = raw.toLowerCase().trim();
  if (/^kg/i.test(u)) return 'kg';
  if (/^(pc|nos|number|unit)/i.test(u)) return 'pcs';
  if (/^(mtr|meter)/i.test(u)) return 'meters';
  if (/^bag/i.test(u)) return 'bags';
  if (/^box/i.test(u)) return 'boxes';
  if (/^ton/i.test(u)) return 'tons';
  if (/^set/i.test(u)) return 'sets';
  if (/^roll/i.test(u)) return 'rolls';
  if (/^(ltr|litre|liter)/i.test(u)) return 'litres';
  return u;
}

// ─── DATE PARSER ─────────────────────────────────────────────────────────────

function extractDate(text) {
  // Try YYYY-MM-DD first
  const isoMatch = text.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  // Try DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const ddMatch = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
  if (ddMatch) {
    const [, d, m, y] = ddMatch;
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  // Try DD/MM/YY
  const shortMatch = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})\b/);
  if (shortMatch) {
    const [, d, m, y] = shortMatch;
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) {
      return `20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

// ─── VEHICLE NUMBER CLEANER ──────────────────────────────────────────────────

function cleanVehicleNumber(raw) {
  if (!raw) return '';
  // Normalize: uppercase, collapse spaces, use hyphens
  let v = raw.toUpperCase().replace(/[\s]+/g, '-').replace(/[^A-Z0-9\-]/g, '');
  // Ensure format like MH-12-AB-1234
  const m = v.replace(/\-/g, '').match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}-${m[4]}`;
  }
  return v;
}

// ─── NLP HEURISTIC PARSER ────────────────────────────────────────────────────

/**
 * Parses raw text from E-Way Bill, Invoice, or Challan using NLP Heuristics.
 * Returns fields that match the frontend form exactly.
 */
function parseEBillText(rawText = '', originalFilename = '') {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  const result = {
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    vendorName: '',
    vendorContact: '',
    vendorGstin: '',
    materialType: 'other',
    materialDescription: '',
    quantity: '',
    unit: 'kg',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    poNumber: '',
    totalAmount: 0,
    taxAmount: 0,
    remarks: '',
    confidence: 'medium',
    rawText: text
  };

  if (!text) {
    result.confidence = 'low';
    result.billNumber = `CHL-${Date.now().toString().slice(-6)}`;
    result.remarks = 'No text could be extracted from the document';
    return result;
  }

  // ── 1. E-Way Bill Number (12 digits) ──
  const ewbMatch = text.match(EWAY_BILL_REGEX);
  if (ewbMatch && ewbMatch[1]) {
    const rawEwb = ewbMatch[1].replace(/[\s\-]/g, '');
    if (rawEwb.length === 12 && /^\d+$/.test(rawEwb)) {
      result.billNumber = `EWB-${rawEwb}`;
    }
  }

  // ── 2. Invoice Number ──
  const invMatch = text.match(INVOICE_REGEX);
  if (invMatch && invMatch[1]) {
    const inv = invMatch[1].trim();
    // Only use if it looks like a real number (not just "No" or "Number")
    if (inv.length >= 3 && !/^(No|Number|Ref|#)$/i.test(inv)) {
      if (!result.billNumber) result.billNumber = inv;
    }
  }

  // ── 3. Challan / DC Number ──
  if (!result.billNumber) {
    const chlMatch = text.match(CHALLAN_REGEX);
    if (chlMatch && chlMatch[1]) {
      const chl = chlMatch[1].trim();
      if (chl.length >= 3 && !/^(No|Number|Ref|#)$/i.test(chl)) {
        result.billNumber = chl;
      }
    }
  }

  // Fallback bill number
  if (!result.billNumber) {
    const fileClean = (originalFilename || '').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 15);
    result.billNumber = fileClean ? `DOC-${fileClean.toUpperCase()}` : `DOC-${Date.now().toString().slice(-6)}`;
  }

  // ── 4. Date ──
  result.billDate = extractDate(text);

  // ── 5. Vehicle Number ──
  // First check labeled patterns
  const vehLabeled = text.match(/(?:Vehicle\s*(?:No\.?|Number|Reg\.?)|Truck\s*(?:No\.?)|Lorry\s*(?:No\.?)|Carrier\s*(?:No\.?)|Transport\s*Vehicle)[:\s.\-]*([A-Z0-9\s\-]{6,18})/i);
  if (vehLabeled && vehLabeled[1]) {
    const cleaned = cleanVehicleNumber(vehLabeled[1]);
    if (cleaned.length >= 6) result.vehicleNumber = cleaned;
  }
  // Then try generic pattern
  if (!result.vehicleNumber) {
    const allVehicles = [...text.matchAll(VEHICLE_REGEX)];
    if (allVehicles.length > 0) {
      // Pick the last one (usually vehicle number appears after bill/GSTIN numbers)
      result.vehicleNumber = cleanVehicleNumber(allVehicles[allVehicles.length - 1][1]);
    }
  }

  // ── 6. GSTIN(s) ──
  const allGstins = [...text.matchAll(GSTIN_REGEX)].map(m => m[1].toUpperCase());
  // First GSTIN is usually the supplier's
  if (allGstins.length > 0) {
    result.vendorGstin = allGstins[0];
  }

  // ── 7. Vendor / Supplier Name ──
  for (const pattern of VENDOR_PATTERNS) {
    const vendorMatch = text.match(pattern);
    if (vendorMatch && vendorMatch[1]) {
      let name = vendorMatch[1].trim()
        .replace(/^[:\-\s.]+/, '')
        .split(/\n|\r|(?:\s{2,})/)[0]  // Take only first line
        .replace(/\s*(GSTIN|GST|Phone|Mobile|Date|Vehicle|Place|Invoice|Challan|PO).*/i, '')
        .trim();
      if (name.length >= 3 && name.length <= 60 && !/trackbells/i.test(name)) {
        result.vendorName = name;
        break;
      }
    }
  }

  // Fallback: scan top 5 non-header lines for company-like names
  if (!result.vendorName) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    const skipWords = ['e-way', 'tax invoice', 'challan', 'government', 'receipt', 'trackbells', 'date', 'bill', 'invoice', 'original', 'duplicate', 'gst', 'gstin'];
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      const lLower = line.toLowerCase();
      if (!skipWords.some(w => lLower.includes(w)) && line.length < 60 && /[A-Za-z]{3,}/.test(line)) {
        result.vendorName = line;
        break;
      }
    }
  }

  // ── 8. Vendor Contact ──
  if (result.vendorGstin) {
    result.vendorContact = `GSTIN: ${result.vendorGstin}`;
  }

  // ── 9. Driver Name ──
  const driverMatch = text.match(DRIVER_NAME_REGEX);
  if (driverMatch && driverMatch[1]) {
    let dName = driverMatch[1].trim()
      .split(/(?:\s+(?:Phone|Mobile|Contact|Vehicle|Truck|Sign|Time|Date|No)\b|[|;\n\r])/i)[0]
      .trim();
    if (dName.length >= 2 && dName.length <= 40 && !/^\d+$/.test(dName)) {
      result.driverName = dName;
    }
  }

  // ── 10. Driver Phone ──
  const dPhoneMatch = text.match(DRIVER_PHONE_REGEX);
  if (dPhoneMatch && dPhoneMatch[1]) {
    result.driverPhone = dPhoneMatch[1];
  }
  if (!result.driverPhone) {
    // Get all phone numbers, skip any that match vendor GSTIN prefix
    const allPhones = [...text.matchAll(PHONE_REGEX)].map(m => m[1]);
    // Last phone number in doc is usually driver's
    if (allPhones.length > 0) {
      result.driverPhone = allPhones[allPhones.length - 1];
    }
  }

  // ── 11. Material Type & Description ──
  // First try explicit description labels
  for (const pattern of MATERIAL_DESC_PATTERNS) {
    const descMatch = text.match(pattern);
    if (descMatch && descMatch[1]) {
      const desc = descMatch[1].trim()
        .split(/\n|\r/)[0]
        .replace(/\s*(Qty|Quantity|Rate|Amount|Total|HSN|SAC|UOM).*/i, '')
        .trim();
      if (desc.length > 3) {
        result.materialDescription = desc.slice(0, 120);
        break;
      }
    }
  }

  // Classify material type from description OR full text
  const searchText = result.materialDescription || lower;
  for (const mat of MATERIAL_KEYWORDS) {
    if (mat.match.test(searchText)) {
      result.materialType = mat.type;
      if (!result.materialDescription) {
        result.materialDescription = mat.defaultDesc;
      }
      if (mat.type !== 'other') {
        result.unit = mat.defaultUnit;
      }
      break;
    }
  }

  // ── 12. Quantity & Unit ──
  const qtyMatch = text.match(QTY_LABELED);
  if (qtyMatch && qtyMatch[1]) {
    result.quantity = parseFloat(qtyMatch[1].replace(/,/g, '')) || '';
    if (qtyMatch[2]) {
      result.unit = normalizeUnit(qtyMatch[2]) || result.unit;
    }
  }
  if (!result.quantity) {
    const inlineMatches = [...text.matchAll(QTY_INLINE)];
    if (inlineMatches.length > 0) {
      // Take the first reasonable quantity
      const match = inlineMatches[0];
      result.quantity = parseFloat(match[1]) || '';
      result.unit = normalizeUnit(match[2]) || result.unit;
    }
  }

  // ── 13. PO Number ──
  const poMatch = text.match(PO_REGEX);
  if (poMatch && poMatch[1]) {
    const candidate = poMatch[1].trim();
    if (!/^(REF|NO|NUM|ORDER|NUMBER)$/i.test(candidate)) {
      result.poNumber = candidate;
    }
  }

  // ── 14. Amounts ──
  const amtMatch = text.match(AMOUNT_REGEX);
  if (amtMatch && amtMatch[1]) {
    result.totalAmount = parseFloat(amtMatch[1].replace(/,/g, '')) || 0;
  }
  const taxMatch = text.match(TAX_REGEX);
  if (taxMatch && taxMatch[1]) {
    result.taxAmount = parseFloat(taxMatch[1].replace(/,/g, '')) || 0;
  }

  // ── 15. Auto remarks ──
  const parts = [];
  if (result.billNumber) parts.push(`Bill: ${result.billNumber}`);
  if (result.vendorName) parts.push(`From: ${result.vendorName}`);
  if (result.quantity) parts.push(`Qty: ${result.quantity} ${result.unit}`);
  result.remarks = parts.length > 0 ? `Auto-scanned: ${parts.join(', ')}` : 'Auto-scanned document';

  // Set confidence
  const filledCount = [result.billNumber, result.vendorName, result.vehicleNumber, result.quantity, result.materialDescription].filter(Boolean).length;
  result.confidence = filledCount >= 4 ? 'high' : filledCount >= 2 ? 'medium' : 'low';

  return result;
}

// ─── AI PARSER (GEMINI) ──────────────────────────────────────────────────────

/**
 * Uses Gemini LLM to extract structured fields from invoice/e-bill text or image.
 * Field names match the frontend GateEntry form exactly.
 */
async function parseWithAI(rawText = '', imageBuffer = null, originalFilename = '') {
  if (!GoogleGenerativeAI) return null;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.includes('your_') || apiKey.length < 10) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert document parser for Indian Factory ERP Gate Entry system.
You will analyze an invoice, e-way bill, tax invoice, delivery challan, or material receipt document.

CRITICAL RULES:
1. Extract ONLY what is actually written in the document. Do NOT invent or guess values.
2. If a field is not found in the document, return empty string "" for text fields or 0 for number fields.
3. Be very careful about WHICH value goes in WHICH field — read the labels/headers carefully.
4. Vehicle numbers look like "MH-12-AB-1234" or "DL 01 EA 5566" (2 state letters + 1-2 digit district + 1-3 letters + 4 digits).
5. GSTIN is exactly 15 characters like "27AABCA1234F1Z5".
6. Indian phone numbers are 10 digits starting with 6-9.

Return a JSON object with EXACTLY these keys (no extra keys, no markdown):
{
  "billNumber": "Invoice/Challan/DC number or E-Way Bill number as shown on document",
  "billDate": "YYYY-MM-DD format date from document",
  "vendorName": "Supplier/Consignor/Seller company name (NOT the buyer/recipient)",
  "vendorContact": "Supplier phone or GSTIN number",
  "vendorGstin": "Supplier 15-char GSTIN if found",
  "materialType": "one of: nylon, pigment, packaging, hardware, other",
  "materialDescription": "Full product/material description exactly as written",
  "quantity": 0,
  "unit": "one of: kg, pcs, boxes, bags, meters, tons, sets, rolls",
  "vehicleNumber": "Vehicle registration number in XX-00-XX-0000 format",
  "driverName": "Driver or transporter person name",
  "driverPhone": "Driver 10-digit mobile number",
  "poNumber": "Purchase Order reference number if mentioned",
  "totalAmount": 0,
  "taxAmount": 0,
  "remarks": "One line summary of what this document is about"
}

Return ONLY the raw JSON object. No markdown, no backticks, no explanation.`;

    let responseText = '';

    if (imageBuffer && imageBuffer.length > 0) {
      const part = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };
      const result = await model.generateContent([prompt, part]);
      responseText = result.response.text();
    } else if (rawText && rawText.trim().length > 10) {
      const result = await model.generateContent([
        prompt,
        `\n\nDocument text extracted from "${originalFilename || 'uploaded file'}":\n\n${rawText.slice(0, 8000)}`
      ]);
      responseText = result.response.text();
    } else {
      return null;
    }

    // Clean and parse JSON
    let cleanedJson = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Handle case where response might have text before/after JSON
    const jsonStart = cleanedJson.indexOf('{');
    const jsonEnd = cleanedJson.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedJson = cleanedJson.slice(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(cleanedJson);

    // Validate and normalize the parsed result
    const result = {
      billNumber: String(parsed.billNumber || '').trim(),
      billDate: String(parsed.billDate || new Date().toISOString().split('T')[0]).trim(),
      vendorName: String(parsed.vendorName || '').trim(),
      vendorContact: String(parsed.vendorContact || '').trim(),
      vendorGstin: String(parsed.vendorGstin || '').trim(),
      materialType: ['nylon', 'pigment', 'packaging', 'hardware', 'other'].includes(parsed.materialType) ? parsed.materialType : 'other',
      materialDescription: String(parsed.materialDescription || '').trim(),
      quantity: Number(parsed.quantity) || '',
      unit: normalizeUnit(parsed.unit) || 'kg',
      vehicleNumber: cleanVehicleNumber(String(parsed.vehicleNumber || '')),
      driverName: String(parsed.driverName || '').trim(),
      driverPhone: String(parsed.driverPhone || '').replace(/[^\d]/g, '').slice(-10),
      poNumber: String(parsed.poNumber || '').trim(),
      totalAmount: Number(parsed.totalAmount) || 0,
      taxAmount: Number(parsed.taxAmount) || 0,
      remarks: String(parsed.remarks || '').trim() || `AI-parsed from ${originalFilename || 'document'}`,
      confidence: 'ai_high',
      rawText: rawText
    };

    // Clean up phone - only keep if valid
    if (result.driverPhone && (result.driverPhone.length !== 10 || !/^[6-9]/.test(result.driverPhone))) {
      result.driverPhone = '';
    }

    return result;
  } catch (error) {
    console.warn('Gemini AI parse error (falling back to NLP parser):', error.message);
    return null;
  }
}

module.exports = {
  parseEBillText,
  parseWithAI
};
