// Fixed Drag Chain Base Price & Pitch Specification Sheet (As per Client Paramveer Singh Trackballs Master Sheet)
// Formula: Pitch is fixed per model. Links = Math.ceil(1000mm / Pitch mm).

const DRAG_CHAIN_SERIES_SPECS = {
  'S-10':   { pitch: 16,  linksPerMeter: 63, ratePerMeter: 450,  defaultWidth: '15',  lengthPerMeter: 1008 },
  'S10':    { pitch: 16,  linksPerMeter: 63, ratePerMeter: 450,  defaultWidth: '15',  lengthPerMeter: 1008 },
  'S 10':   { pitch: 16,  linksPerMeter: 63, ratePerMeter: 450,  defaultWidth: '15',  lengthPerMeter: 1008 },

  'S-15':   { pitch: 24,  linksPerMeter: 42, ratePerMeter: 650,  defaultWidth: '20',  lengthPerMeter: 1008 },
  'S15':    { pitch: 24,  linksPerMeter: 42, ratePerMeter: 650,  defaultWidth: '20',  lengthPerMeter: 1008 },
  'S 15':   { pitch: 24,  linksPerMeter: 42, ratePerMeter: 650,  defaultWidth: '20',  lengthPerMeter: 1008 },

  'S-20':   { pitch: 35,  linksPerMeter: 29, ratePerMeter: 850,  defaultWidth: '25',  lengthPerMeter: 1015 },
  'S20':    { pitch: 35,  linksPerMeter: 29, ratePerMeter: 850,  defaultWidth: '25',  lengthPerMeter: 1015 },
  'S 20':   { pitch: 35,  linksPerMeter: 29, ratePerMeter: 850,  defaultWidth: '25',  lengthPerMeter: 1015 },

  'S-21.1': { pitch: 33,  linksPerMeter: 31, ratePerMeter: 900,  defaultWidth: '30',  lengthPerMeter: 1023 },
  'S21.1':  { pitch: 33,  linksPerMeter: 31, ratePerMeter: 900,  defaultWidth: '30',  lengthPerMeter: 1023 },

  'S-25.1': { pitch: 46,  linksPerMeter: 22, ratePerMeter: 1200, defaultWidth: '50',  lengthPerMeter: 1012 },
  'S25.1':  { pitch: 46,  linksPerMeter: 22, ratePerMeter: 1200, defaultWidth: '50',  lengthPerMeter: 1012 },
  'S-25':   { pitch: 46,  linksPerMeter: 22, ratePerMeter: 1200, defaultWidth: '50',  lengthPerMeter: 1012 },
  'S25':    { pitch: 46,  linksPerMeter: 22, ratePerMeter: 1200, defaultWidth: '50',  lengthPerMeter: 1012 },

  'S-29.1': { pitch: 22,  linksPerMeter: 46, ratePerMeter: 1350, defaultWidth: '60',  lengthPerMeter: 1012 },
  'S29.1':  { pitch: 22,  linksPerMeter: 46, ratePerMeter: 1350, defaultWidth: '60',  lengthPerMeter: 1012 },

  'S-35.1': { pitch: 25,  linksPerMeter: 40, ratePerMeter: 1500, defaultWidth: '75',  lengthPerMeter: 1000 },
  'S35.1':  { pitch: 25,  linksPerMeter: 40, ratePerMeter: 1500, defaultWidth: '75',  lengthPerMeter: 1000 },

  'S-35.2': { pitch: 56,  linksPerMeter: 18, ratePerMeter: 1650, defaultWidth: '75',  lengthPerMeter: 1008 },
  'S35.2':  { pitch: 56,  linksPerMeter: 18, ratePerMeter: 1650, defaultWidth: '75',  lengthPerMeter: 1008 },
  'S-35':   { pitch: 56,  linksPerMeter: 18, ratePerMeter: 1650, defaultWidth: '75',  lengthPerMeter: 1008 },
  'S35':    { pitch: 56,  linksPerMeter: 18, ratePerMeter: 1650, defaultWidth: '75',  lengthPerMeter: 1008 },

  'S-42.1': { pitch: 67,  linksPerMeter: 15, ratePerMeter: 1950, defaultWidth: '90',  lengthPerMeter: 1005 },
  'S42.1':  { pitch: 67,  linksPerMeter: 15, ratePerMeter: 1950, defaultWidth: '90',  lengthPerMeter: 1005 },

  'S-45.1': { pitch: 67,  linksPerMeter: 15, ratePerMeter: 2200, defaultWidth: '100', lengthPerMeter: 1005 },
  'S45.1':  { pitch: 67,  linksPerMeter: 15, ratePerMeter: 2200, defaultWidth: '100', lengthPerMeter: 1005 },
  'S-45':   { pitch: 67,  linksPerMeter: 15, ratePerMeter: 2200, defaultWidth: '100', lengthPerMeter: 1005 },
  'S45':    { pitch: 67,  linksPerMeter: 15, ratePerMeter: 2200, defaultWidth: '100', lengthPerMeter: 1005 },

  'S-56.1': { pitch: 91,  linksPerMeter: 12, ratePerMeter: 2700, defaultWidth: '110', lengthPerMeter: 1092 },
  'S56.1':  { pitch: 91,  linksPerMeter: 12, ratePerMeter: 2700, defaultWidth: '110', lengthPerMeter: 1092 },

  'S-60':   { pitch: 95,  linksPerMeter: 11, ratePerMeter: 3100, defaultWidth: '125', lengthPerMeter: 1045 },
  'S60':    { pitch: 95,  linksPerMeter: 11, ratePerMeter: 3100, defaultWidth: '125', lengthPerMeter: 1045 },
  'S 60':   { pitch: 95,  linksPerMeter: 11, ratePerMeter: 3100, defaultWidth: '125', lengthPerMeter: 1045 },

  'S-80.1': { pitch: 112, linksPerMeter: 9,  ratePerMeter: 4200, defaultWidth: '150', lengthPerMeter: 1008 },
  'S80.1':  { pitch: 112, linksPerMeter: 9,  ratePerMeter: 4200, defaultWidth: '150', lengthPerMeter: 1008 },
  'S-80':   { pitch: 112, linksPerMeter: 9,  ratePerMeter: 4200, defaultWidth: '150', lengthPerMeter: 1008 },
  'S80':    { pitch: 112, linksPerMeter: 9,  ratePerMeter: 4200, defaultWidth: '150', lengthPerMeter: 1008 }
};

