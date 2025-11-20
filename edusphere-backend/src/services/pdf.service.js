const pdf = require('pdf-parse');
const fs = require('fs').promises;

class PDFService {
  async extractText(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error('Failed to extract PDF text: ' + error.message);
    }
  }

  extractIssuer(text) {
    const patterns = [
      /issued by[:\s]+([^\n]+)/i,
      /certified by[:\s]+([^\n]+)/i,
      /from[:\s]+([^\n]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  extractDate(text) {
    const datePattern = /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\w+ \d{1,2},? \d{4}/;
    const match = text.match(datePattern);
    return match ? match[0] : null;
  }

  extractCertId(text) {
    const patterns = [
      /certificate (?:id|number|#)[:\s]+([A-Z0-9-]+)/i,
      /credential[:\s]+([A-Z0-9-]+)/i,
      /ID[:\s]+([A-Z0-9-]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }
}

module.exports = new PDFService();