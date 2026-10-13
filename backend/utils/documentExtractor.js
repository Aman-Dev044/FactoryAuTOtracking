const fs = require('fs');
const path = require('path');

// Safe imports — won't crash if packages aren't installed on server
let mammoth, pdfParse, Tesseract, xlsx;
try { mammoth = require('mammoth'); } catch (e) { console.warn('[documentExtractor] mammoth not installed — DOCX extraction disabled'); }
try { pdfParse = require('pdf-parse'); } catch (e) { console.warn('[documentExtractor] pdf-parse not installed — PDF extraction disabled'); }
try { Tesseract = require('tesseract.js'); } catch (e) { console.warn('[documentExtractor] tesseract.js not installed — OCR disabled'); }
try { xlsx = require('xlsx'); } catch (e) { console.warn('[documentExtractor] xlsx not installed — Excel extraction disabled'); }

/**
 * Extracts raw text from uploaded files (DOCX, PDF, Images, Excel, CSV, TXT)
 * @param {string} filePath - Absolute path to the file on disk
 * @param {string} originalFilename - Original filename with extension
 * @param {Buffer} [fileBuffer] - Optional file buffer if already in memory
 * @returns {Promise<string>} Extracted textual content
 */
async function extractTextFromFile(filePath, originalFilename = '', fileBuffer = null) {
  try {
    const ext = path.extname(originalFilename || filePath).toLowerCase();
    const buffer = fileBuffer || (fs.existsSync(filePath) ? fs.readFileSync(filePath) : null);

    if (!buffer || buffer.length === 0) {
      console.warn('DocumentExtractor: Empty buffer for', originalFilename || filePath);
      return '';
    }

    // 1. Word Document (.docx, .doc)
    if (ext === '.docx' || ext === '.doc') {
      if (!mammoth) { console.warn('mammoth not available for DOCX'); return ''; }
      try {
        const result = await mammoth.extractRawText({ buffer });
        let text = (result && result.value) ? result.value.trim() : '';
        
        // Also extract formatted html to capture table rows with structure if needed
        try {
          const htmlResult = await mammoth.convertToHtml({ buffer });
          if (htmlResult && htmlResult.value) {
            // Replace table cells with separator
            const tableText = htmlResult.value
              .replace(/<\/tr>/gi, '\n')
              .replace(/<\/td>|<\/th>/gi, ' | ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (tableText.length > text.length) {
              text = `${text}\n\n--- Structured Document Tables ---\n${tableText}`;
            }
          }
        } catch (htmlErr) {
          // ignore html conversion fallback
        }

        return text;
      } catch (docErr) {
        console.error('Mammoth DOCX extraction error:', docErr.message);
        return '';
      }
    }

    // 2. PDF Document (.pdf)
    if (ext === '.pdf') {
      if (!pdfParse) { console.warn('pdf-parse not available for PDF'); return ''; }
      try {
        const data = await pdfParse(buffer);
        return data.text ? data.text.trim() : '';
      } catch (pdfErr) {
        console.error('pdf-parse error:', pdfErr.message);
        return '';
      }
    }

    // 3. Images (.png, .jpg, .jpeg, .webp, .bmp, .tiff)
    if (['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff'].includes(ext)) {
      if (!Tesseract) { console.warn('tesseract.js not available for OCR'); return ''; }
      try {
        const ocrResult = await Tesseract.recognize(buffer, 'eng+hin', {
          logger: () => {} // Silent logger
        });
        return ocrResult?.data?.text ? ocrResult.data.text.trim() : '';
      } catch (ocrErr) {
        console.error('Tesseract OCR error:', ocrErr.message);
        return '';
      }
    }

    // 4. Excel Spreadsheets (.xlsx, .xls)
    if (ext === '.xlsx' || ext === '.xls') {
      if (!xlsx) { console.warn('xlsx not available for Excel'); return ''; }
      try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const textParts = [];
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          textParts.push(`--- Sheet: ${sheetName} ---`);
          rows.forEach(row => {
            if (Array.isArray(row) && row.some(c => c !== '')) {
              textParts.push(row.join(' | '));
            }
          });
        });
        return textParts.join('\n');
      } catch (xlsErr) {
        console.error('Excel extraction error:', xlsErr.message);
        return '';
      }
    }

    // 5. CSV / Plain Text (.csv, .txt, .log, .json)
    if (['.csv', '.txt', '.log', '.json'].includes(ext)) {
      return buffer.toString('utf-8').trim();
    }

    return '';
  } catch (error) {
    console.error('extractTextFromFile generic error:', error.message);
    return '';
  }
}

/**
 * Performs OCR on a raw image buffer (e.g. from Webcam snapshot)
 * @param {Buffer} imageBuffer - Raw image buffer
 * @returns {Promise<string>} Extracted OCR text
 */
async function extractTextFromImageBuffer(imageBuffer) {
  try {
    if (!imageBuffer || imageBuffer.length === 0) return '';
    if (!Tesseract) { console.warn('tesseract.js not available for OCR'); return ''; }
    const ocrResult = await Tesseract.recognize(imageBuffer, 'eng+hin', {
      logger: () => {}
    });
    return ocrResult?.data?.text ? ocrResult.data.text.trim() : '';
  } catch (error) {
    console.error('extractTextFromImageBuffer error:', error.message);
    return '';
  }
}

module.exports = {
  extractTextFromFile,
  extractTextFromImageBuffer
};
