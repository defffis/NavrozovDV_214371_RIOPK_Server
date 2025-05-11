const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const Analytics = require('../models/Analytics'); // Import Analytics model
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const analyticsController = require('../controllers/analyticsController');

// Генерация ежедневной аналитики (может вызываться по расписанию)
router.post('/generate/daily', async (req, res) => {
    try {
        const date = req.body.date ? new Date(req.body.date) : new Date();
        const analytics = await analyticsService.generateDailyAnalytics(date);
        res.status(201).json({ success: true, data: analytics });
    } catch (error) {
        console.error('Error generating daily analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение агрегированных аналитических данных
router.get('/aggregated', async (req, res) => {
    try {
        const { period, startDate, endDate } = req.query;
        
        if (!period) {
            return res.status(400).json({ success: false, message: 'Period is required' });
        }
        
        const analytics = await analyticsService.getAggregatedAnalytics(period, startDate, endDate);
        res.json({ success: true, data: analytics });
    } catch (error) {
        console.error('Error getting aggregated analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение KPI для панели управления
router.get('/dashboard/kpis', async (req, res) => {
    try {
        const kpis = await analyticsService.getDashboardKPIs();
        res.json({ success: true, data: kpis });
    } catch (error) {
        console.error('Error getting dashboard KPIs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Новый маршрут для получения последней полной ежедневной аналитики
router.get('/latest-daily-details', async (req, res) => {
    try {
        const latestDailyAnalytics = await Analytics.findOne({ period: 'daily' })
                                                .sort({ date: -1 }); // Get the most recent one

        if (!latestDailyAnalytics) {
            // Option 1: Return 404 if no analytics found yet
            // return res.status(404).json({ success: false, message: 'No daily analytics data found yet.' });

            // Option 2: Trigger generation if none found (might be too slow for a GET request)
            // console.log('No daily analytics found, attempting to generate...');
            // const generatedAnalytics = await analyticsService.generateDailyAnalytics();
            // return res.json({ success: true, data: generatedAnalytics, message: 'Generated fresh analytics data.'});

            // Option 3: Return empty/default structure (safer for frontend)
            return res.json({ 
                success: true, 
                data: null, // Or a default empty analytics structure
                message: 'No daily analytics data found yet. Please generate it first or wait for scheduled generation.'
            });
        }
        res.json({ success: true, data: latestDailyAnalytics });
    } catch (error) {
        console.error('Error fetching latest daily detailed analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Генерация трендов и прогнозов
router.get('/forecasts', async (req, res) => {
    try {
        const forecasts = await analyticsService.generateTrendsAndForecasts();
        res.json({ success: true, data: forecasts });
    } catch (error) {
        console.error('Error generating forecasts:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение метрик поставщиков
router.get('/suppliers', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Получаем аналитику и список поставщиков для объединения данных
        const [analytics, suppliers] = await Promise.all([
            analyticsService.getAggregatedAnalytics('daily', startDate, endDate),
            require('../models/Supplier').find().select('_id name rating reliability avgDeliveryTime priceCompetitiveness')
        ]);
        
        // Создаем карту поставщиков для быстрого доступа
        const supplierMap = {};
        suppliers.forEach(supplier => {
            supplierMap[supplier._id.toString()] = {
                name: supplier.name,
                rating: supplier.rating || 0, 
                reliability: supplier.reliability || 0,
                avgDeliveryTime: supplier.avgDeliveryTime || 0,
                priceCompetitiveness: supplier.priceCompetitiveness || 0
            };
        });
        
        // Агрегация метрик поставщиков
        const supplierMetricsMap = {};
        
        if (analytics && analytics.supplierMetrics && Array.isArray(analytics.supplierMetrics)) {
            analytics.supplierMetrics.forEach(metric => {
                if (!metric.supplier) return; // Пропускаем метрики без поставщика
                
                const supplierId = metric.supplier.toString();
                
                if (!supplierMetricsMap[supplierId]) {
                    supplierMetricsMap[supplierId] = {
                        supplier: metric.supplier,
                        supplierName: supplierMap[supplierId]?.name || 'Неизвестный поставщик',
                        totalOrders: 0,
                        revenue: 0,
                        onTimeDelivery: 0,
                        lateDelivery: 0,
                        quality: 0,
                        costEfficiency: 0,
                        count: 0,
                        // Добавляем данные из модели поставщика
                        supplierRating: supplierMap[supplierId]?.rating || 0,
                        supplierReliability: supplierMap[supplierId]?.reliability || 0,
                        supplierAvgDeliveryTime: supplierMap[supplierId]?.avgDeliveryTime || 0,
                        supplierPriceCompetitiveness: supplierMap[supplierId]?.priceCompetitiveness || 0
                    };
                }
                
                // Суммирование метрик
                supplierMetricsMap[supplierId].totalOrders += metric.totalOrders || 0;
                supplierMetricsMap[supplierId].revenue += metric.revenue || 0;
                supplierMetricsMap[supplierId].onTimeDelivery += metric.onTimeDelivery || 0;
                supplierMetricsMap[supplierId].lateDelivery += metric.lateDelivery || 0;
                supplierMetricsMap[supplierId].quality += metric.quality || 0;
                supplierMetricsMap[supplierId].costEfficiency += metric.costEfficiency || 0;
                supplierMetricsMap[supplierId].count++;
            });
        }
        
        // Расчет средних значений и производительности
        const supplierMetrics = Object.values(supplierMetricsMap).map(metric => {
            const count = metric.count || 1;
            
            // Если нет значений для onTimeDelivery и lateDelivery, генерируем их на основе
            // данных надежности (reliability) поставщика или используем разумные значения по умолчанию
            let onTimeDelivery = metric.onTimeDelivery;
            let lateDelivery = metric.lateDelivery;
            
            if (onTimeDelivery === 0 && lateDelivery === 0 && metric.totalOrders > 0) {
                // Используем надежность (reliability) из модели поставщика или значение по умолчанию
                const reliability = metric.supplierReliability || 85; // Процент по умолчанию 85%
                onTimeDelivery = Math.round(metric.totalOrders * (reliability / 100));
                lateDelivery = metric.totalOrders - onTimeDelivery;
            }
            
            const totalDeliveries = onTimeDelivery + lateDelivery || 1;
            const onTimePercentage = (onTimeDelivery / totalDeliveries) * 100 || 0;
            
            // Если quality равно 0, используем рейтинг поставщика или разумное значение по умолчанию
            let quality = Math.round(metric.quality / count) || 0;
            if (quality === 0) {
                quality = Math.round((metric.supplierRating || 0) * 20) || 75; // Преобразуем рейтинг 0-5 в процент 0-100, или 75% по умолчанию
            }
            
            // Если costEfficiency равно 0, используем priceCompetitiveness или значение по умолчанию
            let costEfficiency = Math.round(metric.costEfficiency / count) || 0;
            if (costEfficiency === 0) {
                costEfficiency = metric.supplierPriceCompetitiveness || 80; // Значение по умолчанию 80%
            }
            
            // Рассчитываем performanceScore 
            const performanceScore = Math.round(
                (quality * 0.4) + 
                (costEfficiency * 0.2) + 
                (onTimePercentage * 0.4)
            ) || 0;
            
            return {
                supplier: metric.supplier,
                supplierName: metric.supplierName,
                totalOrders: metric.totalOrders,
                revenue: metric.revenue,
                onTimeDelivery: onTimeDelivery,
                lateDelivery: lateDelivery,
                totalDeliveries: onTimeDelivery + lateDelivery,
                onTimeDeliveryPercentage: Math.round(onTimePercentage),
                quality: quality,
                costEfficiency: costEfficiency,
                performanceScore: performanceScore
            };
        });
        
        // Сортировка по производительности
        supplierMetrics.sort((a, b) => b.performanceScore - a.performanceScore);
        
        res.json({ success: true, data: supplierMetrics });
    } catch (error) {
        console.error('Error getting supplier metrics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение метрик КОНКРЕТНОГО поставщика (НОВЫЙ МАРШРУТ)
router.get('/supplier/:supplierId/metrics', auth, checkRole(['admin', 'manager', 'supplier']), async (req, res) => {
    try {
        const supplierId = req.params.supplierId;
        
        // Проверка прав доступа (поставщик может смотреть только свои метрики)
        if (req.user.role === 'supplier' && req.user._id.toString() !== supplierId) {
            return res.status(403).json({ success: false, message: 'Access denied to this supplier\'s metrics' });
        }

        // Получаем метрики из сервиса
        const metrics = await analyticsService.getSpecificSupplierMetrics(supplierId);
        
        if (!metrics) {
             return res.status(404).json({ success: false, message: 'Metrics not found for this supplier' });
        }

        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error(`Error getting metrics for supplier ${req.params.supplierId}:`, error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение ДЕТАЛЬНЫХ метрик эффективности КОНКРЕТНОГО поставщика (НОВЫЙ МАРШРУТ)
router.get('/supplier/:supplierId/performance-details', auth, checkRole(['admin', 'manager', 'supplier']), analyticsController.getSupplierPerformanceDetails);

// Получение метрик доставки
router.get('/delivery', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const response = await analyticsService.getDeliveryKPIs(startDate, endDate);
        res.json(response);
    } catch (error) {
        console.error('Error getting delivery metrics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение региональных метрик для доставки
router.get('/delivery/regions', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const response = await analyticsService.getDeliveryRegionMetrics(startDate, endDate);
        res.json(response);
    } catch (error) {
        console.error('Error getting delivery region metrics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение ежедневных метрик доставки для графика трендов
router.get('/delivery/daily', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const response = await analyticsService.getDeliveryDailyMetrics(startDate, endDate);
        res.json(response);
    } catch (error) {
        console.error('Error getting daily delivery metrics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение KPI метрик доставки для дашборда
router.get('/delivery/kpis', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const analytics = await analyticsService.getAggregatedAnalytics('daily', startDate, endDate);
        
        // Также получаем данные о поставщиках, чтобы показать согласованные данные
        const supplierResponse = await analyticsService.getSupplierMetrics(startDate, endDate);
        const supplierMetrics = supplierResponse.data || [];
        
        // Рассчитываем средний процент своевременных доставок по поставщикам
        let avgSupplierOnTimePercentage = 0;
        if (supplierMetrics.length > 0) {
            const totalOnTimePercentage = supplierMetrics.reduce((sum, supplier) => sum + (supplier.onTimeDeliveryPercentage || 0), 0);
            avgSupplierOnTimePercentage = Math.round(totalOnTimePercentage / supplierMetrics.length);
        }
        
        // Используем более точный deliverySuccessRate, основанный на данных поставщиков,
        // или значение из агрегированных метрик, если нет данных по поставщикам
        const deliverySuccessRate = supplierMetrics.length > 0 ? 
            avgSupplierOnTimePercentage : 
            (analytics.deliveryMetrics?.deliverySuccessRate || 0);
        
        // Calculate KPIs from aggregated delivery metrics
        const kpis = {
            deliverySuccessRate: deliverySuccessRate,
            averageDeliveryTime: analytics.deliveryMetrics?.averageDeliveryTime || 0,
            delayedDeliveries: analytics.deliveryMetrics?.delayed || 0,
            onTimeDeliveries: analytics.deliveryMetrics?.onTime || 0,
            deliveryEfficiencyIndex: analytics.kpis?.deliveryEfficiencyIndex || 0,
            customerSatisfactionIndex: analytics.kpis?.customerSatisfactionIndex || 0
        };
        
        res.json({ success: true, data: kpis });
    } catch (error) {
        console.error('Error getting delivery KPIs:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение метрик продуктов
router.get('/products', async (req, res) => {
    try {
        const { startDate, endDate, category } = req.query;
        
        const analytics = await analyticsService.getAggregatedAnalytics('daily', startDate, endDate);
        
        let productMetrics = analytics.productMetrics || [];
        
        // Фильтрация по категории, если указана
        if (category) {
            productMetrics = productMetrics.filter(metric => metric.category === category);
        }
        
        res.json({ success: true, data: productMetrics });
    } catch (error) {
        console.error('Error getting product metrics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получение метрик по регионам
router.get('/regions', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const analytics = await analyticsService.getAggregatedAnalytics('daily', startDate, endDate);
        res.json({ success: true, data: analytics.regionMetrics });
    } catch (error) {
        console.error('Error getting region metrics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Новый маршрут для сравнительного анализа поставщиков
router.get('/suppliers/comparison', auth, checkRole(['admin', 'manager', 'employee']), analyticsController.getSupplierComparisonData);

module.exports = router; 