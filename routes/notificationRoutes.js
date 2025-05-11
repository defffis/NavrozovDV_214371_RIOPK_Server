const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const auth = require('../middleware/auth');

// Get all notifications for the current user
router.get('/', auth, async (req, res) => {
    try {
        console.log('[NOTIFICATIONS] Looking for notifications for user:', req.user._id);
        const notifications = await Notification.find({ 
            userId: req.user._id 
        }).sort({ createdAt: -1 });
        
        console.log(`[NOTIFICATIONS] Found ${notifications.length} notifications for user ${req.user._id}`);
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        // Check if notification exists and belongs to the user
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        if (notification.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this notification' });
        }
        
        notification.isRead = true;
        await notification.save();
        
        res.json({ success: true, notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        
        // Check if notification exists and belongs to the user
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        if (notification.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this notification' });
        }
        
        // Use findByIdAndDelete instead of remove() which is deprecated
        await Notification.findByIdAndDelete(req.params.id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new notification (admin/system only)
router.post('/', auth, async (req, res) => {
    try {
        // Check if user has admin role (this is a simple example, use proper role checking)
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to create notifications' });
        }
        
        const { userId, title, message, type, link } = req.body;
        
        if (!userId || !title || !message) {
            return res.status(400).json({ message: 'userId, title and message are required' });
        }
        
        const io = req.app.get('io');
        const notification = await notificationService.createNotification({
            userId,
            title,
            message,
            type: type || 'info',
            link
        }, io);
        
        res.json(notification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a system notification for multiple users (admin only)
router.post('/system', auth, async (req, res) => {
    try {
        // Check if user has admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to create system notifications' });
        }
        
        const { userIds, title, message, type, link } = req.body;
        
        if (!userIds || !Array.isArray(userIds) || !title || !message) {
            return res.status(400).json({ message: 'userIds array, title and message are required' });
        }
        
        const io = req.app.get('io');
        const notifications = await notificationService.createNotificationForMultipleUsers(
            userIds,
            {
                title,
                message,
                type: type || 'info',
                link
            },
            io
        );
        
        res.json(notifications);
    } catch (error) {
        console.error('Error creating system notifications:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 