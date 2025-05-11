const express = require('express');
const router = express.Router();
const Report = require('../models/Report')
const reportService = require('../services/reportService');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');

router.post('/', async (req, res) => {
    const { title, content, createdBy, email } = req.body;
    
    console.log('dobavlyaem report:',  title, content, createdBy);
    
    try {
        const newReport = new Report({ title, content, createdBy, email });
        await newReport.save();
        res.status(201).json({message: 'success'});
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ message: error.message });
    }
});


router.get('/', async (req, res) => {
    try {
        const reports = await Report.find()
            .populate('createdBy', 'name')

        console.log('reports:: ', reports);
        
        res.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ message: error.message });
    }
});

// Маршрут для отчета по продажам
router.get('/sales', 
       
    async (req, res) => {
    try {
        const { startDate, endDate, groupBy } = req.query;

        // Валидация дат (упрощенная)
        const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999); // Устанавливаем конец дня

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ success: false, message: 'Некорректный формат даты' });
        }

        const reportData = await reportService.getSalesReport(start, end, groupBy);
        res.json({ success: true, data: reportData });

    } catch (error) {
        console.error('Error in /reports/sales route:', error);
        res.status(500).json({ success: false, message: error.message || 'Ошибка сервера при генерации отчета' });
    }
});

// Маршрут для отчета по эффективности поставщиков (можно добавить позже)
// router.get('/supplier-performance', auth, checkRole(['admin', 'manager', 'employee']), async (req, res) => { ... });

module.exports = router;