const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticationMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// MENTOR MANAGEMENT
// ============================================

// REGISTER AS MENTOR
router.post('/register', authenticationMiddleware, async (req, res) => {
  try {
    const { expertise, bio } = req.body;
    const userId = req.user.userId;

    // Check if already a mentor
    const existingMentor = await prisma.mentors.findUnique({
      where: { user_id: userId }
    });

    if (existingMentor) {
      return res.status(400).json({ error: 'Already registered as mentor' });
    }

    const mentor = await prisma.mentors.create({
      data: {
        user_id: userId,
        expertise: expertise,
        bio: bio,
        rating: 0
      },
      include: {
        user: {
          select: { id: true, displayName: true, email: true }
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

    const mentors = await prisma.mentors.findMany({
      where: expertise ? { 
        expertise: {
          path: [],
          string_contains: expertise
        }
      } : undefined,
      include: {
        user: {
          select: { id: true, displayName: true, email: true }
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

// UPDATE MENTOR PROFILE
router.put('/:id', authenticationMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { expertise, bio } = req.body;
    const userId = req.user.userId;

    // Verify ownership
    const mentor = await prisma.mentors.findUnique({
      where: { id }
    });

    if (!mentor || mentor.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.mentors.update({
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
router.post('/sessions', authenticationMiddleware, async (req, res) => {
  try {
    const { mentorId, scheduledAt, meetingLink } = req.body;
    const userId = req.user.userId;

    // Get student profile
    const userProfile = await prisma.profile.findUnique({
      where: { userId: userId },
      include: {
        user: {
          select: { displayName: true, email: true }
        }
      }
    });

    if (!userProfile) {
      return res.status(400).json({ error: 'Student profile required' });
    }

    const session = await prisma.mentorSessions.create({
      data: {
        studentId: userProfile.id,
        mentorId: mentorId,
        scheduled_at: new Date(scheduledAt),
        meeting_link: meetingLink,
        status: 'PENDING'
      },
      include: {
        student: {
          include: {
            user: { select: { displayName: true, email: true } }
          }
        },
        mentor: {
          include: {
            user: { select: { displayName: true, email: true } }
          }
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
router.get('/sessions/my', authenticationMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const userProfile = await prisma.profile.findUnique({
      where: { userId: userId }
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const sessions = await prisma.mentorSessions.findMany({
      where: { studentId: userProfile.id },
      include: {
        mentor: {
          include: {
            user: {
              select: { displayName: true, email: true }
            }
          }
        }
      },
      orderBy: { scheduled_at: 'desc' }
    });

    res.json({ sessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// UPDATE SESSION STATUS
router.patch('/sessions/:id/status', authenticationMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const validStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify the session belongs to user (as mentor or student)
    const session = await prisma.mentorSessions.findUnique({
      where: { id },
      include: {
        student: true,
        mentor: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const isMentor = session.mentor.user_id === userId;
    const isStudent = session.student.userId === userId;

    if (!isMentor && !isStudent) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.mentorSessions.update({
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
router.post('/reviews', authenticationMiddleware, async (req, res) => {
  try {
    const { mentorId, rating, review } = req.body;
    const userId = req.user.userId;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Get student profile
    const userProfile = await prisma.profile.findUnique({
      where: { userId: userId }
    });

    if (!userProfile) {
      return res.status(400).json({ error: 'Student profile required' });
    }

    // Create review
    const mentorReview = await prisma.mentorReviews.create({
      data: {
        mentorId: mentorId,
        studentId: userProfile.id,
        rating: rating,
        reviews: review
      },
      include: {
        student: {
          include: {
            user: { select: { displayName: true } }
          }
        }
      }
    });

    // Update mentor average rating
    const allReviews = await prisma.mentorReviews.findMany({
      where: { mentorId }
    });

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.mentors.update({
      where: { id: mentorId },
      data: { rating: avgRating }
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review: mentorReview
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ============================================
// CREDITS SYSTEM
// ============================================

// GET STUDENT CREDITS
router.get('/credits/my', authenticationMiddleware, async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized - Please login' });
    }

    // Try different possible property names from JWT
    const userId = req.user.userId || req.user.id || req.user.sub || req.user.user_id;
    
    console.log('JWT payload:', req.user);
    console.log('Extracted userId:', userId);

    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }

    // Find the user's profile
    const userProfile = await prisma.profile.findUnique({
      where: { userId: userId },
      include: {
        user: {
          select: { id: true, displayName: true, email: true }
        }
      }
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Find credits using student_id
    let credits = await prisma.credits.findFirst({
      where: { student_id: userProfile.id }
    });

    if (!credits) {
      credits = await prisma.credits.create({
        data: {
          student_id: userProfile.id,
          credits_earned: 0
        }
      });
    }

    res.json({ credits });
  } catch (error) {
    console.error('Credits error:', error);
    res.status(500).json({ error: 'Failed to fetch credits', details: error.message });
  }
});

// ADD CREDITS (Admin/Faculty only)
router.post('/credits/:studentId/add', authenticationMiddleware, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { amount, reason } = req.body;

    // In production, add admin/faculty check here

    // Find existing credits
    const existingCredits = await prisma.credits.findFirst({
      where: { student_id: studentId }
    });

    let credits;
    if (existingCredits) {
      credits = await prisma.credits.update({
        where: { id: existingCredits.id },
        data: {
          credits_earned: existingCredits.credits_earned + amount
        }
      });
    } else {
      credits = await prisma.credits.create({
        data: {
          student_id: studentId,
          credits_earned: amount
        }
      });
    }

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
router.get('/notifications/my', authenticationMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const notifications = await prisma.user_notifications.findMany({
      where: { user_id: userId },
      include: {
        notification: true
      },
      orderBy: { notification: { created_at: 'desc' } },
      take: 50
    });

    res.json({ notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// MARK NOTIFICATION AS READ
router.patch('/notifications/:id/read', authenticationMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await prisma.user_notifications.updateMany({
      where: {
        id,
        user_id: userId
      },
      data: {
        isRead: true,
        read_at: new Date()
      }
    });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ============================================
// DYNAMIC ROUTES - MUST BE LAST
// ============================================

// GET MENTOR BY ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const mentor = await prisma.mentors.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, displayName: true, email: true }
        },
        reviews: {
          include: {
            student: {
              include: {
                user: {
                  select: { displayName: true }
                }
              }
            }
          },
          orderBy: { rating: 'desc' }
        },
        sessions: {
          where: { status: 'COMPLETED' },
          orderBy: { scheduled_at: 'desc' }
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

// GET REVIEWS FOR MENTOR
router.get('/:mentorId/reviews', async (req, res) => {
  try {
    const { mentorId } = req.params;

    const reviews = await prisma.mentorReviews.findMany({
      where: { mentorId },
      include: {
        student: {
          include: {
            user: {
              select: { displayName: true }
            }
          }
        }
      },
      orderBy: { rating: 'desc' }
    });

    res.json({ reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;