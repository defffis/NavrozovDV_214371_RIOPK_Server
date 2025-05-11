const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    sku: { // Stock Keeping Unit
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true,
        index: true
    },
    price: { // Selling price
        type: Number,
        required: true,
        min: 0
    },
    cost: { // Cost price
        type: Number,
        required: true,
        min: 0
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true
    },
    stockQuantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    reorderLevel: { // Threshold to trigger reorder
        type: Number,
        default: 0,
        min: 0
    },
    targetStockLevel: { // Desired stock level
        type: Number,
        default: 0,
        min: 0
    },
    unitOfMeasure: { // e.g., pcs, kg, liter
        type: String,
        default: 'pcs'
    },
    lastStockUpdate: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    dimensions: { // Optional: for logistics planning
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        weight: { type: Number, min: 0 }
    },
    // Removed status, statusHistory, and employee as they are order-specific
    // and not general product attributes.
    // Order model's products array already captures product details per order.
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

// Index for frequently queried fields
productSchema.index({ name: 'text', description: 'text', category: 'text', sku: 'text' });

// Method to update stock (could be expanded for logging)
productSchema.methods.updateStock = async function(quantityChange) {
    this.stockQuantity += quantityChange;
    this.lastStockUpdate = Date.now();
    // Add logic here for reorder level checks if needed, or trigger events
    if (this.stockQuantity < this.reorderLevel) {
        console.warn(`Product ${this.name} (SKU: ${this.sku}) is below reorder level. Current stock: ${this.stockQuantity}, Reorder level: ${this.reorderLevel}`);
        // Potentially emit an event or create a notification
    }
    return await this.save();
};

module.exports = mongoose.model('Product', productSchema);