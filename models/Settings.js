const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    general: {
        siteName: {
            type: String,
            default: 'SupplyBI System'
        },
        siteDescription: {
            type: String,
            default: 'Supply Chain Management System'
        },
        maintenanceMode: {
            type: Boolean,
            default: false
        },
        allowRegistration: {
            type: Boolean,
            default: true
        },
        maxUploadSize: {
            type: Number,
            default: 5
        },
        defaultCurrency: {
            type: String,
            default: 'USD'
        }
    },
    email: {
        smtpServer: {
            type: String,
            default: ''
        },
        smtpPort: {
            type: Number,
            default: 587
        },
        smtpUsername: {
            type: String,
            default: ''
        },
        smtpPassword: {
            type: String,
            default: ''
        },
        senderEmail: {
            type: String,
            default: ''
        },
        senderName: {
            type: String,
            default: 'SupplyBI System'
        }
    },
    security: {
        sessionTimeout: {
            type: Number,
            default: 60
        },
        maxLoginAttempts: {
            type: Number,
            default: 5
        },
        passwordResetExpiry: {
            type: Number,
            default: 24
        },
        requireEmailVerification: {
            type: Boolean,
            default: true
        },
        twoFactorAuth: {
            type: Boolean,
            default: false
        }
    },
    notifications: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        smsNotifications: {
            type: Boolean,
            default: false
        },
        orderStatusChanges: {
            type: Boolean,
            default: true
        },
        newOrderNotification: {
            type: Boolean,
            default: true
        },
        paymentNotification: {
            type: Boolean,
            default: true
        },
        systemAlerts: {
            type: Boolean,
            default: true
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema); 