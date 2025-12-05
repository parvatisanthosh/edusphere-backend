const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NotificationService {
  constructor() {
    this.fast2smsApiKey = process.env.FAST2SMS_API_KEY;
    this.fast2smsBaseUrl = 'https://www.fast2sms.com/dev/bulkV2';
    
    // WhatsApp API (we'll use free alternative)
    this.whatsappEnabled = false; // Set to true when you configure
  }

  /**
   * Main function to send notification via multiple channels
   */
  async sendNotification(id, notificationData) { // CHANGED: userId -> id
    try {
      const { title, message, type, channels = ['IN_APP'] } = notificationData;

      // Get user details
      const user = await prisma.users.findUnique({
        where: { id: id }, // CHANGED: userId -> id
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create notification in database
      const notification = await prisma.notifications.create({
        data: {
          title,
          message,
          created_at: new Date()
        }
      });

      // Link to user
      const userNotification = await prisma.user_notifications.create({
        data: {
          user_id: id, // CHANGED: userId -> id
          notification_id: notification.id, // FIX: notification.userId -> notification.id
          isRead: false
        }
      });

      const results = {
        notificationId: notification.id, // FIX: notification.userId -> notification.id
        inApp: true,
        sms: false,
        whatsapp: false,
        email: false
      };

      // Send via SMS if phone exists and channel requested
      if (user.phone && (channels.includes('SMS') || channels.includes('ALL'))) {
        const smsResult = await this.sendSMS(user.phone, message);
        results.sms = smsResult.success;
        
        // Update notification delivery status
        await prisma.notifications.update({
          where: { id: notification.id }, // FIX: notification.userId -> notification.id
          data: {
            smsDelivered: smsResult.success,
            deliveryError: smsResult.error || null
          }
        });

        // Update user notification
        await prisma.user_notifications.update({
          where: { id: userNotification.id }, // FIX: userNotification.userId -> userNotification.id
          data: { deliveredViaSMS: smsResult.success }
        });
      }

      // Send via WhatsApp (if configured)
      if (user.phone && this.whatsappEnabled && (channels.includes('WHATSAPP') || channels.includes('ALL'))) {
        const whatsappResult = await this.sendWhatsApp(user.phone, message);
        results.whatsapp = whatsappResult.success;
        
        await prisma.notifications.update({
          where: { id: notification.id },
          data: { whatsappDelivered: whatsappResult.success }
        });

        await prisma.user_notifications.update({
          where: { id: userNotification.id },
          data: { deliveredViaWhatsApp: whatsappResult.success }
        });
      }

      console.log(`✅ Notification sent to ${user.displayName}:`, results);
      return results;

    } catch (error) {
      console.error('❌ Notification error:', error);
      throw error;
    }
  }

  /**
   * Send SMS via Fast2SMS
   */
  async sendSMS(phoneNumber, message) {
    try {
      if (!this.fast2smsApiKey) {
        console.log('⚠️ Fast2SMS API key not configured');
        return { success: false, error: 'API key not configured' };
      }

      // Clean phone number (remove +91 if present)
      const cleanPhone = phoneNumber.replace(/^\+91/, '').replace(/\s/g, '');

      // Fast2SMS has 160 character limit
      const truncatedMessage = message.length > 160 
        ? message.substring(0, 157) + '...' 
        : message;

      const response = await axios.get(this.fast2smsBaseUrl, {
        params: {
          authorization: this.fast2smsApiKey,
          route: 'q', // Quick transactional route
          message: truncatedMessage,
          language: 'english',
          flash: 0,
          numbers: cleanPhone
        }
      });

      if (response.data.return === true) {
        console.log(`✅ SMS sent to ${cleanPhone}`);
        return { success: true, messageId: response.data.message };
      } else {
        console.log(`❌ SMS failed:`, response.data);
        return { success: false, error: response.data.message };
      }

    } catch (error) {
      console.error('❌ SMS error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send WhatsApp message (using CallMeBot - FREE alternative)
   */
  async sendWhatsApp(phoneNumber, message) {
    try {
      // CallMeBot is free but requires one-time setup
      // For hackathon, we'll return mock success
      // In production, integrate proper WhatsApp Business API
      
      console.log(`📱 WhatsApp message queued for ${phoneNumber}: ${message}`);
      
      // Simulate success for demo
      return { success: true, provider: 'demo' };

    } catch (error) {
      console.error('❌ WhatsApp error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotification(ids, notificationData) { // CHANGED: userIds -> ids
    const results = [];
    
    for (const id of ids) { // CHANGED: userId of userIds -> id of ids
      try {
        const result = await this.sendNotification(id, notificationData); // CHANGED: userId -> id
        results.push({ id, success: true, result }); // CHANGED: userId -> id
      } catch (error) {
        results.push({ id, success: false, error: error.message }); // CHANGED: userId -> id
      }
    }

    return results;
  }

  /**
   * Template-based notifications for common scenarios
   */
  async sendApplicationStatusUpdate(applicationId, newStatus) {
    try {
      const application = await prisma.internship_applications.findUnique({
        where: { id: applicationId },
        include: {
          student: {
            include: {
              user: true
            }
          },
          internship: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const messages = {
        SHORTLISTED: `🎉 Great news! You've been shortlisted for ${application.internship.title}. Check your dashboard for next steps.`,
        SELECTED: `🎊 Congratulations! You've been selected for ${application.internship.title} internship. Welcome aboard!`,
        REJECTED: `Thank you for applying to ${application.internship.title}. Unfortunately, we've moved forward with other candidates. Keep applying!`
      };

      const message = messages[newStatus] || `Your application status for ${application.internship.title} has been updated to ${newStatus}.`;

      return await this.sendNotification(application.student.user.id, { // CHANGED: application.student.userId -> application.student.user.id
        title: 'Application Status Update',
        message: message,
        type: 'APPLICATION_STATUS',
        channels: ['IN_APP', 'SMS'] // Send via app + SMS
      });

    } catch (error) {
      console.error('Error sending application update:', error);
      throw error;
    }
  }

  async sendInterviewReminder(sessionId) {
    try {
      const session = await prisma.mentorSessions.findUnique({
        where: { id: sessionId },
        include: {
          student: {
            include: { user: true }
          },
          mentor: {
            include: { user: true }
          }
        }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const sessionTime = new Date(session.scheduled_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const message = `⏰ Reminder: Your mentor session with ${session.mentor.user.displayName} is scheduled for ${sessionTime}. Meeting link: ${session.meeting_link || 'Will be shared soon'}`;

      return await this.sendNotification(session.student.user.id, { // CHANGED: session.student.userId -> session.student.user.id
        title: 'Interview Reminder',
        message: message,
        type: 'INTERVIEW_REMINDER',
        channels: ['IN_APP', 'SMS', 'WHATSAPP']
      });

    } catch (error) {
      console.error('Error sending interview reminder:', error);
      throw error;
    }
  }

  async sendNewInternshipMatch(id, internshipId) { // CHANGED: studentId -> id
    try {
      const student = await prisma.profile.findUnique({
        where: { id: id }, // CHANGED: studentId -> id
        include: { user: true }
      });

      const internship = await prisma.internships.findUnique({
        where: { id: internshipId }
      });

      if (!student || !internship) {
        throw new Error('Student or internship not found');
      }

      const message = `🚀 New opportunity! ${internship.title} matches your skills. Location: ${internship.location}. Apply now before deadline!`;

      return await this.sendNotification(student.user.id, { // CHANGED: student.userId -> student.user.id
        title: 'New Internship Match',
        message: message,
        type: 'NEW_INTERNSHIP',
        channels: ['IN_APP', 'SMS']
      });

    } catch (error) {
      console.error('Error sending internship match:', error);
      throw error;
    }
  }

  async sendEvaluationComplete(applicationId) {
    try {
      const application = await prisma.internship_applications.findUnique({
        where: { id: applicationId },
        include: {
          student: {
            include: { user: true }
          },
          internship: true
        }
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const score = application.score || 'N/A';
      const message = `✅ Your internship evaluation for ${application.internship.title} is complete! Score: ${score}/100. Check your dashboard for details.`;

      return await this.sendNotification(application.student.user.id, { // CHANGED: application.student.userId -> application.student.user.id
        title: 'Evaluation Complete',
        message: message,
        type: 'EVALUATION_COMPLETE',
        channels: ['IN_APP', 'SMS']
      });

    } catch (error) {
      console.error('Error sending evaluation notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();