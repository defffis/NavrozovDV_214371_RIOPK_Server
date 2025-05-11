const Order = require('../models/Order');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const mongoose = require('mongoose');

class ReportService {

    /**
     * Генерирует отчет по продажам с группировкой по категориям или поставщикам.
     * @param {Date} startDate - Начальная дата периода.
     * @param {Date} endDate - Конечная дата периода.
     * @param {'category' | 'supplier'} groupBy - Поле для группировки.
     * @returns {Promise<Array<{ group: string, totalOrders: number, totalRevenue: number }>>}
     */
    async getSalesReport(startDate, endDate, groupBy = 'category') {
        try {
            const matchStage = {
                orderDate: { $gte: startDate, $lte: endDate },
                // Можно добавить фильтр по статусам, если отчет нужен только по завершенным заказам
                // status: { $in: ['Доставлен', 'Получен'] }
            };

            const unwindStage = { $unwind: '$products' };

            const lookupProductStage = {
                $lookup: {
                    from: 'products', // Имя коллекции продуктов
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            };

            const unwindProductStage = {
                 $unwind: '$productDetails' // Разворачиваем результат lookup
            };
            
            let groupField = '$productDetails.category'; // По умолчанию группируем по категории
            let lookupSupplierStage = null;
            let unwindSupplierStage = null;

            if (groupBy === 'supplier') {
                // Если группируем по поставщику, нужно подтянуть данные поставщика
                groupField = '$supplierDetails.name'; // Группируем по имени поставщика
                lookupSupplierStage = {
                    $lookup: {
                        from: 'suppliers', // Имя коллекции поставщиков
                        localField: '$productDetails.supplier', // Поле supplier в продукте
                        foreignField: '_id',
                        as: 'supplierDetails'
                    }
                };
                 unwindSupplierStage = { $unwind: '$supplierDetails' };
            }

            const groupStage = {
                $group: {
                    _id: groupField,
                    totalOrders: { $addToSet: '$_id' }, // Считаем уникальные ID заказов
                    totalRevenue: { $sum: '$products.totalPrice' }
                }
            };

            const projectStage = {
                $project: {
                    _id: 0, // Убираем _id
                    group: '$_id', // Переименовываем _id в group
                    totalOrders: { $size: '$totalOrders' }, // Считаем размер массива уникальных заказов
                    totalRevenue: '$totalRevenue'
                }
            };

            const sortStage = {
                $sort: { totalRevenue: -1 } // Сортируем по выручке по убыванию
            };

            // Собираем pipeline агрегации
            const pipeline = [
                { $match: matchStage },
                unwindStage,
                lookupProductStage,
                unwindProductStage,
            ];

            if (lookupSupplierStage) {
                pipeline.push(lookupSupplierStage);
                pipeline.push(unwindSupplierStage);
            }

            pipeline.push(groupStage);
            pipeline.push(projectStage);
            pipeline.push(sortStage);

            const reportData = await Order.aggregate(pipeline);
            
            return reportData;

        } catch (error) {
            console.error(`Error generating sales report (groupBy: ${groupBy}):`, error);
            throw new Error('Ошибка при формировании отчета по продажам');
        }
    }

    // TODO: Добавить метод для отчета по эффективности поставщиков (getSupplierPerformanceReport)
    // Он может быть похож на логику из GET /api/analytics/suppliers

}

module.exports = new ReportService(); 