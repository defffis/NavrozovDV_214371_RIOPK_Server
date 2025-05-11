const express = require('express');
const Contract = require('../models/Contract');
const router = express.Router();


router.get('/', async (req, res) => {
    try {
        const contracts = await Contract.find()
            .populate('supplier', 'name email')
            .populate({
                path: 'products',
                select: 'name description price status'
            });
        res.json(contracts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.post('/', async (req, res) => {
    const { supplier, startDate, endDate, products } = req.body;

    try {
        const newContract = new Contract({
            supplier,
            startDate,
            endDate,
            products,
        });

        const savedContract = await newContract.save();
        res.status(201).json(savedContract);
    } catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({ message: error.message });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const contract = await Contract.findById(req.params.id).populate('supplier');
        if (!contract) return res.status(404).json({ message: 'Contract not found' });
        res.json(contract);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.put('/:id', async (req, res) => {
    try {
        const updatedContract = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedContract);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


router.delete('/:id', async (req, res) => {
    try {
        await Contract.findByIdAndDelete(req.params.id);
        res.json({ message: 'Contract deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.get('/supplier/:supplierId', async (req, res) => {
    try {
        const contracts = await Contract.find({ 
            supplier: req.params.supplierId 
        }).populate('products');
        
        if (!contracts) {
            return res.status(404).json({ message: 'Контракты не найдены' });
        }
        
        res.json(contracts);
    } catch (error) {
        console.error('Error fetching supplier contracts:', error);
        res.status(500).json({ message: 'Ошибка при получении контрактов поставщика' });
    }
});

module.exports = router;