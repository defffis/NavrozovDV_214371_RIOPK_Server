const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

const router = express.Router();

router.get('/', auth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id })
            .populate({
                path: 'items.productId',
                select: 'name sku imageUrl price stockQuantity unitOfMeasure',
            });

        if (!cart) {
            const newCart = new Cart({ user: req.user.id, items: [] });
            await newCart.save();
            return res.json(newCart);
        }
        res.json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ message: 'Ошибка при загрузке корзины', error: error.message });
    }
});

router.post('/item', auth, async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(productId)){
        return res.status(400).json({ message: 'Некорректный ID товара' });
    }
    if (typeof quantity !== 'number' || quantity < 1){
        return res.status(400).json({ message: 'Некорректное количество товара' });
    }

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Товар не найден' });
        }
        if (!product.isActive || product.stockQuantity < quantity) {
            return res.status(400).json({ message: 'Товар недоступен или нет в наличии в нужном количестве' });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({
                productId: productId,
                quantity: quantity,
                unitPrice: product.price,
            });
        }

        await cart.save();
        const populatedCart = await Cart.findById(cart._id).populate('items.productId', 'name sku imageUrl price stockQuantity unitOfMeasure');
        res.status(200).json(populatedCart);
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ message: 'Ошибка при добавлении товара в корзину', error: error.message });
    }
});

router.put('/item/:itemId', auth, async (req, res) => {
    const { quantity } = req.body;
    const { itemId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(itemId)){
        return res.status(400).json({ message: 'Некорректный ID элемента корзины' });
    }
    if (typeof quantity !== 'number' || quantity < 1){
        return res.status(400).json({ message: 'Некорректное количество. Минимальное количество - 1.' });
    }

    try {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Корзина не найдена' });
        }

        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Товар не найден в корзине' });
        }

        cart.items[itemIndex].quantity = quantity;
        await cart.save();
        const populatedCart = await Cart.findById(cart._id).populate('items.productId', 'name sku imageUrl price stockQuantity unitOfMeasure');
        res.json(populatedCart);
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ message: 'Ошибка при обновлении товара в корзине', error: error.message });
    }
});

router.delete('/item/:itemId', auth, async (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(itemId)){
        return res.status(400).json({ message: 'Некорректный ID элемента корзины' });
    }

    try {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Корзина не найдена' });
        }

        const initialLength = cart.items.length;
        cart.items = cart.items.filter(item => item._id.toString() !== itemId);

        if (cart.items.length === initialLength) {
            return res.status(404).json({ message: 'Товар не найден в корзине для удаления' });
        }

        await cart.save();
        const populatedCart = await Cart.findById(cart._id).populate('items.productId', 'name sku imageUrl price stockQuantity unitOfMeasure');
        res.json(populatedCart);
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ message: 'Ошибка при удалении товара из корзины', error: error.message });
    }
});

router.delete('/clear', auth, async (req, res) => {
    const userId = req.user.id;
    try {
        const cart = await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true }
        );
        if (!cart) {
            return res.status(200).json({ message: 'Корзина уже была пуста или не найдена', cart: { user: userId, items: [], subtotal: 0} });
        }
        res.json(cart);
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Ошибка при очистке корзины', error: error.message });
    }
});

module.exports = router;