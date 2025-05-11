const mongoose = require('mongoose');

// Схема для элемента корзины
const CartItemSchema = new mongoose.Schema({
    productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Количество не может быть меньше 1'],
        default: 1,
    },
    unitPrice: { // Цена за единицу на момент добавления в корзину
        type: Number,
        required: true,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

// Виртуальное свойство для общей стоимости элемента корзины
CartItemSchema.virtual('totalPrice').get(function() {
    return this.quantity * this.unitPrice;
});

// Схема корзины
const CartSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', // Убедитесь, что у вас есть модель User или замените на Client/Supplier/Employee
        required: true,
        unique: true // У одного пользователя одна корзина
    },
    items: [CartItemSchema], // Массив элементов корзины
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true, // Добавляет createdAt и updatedAt
    toJSON: { virtuals: true }, // Включаем виртуальные поля при сериализации в JSON
    toObject: { virtuals: true } // Включаем виртуальные поля при преобразовании в объект
});

// Виртуальное свойство для общей суммы корзины (subtotal)
CartSchema.virtual('subtotal').get(function() {
    return this.items.reduce((total, item) => {
        return total + item.totalPrice; // Используем виртуальное totalPrice из CartItemSchema
    }, 0);
});

// Обновляем поле updatedAt при каждом сохранении
CartSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Cart', CartSchema);