const express = require('express');
const router = express.Router();
const { authenticationMiddleware, ensureAuthenticated } = require('../middleware/auth');
const notificationService = require('../services/notification.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// SEND CUSTOM NOTIFICATION (Admin/Faculty)
// ============================================

router.use(authenticationMiddleware);
router.post('/send', ensureAuthenticated, async (req, res) => {
  try {
    const { id, title, message, type, channels } = req.body; // CHANGED: userId -> id

    if (!id || !title || !message) { // CHANGED: userId -> id
      return res.status(400).json({ error: 'id, title, and message are required' }); // CHANGED: userId -> id
    }

    const result = await notificationService.sendNotification(id, { // CHANGED: userId -> id
      title,
      message,
      type: type || 'SYSTEM',
      channels: channels || ['IN_APP']
    });

    res.json({
      success: true,
      message: 'Notification sent',
      result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ============================================
// SEND BULK NOTIFICATIONS
// ============================================
router.post('/send-bulk', ensureAuthenticated, async (req, res) => {
  try {
    const { ids, title, message, type, channels } = req.body; // CHANGED: userIds -> ids

    if (!ids || !Array.isArray(ids) || !title || !message) { // CHANGED: userIds -> ids
      return res.status(400).json({ error: 'ids (array), title, and message are required' }); // CHANGED: userIds -> ids
    }

    const results = await notificationService.sendBulkNotification(ids, { // CHANGED: userIds -> ids
      title,
      message,
      type: type || 'SYSTEM',
      channels: channels || ['IN_APP']
    });

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Sent to ${successCount}/${ids.length} users`, // CHANGED: userIds -> ids
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

// ============================================
// GET MY NOTIFICATIONS
// ============================================
router.get('/my', ensureAuthenticated, async (req, res) => {
  try {
    // ASSUMPTION: req.user.userId is now req.user.id
    const id = req.user.id; // CHANGED: userId -> id
    const { unreadOnly } = req.query;

    const where = {
      user_id: id // CHANGED: userId -> id
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.user_notifications.findMany({
      where,
      include: {
        notification: true
      },
      orderBy: {
        notification: { created_at: 'desc' }
      },
      take: 50
    });

    // Count unread
    const unreadCount = await prisma.user_notifications.count({
      where: {
        user_id: id, // CHANGED: userId -> id
        isRead: false
      }
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ============================================
// MARK AS READ
// ============================================
router.patch('/:id/read', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    // ASSUMPTION: req.user.userId is now req.user.id
    const authenticatedId = req.user.id; // CHANGED: userId -> id (Renamed to authenticatedId to avoid confusion with req.params.id)

    await prisma.user_notifications.updateMany({
      where: {
        id, // This is the notification ID from the URL parameter
        user_id: authenticatedId // CHANGED: userId -> id
      },
      data: {
        isRead: true,
        read_at: new Date()
      }
    });

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ============================================
// MARK ALL AS READ
// ============================================
router.post('/read-all', ensureAuthenticated, async (req, res) => {
  try {
    // ASSUMPTION: req.user.userId is now req.user.id
    const id = req.user.id; // CHANGED: userId -> id

    await prisma.user_notifications.updateMany({
      where: {
        user_id: id, // CHANGED: userId -> id
        isRead: false
      },
      data: {
        isRead: true,
        read_at: new Date()
      }
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// ============================================
// TEST NOTIFICATION (for demo)
// ============================================
router.post('/test', ensureAuthenticated, async (req, res) => {
  try {
   
    console.log('🔍 DEBUG - req.user:', req.user);
    // ASSUMPTION: req.user.userId is now req.user.id
    const id = req.user.id; // CHANGED: userId -> id
     console.log('🔍 DEBUG - id:', id); // CHANGED: userId -> id
     

    const result = await notificationService.sendNotification(id, { // CHANGED: userId -> id
      title: 'Test Notification',
      message: 'This is a test notification from EduSphere platform. If you receive this SMS, notifications are working!',
      type: 'SYSTEM',
      channels: ['IN_APP', 'SMS']
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;