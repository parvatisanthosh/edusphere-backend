const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ensureAuthenticated, restrictToRole } = require('../middleware/auth');
const notificationService = require('../services/notification.service');

const prisma = new PrismaClient();

// ============================================
// INTERNSHIP APPLICATIONS
// ============================================

// APPLY TO INTERNSHIP
router.post('/:internshipId/apply', ensureAuthenticated, async (req, res) => {
  try {
    const { internshipId } = req.params;
    const { coverLetter, resumeUrl } = req.body;
    const userId = req.user.id;

    // Get student profile
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Check if internship exists
    const internship = await prisma.internships.findUnique({
      where: { id: internshipId }
    });

    if (!internship) {
      return res.status(404).json({ error: 'Internship not found' });
    }

    // Check if already applied
    const existingApplication = await prisma.internship_applications.findFirst({
      where: {
        internship_id: internshipId,
        student_id: profile.id
      }
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'Already applied to this internship' });
    }

    // Create application
    const application = await prisma.internship_applications.create({
      data: {
        internship_id: internshipId,
        student_id: profile.id,
        status: 'APPLIED',
        submission_url: resumeUrl || null,
        applied_at: new Date()
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                displayName: true,
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

// GET MY APPLICATIONS (Student view)
router.get('/my-applications', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const applications = await prisma.internship_applications.findMany({
      where: {
        student_id: profile.id,
        ...(status && { status })
      },
      include: {
        internship: true,
        logbookEntries: {
          orderBy: { date: 'desc' }
        },
        evaluations: {
          include: {
            faculty: {
              include: {
                user: {
                  select: { displayName: true }
                }
              }
            }
          }
        }
      },
      orderBy: { applied_at: 'desc' }
    });

    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// UPDATE APPLICATION STATUS (Admin/Industry only)
router.patch('/applications/:id/status', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['APPLIED', 'SHORTLISTED', 'SELECTED', 'REJECTED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await prisma.internship_applications.update({
      where: { id },
      data: { status }
    });

    // 🆕 SEND NOTIFICATION
    try {
      await notificationService.sendApplicationStatusUpdate(id, status);
    } catch (notifError) {
      console.error('Notification failed:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      message: `Application status updated to ${status}`,
      application
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// ============================================
// LOGBOOK ENTRIES
// ============================================

// ADD LOGBOOK ENTRY
router.post('/applications/:applicationId/logbook', ensureAuthenticated, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { date, taskDone, proofUrl, hours_spent } = req.body;
    const userId = req.user.id;

    if (!date || !taskDone || !hours_spent) {
      return res.status(400).json({ error: 'Date, task description, and hours are required' });
    }

    // Verify application belongs to user
    const application = await prisma.internship_applications.findUnique({
      where: { id: applicationId },
      include: {
        student: true
      }
    });

    if (!application || application.student.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const logEntry = await prisma.logbook_entries.create({
      data: {
        applicationId,
        date: new Date(date),
        taskDone,
        proofUrl: proofUrl || null,
        hours_spent: parseInt(hours_spent)
      }
    });

    res.status(201).json({
      message: 'Logbook entry added successfully',
      logEntry
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add logbook entry' });
  }
});

// GET LOGBOOK ENTRIES FOR APPLICATION
router.get('/applications/:applicationId/logbook', ensureAuthenticated, async (req, res) => {
  try {
    const { applicationId } = req.params;

    const entries = await prisma.logbook_entries.findMany({
      where: { applicationId },
      orderBy: { date: 'desc' }
    });

    // Calculate total hours
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours_spent, 0);

    res.json({
      entries,
      totalHours,
      entriesCount: entries.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch logbook entries' });
  }
});

// UPDATE LOGBOOK ENTRY
router.put('/logbook/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, taskDone, proofUrl, hours_spent } = req.body;

    const updateData = {};
    if (date) updateData.date = new Date(date);
    if (taskDone) updateData.taskDone = taskDone;
    if (proofUrl !== undefined) updateData.proofUrl = proofUrl;
    if (hours_spent) updateData.hours_spent = parseInt(hours_spent);

    const entry = await prisma.logbook_entries.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Logbook entry updated',
      entry
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update logbook entry' });
  }
});

// DELETE LOGBOOK ENTRY
router.delete('/logbook/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.logbook_entries.delete({
      where: { id }
    });

    res.json({ message: 'Logbook entry deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete logbook entry' });
  }
});

// ============================================
// FACULTY EVALUATION
// ============================================

// CREATE/UPDATE EVALUATION (Faculty only)
router.post('/applications/:applicationId/evaluate', ensureAuthenticated, restrictToRole('faculty'), async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { rubric_json, comments, final_score } = req.body;
    const userId = req.user.id;

    // Get faculty profile
    const faculty = await prisma.faculty.findUnique({
      where: { userId }
    });

    if (!faculty) {
      return res.status(403).json({ error: 'Faculty access required' });
    }

    // Check if evaluation already exists
    const existingEval = await prisma.internship_evaluation.findFirst({
      where: {
        application_id: applicationId,
        faculty_id: faculty.id
      }
    });

    let evaluation;

    if (existingEval) {
      // Update existing evaluation
      evaluation = await prisma.internship_evaluation.update({
        where: { id: existingEval.id },
        data: {
          rubric_json,
          comments,
          final_score: final_score ? parseFloat(final_score) : null
        }
      });
    } else {
      // Create new evaluation
      evaluation = await prisma.internship_evaluation.create({
        data: {
          application_id: applicationId,
          faculty_id: faculty.id,
          rubric_json,
          comments,
          final_score: final_score ? parseFloat(final_score) : null
        }
      });
    }

    // Update application score
    await prisma.internship_applications.update({
      where: { id: applicationId },
      data: { score: final_score ? parseFloat(final_score) : null }
    });

    // Award credits based on score (if completed)
    if (final_score) {
      const score = parseFloat(final_score);
      let credits = 0;
      
      if (score >= 90) credits = 50;
      else if (score >= 80) credits = 40;
      else if (score >= 70) credits = 30;
      else if (score >= 60) credits = 20;

      if (credits > 0) {
        const application = await prisma.internship_applications.findUnique({
          where: { id: applicationId },
          include: { student: true }
        });

        // Find existing credits record
        const existingCredits = await prisma.credits.findFirst({
          where: { student_id: application.student_id }
        });

        if (existingCredits) {
          // Update existing
          await prisma.credits.update({
            where: { id: existingCredits.id },
            data: {
              credits_earned: { increment: credits }
            }
          });
        } else {
          // Create new
          await prisma.credits.create({
            data: {
              student_id: application.student_id,
              credits_earned: credits
            }
          });
        }
      }
    }

    res.json({
      message: 'Evaluation saved successfully',
      evaluation
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save evaluation' });
  }
});

// GET EVALUATIONS FOR APPLICATION
router.get('/applications/:applicationId/evaluations', ensureAuthenticated, async (req, res) => {
  try {
    const { applicationId } = req.params;

    const evaluations = await prisma.internship_evaluation.findMany({
      where: { application_id: applicationId },
      include: {
        faculty: {
          include: {
            user: {
              select: {
                displayName: true,
                email: true
              }
            }
          }
        }
      }
    });

    res.json({ evaluations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

// GET APPLICATIONS TO EVALUATE (Faculty view)
router.get('/faculty/applications-to-evaluate', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const faculty = await prisma.faculty.findUnique({
      where: { userId }
    });

    if (!faculty) {
      return res.status(403).json({ error: 'Faculty access required' });
    }

    // Get students assigned to this faculty
    const students = await prisma.profile.findMany({
      where: { facultyId: faculty.id },
      include: {
        internshipApplications: {
          where: {
            status: 'SELECTED'
          },
          include: {
            internship: true,
            logbookEntries: true,
            evaluations: {
              where: {
                faculty_id: faculty.id
              }
            }
          }
        }
      }
    });

    // Flatten applications
    const applications = [];
    students.forEach(student => {
      student.internshipApplications.forEach(app => {
        applications.push({
          ...app,
          student: {
            id: student.id,
            userId: student.userId,
            user: student.user
          }
        });
      });
    });

    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ============================================
// CERTIFICATES
// ============================================

// GENERATE CERTIFICATE (admin/faculty only)
router.post('/applications/:applicationId/certificate', ensureAuthenticated, restrictToRole('faculty'), async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await prisma.internship_applications.findUnique({
      where: { id: applicationId },
      include: {
        internship: true,
        student: {
          include: {
            user: true
          }
        }
      }
    });

    if (!application || !application.score) {
      return res.status(400).json({ error: 'Application must be evaluated first' });
    }

    const certificate = await prisma.certificates.create({
      data: {
        student_id: application.student_id,
        title: `${application.internship.title} - Internship Completion`,
        certificateUrl: `/certificates/${applicationId}.pdf`,
        issuedAt: new Date()
      }
    });

    res.status(201).json({
      message: 'Certificate generated',
      certificate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

module.exports = router;