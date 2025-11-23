const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ensureAuthenticated } = require('../middleware/auth');

const prisma = new PrismaClient();

// ============================================
// ROADMAP MANAGEMENT
// ============================================

// CREATE ROADMAP (Faculty/Admin only)
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { title, description, domain } = req.body;

    if (!title || !description || !domain) {
      return res.status(400).json({ error: 'Title, description, and domain are required' });
    }

    const roadmap = await prisma.roadmaps.create({
      data: {
        title,
        description,
        domain
      }
    });

    res.status(201).json({
      message: 'Roadmap created successfully',
      roadmap
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create roadmap' });
  }
});

// GET ALL ROADMAPS (with optional domain filter)
router.get('/', async (req, res) => {
  try {
    const { domain } = req.query;

    const roadmaps = await prisma.roadmaps.findMany({
      where: domain ? { domain } : undefined,
      include: {
        checkpoints: {
          orderBy: { id: 'asc' }
        },
        _count: {
          select: { checkpoints: true }
        }
      },
      orderBy: { title: 'asc' }
    });

    res.json({ roadmaps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch roadmaps' });
  }
});

router.get('/my-progress', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const progress = await prisma.studentLearningProgress.findMany({
      where: { profileId: profile.id },
      include: {
        checkpoint: {
          include: {
            roadmap: {
              select: {
                id: true,
                title: true,
                domain: true
              }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    // Group by roadmap
    const progressByRoadmap = {};
    progress.forEach(p => {
      const roadmapId = p.checkpoint.roadmap.id;
      if (!progressByRoadmap[roadmapId]) {
        progressByRoadmap[roadmapId] = {
          roadmap: p.checkpoint.roadmap,
          total: 0,
          completed: 0,
          checkpoints: []
        };
      }
      progressByRoadmap[roadmapId].total++;
      if (p.isCompleted) progressByRoadmap[roadmapId].completed++;
      progressByRoadmap[roadmapId].checkpoints.push(p);
    });

    // Calculate percentages
    Object.keys(progressByRoadmap).forEach(key => {
      const data = progressByRoadmap[key];
      data.progressPercentage = data.total > 0 
        ? Math.round((data.completed / data.total) * 100)
        : 0;
    });

    res.json({
      progress: Object.values(progressByRoadmap)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topLearners = await prisma.credits.findMany({
      take: parseInt(limit),
      orderBy: { credits_earned: 'desc' },
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
        }
      }
    });

    res.json({ leaderboard: topLearners });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});


// GET ROADMAP BY ID (with checkpoints and student progress)
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get student profile
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    const roadmap = await prisma.roadmaps.findUnique({
      where: { id },
      include: {
        checkpoints: {
          include: {
            progress: profile ? {
              where: { profileId: profile.id }
            } : false
          },
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Calculate overall progress if student profile exists
    if (profile && roadmap.checkpoints.length > 0) {
      const completedCount = roadmap.checkpoints.filter(
        cp => cp.progress?.[0]?.isCompleted
      ).length;
      roadmap.progressPercentage = Math.round((completedCount / roadmap.checkpoints.length) * 100);
    }

    res.json({ roadmap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

// ============================================
// CHECKPOINT MANAGEMENT
// ============================================

// ADD CHECKPOINT TO ROADMAP
router.post('/:roadmapId/checkpoints', ensureAuthenticated, async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { title, description, resourceType, resourceUrl } = req.body;

    if (!title || !description || !resourceType || !resourceUrl) {
      return res.status(400).json({ error: 'All checkpoint fields are required' });
    }

    const checkpoint = await prisma.checkpoints.create({
      data: {
        roadmapId,
        title,
        description,
        resourceType,
        resourceUrl
      }
    });

    res.status(201).json({
      message: 'Checkpoint added successfully',
      checkpoint
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add checkpoint' });
  }
});

// UPDATE CHECKPOINT
router.put('/checkpoints/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const checkpoint = await prisma.checkpoints.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Checkpoint updated successfully',
      checkpoint
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update checkpoint' });
  }
});

// DELETE CHECKPOINT
router.delete('/checkpoints/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.checkpoints.delete({
      where: { id }
    });

    res.json({ message: 'Checkpoint deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete checkpoint' });
  }
});

// ============================================
// STUDENT PROGRESS TRACKING
// ============================================

// MARK CHECKPOINT AS COMPLETE/INCOMPLETE
router.post('/checkpoints/:checkpointId/progress', ensureAuthenticated, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    const { isCompleted } = req.body;
    const userId = req.user.id;

    // Get student profile
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Check if progress entry exists
    const existingProgress = await prisma.studentLearningProgress.findFirst({
      where: {
        profileId: profile.id,
        checkpointId
      }
    });

    let progress;

    if (existingProgress) {
      // Update existing progress
      progress = await prisma.studentLearningProgress.update({
        where: { id: existingProgress.id },
        data: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      });
    } else {
      // Create new progress entry
      progress = await prisma.studentLearningProgress.create({
        data: {
          profileId: profile.id,
          checkpointId,
          isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      });
    }

    // Award credits if completed (5 credits per checkpoint)
    if (isCompleted && !existingProgress?.isCompleted) {
      await prisma.credits.upsert({
        where: { student_id: profile.id },
        update: {
          credits_earned: { increment: 5 }
        },
        create: {
          student_id: profile.id,
          credits_earned: 5
        }
      });
    }

    res.json({
      message: isCompleted ? 'Checkpoint marked as complete! +5 credits' : 'Progress updated',
      progress
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// GET STUDENT'S OVERALL PROGRESS


// GET LEADERBOARD (top learners by credits)

module.exports = router;