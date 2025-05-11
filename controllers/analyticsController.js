const analyticsService = require('../services/analyticsService');

// Контроллер для получения детальных метрик эффективности конкретного поставщика
exports.getSupplierPerformanceDetails = async (req, res) => {
    try {
        const supplierId = req.params.supplierId;

        // Проверка, если пользователь - поставщик, может ли он видеть эти данные
        if (req.user.role === 'supplier' && req.user._id.toString() !== supplierId) {
            return res.status(403).json({ success: false, message: 'Access denied to this supplier\'s performance data' });
        }

        const performanceDetails = await analyticsService.getSupplierPerformanceDetails(supplierId);

        if (!performanceDetails) {
            return res.status(404).json({ success: false, message: 'Performance data not found for this supplier' });
        }

        res.json({ success: true, data: performanceDetails });
    } catch (error) {
        console.error(`Error in getSupplierPerformanceDetails for supplier ${req.params.supplierId}:`, error);
        res.status(500).json({ success: false, message: error.message || 'Server error fetching supplier performance details' });
    }
};

// Контроллер для получения данных для сравнительного анализа поставщиков
exports.getSupplierComparisonData = async (req, res) => {
    try {
        const { supplierIds, metricIds } = req.query;

        if (!supplierIds || !metricIds) {
            return res.status(400).json({ success: false, message: 'supplierIds and metricIds are required query parameters.' });
        }

        const parsedSupplierIds = supplierIds.split(',').filter(id => id.trim() !== '');
        const parsedMetricIds = metricIds.split(',').filter(id => id.trim() !== '');

        if (parsedSupplierIds.length === 0 || parsedMetricIds.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one supplierId and one metricId must be provided.' });
        }

        // Вызываем соответствующий метод из analyticsService
        const comparisonData = await analyticsService.fetchSupplierComparisonData(parsedSupplierIds, parsedMetricIds);
        
        if (comparisonData && comparisonData.length > 0) {
            res.json({ success: true, data: comparisonData });
        } else if (comparisonData) { // Service returned empty array, not an error
            res.json({ success: true, data: [], message: "No data found for the selected criteria." });
        } else {
            // This case should ideally not be reached if service throws errors properly
            res.status(500).json({ success: false, message: 'Failed to retrieve comparison data from service.'});
        }

    } catch (error) {
        console.error('Error in getSupplierComparisonData controller:', error);
        // Check if the error came from our service with a specific message
        const errorMessage = error.message && error.message.includes('Error fetching supplier comparison data from service') 
                           ? error.message 
                           : 'Server error processing supplier comparison data.';
        res.status(500).json({ success: false, message: errorMessage });
    }
}; 