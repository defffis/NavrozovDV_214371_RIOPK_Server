const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');
const Client = require('../models/Client');
const Supplier = require('../models/Supplier');
const Employee = require('../models/Employee');
// const User = require('../models/User');

// Создаем транспорт для отправки email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Шаблоны уведомлений
const notificationTemplates = {
    NEW_ORDER: {
        subject: 'Новый заказ',
        template: (data) => `
            <h2>Поступил новый заказ #${data.orderId}</h2>
            <p>Сумма заказа: ${data.totalValue.toLocaleString('ru-RU')} ₽</p>
            <p>Пожалуйста, проверьте детали заказа в личном кабинете.</p>
        `
    },
    ORDER_CONFIRMED: {
        subject: 'Заказ подтвержден',
        template: (data) => `
            <h2>Ваш заказ #${data.orderId} подтвержден</h2>
            <p>Заказ передан в обработку. Мы уведомим вас о дальнейших изменениях статуса.</p>
        `
    },
    ORDER_SHIPPED: {
        subject: 'Заказ отправлен',
        template: (data) => `
            <h2>Ваш заказ #${data.orderId} отправлен</h2>
            <p>Заказ передан в службу доставки.</p>
            ${data.trackingNumber ? `<p>Номер для отслеживания: ${data.trackingNumber}</p>` : ''}
        `
    },
    ORDER_DELIVERED: {
        subject: 'Заказ доставлен',
        template: (data) => `
            <h2>Ваш заказ #${data.orderId} доставлен</h2>
            <p>Пожалуйста, подтвердите получение заказа в личном кабинете.</p>
        `
    },
    ORDER_ASSIGNED: {
        subject: 'Назначен новый заказ',
        template: (data) => `
            <h2>Вам назначен заказ #${data.orderId}</h2>
            <p>Пожалуйста, ознакомьтесь с деталями заказа в личном кабинете.</p>
        `
    },
    TRACKING_ADDED: {
        subject: 'Добавлен трекинг-номер',
        template: (data) => `
            <h2>Для вашего заказа #${data.orderId} добавлен трекинг-номер</h2>
            <p>Номер для отслеживания: ${data.trackingNumber}</p>
        `
    },
    ORDER_CLAIMED: {
        subject: 'Заказ принят поставщиком',
        template: (data) => `
            <h2>Ваш заказ #${data.orderId} принят поставщиком</h2>
            <p>Поставщик "${data.supplierName}" взял ваш заказ в обработку.</p>
            <p>Мы уведомим вас о дальнейших изменениях статуса заказа.</p>
        `
    }
};

/**
 * Notification Service to handle creating and managing notifications
 */
