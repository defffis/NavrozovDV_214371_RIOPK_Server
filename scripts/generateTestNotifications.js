const mongoose = require('mongoose');
const Notification = require('../models/Notification');
require('dotenv').config();

// Test notification data
const testNotifications = [
    {
        title: 'Новый заказ',
        message: 'Поступил новый заказ #12345 от клиента ООО "Сибирь"',
        type: 'order',
        link: '/orders/12345'
    },
    {
        title: 'Проблема с доставкой',
        message: 'Задержка доставки заказа #54321 от поставщика "Восточный союз"',
        type: 'warning',
        link: '/deliveries/54321'
    },
    {
        title: 'Новый поставщик',
        message: 'Был зарегистрирован новый поставщик "ТрансСнаб"',
        type: 'info',
        link: '/suppliers/789'
    },
    {
        title: 'Низкий запас продукции',
        message: 'Товар "Гайки М10" (SKU: 567890) заканчивается на складе',
        type: 'inventory',
        link: '/products/567890'
    },
    {
        title: 'Обновление системы',
        message: 'Система будет обновлена 15 ноября. Возможны кратковременные перебои в работе.',
        type: 'info'
    }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Function to generate notifications for a user
async function generateNotificationsForUser(userId) {
    try {
        // Delete existing notifications for this user
        await Notification.deleteMany({ userId });
        
        // Create new notifications
        const notifications = testNotifications.map(notification => ({
            ...notification,
            userId,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)), // Random date within last week
            isRead: Math.random() > 0.7 // 30% chance of being read
        }));
        
        // Save to database
        await Notification.insertMany(notifications);
        
        console.log(`Successfully generated ${notifications.length} test notifications for user ${userId}`);
    } catch (error) {
        console.error('Error generating test notifications:', error);
    }
}

// Usage: node generateTestNotifications.js <userId>
const userId = process.argv[2];

if (!userId) {
    console.error('Please provide a user ID as an argument');
    process.exit(1);
}

generateNotificationsForUser(userId)
    .then(() => {
        console.log('Notification generation completed');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    }); 