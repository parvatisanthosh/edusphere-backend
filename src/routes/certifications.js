const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const pdfService = require('../services/pdf.service');
const aiService = require('../services/ai.service');

const router = express.Router();
const prisma = new PrismaClient();

// Upload and scan certificate
router.post('/upload', authenticateToken, upload.single('certificate'), async (req, res) => {
  const userId = req.user.userId;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Get student profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.student) {
      return res.status(400).json({ error: 'Student profile not found' });
    }

    let certData = {
      title: req.body.title || 'Untitled Certificate',
      issuer: req.body.issuer || null,
      issueDate: req.body.issueDate ? new Date(req.body.issueDate) : null,
      credentialId: req.body.credentialId || null,
      credentialUrl: req.body.credentialUrl || null,
      source: 'manual',
      documentUrl: `/uploads/certificates/${file.filename}`
    };

    // If PDF, try to extract information using AI
    if (file.mimetype === 'application/pdf') {
      try {
        const pdfText = await pdfService.extractText(file.path);
        const extracted = await aiService.extractCertificationFromPDF(pdfText);
        
        if (extracted) {
          certData = {
            ...certData,
            title: extracted.title || certData.title,
            issuer: extracted.issuer || certData.issuer,
            issueDate: extracted.issueDate ? new Date(extracted.issueDate) : certData.issueDate,
            credentialId: extracted.credentialId || certData.credentialId,
            source: 'ai'
          };
        }
      } catch (error) {
        console.log('PDF extraction failed, using manual data:', error.message);
      }
    }

    const certification = await prisma.certification.create({
      data: {
        studentId: user.student.id,
        ...certData
      }
    });

    res.json({
      success: true,
      message: 'Certificate uploaded successfully',
      certification
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all certifications
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const certifications = await prisma.certification.findMany({
      where: { studentId: user.student.id },
      orderBy: { issueDate: 'desc' }
    });

    res.json({ certifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update certification
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    const certification = await prisma.certification.findFirst({
      where: {
        id: id,
        studentId: user.student.id
      }
    });

    if (!certification) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    const updated = await prisma.certification.update({
      where: { id: id },
      data: req.body
    });

    res.json({ success: true, certification: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete certification
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    const certification = await prisma.certification.findFirst({
      where: {
        id: id,
        studentId: user.student.id
      }
    });

    if (!certification) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    await prisma.certification.delete({
      where: { id: id }
    });

    res.json({ success: true, message: 'Certification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;