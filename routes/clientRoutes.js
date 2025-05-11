const express = require('express');
const Client = require('../models/Client');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Получение всех клиентов (только для админов и менеджеров)
router.get('/', auth, checkRole(['admin', 'manager']), async (req, res) => {
    try {
        const clients = await Client.find({}).select('name email phone');
        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Ошибка при получении списка клиентов' });
    }
});

router.post('/', async (req, res) => {
    const client = new Client(req.body);
    try {
        const savedClient = await client.save();
        res.status(201).json(savedClient);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Получение клиента по ID
router.get('/:id', auth, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id).select('-password');
        
        if (!client) {
            return res.status(404).json({ message: 'Клиент не найден' });
        }
        
        // Проверка прав доступа (только сам клиент или админ/менеджер может получить данные)
        if (req.user.role === 'client' && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ message: 'Доступ запрещен' });
        }
        
        res.json(client);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ message: 'Ошибка при получении данных клиента' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedClient = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedClient);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Client.findByIdAndDelete(req.params.id);
        res.json({ message: 'Client deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;