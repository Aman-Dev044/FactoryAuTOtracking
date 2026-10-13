const COUNTRY_CONFIG = {
  'India': { country: 'India', code: 'IN', currency: 'INR', symbol: '₹', taxName: 'GST', taxRate: 18 },
  'United States': { country: 'United States', code: 'US', currency: 'USD', symbol: '$', taxName: 'Sales Tax', taxRate: 8.25 },
  'United Kingdom': { country: 'United Kingdom', code: 'GB', currency: 'GBP', symbol: '£', taxName: 'VAT', taxRate: 20 },
  'United Arab Emirates': { country: 'United Arab Emirates', code: 'AE', currency: 'AED', symbol: 'د.إ', taxName: 'VAT', taxRate: 5 },
  'Germany': { country: 'Germany', code: 'DE', currency: 'EUR', symbol: '€', taxName: 'VAT', taxRate: 19 },
  'Canada': { country: 'Canada', code: 'CA', currency: 'CAD', symbol: 'CA$', taxName: 'HST/GST', taxRate: 13 },
  'Australia': { country: 'Australia', code: 'AU', currency: 'AUD', symbol: 'A$', taxName: 'GST', taxRate: 10 },
  'Singapore': { country: 'Singapore', code: 'SG', currency: 'SGD', symbol: 'S$', taxName: 'GST', taxRate: 9 },
  'Japan': { country: 'Japan', code: 'JP', currency: 'JPY', symbol: '¥', taxName: 'Consumption Tax', taxRate: 10 },
  'Saudi Arabia': { country: 'Saudi Arabia', code: 'SA', currency: 'SAR', symbol: 'SR', taxName: 'VAT', taxRate: 15 },
  'Default': { country: 'India', code: 'IN', currency: 'INR', symbol: '₹', taxName: 'GST', taxRate: 18 }
};

const getCountryDetails = (countryName) => {
  if (!countryName) return COUNTRY_CONFIG['Default'];
  const matchKey = Object.keys(COUNTRY_CONFIG).find(
    k => k.toLowerCase() === countryName.trim().toLowerCase()
  );
  return matchKey ? COUNTRY_CONFIG[matchKey] : COUNTRY_CONFIG['Default'];
};

module.exports = {
  COUNTRY_CONFIG,
  getCountryDetails
};