// Helper function to extract series key and retrieve default pitch & rate
const getSeriesSpecFromModel = (modelNumber = '') => {
  if (!modelNumber) return { pitch: 46, linksPerMeter: 22, ratePerMeter: 1200, series: 'S-25.1' };
  const raw = modelNumber.toString().trim();
  const clean = raw.toUpperCase().replace(/\s+/g, '');

  // 1. Direct key lookup
  if (DRAG_CHAIN_SERIES_SPECS[raw] || DRAG_CHAIN_SERIES_SPECS[clean]) {
    const matched = DRAG_CHAIN_SERIES_SPECS[raw] || DRAG_CHAIN_SERIES_SPECS[clean];
    return { ...matched, series: raw };
  }

  // 2. Prioritized match: Longest/most specific keys first (e.g. S-35.2 before S35)
  const sortedKeys = Object.keys(DRAG_CHAIN_SERIES_SPECS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const cleanKey = key.replace(/[\s-_]/g, '').toUpperCase();
    const cleanTarget = clean.replace(/[\s-_]/g, '');
    if (cleanTarget.includes(cleanKey)) {
      return { ...DRAG_CHAIN_SERIES_SPECS[key], series: key };
    }
  }

  // 3. Number/dot pattern match (e.g. "35.2", "25.1", "45.1", "11")
  const numMatch = clean.match(/(\d+\.\d+|\d+)/);
  if (numMatch) {
    const numPart = numMatch[0];
    for (const key of sortedKeys) {
      if (key.includes(numPart)) {
        return { ...DRAG_CHAIN_SERIES_SPECS[key], series: key };
      }
    }
  }

  // Default fallback
  return { pitch: 46, linksPerMeter: 22, ratePerMeter: 1200, series: 'S-25.1' };
};

module.exports = {
  DRAG_CHAIN_SERIES_SPECS,
  getSeriesSpecFromModel
};