const notificationService = {
    /**
     * Create a new notification for a user
     * @param {Object} notificationData - Notification data
     * @param {string} notificationData.userId - User ID
     * @param {string} notificationData.title - Notification title
     * @param {string} notificationData.message - Notification message
     * @param {string} notificationData.type - Notification type (order, delivery, inventory, warning, info)
     * @param {string} notificationData.link - Optional link for the notification
     * @param {Object} io - Socket.IO instance (optional)
     * @returns {Promise<Object>} Created notification
     */
    createNotification: async (notificationData, io) => {
        try {
            const notification = new Notification(notificationData);
            await notification.save();
            
            // If Socket.IO instance is provided, emit to the user's room
            if (io && notification.userId) {
                io.to(notification.userId.toString()).emit('new_notification', notification);
            }
            
            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    },

    /**
     * Create notifications for multiple users
     * @param {Array} userIds - Array of user IDs
     * @param {Object} notificationData - Notification data without userId
     * @param {Object} io - Socket.IO instance (optional)
     * @returns {Promise<Array>} Created notifications
     */
    createNotificationForMultipleUsers: async (userIds, notificationData, io) => {
        try {
            const notifications = userIds.map(userId => ({
                userId,
                ...notificationData
            }));
            
            const createdNotifications = await Notification.insertMany(notifications);
            
            // If Socket.IO instance is provided, emit to each user's room
            if (io) {
                createdNotifications.forEach(notification => {
                    io.to(notification.userId.toString()).emit('new_notification', notification);
                });
            }
            
            return createdNotifications;
        } catch (error) {
            console.error('Error creating notifications for multiple users:', error);
            throw error;
        }
    },

    /**
     * Count unread notifications for a user
     * @param {string} userId - User ID
     * @returns {Promise<number>} Count of unread notifications
     */
    countUnreadNotifications: async (userId) => {
        try {
            return await Notification.countDocuments({ 
                userId, 
                isRead: false 
            });
        } catch (error) {
            console.error('Error counting unread notifications:', error);
            throw error;
        }
    },

    /**
     * Create a system notification for all users or users with specific roles
     * @param {Object} notificationData - Notification data
     * @param {Array} roles - Optional array of roles to send notification to
     * @param {Object} io - Socket.IO instance (optional)
     * @returns {Promise<Array>} Created notifications
     */
    createSystemNotification: async (notificationData, roles = null, io) => {
        try {
            // This would require User model to find users by roles
            // For now, it's a placeholder
            // const query = roles ? { role: { $in: roles } } : {};
            // const users = await User.find(query).select('_id');
            // const userIds = users.map(user => user._id);
            
            // return await notificationService.createNotificationForMultipleUsers(
            //     userIds, 
            //     notificationData,
            //     io
            // );
            
            // For now, just log that we would create system notifications
            console.log('Would create system notification:', notificationData, 'for roles:', roles);
            return [];
        } catch (error) {
            console.error('Error creating system notification:', error);
            throw error;
        }
    },
    
    /**
     * Mark notification as read
     * @param {string} notificationId - Notification ID
     * @param {string} userId - User ID
     * @param {Object} io - Socket.IO instance (optional)
     * @returns {Promise<Object>} Updated notification
     */
    markAsRead: async (notificationId, userId, io) => {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, userId },
                { isRead: true },
                { new: true }
            );
            
            if (!notification) {
                throw new Error('Notification not found');
            }
            
            // If Socket.IO instance is provided, emit to the user's room
            if (io) {
                io.to(userId.toString()).emit('notification_read', notificationId);
            }
            
            return notification;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },
    
    /**
     * Mark all notifications as read for a user
     * @param {string} userId - User ID
     * @param {Object} io - Socket.IO instance (optional)
     * @returns {Promise<Object>} Result
     */
    markAllAsRead: async (userId, io) => {
        try {
            const result = await Notification.updateMany(
                { userId, isRead: false },
                { isRead: true }
            );
            
            // If Socket.IO instance is provided, emit to the user's room
            if (io) {
                io.to(userId.toString()).emit('all_notifications_read');
            }
            
            return result;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    },
    
    /**
     * Delete a notification
     * @param {string} notificationId - Notification ID
     * @param {string} userId - User ID
     * @param {Object} io - Socket.IO instance (optional)
     * @returns {Promise<Object>} Result
     */
    deleteNotification: async (notificationId, userId, io) => {
        try {
            const notification = await Notification.findOneAndDelete({
                _id: notificationId,
                userId
            });
            
            if (!notification) {
                throw new Error('Notification not found');
            }
            
            // If Socket.IO instance is provided, emit to the user's room
            if (io) {
                io.to(userId.toString()).emit('notification_deleted', notificationId);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
};

/**
 * Отправляет уведомление пользователю
 * @param {Object} notification - Объект с данными уведомления
 * @param {string} notification.type - Тип уведомления
 * @param {string} notification.recipient - ID получателя
 * @param {Object} notification.data - Данные для шаблона
 * @returns {Promise<void>}
 */
const sendNotification = async (notification) => {
    try {
        const { type, recipient, data } = notification;
        const template = notificationTemplates[type];

        if (!template) {
            throw new Error(`Unknown notification type: ${type}`);
        }

        // Try to find the user in any of the user collections
        let user = null;
        let userEmail = null;

        // For development/testing mode, we'll log but not actually send email
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] Would send ${type} notification to ${recipient}:`, data);
            
            // Create an in-app notification anyway
            try {
                await notificationService.createNotification({
                    userId: recipient,
                    title: template.subject,
                    message: `Notification about order #${data.orderId}`,
                    type: 'order',
                    link: `/orders/${data.orderId}`
                });
                console.log(`[DEV] Created in-app notification for ${recipient}`);
            } catch (err) {
                console.error('[DEV] Failed to create in-app notification:', err);
            }
            
            return;
        }

        // Try to find the user in Client collection
        user = await Client.findById(recipient);
        if (user && user.email) {
            userEmail = user.email;
        } else {
            // Try Supplier collection
            user = await Supplier.findById(recipient);
            if (user && user.email) {
                userEmail = user.email;
            } else {
                // Try Employee collection
                user = await Employee.findById(recipient);
                if (user && user.email) {
                    userEmail = user.email;
                }
            }
        }

        if (!userEmail) {
            throw new Error(`User not found or no email: ${recipient}`);
        }

        // Отправляем email
        await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: userEmail,
            subject: template.subject,
            html: template.template(data)
        });

        // Если есть подключение к Socket.IO, отправляем уведомление в реальном времени
        const io = global.io;
        if (io) {
            io.to(`user_${recipient}`).emit('notification', {
                type,
                data
            });
        }

        console.log(`Notification sent: ${type} to ${userEmail}`);
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
};

/**
 * Отправляет массовое уведомление группе пользователей
 * @param {Object} notification - Объект с данными уведомления
 * @param {string} notification.type - Тип уведомления
 * @param {Array<string>} notification.recipients - Массив ID получателей
 * @param {Object} notification.data - Данные для шаблона
 * @returns {Promise<void>}
 */
const sendBulkNotification = async (notification) => {
    try {
        const { type, recipients, data } = notification;
        const template = notificationTemplates[type];

        if (!template) {
            throw new Error(`Unknown notification type: ${type}`);
        }

        // For development/testing mode, we'll log but not actually send emails
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] Would send bulk ${type} notification to ${recipients.length} recipients:`, data);
            return;
        }

        // Find all users across different collections
        const clientPromise = Client.find({ _id: { $in: recipients } });
        const supplierPromise = Supplier.find({ _id: { $in: recipients } });
        const employeePromise = Employee.find({ _id: { $in: recipients } });

        const [clients, suppliers, employees] = await Promise.all([
            clientPromise,
            supplierPromise,
            employeePromise
        ]);

        // Combine all users with valid emails
        const validUsers = [
            ...clients.filter(user => user.email),
            ...suppliers.filter(user => user.email),
            ...employees.filter(user => user.email)
        ];

        // Отправляем email всем пользователям
        const emailPromises = validUsers.map(user => 
            transporter.sendMail({
                from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
                to: user.email,
                subject: template.subject,
                html: template.template(data)
            })
        );

        await Promise.all(emailPromises);

        // Отправляем уведомления через Socket.IO
        const io = global.io;
        if (io) {
            validUsers.forEach(user => {
                io.to(`user_${user._id}`).emit('notification', {
                    type,
                    data
                });
            });
        }

        console.log(`Bulk notification sent: ${type} to ${validUsers.length} users`);
    } catch (error) {
        console.error('Error sending bulk notification:', error);
        throw error;
    }
};

module.exports = {
    ...notificationService,
    sendNotification,
    sendBulkNotification
}; 