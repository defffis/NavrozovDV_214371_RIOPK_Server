const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // In production, specify the exact origin
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const PORT = process.env.PORT || 5001;

const supplierRoutes = require('./routes/supplierRoutes');
const clientRoutes = require('./routes/clientRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const cartRoutes = require('./routes/cartRoutes');
const contractRoutes = require('./routes/contractRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const taskRoutes = require('./routes/taskRoutes');

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Join a room based on userId
    socket.on('join', (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`User ${userId} joined personal room`);
        }
    });
    
    // Leave room when disconnecting
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Export socket.io instance for use in other files
app.set('io', io);

app.use(cors());
app.use(express.json());

// Setting default MongoDB URI for local development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supplier_management';
console.log(`Attempting to connect to MongoDB at: ${MONGODB_URI}`);

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => {
        console.error('MongoDB connection error:', err.message);
        console.warn('Continuing with application startup despite MongoDB connection failure');
    });

// Важно! Поместим пути API admin перед другими маршрутами, 
// чтобы они имели приоритет при совпадении URL
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tasks', taskRoutes);

// Обслуживание статических файлов React в production
if (process.env.NODE_ENV === 'production') {
    // Указываем Express на папку со сборкой React-приложения
    app.use(express.static(path.join(__dirname, '../client/build')));

    // Для всех остальных GET-запросов, не соответствующих API, отдаем index.html
    // Это нужно для корректной работы клиентского роутинга React
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
    });
}

// Начальная генерация аналитики при запуске сервера
const analyticsService = require('./services/analyticsService');
app.once('ready', async () => {
    try {
        // Skip analytics generation if MongoDB isn't connected
        if (mongoose.connection.readyState !== 1) {
            console.warn('MongoDB not connected, skipping initial analytics generation');
            return;
        }
        
        console.log('Generating initial analytics data...');
        await analyticsService.generateDailyAnalytics();
        console.log('Initial analytics data generated successfully');
    } catch (error) {
        console.error('Error generating initial analytics data:', error);
        console.warn('Continuing application execution despite analytics generation failure');
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    app.emit('ready');
});