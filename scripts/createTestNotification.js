const mongoose = require('mongoose');
const notificationService = require('../services/notificationService');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
    console.error('Please provide a user ID as an argument');
    process.exit(1);
}

// Create a test notification
async function createTestNotification() {
    try {
        const notification = await notificationService.createNotification({
            userId,
            title: 'Тестовое уведомление',
            message: 'Это тестовое уведомление, созданное для проверки функциональности.',
            type: 'info',
            link: '/dashboard'
        });
        
        console.log('Test notification created successfully:', notification);
        process.exit(0);
    } catch (error) {
        console.error('Error creating test notification:', error);
        process.exit(1);
    }
}

createTestNotification(); 