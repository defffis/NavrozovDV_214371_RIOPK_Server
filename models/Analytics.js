const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
    // Временной период
    period: {
        type: String,
        required: true,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    date: {
        type: Date,
        required: true
    },
    
    // Общие показатели
    totalOrders: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    totalSuppliers: {
        type: Number,
        default: 0
    },
    
    // Показатели эффективности поставок
    deliveryMetrics: {
        onTime: { type: Number, default: 0 },
        delayed: { type: Number, default: 0 },
        averageDeliveryTime: { type: Number, default: 0 }, // в днях
        deliverySuccessRate: { type: Number, default: 0 }, // процент успешных доставок
    },
    
    // Показатели поставщиков
    supplierMetrics: [{
        supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
        totalOrders: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        onTimeDelivery: { type: Number, default: 0 },
        lateDelivery: { type: Number, default: 0 },
        quality: { type: Number, min: 0, max: 100, default: 0 }, // процент качества
        costEfficiency: { type: Number, min: 0, max: 100, default: 0 } // эффективность затрат
    }],
    
    // Показатели продуктов
    productMetrics: [{
        category: { type: String },
        totalSold: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        topProducts: [{
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: { type: Number, default: 0 },
            revenue: { type: Number, default: 0 }
        }]
    }],
    
    // Регионы
    regionMetrics: [{
        region: { type: String },
        orders: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        averageDeliveryTime: { type: Number, default: 0 }
    }],
    
    // Прогнозы
    forecasts: {
        nextPeriodOrders: { type: Number, default: 0 },
        nextPeriodRevenue: { type: Number, default: 0 },
        demandTrend: { type: String, enum: ['rising', 'stable', 'falling'], default: 'stable' },
        supplierRecommendations: [{
            supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
            recommendedAction: { type: String },
            reasoningScore: { type: Number, min: 0, max: 100, default: 0 }
        }]
    },
    
    // KPI панель управления
    kpis: {
        supplierPerformanceIndex: { type: Number, min: 0, max: 100, default: 0 },
        deliveryEfficiencyIndex: { type: Number, min: 0, max: 100, default: 0 },
        inventoryHealthIndex: { type: Number, min: 0, max: 100, default: 0 },
        costOptimizationIndex: { type: Number, min: 0, max: 100, default: 0 },
        customerSatisfactionIndex: { type: Number, min: 0, max: 100, default: 0 }
    },
    
    // Временные метки
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Индексы для быстрого доступа к данным
AnalyticsSchema.index({ period: 1, date: 1 }, { unique: true });
AnalyticsSchema.index({ "supplierMetrics.supplier": 1 });
AnalyticsSchema.index({ "productMetrics.category": 1 });
AnalyticsSchema.index({ "regionMetrics.region": 1 });

module.exports = mongoose.model('Analytics', AnalyticsSchema); 