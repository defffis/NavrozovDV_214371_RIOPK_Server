const Order = require('../models/Order');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Analytics = require('../models/Analytics');
const mongoose = require('mongoose');

// Вспомогательные функции для расчетов
const calculateDeliverySuccessRate = (onTime, total) => {
    return total > 0 ? Math.round((onTime / total) * 100) : 0;
};

const calculateAverageDeliveryTime = (totalTime, count) => {
    return count > 0 ? Number((totalTime / count).toFixed(1)) : 0;
};

// Основной класс сервиса аналитики
class AnalyticsService {
    
    // Генерация ежедневной аналитики
    async generateDailyAnalytics(date = new Date()) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            // Получение данных за день
            const orders = await this._getOrdersForPeriod(startOfDay, endOfDay);
            const suppliers = await Supplier.find();
            
            // Основные метрики
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + (order.totalOrderValue || 0), 0);
            
            // Метрики доставки
            const onTimeDeliveries = orders.filter(order => !order.deliveryDelay || order.deliveryDelay === 0).length;
            const delayedDeliveries = orders.filter(order => order.deliveryDelay > 0).length;
            
            let totalDeliveryTime = 0;
            let completedDeliveries = 0;
            
            orders.forEach(order => {
                if (order.shippingTime && order.status === 'Доставлен') {
                    totalDeliveryTime += order.shippingTime;
                    completedDeliveries++;
                }
            });
            
            // Создание аналитической записи
            const analytics = new Analytics({
                period: 'daily',
                date: startOfDay,
                totalOrders,
                totalRevenue,
                totalSuppliers: suppliers.length,
                
                deliveryMetrics: {
                    onTime: onTimeDeliveries,
                    delayed: delayedDeliveries,
                    averageDeliveryTime: calculateAverageDeliveryTime(totalDeliveryTime, completedDeliveries),
                    deliverySuccessRate: calculateDeliverySuccessRate(onTimeDeliveries, completedDeliveries)
                },
                
                // Дополнительные метрики будут добавлены ниже
            });
            
            // Добавление метрик по поставщикам
            analytics.supplierMetrics = await this._calculateSupplierMetrics(orders, suppliers);
            
            // Получаем все активные продукты для полной инвентаризационной картины
            const allActiveProducts = await Product.find({ isActive: true });

            // Добавление метрик по продуктам и инвентарю
            analytics.productMetrics = await this._calculateProductMetrics(orders, allActiveProducts);
            
            // Добавление региональных метрик
            analytics.regionMetrics = await this._calculateRegionMetrics(orders);
            
            // Расчет KPI
            analytics.kpis = this._calculateKPIs(analytics);
            
            // Прогнозы - будут рассчитаны позже на основе исторических данных
            
            // Сохранение или обновление аналитики
            await this._saveOrUpdateAnalytics(analytics);
            
            return analytics;
        } catch (error) {
            console.error('Error generating daily analytics:', error);
            throw error;
        }
    }
    
    // Получение метрик поставщиков для интеграции с API клиента
    async getSupplierMetrics(startDate, endDate) {
        try {
            // Получаем список поставщиков
            const suppliers = await Supplier.find().select('_id name rating reliability avgDeliveryTime priceCompetitiveness');
            
            // Собираем поставщиков с аналитикой
            const supplierMetricsPromises = suppliers.map(supplier => 
                this.getSpecificSupplierMetrics(supplier._id.toString())
            );
            
            // Ждем выполнения всех запросов
            const supplierMetricsResults = await Promise.all(supplierMetricsPromises);
            
            // Объединяем результаты с данными поставщиков
            const enrichedMetrics = supplierMetricsResults.map((metrics, index) => {
                const supplier = suppliers[index];
                return {
                    supplier: supplier._id,
                    supplierName: supplier.name,
                    // Метрики поставщика
                    totalOrders: metrics.totalOrders || 0,
                    onTimeDelivery: metrics.onTimeDelivery || 0,
                    onTimeDeliveryPercentage: metrics.onTimeDeliveryPercentage || 0,
                    averageProcessingTime: metrics.averageProcessingTime || 0,
                    totalRevenue: metrics.totalRevenue || 0,
                    revenueGrowth: metrics.revenueGrowth || 0,
                    completedOrders: metrics.completedOrders || 0,
                    // Рассчитанные показатели
                    lateDelivery: (metrics.completedOrders || 0) - (metrics.onTimeDelivery || 0),
                    quality: Math.round((supplier.rating || 0) * 20) || 75, // Преобразуем рейтинг 0-5 в 0-100
                    costEfficiency: supplier.priceCompetitiveness || 80,
                    // Индекс производительности
                    performanceScore: Math.round(
                        ((metrics.onTimeDeliveryPercentage || 0) * 0.4) + 
                        ((Math.round((supplier.rating || 0) * 20) || 75) * 0.4) + 
                        ((supplier.priceCompetitiveness || 80) * 0.2)
                    ) || 0
                };
            });
            
            // Сортируем по индексу производительности
            enrichedMetrics.sort((a, b) => b.performanceScore - a.performanceScore);
            
            return {
                success: true,
                data: enrichedMetrics
            };
        } catch (error) {
            console.error('Error getting supplier metrics:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Генерация недельной аналитики
    async generateWeeklyAnalytics(date = new Date()) {
        // Аналогично ежедневной, но с периодом в неделю
        // Код будет аналогичен generateDailyAnalytics, но с другим временным периодом
        // ...
    }
    
    // Генерация месячной аналитики
    async generateMonthlyAnalytics(date = new Date()) {
        // Аналогично, но с периодом в месяц
        // ...
    }
    
    // Получение агрегированных аналитических данных
    async getAggregatedAnalytics(period, startDate, endDate) {
        try {
            const query = { period };
            
            if (startDate && endDate) {
                query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }
            
            const analyticsRecords = await Analytics.find(query).sort({ date: 1 });
            
            // Агрегация данных за указанный период
            const aggregated = {
                totalOrders: 0,
                totalRevenue: 0,
                deliveryMetrics: {
                    onTime: 0,
                    delayed: 0,
                    averageDeliveryTime: 0,
                    deliverySuccessRate: 0
                },
                supplierMetrics: [],
                productMetrics: [],
                regionMetrics: [],
                kpis: {
                    supplierPerformanceIndex: 0,
                    deliveryEfficiencyIndex: 0,
                    inventoryHealthIndex: 0,
                    costOptimizationIndex: 0,
                    customerSatisfactionIndex: 0
                }
            };
            
            let totalDeliveryTimeSum = 0;
            let completedDeliveriesCount = 0;
            let kpiCount = 0;

            // Суммирование данных из всех записей
            analyticsRecords.forEach(record => {
                aggregated.totalOrders += record.totalOrders || 0;
                aggregated.totalRevenue += record.totalRevenue || 0;
                
                if (record.deliveryMetrics) {
                    aggregated.deliveryMetrics.onTime += record.deliveryMetrics.onTime || 0;
                    aggregated.deliveryMetrics.delayed += record.deliveryMetrics.delayed || 0;
                    
                    // Вычисляем общее время доставок для дальнейшего расчета среднего
                    if (record.deliveryMetrics.averageDeliveryTime && record.deliveryMetrics.onTime + record.deliveryMetrics.delayed > 0) {
                        const recordCompletedDeliveries = record.deliveryMetrics.onTime + record.deliveryMetrics.delayed;
                        const recordTotalTime = record.deliveryMetrics.averageDeliveryTime * recordCompletedDeliveries;
                        totalDeliveryTimeSum += recordTotalTime;
                        completedDeliveriesCount += recordCompletedDeliveries;
                    }
                }
                
                if (record.supplierMetrics && Array.isArray(record.supplierMetrics)) {
                    aggregated.supplierMetrics.push(...record.supplierMetrics);
                }

                if (record.productMetrics) {
                    if (record.productMetrics.inventorySummary) {
                        // Если productMetrics имеет специфическую структуру с inventorySummary
                        if (!aggregated.productMetrics.inventorySummary) {
                            aggregated.productMetrics.inventorySummary = { ...record.productMetrics.inventorySummary };
                        } 
                    }
                    
                    if (record.productMetrics.byCategory && Array.isArray(record.productMetrics.byCategory)) {
                        if (!aggregated.productMetrics.byCategory) {
                            aggregated.productMetrics.byCategory = [];
                        }
                        aggregated.productMetrics.byCategory.push(...record.productMetrics.byCategory);
                    } else if (Array.isArray(record.productMetrics)) {
                        // Если это просто массив, то просто добавляем
                        if (!Array.isArray(aggregated.productMetrics)) {
                            aggregated.productMetrics = [];
                        }
                        aggregated.productMetrics.push(...record.productMetrics);
                    }
                }

                if (record.regionMetrics && Array.isArray(record.regionMetrics)) {
                    aggregated.regionMetrics.push(...record.regionMetrics);
                }

                if (record.kpis) {
                    kpiCount++;
                    aggregated.kpis.supplierPerformanceIndex += record.kpis.supplierPerformanceIndex || 0;
                    aggregated.kpis.deliveryEfficiencyIndex += record.kpis.deliveryEfficiencyIndex || 0;
                    aggregated.kpis.inventoryHealthIndex += record.kpis.inventoryHealthIndex || 0;
                    aggregated.kpis.costOptimizationIndex += record.kpis.costOptimizationIndex || 0;
                    aggregated.kpis.customerSatisfactionIndex += record.kpis.customerSatisfactionIndex || 0;
                }
            });
            
            // Пересчет средних значений
            if (analyticsRecords.length > 0) {
                const totalDeliveriesForRate = aggregated.deliveryMetrics.onTime + aggregated.deliveryMetrics.delayed;
                aggregated.deliveryMetrics.deliverySuccessRate = calculateDeliverySuccessRate(
                    aggregated.deliveryMetrics.onTime,
                    totalDeliveriesForRate
                );
                
                // Рассчитываем среднее время доставки
                if (completedDeliveriesCount > 0) {
                    aggregated.deliveryMetrics.averageDeliveryTime = Number((totalDeliveryTimeSum / completedDeliveriesCount).toFixed(1));
                }

                // Average KPIs if they were summed
                if (kpiCount > 0) {
                    aggregated.kpis.supplierPerformanceIndex = Math.round(aggregated.kpis.supplierPerformanceIndex / kpiCount);
                    aggregated.kpis.deliveryEfficiencyIndex = Math.round(aggregated.kpis.deliveryEfficiencyIndex / kpiCount);
                    aggregated.kpis.inventoryHealthIndex = Math.round(aggregated.kpis.inventoryHealthIndex / kpiCount);
                    aggregated.kpis.costOptimizationIndex = Math.round(aggregated.kpis.costOptimizationIndex / kpiCount);
                    aggregated.kpis.customerSatisfactionIndex = Math.round(aggregated.kpis.customerSatisfactionIndex / kpiCount);
                }
            }
            
            return aggregated;
        } catch (error) {
            console.error('Error getting aggregated analytics:', error);
            throw error;
        }
    }
    
    // Получение метрик доставки для KPI
    async getDeliveryKPIs(startDate, endDate) {
        try {
            const aggregated = await this.getAggregatedAnalytics('daily', startDate, endDate);
            return {
                success: true,
                data: aggregated.deliveryMetrics
            };
        } catch (error) {
            console.error('Error getting delivery KPIs:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }

    // Получение ежедневных метрик доставки для графиков
    async getDeliveryDailyMetrics(startDate, endDate) {
        try {
            const query = { 
                period: 'daily',
                date: { $gte: new Date(startDate), $lte: new Date(endDate) }
            };
            
            const dailyRecords = await Analytics.find(query)
                .sort({ date: 1 })
                .select('date deliveryMetrics')
                .lean(); // Используем lean для получения простых JS объектов

            // Если записей нет, используем данные из заказов напрямую
            if (!dailyRecords || dailyRecords.length === 0) {
                console.log('No analytics records found, generating from orders directly');
                
                // Получаем данные о заказах за указанный период
                const startDateObj = new Date(startDate);
                const endDateObj = new Date(endDate);
                
                const orders = await Order.find({
                    orderDate: { $gte: startDateObj, $lte: endDateObj }
                })
                .select('orderDate estimatedDeliveryDate actualDeliveryDate status')
                .lean();
                
                if (!orders || orders.length === 0) {
                    return {
                        success: true,
                        data: [],
                        message: 'Нет данных о доставке за указанный период'
                    };
                }
                
                // Группируем заказы по дням
                const ordersByDay = {};
                
                orders.forEach(order => {
                    const dateKey = new Date(order.orderDate).toISOString().split('T')[0];
                    
                    if (!ordersByDay[dateKey]) {
                        ordersByDay[dateKey] = {
                            date: new Date(dateKey),
                            onTime: 0,
                            delayed: 0,
                            total: 0
                        };
                    }
                    
                    ordersByDay[dateKey].total++;
                    
                    if (order.actualDeliveryDate && order.estimatedDeliveryDate) {
                        if (new Date(order.actualDeliveryDate) <= new Date(order.estimatedDeliveryDate)) {
                            ordersByDay[dateKey].onTime++;
                        } else {
                            ordersByDay[dateKey].delayed++;
                        }
                    }
                });
                
                // Преобразуем в формат для отображения
                const derivedDailyMetrics = Object.values(ordersByDay).map(dayData => {
                    const total = dayData.onTime + dayData.delayed || 1; // Избегаем деления на ноль
                    return {
                        date: dayData.date,
                        onTime: dayData.onTime,
                        delayed: dayData.delayed,
                        averageDeliveryTime: 3.0, // Примерное значение, нет данных для точного расчета
                        deliverySuccessRate: Math.round((dayData.onTime / total) * 100)
                    };
                });
                
                return {
                    success: true,
                    data: derivedDailyMetrics,
                    source: 'derived_from_orders'
                };
            }

            // Преобразуем данные для графика
            const dailyMetrics = dailyRecords.map(record => ({
                date: record.date,
                onTime: record.deliveryMetrics?.onTime || 0,
                delayed: record.deliveryMetrics?.delayed || 0,
                averageDeliveryTime: record.deliveryMetrics?.averageDeliveryTime || 0,
                deliverySuccessRate: record.deliveryMetrics?.deliverySuccessRate || 0
            }));
            
            return {
                success: true,
                data: dailyMetrics
            };
        } catch (error) {
            console.error('Error getting delivery daily metrics:', error);
            return {
                success: false, 
                message: error.message
            };
        }
    }

    // Получение региональных метрик доставки
    async getDeliveryRegionMetrics(startDate, endDate) {
        try {
            const query = { 
                period: 'daily',
                date: { $gte: new Date(startDate), $lte: new Date(endDate) }
            };
            
            const analyticsRecords = await Analytics.find(query)
                .select('regionMetrics')
                .lean();
            
            // Объединяем все региональные метрики
            const allRegionMetrics = [];
            analyticsRecords.forEach(record => {
                if (record.regionMetrics && Array.isArray(record.regionMetrics)) {
                    allRegionMetrics.push(...record.regionMetrics);
                }
            });
            
            // При необходимости можно выполнить дополнительную агрегацию по регионам
            
            return {
                success: true,
                data: allRegionMetrics
            };
        } catch (error) {
            console.error('Error getting delivery region metrics:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    // Генерация трендов и прогнозов
    async generateTrendsAndForecasts() {
        try {
            // Получение исторических данных для анализа трендов
            const historicalData = await Analytics.find({ period: 'daily' })
                .sort({ date: -1 })
                .limit(30); // последние 30 дней
            
            if (historicalData.length < 2) {
                // Если недостаточно данных для прогноза, возвращаем безопасные значения
                return {
                    nextPeriodOrders: 0,
                    nextPeriodRevenue: 0,
                    demandTrend: 'stable'
                };
            }
            
            // Здесь будет логика анализа трендов и прогнозирования
            // Можно использовать простые методы, такие как скользящее среднее
            // или более сложные, такие как линейная регрессия
            
            // Пример: расчет среднего роста заказов
            let orderGrowth = 0;
            let validComparisons = 0;
            
            for (let i = 1; i < historicalData.length; i++) {
                const prevOrders = historicalData[i].totalOrders || 0;
                const currentOrders = historicalData[i-1].totalOrders || 0;
                
                if (prevOrders > 0) {
                    const growth = (currentOrders - prevOrders) / prevOrders;
                    if (!isNaN(growth) && isFinite(growth)) {
                        orderGrowth += growth;
                        validComparisons++;
                    }
                }
            }
            
            // Безопасно вычисляем средний рост - если нет валидных сравнений, считаем нулевой рост
            const avgOrderGrowth = validComparisons > 0 ? orderGrowth / validComparisons : 0;
            const lastDayOrders = historicalData[0].totalOrders || 0;
            
            // Прогноз на следующий день - защита от NaN
            const growthMultiplier = !isNaN(avgOrderGrowth) && isFinite(avgOrderGrowth) ? (1 + avgOrderGrowth) : 1;
            const predictedOrders = Math.max(0, Math.round(lastDayOrders * growthMultiplier));
            
            // Обновление последней записи аналитики с прогнозом
            const latestAnalytics = await Analytics.findOne({ period: 'daily' }).sort({ date: -1 });
            
            if (latestAnalytics) {
                latestAnalytics.forecasts.nextPeriodOrders = predictedOrders;
                latestAnalytics.forecasts.demandTrend = avgOrderGrowth > 0.05 ? 'rising' : (avgOrderGrowth < -0.05 ? 'falling' : 'stable');
                
                await latestAnalytics.save();
                return latestAnalytics.forecasts;
            }
            
            return {
                nextPeriodOrders: predictedOrders,
                nextPeriodRevenue: 0,
                demandTrend: avgOrderGrowth > 0.05 ? 'rising' : (avgOrderGrowth < -0.05 ? 'falling' : 'stable')
            };
        } catch (error) {
            console.error('Error generating trends and forecasts:', error);
            throw error;
        }
    }
    
    // Получение KPI для панели управления
    async getDashboardKPIs() {
        try {
            const latestAnalytics = await Analytics.findOne({ period: 'daily' }).sort({ date: -1 });
            
            if (!latestAnalytics) {
                return {
                    supplierPerformanceIndex: 0,
                    deliveryEfficiencyIndex: 0,
                    inventoryHealthIndex: 0,
                    costOptimizationIndex: 0,
                    customerSatisfactionIndex: 0
                };
            }
            
            return latestAnalytics.kpis;
        } catch (error) {
            console.error('Error getting dashboard KPIs:', error);
            throw error;
        }
    }
    
    // Приватные методы для внутренних расчетов
    
    async _getOrdersForPeriod(startDate, endDate) {
        return Order.find({
            orderDate: { $gte: startDate, $lte: endDate }
        }).populate('products.product client employee');
    }
    
    async _calculateSupplierMetrics(orders, suppliers) {
        const supplierMap = {};
        
        // Инициализация метрик для каждого поставщика
        suppliers.forEach(supplier => {
            supplierMap[supplier._id.toString()] = {
                supplier: supplier._id,
                supplierName: supplier.name, // Assuming Supplier model has a name field
                totalOrders: 0, // Number of orders they are associated with (via product)
                totalItemsSold: 0,
                totalRevenueGenerated: 0, // Revenue from their products
                totalCostOfGoodsSold: 0, // Cost of their products sold
                totalProfitGenerated: 0,
                onTimeDeliveryCount: 0, // Count of on-time orders containing their products
                lateDeliveryCount: 0,   // Count of late orders containing their products
                // Placeholders, ideally derived from more data:
                qualityScore: 80 + Math.floor(Math.random() * 21), // FIXME: Placeholder - Replace with actual quality data source
                costEfficiencyScore: 75 + Math.floor(Math.random() * 26), // FIXME: Placeholder - Replace with actual cost efficiency data
                productBreakdown: {}, // To store stats per product for this supplier
                distinctProductsSold: 0
            };
        });
        
        // Обработка заказов
        orders.forEach(order => {
            let supplierInvolvedInOrderOnTime = {}; // Track if a supplier's product was in an on-time order
            let supplierInvolvedInOrderLate = {};   // Track if a supplier's product was in a late order

            order.products.forEach(item => {
                // item.product should be populated from _getOrdersForPeriod
                // It contains fields like _id, name, cost, supplier (which is an ObjectId)
                if (item.product && item.product.supplier) {
                    const productDoc = item.product;
                    const supplierId = productDoc.supplier.toString(); // Supplier of this specific product
                    
                    if (supplierMap[supplierId]) {
                        const supMetrics = supplierMap[supplierId];
                        supMetrics.totalItemsSold += item.quantity || 0;
                        supMetrics.totalRevenueGenerated += item.totalPrice || 0;
                        supMetrics.totalCostOfGoodsSold += (productDoc.cost || 0) * (item.quantity || 0);

                        // Track if this supplier has been counted for this order's on-time/late status
                        if (order.deliveryDelay === 0 && !supplierInvolvedInOrderOnTime[supplierId]) {
                            supMetrics.onTimeDeliveryCount++;
                            supplierInvolvedInOrderOnTime[supplierId] = true;
                        }
                        if (order.deliveryDelay > 0 && !supplierInvolvedInOrderLate[supplierId]) {
                            supMetrics.lateDeliveryCount++;
                            supplierInvolvedInOrderLate[supplierId] = true;
                        }
                        // Total orders for a supplier will be derived from onTimeDeliveryCount + lateDeliveryCount if we only count an order once per supplier
                        // Or, if an order can have multiple products from the same supplier, this way of counting orders might need refinement.
                        // For now, let's consider totalOrders as orders where at least one of their products was present.
                        // We can refine totalOrders based on onTime/late counts later.

                        // Product breakdown for this supplier
                        const productIdStr = productDoc._id.toString();
                        if (!supMetrics.productBreakdown[productIdStr]) {
                            supMetrics.productBreakdown[productIdStr] = {
                                productId: productDoc._id,
                                productName: productDoc.name,
                                sku: productDoc.sku,
                                quantitySold: 0,
                                revenue: 0,
                                profit: 0
                            };
                        }
                        const pBreakdown = supMetrics.productBreakdown[productIdStr];
                        pBreakdown.quantitySold += item.quantity || 0;
                        pBreakdown.revenue += item.totalPrice || 0;
                        pBreakdown.profit += (item.totalPrice || 0) - ((productDoc.cost || 0) * (item.quantity || 0));
                    }
                }
            });
        });
        
        // Final calculations for each supplier
        Object.values(supplierMap).forEach(supMetrics => {
            supMetrics.totalProfitGenerated = supMetrics.totalRevenueGenerated - supMetrics.totalCostOfGoodsSold;
            supMetrics.averageProfitMargin = supMetrics.totalRevenueGenerated > 0 
                ? (supMetrics.totalProfitGenerated / supMetrics.totalRevenueGenerated) * 100 
                : 0;
            supMetrics.totalOrders = supMetrics.onTimeDeliveryCount + supMetrics.lateDeliveryCount; // Sum of orders they were involved in (on-time or late)
            supMetrics.onTimeDeliveryRate = supMetrics.totalOrders > 0
                ? (supMetrics.onTimeDeliveryCount / supMetrics.totalOrders) * 100
                : 0;

            const soldProductsArray = Object.values(supMetrics.productBreakdown);
            supMetrics.distinctProductsSold = soldProductsArray.length;
            soldProductsArray.sort((a, b) => b.revenue - a.revenue); // Sort by revenue
            supMetrics.topSellingProducts = soldProductsArray.slice(0, 5); // Top 5 products for this supplier
            delete supMetrics.productBreakdown; // Remove detailed breakdown from top-level, keep summary
        });

        return Object.values(supplierMap);
    }
    
    async _calculateProductMetrics(orders, allProducts) {
        const categoryMap = {};
        const productStatsMap = {};
        let totalInventoryValue = 0;
        let productsBelowReorderLevel = [];
        const lowStockThreshold = 10;

        // 1. Calculate sales metrics from orders
        orders.forEach(order => {
            order.products.forEach(item => {
                if (item.product && item.product._id) {
                    const product = item.product;
                    const category = product.category || 'Uncategorized';
                    const productId = product._id.toString();

                    // Initialize category map
                    if (!categoryMap[category]) {
                        categoryMap[category] = {
                            category,
                            totalSoldQuantity: 0,
                            totalRevenue: 0,
                            totalCost: 0,
                            productsInOrder: 0,
                        };
                    }

                    // Update category sales stats
                    categoryMap[category].totalSoldQuantity += item.quantity || 0;
                    categoryMap[category].totalRevenue += item.totalPrice || 0;
                    categoryMap[category].totalCost += (product.cost || 0) * (item.quantity || 0);

                    // Initialize and update individual product sales stats from orders
                    if (!productStatsMap[productId]) {
                        productStatsMap[productId] = {
                            productId: product._id,
                            name: product.name,
                            sku: product.sku,
                            category: category,
                            soldQuantity: 0,
                            revenue: 0,
                            costOfGoodsSold: 0,
                        };
                    }
                    productStatsMap[productId].soldQuantity += item.quantity || 0;
                    productStatsMap[productId].revenue += item.totalPrice || 0;
                    productStatsMap[productId].costOfGoodsSold += (product.cost || 0) * (item.quantity || 0);
                }
            });
        });
        
        // 2. Calculate inventory metrics and combine with sales for all products in the system
        if (!allProducts) {
            allProducts = await Product.find({ isActive: true });
        }

        const overallInventoryStats = {
            totalProducts: allProducts.length,
            totalStockQuantity: 0,
            currentTotalInventoryValueByCost: 0,
            currentTotalInventoryValueByPrice: 0,
            productsBelowReorder: 0,
            lowStockProductsCount: 0,
        };

        allProducts.forEach(p => {
            overallInventoryStats.totalStockQuantity += p.stockQuantity || 0;
            overallInventoryStats.currentTotalInventoryValueByCost += (p.stockQuantity || 0) * (p.cost || 0);
            overallInventoryStats.currentTotalInventoryValueByPrice += (p.stockQuantity || 0) * (p.price || 0);

            if (p.stockQuantity < p.reorderLevel) {
                overallInventoryStats.productsBelowReorder++;
                productsBelowReorderLevel.push({
                    productId: p._id,
                    name: p.name,
                    sku: p.sku,
                    currentStock: p.stockQuantity,
                    reorderLevel: p.reorderLevel,
                });
            }
            if (p.stockQuantity < lowStockThreshold && p.stockQuantity >= p.reorderLevel ) {
                 overallInventoryStats.lowStockProductsCount++;
            }

            // Merge sales data into categoryMap for products that might not have been sold in the period
            // but still contribute to inventory stats of their category
            const category = p.category || 'Uncategorized';
            if (!categoryMap[category]) {
                 categoryMap[category] = {
                    category,
                    totalSoldQuantity: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    productsInOrder: 0,
                };
            }
            categoryMap[category].currentStockQuantity = (categoryMap[category].currentStockQuantity || 0) + (p.stockQuantity || 0);
            categoryMap[category].currentStockValueByCost = (categoryMap[category].currentStockValueByCost || 0) + ((p.stockQuantity || 0) * (p.cost || 0));
        });

        // Calculate profit margins for categories and add top products
        Object.values(categoryMap).forEach(cat => {
            cat.profitMargin = cat.totalRevenue - cat.totalCost;
            cat.profitMarginPercentage = cat.totalRevenue > 0 ? (cat.profitMargin / cat.totalRevenue) * 100 : 0;
            
            // Consolidate top products for each category based on productStatsMap
            const productsInCategory = Object.values(productStatsMap).filter(pStat => pStat.category === cat.category);
            productsInCategory.sort((a, b) => b.revenue - a.revenue);
            cat.topSellingProducts = productsInCategory.slice(0, 5).map(p => ({
                productId: p.productId,
                name: p.name,
                sku: p.sku,
                soldQuantity: p.soldQuantity,
                revenue: p.revenue,
                profit: p.revenue - p.costOfGoodsSold
            }));
        });
        
        return {
            byCategory: Object.values(categoryMap),
            byProductSales: Object.values(productStatsMap),
            inventorySummary: {
                ...overallInventoryStats,
                productsBelowReorderLevelDetails: productsBelowReorderLevel,
            }
        };
    }
    
    async _calculateRegionMetrics(orders) {
        const regionMap = {};
        
        // Обработка заказов для сбора региональных метрик
        orders.forEach(order => {
            const region = order.region || 'Unknown';
            
            // Инициализация региона, если он не существует
            if (!regionMap[region]) {
                regionMap[region] = {
                    region,
                    orders: 0,
                    revenue: 0,
                    totalDeliveryTime: 0,
                    deliveries: 0
                };
            }
            
            // Обновление метрик региона
            regionMap[region].orders++;
            regionMap[region].revenue += order.totalOrderValue || 0;
            
            if (order.shippingTime && order.status === 'Доставлен') {
                regionMap[region].totalDeliveryTime += order.shippingTime;
                regionMap[region].deliveries++;
            }
        });
        
        // Расчет среднего времени доставки для каждого региона
        Object.keys(regionMap).forEach(region => {
            const metrics = regionMap[region];
            metrics.averageDeliveryTime = calculateAverageDeliveryTime(
                metrics.totalDeliveryTime,
                metrics.deliveries
            );
            
            // Удаление временных полей
            delete metrics.totalDeliveryTime;
            delete metrics.deliveries;
        });
        
        return Object.values(regionMap);
    }
    
    _calculateKPIs(analytics) {
        // Расчет индекса производительности поставщиков
        const supplierPerformanceIndex = this._calculateSupplierPerformanceIndex(analytics.supplierMetrics);
        
        // Расчет индекса эффективности доставки
        const deliveryEfficiencyIndex = this._calculateDeliveryEfficiencyIndex(analytics.deliveryMetrics);
        
        // Calculate Inventory Health Index (Example)
        let inventoryHealthIndex = 0;
        if (analytics.productMetrics && analytics.productMetrics.inventorySummary) {
            const invSummary = analytics.productMetrics.inventorySummary;
            const { totalProducts, productsBelowReorder, lowStockProductsCount } = invSummary;
            if (totalProducts > 0) {
                const healthyStockRatio = 1 - ((productsBelowReorder + lowStockProductsCount) / (totalProducts * 2));
                inventoryHealthIndex = Math.max(0, Math.round(healthyStockRatio * 100));
            }
        } else {
            inventoryHealthIndex = 70;
        }
        
        const costOptimizationIndex = 75; // FIXME: Placeholder - Implement actual cost optimization calculation
        const customerSatisfactionIndex = 85; // FIXME: Placeholder - Implement actual customer satisfaction calculation
        
        return {
            supplierPerformanceIndex,
            deliveryEfficiencyIndex,
            inventoryHealthIndex,
            costOptimizationIndex,
            customerSatisfactionIndex
        };
    }
    
    _calculateSupplierPerformanceIndex(supplierMetrics) {
        if (!supplierMetrics || supplierMetrics.length === 0) {
            return 0;
        }
        
        let totalScore = 0;
        let totalWeight = 0;
        
        supplierMetrics.forEach(supplier => {
            const onTimeDeliveryContribution = (supplier.onTimeDeliveryRate || 0) * 0.4; 
            const profitMarginContribution = (supplier.averageProfitMargin || 0) * 0.3; 
            const qualityContribution = (supplier.qualityScore || 0) * 0.15; 
            const costEfficiencyContribution = (supplier.costEfficiencyScore || 0) * 0.15;

            const score = onTimeDeliveryContribution + profitMarginContribution + qualityContribution + costEfficiencyContribution;
            
            const weight = supplier.totalOrders || 1; 
            
            totalScore += score * weight;
            totalWeight += weight;
        });
        
        return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    }
    
    _calculateDeliveryEfficiencyIndex(deliveryMetrics) {
        if (!deliveryMetrics) return 0;

        let { onTime, delayed, averageDeliveryTime, deliverySuccessRate } = deliveryMetrics;
        const totalDeliveries = onTime + delayed;

        if (totalDeliveries === 0) return 0;

        // Убедимся, что deliverySuccessRate не превышает 100
        deliverySuccessRate = Math.min(deliverySuccessRate || 0, 100);

        // Веса для компонентов индекса
        const W_SUCCESS_RATE = 0.5;
        const W_AVG_TIME = 0.3;
        const W_ON_TIME_RATE = 0.2;

        // Нормализация среднего времени доставки (предполагаем, что 1 день - отлично, 7+ дней - плохо)
        const normalizedAvgTime = Math.max(0, 100 - (averageDeliveryTime - 1) * 15);

        // Расчет компонентов индекса
        const successRateScore = deliverySuccessRate; // Уже в диапазоне 0-100
        const timeScore = normalizedAvgTime;
        const onTimeRate = onTime / totalDeliveries * 100;

        let dei = (successRateScore * W_SUCCESS_RATE) + (timeScore * W_AVG_TIME) + (onTimeRate * W_ON_TIME_RATE);
        
        // Дополнительно ограничиваем dei перед округлением
        dei = Math.max(0, Math.min(dei, 100));
        
        return Math.round(dei);
    }
    
    async _saveOrUpdateAnalytics(analytics) {
        try {
            // analytics.date is expected to be the start of the day, matching the unique index.
            const existingAnalytics = await Analytics.findOne({
                period: analytics.period,
                date: analytics.date // Query for the exact date/time that forms the unique key
            });
            
            if (existingAnalytics) {
                // The document for this specific period and date already exists. Update it.
                // Preserve the original _id and unique key fields (period, date) from existingAnalytics 
                // to prevent any accidental changes to them if `analytics` object had different values for these.
                const originalId = existingAnalytics._id;
                const originalPeriod = existingAnalytics.period;
                const originalDate = existingAnalytics.date;

                // Create a new object for updates, excluding _id, period, and date from the source `analytics` object
                // to avoid attempting to change these unique/immutable fields on the existing document.
                const updatePayload = { ...analytics };
                delete updatePayload._id; // Should not be in analytics object anyway, but good practice
                delete updatePayload.period; // Should match originalPeriod
                delete updatePayload.date;   // Should match originalDate

                Object.assign(existingAnalytics, updatePayload); // Apply updates from the new analytics data

                // Ensure immutable/key fields are explicitly set back if somehow modified by Object.assign (should not happen with deletes above)
                existingAnalytics._id = originalId;
                existingAnalytics.period = originalPeriod;
                existingAnalytics.date = originalDate;
                existingAnalytics.lastUpdated = new Date();
                
                await existingAnalytics.save();
                return existingAnalytics;
            } else {
                // No document for this specific period and date exists, so save the new one.
                // analytics.date is already set to startOfDay by generateDailyAnalytics.
                analytics.lastUpdated = new Date(); // Ensure lastUpdated is set on new docs too
                return await analytics.save(); 
            }
        } catch (error) {
            console.error('Error saving or updating analytics:', error);
            throw error;
        }
    }

    // Метод для получения метрик КОНКРЕТНОГО поставщика (используется на /supplier/orders)
    async getSpecificSupplierMetrics(supplierId) {
        try {
            // 1. Валидация ID
            if (!mongoose.Types.ObjectId.isValid(supplierId)) {
                throw new Error('Invalid Supplier ID format');
            }

            // 2. Находим все заказы для данного поставщика
            // Учитываем только завершенные (или в определенном статусе) заказы для некоторых метрик
            const completedStatuses = ['Доставлен', 'Получен'];
            const orders = await Order.find({
                supplier: supplierId,
                // status: { $in: completedStatuses } // Раскомментировать, если метрики считать только по завершенным
            })
            .select('orderDate estimatedDeliveryDate actualDeliveryDate status totalOrderValue') // Выбираем только нужные поля
            .lean(); // Используем lean() для производительности, так как нам не нужны Mongoose документы

            if (!orders || orders.length === 0) {
                // Если заказов нет, возвращаем метрики по умолчанию
                return {
                    totalOrders: 0,
                    completedOrders: 0,
                    onTimeDelivery: 0,
                    onTimeDeliveryPercentage: 0,
                    averageProcessingTime: 0, // Пока не вычисляем
                    totalRevenue: 0,
                    revenueGrowth: 0 // Пока не вычисляем
                };
            }

            // 3. Вычисляем метрики
            let totalOrders = orders.length;
            let completedOrders = 0;
            let onTimeDeliveryCount = 0;
            let totalRevenue = 0;
            // let processingTimeSum = 0;
            // let processingCount = 0;

            orders.forEach(order => {
                totalRevenue += order.totalOrderValue || 0;
                
                if (completedStatuses.includes(order.status)) {
                    completedOrders++;
                    if (order.actualDeliveryDate && order.estimatedDeliveryDate) {
                        if (order.actualDeliveryDate <= order.estimatedDeliveryDate) {
                            onTimeDeliveryCount++;
                        }
                    }
                }
                
                // Логика для averageProcessingTime (нужны доп. статусы/даты)
                // Пример: найти статус 'Отправлен' и 'Подтвержден' в statusHistory 
                // const confirmedEntry = order.statusHistory?.find(h => h.status === 'Подтвержден');
                // const shippedEntry = order.statusHistory?.find(h => h.status === 'Отправлен');
                // if (confirmedEntry && shippedEntry) {
                //    processingTimeSum += (shippedEntry.timestamp - confirmedEntry.timestamp);
                //    processingCount++;
                // }
            });

            const onTimeDeliveryPercentage = completedOrders > 0 ? Math.round((onTimeDeliveryCount / completedOrders) * 100) : 0;
            // const averageProcessingTimeDays = processingCount > 0 ? Math.round((processingTimeSum / processingCount) / (1000 * 60 * 60 * 24)) : 0;

            // TODO: Расчет revenueGrowth (требует данных за предыдущий период)
            const revenueGrowth = 0; // Placeholder

            return {
                totalOrders,
                completedOrders,
                onTimeDelivery: onTimeDeliveryCount, // Возвращаем КОЛИЧЕСТВО
                onTimeDeliveryPercentage, // Возвращаем ПРОЦЕНТ
                averageProcessingTime: 0, // averageProcessingTimeDays, // Пока 0
                totalRevenue,
                revenueGrowth, // Пока 0
            };

        } catch (error) {
            console.error(`Error calculating metrics for supplier ${supplierId}:`, error);
            throw error; // Пробрасываем ошибку для обработки в маршруте
        }
    }

    // Метод для получения ДЕТАЛЬНЫХ метрик эффективности КОНКРЕТНОГО поставщика
    async getSupplierPerformanceDetails(supplierId) {
        try {
            if (!mongoose.Types.ObjectId.isValid(supplierId)) {
                throw new Error('Invalid Supplier ID format');
            }

            // Пока что этот метод будет возвращать те же данные, что и getSpecificSupplierMetrics
            // В будущем его можно расширить, чтобы он агрегировал данные из нескольких записей Analytics
            // или рассчитывал более сложные KPI.

            const basicMetrics = await this.getSpecificSupplierMetrics(supplierId);

            // Пытаемся найти последнюю запись аналитики для этого поставщика, чтобы получить доп. данные
            // Это очень упрощенно, в идеале нужна агрегация за период или более сложная логика.
            const latestAnalyticsRecord = await Analytics.findOne({ 'supplierMetrics.supplier': supplierId })
                .sort({ date: -1 })
                .lean();
            
            let additionalMetrics = {};
            if (latestAnalyticsRecord && latestAnalyticsRecord.supplierMetrics) {
                const supplierMetricData = latestAnalyticsRecord.supplierMetrics.find(
                    s => s.supplier?.toString() === supplierId
                );
                if (supplierMetricData) {
                    additionalMetrics = {
                        // Пример: если в Analytics.supplierMetrics есть такие поля
                        // qualityScore: supplierMetricData.qualityScore || 0, 
                        // averageRating: supplierMetricData.averageRating || 0,
                        // contractCompliance: supplierMetricData.contractCompliance || 0, 
                        // Поля из getSpecificSupplierMetrics уже есть в basicMetrics
                        // Можно добавить поля, которых нет в basicMetrics, но есть в Analytics
                        // например, performanceScore из схемы Analytics, если он рассчитывается
                        performanceScore: supplierMetricData.performanceScore || 0,
                        // или другие специфичные поля из supplierMetricData
                    };
                }
            }

            // Объединяем базовые метрики с дополнительными
            const performanceDetails = {
                ...basicMetrics,
                ...additionalMetrics,
                 // Можно добавить поля, которых нет ни там, ни там, но можно вычислить
                exampleCalculatedMetric: 100 // Пример
            };

            // Убедимся, что все ожидаемые поля присутствуют, даже если с 0
            const defaultPerformanceValues = {
                totalOrders: 0,
                completedOrders: 0,
                onTimeDelivery: 0,
                onTimeDeliveryPercentage: 0,
                averageProcessingTime: 0,
                totalRevenue: 0,
                revenueGrowth: 0,
                performanceScore: 0, // Из Analytics
                // qualityScore: 0, 
                // averageRating: 0,
            };

            return { ...defaultPerformanceValues, ...performanceDetails };

        } catch (error) {
            console.error(`Error calculating performance details for supplier ${supplierId}:`, error);
            throw error;
        }
    }

    // Метод для получения данных для сравнительного анализа поставщиков
    async fetchSupplierComparisonData(supplierIds, metricIds) {
        try {
            const results = [];

            for (const supplierId of supplierIds) {
                const supplier = await Supplier.findById(supplierId).lean();
                if (!supplier) {
                    results.push({ supplierId, supplierName: 'Неизвестный поставщик', error: 'Поставщик не найден' });
                    continue;
                }

                const supplierData = {
                    supplierId: supplierId,
                    supplierName: supplier.name,
                };
                
                // Получаем все заказы, где есть хотя бы один товар от данного поставщика
                const productsOfSupplier = await Product.find({ supplier: supplierId }).select('_id').lean();
                const productIdsOfSupplier = productsOfSupplier.map(p => p._id);

                const ordersWithSupplierProducts = await Order.find({
                    'products.product': { $in: productIdsOfSupplier }
                })
                .select('totalOrderValue orderDate estimatedDeliveryDate actualDeliveryDate deliveryDelay shippingTime products') 
                .populate('products.product', 'supplier cost price')
                .lean();

                for (const metricId of metricIds) {
                    switch (metricId) {
                        case 'onTimeDeliveryRate':
                            // Вычисляем процент своевременных доставок из реальных данных
                            if (ordersWithSupplierProducts && ordersWithSupplierProducts.length > 0) {
                                let onTimeDeliveries = 0;
                                let relevantOrdersForDeliveryRate = 0;
                                
                                ordersWithSupplierProducts.forEach(order => {
                                    if (order.actualDeliveryDate && order.estimatedDeliveryDate) {
                                        relevantOrdersForDeliveryRate++;
                                        if (order.deliveryDelay === 0 || new Date(order.actualDeliveryDate) <= new Date(order.estimatedDeliveryDate)) {
                                            onTimeDeliveries++;
                                        }
                                    }
                                });
                                
                                if (relevantOrdersForDeliveryRate > 0) {
                                    supplierData[metricId] = Math.round((onTimeDeliveries / relevantOrdersForDeliveryRate) * 100) + '%';
                                } else {
                                    // Если нет релевантных заказов, используем значение из профиля поставщика или значение по умолчанию
                                    supplierData[metricId] = (supplier.reliability || 85) + '%';
                                }
                            } else {
                                // Если нет заказов, используем значение из профиля поставщика или значение по умолчанию
                                supplierData[metricId] = (supplier.reliability || 85) + '%';
                            }
                            break;

                        case 'qualityScore':
                            // Используем фактический рейтинг из модели Supplier
                            supplierData[metricId] = supplier.rating ? supplier.rating.toFixed(1) : '4.0';
                            break;

                        case 'averageOrderValue':
                            if (ordersWithSupplierProducts && ordersWithSupplierProducts.length > 0) {
                                let totalValue = 0;
                                let countOrders = 0;
                                
                                ordersWithSupplierProducts.forEach(order => {
                                    const valueFromThisSupplier = order.products.reduce((sum, item) => {
                                        if (item.product && item.product.supplier && item.product.supplier.toString() === supplierId) {
                                            return sum + (item.totalPrice || item.unitPrice * item.quantity || 0);
                                        }
                                        return sum;
                                    }, 0);
                                    
                                    if (valueFromThisSupplier > 0) {
                                        totalValue += valueFromThisSupplier;
                                        countOrders++;
                                    }
                                });
                                
                                if (countOrders > 0) {
                                    const avgValue = Math.round(totalValue / countOrders);
                                    supplierData[metricId] = `${avgValue.toLocaleString('ru-RU')} руб.`;
                                } else {
                                    // Если нет данных, используем среднюю стоимость продуктов этого поставщика
                                    const productAvgPrice = await calculateSupplierProductAvgPrice(supplierId);
                                    supplierData[metricId] = `${productAvgPrice.toLocaleString('ru-RU')} руб.`;
                                }
                            } else {
                                // Если нет заказов, используем среднюю стоимость продуктов этого поставщика
                                const productAvgPrice = await calculateSupplierProductAvgPrice(supplierId);
                                supplierData[metricId] = `${productAvgPrice.toLocaleString('ru-RU')} руб.`;
                            }
                            break;

                        case 'defectRate':
                            // Используем обратное значение от reliability (качества) поставщика
                            // или оптимистичное низкое значение по умолчанию, если нет данных
                            const defectRate = supplier.reliability ? (100 - supplier.reliability) : 10;
                            supplierData[metricId] = `${defectRate}%`;
                            break;

                        case 'leadTime':
                            // Используем среднее время доставки из профиля поставщика или вычисляем из заказов
                            if (supplier.avgDeliveryTime) {
                                supplierData[metricId] = `${supplier.avgDeliveryTime} дней`;
                            } else if (ordersWithSupplierProducts && ordersWithSupplierProducts.length > 0) {
                                let totalLeadTime = 0;
                                let leadTimeCount = 0;
                                
                                ordersWithSupplierProducts.forEach(order => {
                                    if (order.shippingTime) {
                                        totalLeadTime += order.shippingTime;
                                        leadTimeCount++;
                                    } else if (order.actualDeliveryDate && order.orderDate) {
                                        // Если shippingTime не указано, вычисляем из дат
                                        const deliveryTime = Math.ceil((new Date(order.actualDeliveryDate) - new Date(order.orderDate)) / (1000 * 60 * 60 * 24));
                                        if (deliveryTime > 0) {
                                            totalLeadTime += deliveryTime;
                                            leadTimeCount++;
                                        }
                                    }
                                });
                                
                                if (leadTimeCount > 0) {
                                    const avgLeadTime = Math.round(totalLeadTime / leadTimeCount);
                                    supplierData[metricId] = `${avgLeadTime} дней`;
                                } else {
                                    // Стандартное значение, если нет данных
                                    supplierData[metricId] = '7 дней';
                                }
                            } else {
                                // Стандартное значение, если нет данных
                                supplierData[metricId] = '7 дней';
                            }
                            break;

                        default:
                            supplierData[metricId] = 'Нет данных';
                    }
                }
                results.push(supplierData);
            }
            return results;
        } catch (error) {
            console.error('Error in fetchSupplierComparisonData:', error);
            throw new Error('Ошибка получения данных для сравнения поставщиков: ' + error.message);
        }
    }

    // Вспомогательная функция для вычисления средней цены продуктов поставщика
    async calculateSupplierProductAvgPrice(supplierId) {
        try {
            const products = await Product.find({ supplier: supplierId, price: { $gt: 0 } }).select('price').lean();
            if (products && products.length > 0) {
                const totalPrice = products.reduce((sum, product) => sum + (product.price || 0), 0);
                return Math.round(totalPrice / products.length);
            }
            return 50000; // Значение по умолчанию, если нет продуктов или цен
        } catch (error) {
            console.error('Error calculating average product price:', error);
            return 50000; // Значение по умолчанию при ошибке
        }
    }
}

module.exports = new AnalyticsService(); 