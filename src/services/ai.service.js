const Anthropic = require('@anthropic-ai/sdk');

class AIService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  async generateCV(studentData) {
    const prompt = this.buildCVPrompt(studentData);
    
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return message.content[0].text;
    } catch (error) {
      throw new Error('Failed to generate CV: ' + error.message);
    }
  }

  buildCVPrompt(data) {
    return `Generate a professional CV/resume in HTML format for the following student:

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'N/A'}
Department: ${data.department || 'N/A'}
CGPA: ${data.cgpa || 'N/A'}
Roll Number: ${data.rollNumber || 'N/A'}

Skills: ${JSON.stringify(data.skills || [])}

Portfolio Projects:
${data.projects?.map(p => `- ${p.title}: ${p.description}`).join('\n') || 'None'}

Certifications:
${data.certifications?.map(c => `- ${c.title} by ${c.issuer}`).join('\n') || 'None'}

Internships Applied:
${data.internships?.map(i => `- ${i.title} (${i.status})`).join('\n') || 'None'}

Generate a clean, professional, ATS-friendly HTML CV. Use modern styling with CSS included in a  tag. Make it print-friendly. Include all sections: Header, Summary, Education, Skills, Projects, Certifications, and Experience.`;
  }

  async extractCertificationFromPDF(pdfText) {
    const prompt = `Extract certification information from the following text:

${pdfText}

Return a JSON object with these fields:
{
  "title": "certification name",
  "issuer": "issuing organization",
  "issueDate": "date in YYYY-MM-DD format",
  "credentialId": "credential/certificate ID if found"
}

If information is not found, use null.`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].text;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      console.error('Error extracting certification:', error);
      return null;
    }
  }
}

module.exports = new AIService();