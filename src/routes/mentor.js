const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// MENTOR MANAGEMENT
// ============================================

// REGISTER AS MENTOR
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { expertise, bio } = req.body;
    const userId = req.user.userId;

    // Check if already a mentor
    const existingMentor = await prisma.mentor.findUnique({
      where: { userId }
    });

    if (existingMentor) {
      return res.status(400).json({ error: 'Already registered as mentor' });
    }

    const mentor = await prisma.mentor.create({
      data: {
        userId,
        expertise,
        bio
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      message: 'Mentor registration successful',
      mentor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register as mentor' });
  }
});

// GET ALL MENTORS
router.get('/', async (req, res) => {
  try {
    const { expertise } = req.query;

    const mentors = await prisma.mentor.findMany({
      where: expertise ? { expertise: { contains: expertise } } : undefined,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { sessions: true, reviews: true }
        }
      },
      orderBy: { rating: 'desc' }
    });

    res.json({ mentors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// GET MENTOR BY ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const mentor = await prisma.mentor.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        reviews: {
          include: {
            student: {
              include: {
                user: {
                  select: { name: true }
                }
              }
            }
          },
          orderBy: { id: 'desc' }
        },
        sessions: {
          where: { status: 'completed' },
          orderBy: { scheduledAt: 'desc' }
        }
      }
    });

    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    res.json({ mentor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch mentor details' });
  }
});

// UPDATE MENTOR PROFILE
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { expertise, bio } = req.body;
    const userId = req.user.userId;

    // Verify ownership
    const mentor = await prisma.mentor.findUnique({
      where: { id }
    });

    if (!mentor || mentor.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.mentor.update({
      where: { id },
      data: { expertise, bio }
    });

    res.json({ message: 'Mentor profile updated', mentor: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================
// MENTOR SESSIONS
// ============================================

// BOOK MENTOR SESSION
router.post('/sessions', authenticateToken, async (req, res) => {
  try {
    const { mentorId, scheduledAt, meetingLink } = req.body;
    const userId = req.user.userId;

    // Get student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.student) {
      return res.status(400).json({ error: 'Student profile required' });
    }

    const session = await prisma.mentorSession.create({
      data: {
        studentId: user.student.id,
        mentorId,
        scheduledAt: new Date(scheduledAt),
        meetingLink,
        status: 'scheduled'
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } }
          }
        },
        mentor: {
          select: { name: true, email: true }
        }
      }
    });

    res.status(201).json({
      message: 'Session booked successfully',
      session
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to book session' });
  }
});

// GET MY SESSIONS (Student)
router.get('/sessions/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const sessions = await prisma.mentorSession.findMany({
      where: { studentId: user.student.id },
      include: {
        mentor: {
          select: { name: true, email: true }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });

    res.json({ sessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// UPDATE SESSION STATUS
router.patch('/sessions/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const validStatuses = ['scheduled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify the session belongs to user (as mentor or student)
    const session = await prisma.mentorSession.findUnique({
      where: { id },
      include: {
        student: true,
        mentor: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const isMentor = session.mentor.id === userId;
    const isStudent = session.student.userId === userId;

    if (!isMentor && !isStudent) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.mentorSession.update({
      where: { id },
      data: { status }
    });

    res.json({ message: 'Session updated', session: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// ============================================
// MENTOR REVIEWS
// ============================================

// ADD REVIEW FOR MENTOR
router.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const { mentorId, rating, reviews } = req.body;
    const userId = req.user.userId;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.student) {
      return res.status(400).json({ error: 'Student profile required' });
    }

    // Create review
    const review = await prisma.mentorReview.create({
      data: {
        mentorId,
        studentId: user.student.id,
        rating,
        reviews
      },
      include: {
        student: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    });

    // Update mentor average rating
    const allReviews = await prisma.mentorReview.findMany({
      where: { mentorId }
    });

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.mentor.update({
      where: { id: mentorId },
      data: { rating: avgRating }
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET REVIEWS FOR MENTOR
router.get('/:mentorId/reviews', async (req, res) => {
  try {
    const { mentorId } = req.params;

    const reviews = await prisma.mentorReview.findMany({
      where: { mentorId },
      include: {
        student: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    res.json({ reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ============================================
// CREDITS SYSTEM
// ============================================

// GET STUDENT CREDITS
router.get('/credits/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true }
    });

    if (!user.student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    let credits = await prisma.credit.findUnique({
      where: { studentId: user.student.id }
    });

    if (!credits) {
      credits = await prisma.credit.create({
        data: {
          studentId: user.student.id,
          creditsEarned: 0
        }
      });
    }

    res.json({ credits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

// ADD CREDITS (Admin/Faculty only)
router.post('/credits/:studentId/add', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { amount, reason } = req.body;

    // In production, add admin/faculty check here

    const credits = await prisma.credit.upsert({
      where: { studentId },
      update: {
        creditsEarned: { increment: amount }
      },
      create: {
        studentId,
        creditsEarned: amount
      }
    });

    res.json({
      message: `${amount} credits added`,
      credits
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add credits' });
  }
});

// ============================================
// NOTIFICATIONS
// ============================================

// GET MY NOTIFICATIONS
router.get('/notifications/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const notifications = await prisma.userNotification.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      take: 50
    });

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// MARK NOTIFICATION AS READ
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await prisma.userNotification.updateMany({
      where: {
        id,
        userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

module.exports = router;
