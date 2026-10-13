/**
 * Auto-generates a composite merged product name from drag chain specifications.
 * Format: Drag Chain <modelNumber> (<innerSize> R<radius> <designType> <vs> <hs> <sr>)
 */
export const generateMergedProductName = ({
  modelNumber,
  size,
  productSize,
  innerSize,
  radius,
  designType,
  vs,
  hs,
  sr
}) => {
  const model = (modelNumber || '').trim();
  if (!model) return '';

  const inner = (size || productSize || innerSize || '').trim();
  const r = (radius || '').toString().trim();
  const dt = (designType || '').trim();
  const v = (vs || '').toString().trim();
  const h = (hs || '').toString().trim();
  const s = (sr || '').toString().trim();

  let specs = [];
  if (inner && inner !== 'N/A') specs.push(inner);

  if (r && r !== 'N/A') {
    specs.push(r.toUpperCase().startsWith('R') ? r : `R${r}`);
  }

  if (dt && dt !== 'N/A') specs.push(dt);

  if (v && v !== 'N/A') {
    specs.push(v.toUpperCase().startsWith('VS') ? v : `VS:${v}`);
  }

  if (h && h !== 'N/A') {
    specs.push(h.toUpperCase().startsWith('HS') ? h : `HS:${h}`);
  }

  if (s && s !== 'N/A') {
    specs.push(s.toUpperCase().startsWith('SR') ? s : `SR:${s}`);
  }

  if (specs.length > 0) {
    return `Drag Chain ${model} (${specs.join(' ')})`;
  }
  return `Drag Chain ${model}`;
};

/**
 * Formats the exact mounting bracket code for ordering:
 * - Box Type: B.<series> (e.g. B.35.1 or B.25.1 — nothing in case of Box)
 * - L-Angular Type: L.<series> (e.g. L.35.1)
 * - LSR Plastic: LSR.<series>.P (e.g. LSR.35.1.P or LSR 35.1.P)
 * - Metal LSR: LSR.<series>.M (e.g. LSR.35.1.M or LSR 35.1.M)
 * - SRP: SRP-25, SRP-35, SRP-50
 */
export const formatMountingBracketCode = (bracketType, modelNumber = '') => {
  if (!bracketType) return '';
  const cleanModel = (modelNumber || '').trim();
  const seriesMatch = cleanModel.match(/(\d+\.\d+|\d+)/);
  const series = seriesMatch ? seriesMatch[0] : (cleanModel || '35.1');

  const bt = bracketType.trim().toUpperCase();
  if (bt.includes('LSR(P)') || bt.includes('LSR (P)') || bt.includes('LSR_P') || bt.includes('LSR.P') || bt.includes('PLASTIC')) {
    return `LSR.${series}.P`;
  }
  if (bt.includes('LSR(M)') || bt.includes('LSR (M)') || bt.includes('LSR_M') || bt.includes('LSR.M') || bt.includes('METAL')) {
    return `LSR.${series}.M`;
  }
  if (bt.includes('B-BOX') || bt.includes('BOX') || bt === 'B') {
    return `B.${series}`;
  }
  if (bt.includes('L-ANGULAR') || bt === 'L') {
    return `L.${series}`;
  }
  if (bt.startsWith('SRP')) {
    return bracketType;
  }
  return bracketType;
};

/**
 * Auto-generates the standard ordering model code according to the chart:
 * Format: MODEL-WIDTH-BENDING RADIUS-TYPE-NO.OF LINKS-LENGTH-MOUNTING BRACKET TYPE-ACCESSORIES
 * Example: S2425.1-150-R125-OP-22-1000-B.25.1-HS.25.1
 * Example with LSR Plastic: S2435.1-150-R125-OP-22-1000-LSR.35.1.P-HS.35.1
 * Example with LSR Metal: S2435.1-150-R125-OP-22-1000-LSR.35.1.M-HS.35.1
 */
export const formatDragChainOrderCode = ({
  modelNumber,
  width,
  radius,
  chainType,
  numberOfLinks,
  totalCalculatedLinks,
  length,
  quantity,
  mountingBracketType,
  accessories
}) => {
  if (!modelNumber) return '';

  const cleanModel = (modelNumber || '').trim();
  const seriesMatch = cleanModel.match(/(\d+\.\d+|\d+)/);
  const series = seriesMatch ? seriesMatch[0] : cleanModel;

  const parts = [];

  // 1. Model (e.g. S2425.1 or S2435.1)
  const fullModel = cleanModel.toUpperCase().startsWith('S') ? cleanModel : `S${cleanModel}`;
  parts.push(fullModel);

  // 2. Width (e.g. 150)
  if (width) {
    const cleanWidth = width.toString().replace(/[^0-9.]/g, '');
    if (cleanWidth) parts.push(cleanWidth);
  }

  // 3. Radius (e.g. R125)
  if (radius) {
    const rStr = radius.toString().trim();
    parts.push(rStr.toUpperCase().startsWith('R') ? rStr.toUpperCase() : `R${rStr}`);
  }

  // 4. Type (OP / CL / SC)
  if (chainType) {
    const ct = chainType.toString().toUpperCase().trim();
    const cleanType = ct.includes('CLOSE') && !ct.includes('SEMI') ? 'CL' : (ct.includes('SEMI') ? 'SC' : (ct.includes('OP') ? 'OP' : ct));
    parts.push(cleanType);
  }

  // Set quantity multiplier (Client requirement: length * set (Quantity))
  const setQty = (quantity !== undefined && quantity !== null && Number(quantity) > 0) ? Number(quantity) : 1;

  // 5. Number of links (Calculated for total length = length * set)
  let linksValue = totalCalculatedLinks;
  if (!linksValue && numberOfLinks) {
    const perSet = parseInt(String(numberOfLinks).replace(/[^0-9]/g, ''), 10) || 0;
    linksValue = perSet > 0 ? (perSet * setQty) : numberOfLinks;
  }
  if (linksValue !== undefined && linksValue !== null && linksValue !== '') {
    const cleanLinks = linksValue.toString().replace(/[^0-9]/g, '');
    if (cleanLinks) parts.push(cleanLinks);
  }

  // 6. Length (Calculated as length * set (Quantity) as per client instruction)
  if (length) {
    const str = String(length).trim().toLowerCase();
    let num = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      if ((str.includes('m') && !str.includes('mm')) || (num < 20 && !str.includes('mm'))) {
        num = num * 1000;
      }
      const totalLengthMm = Math.round(num * setQty);
      parts.push(totalLengthMm);
    } else {
      const cleanLength = length.toString().replace(/[^0-9.]/g, '');
      if (cleanLength) parts.push(cleanLength);
    }
  }

  // 7. Mounting Bracket Type (e.g. B.35.1, L.35.1, LSR.35.1.P, LSR.35.1.M, SRP-35)
  if (mountingBracketType) {
    const formattedBracket = formatMountingBracketCode(mountingBracketType, cleanModel);
    if (formattedBracket) parts.push(formattedBracket);
  }

  // 8. Accessories / Separator / Divider (e.g. HS.25.1, VS.25.1)
  if (accessories && accessories !== '-- None / Not Required --' && accessories !== 'None') {
    const acc = accessories.toString().trim().toUpperCase();
    if (acc.includes('HS') && acc.includes('VS')) {
      parts.push(`HS.${series}-VS.${series}`);
    } else if (acc.includes('HS')) {
      parts.push(`HS.${series}`);
    } else if (acc.includes('VS')) {
      parts.push(`VS.${series}`);
    } else {
      parts.push(acc);
    }
  }

  return parts.join('-');
};
