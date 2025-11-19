// src/routes/applications.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// APPLY TO INTERNSHIP
router.post('/', async (req, res) => {
  try {
    const {
      studentId,
      internshipId,
      coverLetter,
      resumeUrl
    } = req.body;

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if internship exists and is active
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId }
    });

    if (!internship) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    if (!internship.isActive) {
      return res.status(400).json({ error: 'Internship is not accepting applications' });
    }

    // Check if already applied
    const existingApplication = await prisma.internshipApplication.findUnique({
      where: {
        studentId_internshipId: {
          studentId,
          internshipId
        }
      }
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'Already applied to this internship' });
    }

    // Create application
    const application = await prisma.internshipApplication.create({
      data: {
        studentId,
        internshipId,
        coverLetter,
        resumeUrl,
        status: 'pending'
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        internship: true
      }
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// GET ALL APPLICATIONS (with filters)
router.get('/', async (req, res) => {
  try {
    const { studentId, internshipId, status } = req.query;

    const where = {};
    if (studentId) where.studentId = studentId;
    if (internshipId) where.internshipId = internshipId;
    if (status) where.status = status;

    const applications = await prisma.internshipApplication.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            },
            profile: true
          }
        },
        internship: true
      },
      orderBy: {
        appliedAt: 'desc'
      }
    });

    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET APPLICATION BY ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.internshipApplication.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: true,
            profile: true
          }
        },
        internship: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// UPDATE APPLICATION STATUS
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const validStatuses = ['pending', 'accepted', 'rejected', 'withdrawn'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = {
      status,
      reviewedAt: new Date()
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const application = await prisma.internshipApplication.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          include: {
            user: true
          }
        },
        internship: true
      }
    });

    res.json({
      message: `Application ${status}`,
      application
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// WITHDRAW APPLICATION
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.internshipApplication.update({
      where: { id },
      data: {
        status: 'withdrawn'
      }
    });

    res.json({
      message: 'Application withdrawn',
      application
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

module.exports = router;