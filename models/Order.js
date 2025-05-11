const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    products: [{ 
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, 
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number 
    }],
    orderDate: { type: Date, default: Date.now },
    estimatedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    
    // Расширенная информация о статусе
    status: { 
        type: String, 
        enum: [
            'Создан', 
            'Подтвержден', 
            'В обработке', 
            'Отправлен',
            'В пути', 
            'Доставлен', 
            'Получен', 
            'Отменен', 
            'Возвращен'
        ], 
        default: 'Создан' 
    },
    statusHistory: [{
        status: String,
        comment: String,
        timestamp: Date,
        location: String, // локация изменения статуса
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' } // кто изменил статус
    }],
    
    // Финансовая информация
    totalOrderValue: { type: Number, default: 0 },
    paymentStatus: { 
        type: String, 
        enum: ['Не оплачен', 'Частично оплачен', 'Полностью оплачен'], 
        default: 'Не оплачен' 
    },
    paymentMethod: { type: String },
    
    // Логистическая информация
    shippingMethod: { type: String },
    trackingNumber: { type: String },
    shippingCost: { type: Number, default: 0 },
    
    // Временные KPI
    processingTime: { type: Number }, // время обработки в часах
    shippingTime: { type: Number }, // время доставки в днях
    deliveryDelay: { type: Number }, // задержка в днях (если есть)
    
    // Метрики для BI-анализа
    priority: { type: String, enum: ['Низкий', 'Средний', 'Высокий'], default: 'Средний' },
    seasonality: { type: String }, // для анализа сезонных трендов
    region: { type: String }, // регион доставки для географического анализа
    
    // Дополнительная информация
    notes: { type: String },
    isRush: { type: Boolean, default: false }, // срочный заказ
    source: { type: String, enum: ['Веб-сайт', 'Телефон', 'Email', 'Лично'], default: 'Веб-сайт' }
});

// Вычисление временных KPI перед сохранением
OrderSchema.pre('save', function(next) {
    // Автоматический расчет общей стоимости заказа
    if (this.products && this.products.length > 0) {
        this.totalOrderValue = this.products.reduce((total, item) => total + (item.totalPrice || 0), 0);
    }
    
    // Расчет времени обработки и доставки
    if (this.actualDeliveryDate && this.orderDate) {
        const deliveryTime = Math.floor((this.actualDeliveryDate - this.orderDate) / (1000 * 60 * 60 * 24)); // в днях
        this.shippingTime = deliveryTime;
        
        // Проверка на задержку доставки
        if (this.estimatedDeliveryDate) {
            const estimatedDays = Math.floor((this.estimatedDeliveryDate - this.orderDate) / (1000 * 60 * 60 * 24));
            this.deliveryDelay = Math.max(0, deliveryTime - estimatedDays);
        }
    }
    
    next();
});

module.exports = mongoose.model('Order', OrderSchema);