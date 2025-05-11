const express = require('express');
const Product = require('../models/Product');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

// @route   POST api/products
// @desc    Create a new product
// @access  Private (Admin, Manager)
router.post('/',  async (req, res) => {
    try {
        const { 
            name, sku, description, category, price, cost, supplier,
            stockQuantity, reorderLevel, targetStockLevel, unitOfMeasure, 
            isActive, imageUrl, dimensions 
        } = req.body;

        // Basic validation (more can be added)
        if (!name || !sku || !price || !cost || !supplier || stockQuantity === undefined) {
            return res.status(400).json({ message: 'Please provide all required fields: name, sku, price, cost, supplier, stockQuantity' });
        }

        const existingProduct = await Product.findOne({ sku });
        if (existingProduct) {
            return res.status(400).json({ message: 'Product with this SKU already exists' });
        }

        const newProduct = new Product({
            name, sku, description, category, price, cost, supplier,
            stockQuantity, reorderLevel, targetStockLevel, unitOfMeasure, 
            isActive, imageUrl, dimensions
        });

        const product = await newProduct.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Server error while creating product' });
    }
});

// @route   GET api/products
// @desc    Get all products (with filtering/pagination options)
// @access  Public (or Private depending on requirements)
router.get('/',   async (req, res) => { // Kept auth for now, can be made public
    try {
        const { category, supplierId, isActive, search, sortBy, order = 'asc', page = 1, limit = 10 } = req.query;
        const filter = {};
        if (category) filter.category = category;
        if (supplierId) filter.supplier = supplierId;
        if (isActive !== undefined) filter.isActive = isActive;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {};
        if (sortBy) sortOptions[sortBy] = order === 'desc' ? -1 : 1;
        else sortOptions.createdAt = -1; // Default sort

        const products = await Product.find(filter)
            .populate('supplier', 'name contactPerson') // Populate supplier details
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const totalProducts = await Product.countDocuments(filter);

        res.json({
            products,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error while fetching products' });
    }
});

// @route   GET api/products/:id
// @desc    Get a single product by ID
// @access  Public (or Private)
router.get('/:id',  async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('supplier', 'name');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found (invalid ID format)' });
        }
        res.status(500).json({ message: 'Server error while fetching product' });
    }
});

// @route   PUT api/products/:id
// @desc    Update a product
// @access  Private (Admin, Manager)
router.put('/:id', async (req, res) => {
    try {
        const { 
            name, sku, description, category, price, cost, supplier,
            stockQuantity, reorderLevel, targetStockLevel, unitOfMeasure, 
            isActive, imageUrl, dimensions
        } = req.body;

        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check for SKU conflict if SKU is being changed
        if (sku && sku !== product.sku) {
            const existingProduct = await Product.findOne({ sku });
            if (existingProduct) {
                return res.status(400).json({ message: 'Product with this new SKU already exists' });
            }
        }

        // Update fields
        product.name = name !== undefined ? name : product.name;
        product.sku = sku !== undefined ? sku : product.sku;
        product.description = description !== undefined ? description : product.description;
        product.category = category !== undefined ? category : product.category;
        product.price = price !== undefined ? price : product.price;
        product.cost = cost !== undefined ? cost : product.cost;
        product.supplier = supplier !== undefined ? supplier : product.supplier;
        // For stockQuantity, it's better to have a dedicated route or use the updateStock method for transactional safety
        // However, allowing direct update here for admin override, but logging/event emitting should be in model/service layer.
        if (stockQuantity !== undefined && stockQuantity !== product.stockQuantity) {
             product.stockQuantity = stockQuantity;
             product.lastStockUpdate = Date.now(); // Manual update if directly setting stock
        }
        product.reorderLevel = reorderLevel !== undefined ? reorderLevel : product.reorderLevel;
        product.targetStockLevel = targetStockLevel !== undefined ? targetStockLevel : product.targetStockLevel;
        product.unitOfMeasure = unitOfMeasure !== undefined ? unitOfMeasure : product.unitOfMeasure;
        product.isActive = isActive !== undefined ? isActive : product.isActive;
        product.imageUrl = imageUrl !== undefined ? imageUrl : product.imageUrl;
        product.dimensions = dimensions !== undefined ? dimensions : product.dimensions;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found (invalid ID format)' });
        }
        res.status(500).json({ message: 'Server error while updating product' });
    }
});

// @route   PATCH api/products/:id/stock
// @desc    Update product stock quantity (e.g., +10 or -5)
// @access  Private (Admin, Manager, Employee - for order processing)
router.patch('/:id/stock',  async (req, res) => {
    try {
        const { quantityChange } = req.body; // quantityChange can be positive or negative

        if (quantityChange === undefined || typeof quantityChange !== 'number') {
            return res.status(400).json({ message: 'Please provide a numeric quantityChange.' });
        }

        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Use the model method to update stock, which includes reorder level check
        await product.updateStock(quantityChange);
        
        res.json({ message: 'Stock updated successfully', product });

    } catch (error) {
        console.error('Error updating product stock:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found (invalid ID format)' });
        }
        res.status(500).json({ message: 'Server error while updating stock' });
    }
});


// @route   DELETE api/products/:id
// @desc    Delete a product (soft delete by setting isActive = false, or hard delete)
// @access  Private (Admin)
router.delete('/:id',  async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Option 1: Soft delete
        // product.isActive = false;
        // await product.save();
        // res.json({ message: 'Product deactivated successfully' });

        // Option 2: Hard delete (use with caution, consider impact on historical orders)
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });

    } catch (error) {
        console.error('Error deleting product:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Product not found (invalid ID format)' });
        }
        res.status(500).json({ message: 'Server error while deleting product' });
    }
});

module.exports = router;