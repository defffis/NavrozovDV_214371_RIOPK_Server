const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    password: { type: String, required: true },
    
    // BI-аналитика и дополнительные поля
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reliability: { type: Number, default: 0, min: 0, max: 100 }, // Надежность в процентах
    categories: [{ type: String }], // Категории поставляемых товаров
    avgDeliveryTime: { type: Number }, // Среднее время доставки в днях
    
    // История сотрудничества
    performanceHistory: [{
        month: String, // формат "YYYY-MM"
        onTimeDelivery: { type: Number, default: 0 }, // Количество своевременных доставок
        lateDelivery: { type: Number, default: 0 }, // Количество просроченных доставок
        qualityIssues: { type: Number, default: 0 }, // Количество проблем с качеством
        totalOrders: { type: Number, default: 0 } // Общее количество заказов
    }],
    
    // Финансовые показатели
    priceCompetitiveness: { type: Number, default: 0, min: 0, max: 100 }, // Конкурентоспособность цен
    paymentTerms: { type: String },
});

module.exports = mongoose.model('Supplier', SupplierSchema);