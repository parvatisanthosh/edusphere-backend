const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// CHAT ROOMS
// ============================================

// CREATE CHAT ROOM
router.post('/rooms', authenticateToken, async (req, res) => {
  try {
    const { name, type, internshipId, participantIds } = req.body;
    const userId = req.user.userId;

    const chatRoom = await prisma.chatRoom.create({
      data: {
        name,
        type,
        internshipId,
        createdBy: userId,
        participants: {
          create: [
            { userId, role: 'admin' },
            ...(participantIds || []).map(id => ({ userId: id, role: 'member' }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Chat room created',
      chatRoom
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// GET USER'S CHAT ROOMS
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    res.json({ chatRooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// GET CHAT ROOM MESSAGES
router.get('/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;
    const { limit = 50, before } = req.query;

    // Check if user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatRoomId: roomId, userId }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        chatRoomId: roomId,
        ...(before && { createdAt: { lt: new Date(before) } })
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // Update last read
    await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() }
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// SEND MESSAGE
router.post('/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    // Check if user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: { chatRoomId: roomId, userId }
    });

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        senderId: userId,
        message
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      message: 'Message sent',
      chatMessage: newMessage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============================================
// DISCUSSION FORUMS
// ============================================

// CREATE FORUM
router.post('/forums', authenticateToken, async (req, res) => {
  try {
    const { topic, description, category } = req.body;
    const userId = req.user.userId;

    const forum = await prisma.discussionForum.create({
      data: {
        topic,
        description,
        category,
        createdBy: userId
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      message: 'Forum created',
      forum
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create forum' });
  }
});

// GET ALL FORUMS
router.get('/forums', async (req, res) => {
  try {
    const { category } = req.query;

    const forums = await prisma.discussionForum.findMany({
      where: category ? { category } : undefined,
      include: {
        creator: {
          select: { id: true, name: true }
        },
        _count: {
          select: { posts: true }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ forums });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch forums' });
  }
});

// GET FORUM POSTS
router.get('/forums/:forumId/posts', async (req, res) => {
  try {
    const { forumId } = req.params;

    // Increment view count
    await prisma.discussionForum.update({
      where: { id: forumId },
      data: { viewCount: { increment: 1 } }
    });

    const forum = await prisma.discussionForum.findUnique({
      where: { id: forumId },
      include: {
        creator: {
          select: { id: true, name: true }
        },
        posts: {
          where: { parentPostId: null },
          include: {
            user: {
              select: { id: true, name: true }
            },
            replies: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    res.json({ forum });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch forum posts' });
  }
});

// CREATE FORUM POST
router.post('/forums/:forumId/posts', authenticateToken, async (req, res) => {
  try {
    const { forumId } = req.params;
    const { content, parentPostId } = req.body;
    const userId = req.user.userId;

    const post = await prisma.forumPost.create({
      data: {
        forumId,
        userId,
        content,
        parentPostId
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      message: 'Post created',
      post
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// UPVOTE POST
router.post('/posts/:postId/upvote', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await prisma.forumPost.update({
      where: { id: postId },
      data: { upvotes: { increment: 1 } }
    });

    res.json({ message: 'Upvoted', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

// ============================================
// DIRECT MESSAGES
// ============================================

// SEND DIRECT MESSAGE
router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { receiverId, subject, body } = req.body;
    const userId = req.user.userId;

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        receiverId,
        subject,
        body
      },
      include: {
        sender: {
          select: { id: true, name: true }
        },
        receiver: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      message: 'Message sent',
      directMessage: message
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET INBOX
router.get('/messages/inbox', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const messages = await prisma.message.findMany({
      where: {
        receiverId: userId,
        deletedAt: null
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// MARK AS READ
router.patch('/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await prisma.message.updateMany({
      where: {
        id: messageId,
        receiverId: userId
      },
      data: { isRead: true }
    });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ============================================
// ANNOUNCEMENTS
// ============================================

// CREATE ANNOUNCEMENT (Admin only)
router.post('/announcements', authenticateToken, async (req, res) => {
  try {
    const { title, content, targetAudience, priority, expiresAt } = req.body;
    const userId = req.user.userId;

    const announcement = await prisma.announcement.create({
      data: {
        postedBy: userId,
        title,
        content,
        targetAudience,
        priority,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    res.status(201).json({
      message: 'Announcement created',
      announcement
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// GET ACTIVE ANNOUNCEMENTS
router.get('/announcements', async (req, res) => {
  try {
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      include: {
        poster: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ announcements });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

module.exports = router;
