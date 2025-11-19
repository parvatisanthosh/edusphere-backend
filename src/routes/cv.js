const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const aiService = require('../services/ai.service');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Generate CV
router.post('/generate', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Fetch all student data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            projects: true,
            certifications: true,
            applications: {
              include: {
                internship: true
              }
            }
          }
        }
      }
    });

    if (!user.student) {
      return res.status(400).json({ error: 'Student profile not found' });
    }

    // Build student data object
    const studentData = {
      name: user.name,
      email: user.email,
      phone: user.student.phone,
      department: user.student.department,
      cgpa: user.student.cgpa,
      rollNumber: user.student.rollNumber,
      skills: [], // You can fetch from StudentSkill model if needed
      projects: user.student.projects.map(p => ({
        title: p.title,
        description: p.description,
        githubUrl: p.githubUrl,
        language: p.language
      })),
      certifications: user.student.certifications.map(c => ({
        title: c.title,
        issuer: c.issuer
      })),
      internships: user.student.applications.map(a => ({
        title: a.internship.title,
        company: a.internship.companyName,
        status: a.status
      }))
    };

    // Generate CV using AI
    const cvHTML = await aiService.generateCV(studentData);

    // Save CV to file
    const filename = `cv-${user.student.id}-${Date.now()}.html`;
    const filePath = path.join(__dirname, '../../uploads/cvs', filename);
    await fs.writeFile(filePath, cvHTML);

    // Save generation record
    const cvRecord = await prisma.cVGeneration.create({
      data: {
        studentId: user.student.id,
        templateName: 'default',
        fileUrl: `/uploads/cvs/${filename}`,
        format: 'html'
      }
    });

    res.json({
      success: true,
      message: 'CV generated successfully',
      cv: cvRecord,
      previewUrl: `/uploads/cvs/${filename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get CV history
router.get('/history', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const cvs = await prisma.cVGeneration.findMany({
      where: { studentId: user.student.id },
      orderBy: { generatedAt: 'desc' }
    });

    res.json({ cvs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download CV
router.get('/download/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    const cv = await prisma.cVGeneration.findFirst({
      where: {
        id: id,
        studentId: user.student.id
      }
    });

    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }

    const filePath = path.join(__dirname, '../..', cv.fileUrl);
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;