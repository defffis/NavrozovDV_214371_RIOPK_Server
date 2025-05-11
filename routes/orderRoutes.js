const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Employee = require('../models/Employee');
const Product = require('../models/Product');
const Client = require('../models/Client');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/checkRole');
const { exportOrdersToExcel } = require('../services/exportService');
const { calculateOrderMetrics } = require('../services/analyticsService');
const { sendNotification } = require('../services/notificationService');

// Helper function to manually populate client data
async function manuallyAddClientInfo(orders) {
    try {
        // Find orders with missing client info (null or not an object)
        orders = orders.map(order => {
            if (!order.client) {
                // Order missing a client - flag it for admin attention
                console.log(`Order ${order._id} has no client assigned`);
                order.client = { 
                    _id: null,
                    name: '[ОШИБКА: Отсутствует клиент]',
                    missingClient: true 
                };
            }
            return order;
        });
        
        // Extract client IDs that need to be looked up
        const clientIds = orders
            .filter(order => order.client && typeof order.client !== 'object')
            .map(order => order.client);
        
        if (clientIds.length === 0) return orders;
        
        // Fetch and map clients
        console.log(`Attempting to manually populate ${clientIds.length} clients`);
        
        const clients = await Client.find({ 
            '_id': { $in: clientIds } 
        }).lean();
        
        const clientMap = {};
        clients.forEach(client => {
            clientMap[client._id.toString()] = client;
        });
        
        // Replace client IDs with client objects
        return orders.map(order => {
            if (order.client && typeof order.client !== 'object') {
                const clientId = order.client.toString();
                
                // Check if this is the test admin ID
                if (clientId === '000000000000000000000000') {
                    console.log(`Order ${order._id} has test admin user as client`);
                    order.client = { 
                        _id: order.client,
                        name: '[ОШИБКА: Тестовый пользователь]',
                        isTestUser: true
                    };
                } 
                // Normal case - client exists in database
                else if (clientMap[clientId]) {
                    order.client = clientMap[clientId];
                } 
                // Client ID exists but client not found in database
                else {
                    console.log(`Order ${order._id} has client ID ${clientId} but client not found in database`);
                    order.client = { 
                        _id: order.client,
                        name: `[ID Клиента: ${clientId.slice(-6)}]`,
                        missingClientData: true
                    };
                }
            } 
            // Check for test admin user object
            else if (order.client && order.client.name && 
                    (order.client.name.includes('[TEST ADMIN USER') || 
                     order.client.name === 'Администратор Системы')) {
                console.log(`Order ${order._id} has test admin name in client field`);
                order.client.name = '[ОШИБКА: Тестовый пользователь]';
                order.client.isTestUser = true;
            }
            
            return order;
        });
    } catch (error) {
        console.error('Error manually populating clients:', error);
        return orders; // Return original orders if there's an error
    }
}

// ======================= GENERAL ROUTES =======================

// Получение всех заказов с фильтрацией
router.get('/', auth, async (req, res) => {
    try {
        const {
            status,
            client,
            supplier,
            employee,
            search,
            startDate,
            endDate,
            sort = '-orderDate'
        } = req.query;

        // Базовый фильтр
        const filter = {};

        // Добавляем фильтры в зависимости от роли пользователя
        if (req.user.role === 'client') {
            filter.client = req.user._id;
        } else if (req.user.role === 'supplier') {
            filter.supplier = req.user._id;
        } else if (req.user.role === 'employee' && !employee) {
            filter.employee = req.user._id;
        } else if (req.user.role === 'employee' && employee === 'all') {
            // Если указан специальный параметр employee=all, не добавляем фильтр по сотруднику
            console.log('Employee requesting all orders without employee filter');
        }

        // Применяем дополнительные фильтры
        if (status) filter.status = status;
        if (client && req.user.role !== 'client') filter.client = client;
        if (supplier && req.user.role !== 'supplier') filter.supplier = supplier;
        if (employee && employee !== 'all' && ['admin', 'manager'].includes(req.user.role)) filter.employee = employee;
        
        // Поиск по номеру заказа
        if (search) {
            filter._id = new RegExp(search, 'i');
        }

        // Фильтр по дате
        if (startDate || endDate) {
            filter.orderDate = {};
            if (startDate) filter.orderDate.$gte = new Date(startDate);
            if (endDate) filter.orderDate.$lte = new Date(endDate);
        }

        console.log('Fetching orders with filter:', filter);
        
        // Adjust the populate method for better client info
        let orders = await Order.find(filter)
            .sort(sort)
            .populate({
                path: 'client',
                select: 'name email phone',
                options: { lean: true }
            })
            .populate('supplier', 'name email phone')
            .populate('employee', 'name email')
            .populate('products.product', 'name price')
            .lean();
            
        // Add client name for any order with just a client ID
        orders = orders.map(order => {
            // If client is an ObjectId but not populated, convert it to a string representation
            if (order.client && typeof order.client !== 'object') {
                console.log(`Order ${order._id} has client ID but not populated:`, order.client);
                // Try to manually get client info
                // Will be attempted in a separate step if needed
            }
            return order;
        });

        // Manually populate any client info that MongoDB's populate missed
        orders = await manuallyAddClientInfo(orders);

        // Add debugging to check what's returned for client population
        console.log('Orders returned with client population:', 
            orders.map(o => ({
                id: o._id.toString().slice(-6),
                client: o.client, 
                clientType: o.client ? typeof o.client : 'undefined'
            }))
        );

        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Ошибка при получении заказов' });
    }
});

// ======================= SPECIALIZED GET ROUTES (before ID route) =======================

// Получение заказов для текущего поставщика
router.get('/supplier', auth, checkRole(['supplier']), async (req, res) => {
    try {
        console.log('[SUPPLIER ORDERS] Fetching orders for supplier:', req.user._id);
        
        let orders = await Order.find({ supplier: req.user._id })
            .sort('-createdAt')
            .populate('client', 'name email phone')
            .populate('products.product', 'name price')
            .lean();
        
        console.log(`[SUPPLIER ORDERS] Found ${orders.length} orders for supplier ${req.user._id}`);
        
        if (orders.length === 0) {
            // Check if there are any orders with this supplier at all
            const supplierCheck = await Order.countDocuments({ supplier: req.user._id });
            console.log(`[SUPPLIER ORDERS] Raw count of supplier orders in database: ${supplierCheck}`);
            
            // Check if supplier ID is stored correctly - sometimes it might be string vs ObjectId 
            const objectIdCheck = await Order.countDocuments({ 
                supplier: mongoose.Types.ObjectId.isValid(req.user._id) ? 
                    new mongoose.Types.ObjectId(req.user._id) : req.user._id 
            });
            console.log(`[SUPPLIER ORDERS] Count with explicit ObjectId conversion: ${objectIdCheck}`);
        } else {
            // Log detailed information about the first order
            const sampleOrder = orders[0];
            console.log('[SUPPLIER ORDERS] Sample order structure:', {
                id: sampleOrder._id,
                clientType: sampleOrder.client ? typeof sampleOrder.client : 'undefined',
                clientName: sampleOrder.client?.name || 'N/A',
                orderDate: sampleOrder.orderDate || 'N/A',
                createdAt: sampleOrder.createdAt || 'N/A',
                totalValue: sampleOrder.totalOrderValue || 'N/A',
                totalAmount: sampleOrder.totalAmount || 'N/A',
                status: sampleOrder.status || 'N/A',
                productsCount: sampleOrder.products?.length || 0
            });
        }

        // Manually populate any client info that MongoDB's populate missed
        orders = await manuallyAddClientInfo(orders);

        console.log('[SUPPLIER ORDERS] Returning orders to client');
        res.json(orders);
    } catch (error) {
        console.error('Error fetching supplier orders:', error);
        res.status(500).json({ message: 'Ошибка при получении заказов поставщика' });
    }
});

// Получение заказов без назначенного поставщика (для поставщиков, чтобы брать их себе)
router.get('/unclaimed', auth, checkRole(['supplier', 'manager', 'admin']), async (req, res) => {
    try {
        console.log('[ORDERS] Fetching unclaimed orders');
        let unclaimedOrders = await Order.find({ 
            $or: [
                { supplier: { $exists: false } },
                { supplier: null }
            ]
        })
        .populate('client', 'name email phone')
        .populate('employee', 'name')
        .populate('products.product', 'name price')
        .lean();

        // Manually populate any client info that MongoDB's populate missed
        unclaimedOrders = await manuallyAddClientInfo(unclaimedOrders);
        
        console.log(`[ORDERS] Found ${unclaimedOrders.length} unclaimed orders`);
        res.json(unclaimedOrders);
    } catch (error) {
        console.error('Error fetching unclaimed orders:', error);
        res.status(500).json({ message: 'Ошибка при получении неназначенных заказов' });
    }
});

// Экспорт заказов в Excel
router.get('/export', auth, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        const { status, startDate, endDate, supplier } = req.query;
        
        // Формируем фильтр
        const filter = {};
        if (status) filter.status = status;
        if (supplier) filter.supplier = supplier;
        if (startDate || endDate) {
            filter.orderDate = {};
            if (startDate) filter.orderDate.$gte = new Date(startDate);
            if (endDate) filter.orderDate.$lte = new Date(endDate);
        }

        // Получаем заказы
        const orders = await Order.find(filter)
            .populate('client', 'name email phone')
            .populate('supplier', 'name')
            .populate('employee', 'name')
            .populate('products.product', 'name price');

        // Генерируем Excel файл
        const buffer = await exportOrdersToExcel(orders);

        // Отправляем файл
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
        res.send(buffer);
    } catch (error) {
        console.error('Error exporting orders:', error);
        res.status(500).json({ message: 'Ошибка при экспорте заказов' });
    }
});

// ======================= ANALYTICS ROUTES =======================

// Получение метрик поставщика
router.get('/analytics/supplier/:id', auth, checkRole(['supplier', 'manager', 'admin']), async (req, res) => {
    try {
        const supplierId = req.params.id;

        // Проверяем права доступа
        if (req.user.role === 'supplier' && req.user._id.toString() !== supplierId) {
            return res.status(403).json({ message: 'Доступ запрещен' });
        }

        const metrics = await calculateOrderMetrics({ supplier: supplierId });
        res.json(metrics);
    } catch (error) {
        console.error('Error fetching supplier metrics:', error);
        res.status(500).json({ message: 'Ошибка при получении метрик поставщика' });
    }
});

// Получение общей статистики по заказам
router.get('/analytics/summary', auth, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        const { startDate, endDate, supplier } = req.query;
        const metrics = await calculateOrderMetrics({ startDate, endDate, supplier });
        res.json(metrics);
    } catch (error) {
        console.error('Error fetching order metrics:', error);
        res.status(500).json({ message: 'Ошибка при получении метрик заказов' });
    }
});

// Получение статистики для панели управления
router.get('/analytics/dashboard', auth, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const [
            totalOrders,
            monthlyOrders,
            pendingOrders,
            completedOrders,
            canceledOrders,
            averageOrderValue
        ] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({
                orderDate: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            Order.countDocuments({
                status: { $in: ['Создан', 'Подтвержден', 'В обработке'] }
            }),
            Order.countDocuments({
                status: { $in: ['Доставлен', 'Получен'] }
            }),
            Order.countDocuments({ status: 'Отменен' }),
            Order.aggregate([
                {
                    $group: {
                        _id: null,
                        average: { $avg: '$totalOrderValue' }
                    }
                }
            ]).then(result => result[0]?.average || 0)
        ]);

        res.json({
            totalOrders,
            monthlyOrders,
            pendingOrders,
            completedOrders,
            canceledOrders,
            averageOrderValue
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Ошибка при получении статистики' });
    }
});

// ======================= INDIVIDUAL ITEM ROUTES =======================

// Получение заказа по ID - MUST come after all other GET routes with specific paths
router.get('/:id', auth, async (req, res) => {
    try {
        let order = await Order.findById(req.params.id)
            .populate('client', 'name email phone')
            .populate('supplier', 'name email phone')
            .populate('employee', 'name email')
            .populate('products.product', 'name price')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Заказ не найден' });
        }

        // Если у заказа есть client ID, но не заполнен объект клиента, заполняем его вручную
        if (order.client && typeof order.client !== 'object') {
            const orders = await manuallyAddClientInfo([order]);
            order = orders[0]; // Get the updated order
        }

        // Проверка прав доступа
        if (req.user.role === 'client' && 
            order.client && 
            order.client._id && 
            order.client._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Доступ запрещен' });
        }

        if (req.user.role === 'supplier' && 
            order.supplier && 
            order.supplier._id && 
            order.supplier._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Доступ запрещен' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Ошибка при получении заказа' });
    }
});

// ======================= POST/PATCH ROUTES =======================

// Создание нового заказа
router.post('/', auth, async (req, res) => {
    try {
        // Check if user is a client or has admin role
        if (req.user.role !== 'client' && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Только клиенты могут создавать заказы',
                details: 'Только пользователь с ролью "client" может создавать заказы'
            });
        }

        // For testing, simplified order structure
        const { items, totalOrderValue: orderTotal, shippingAddress, paymentMethod, shippingMethod } = req.body;
        
        console.log('[DEBUG] Auth user info:', {
            userId: req.user._id.toString(),
            name: req.user.name,
            role: req.user.role
        });
        
        // Development mode - create a simplified order but with PROPER CLIENT ASSOCIATION
        if (process.env.NODE_ENV !== 'production') {
            // In development mode, use the authenticated user's ID if they're a client
            let clientId = req.user.role === 'client' ? req.user._id : null;
            console.log('[DEBUG] Client ID for the order:', clientId && clientId.toString());
            
            // If admin is testing and no client ID is set, look for a real client
            if (!clientId || req.user._id.toString() === '000000000000000000000000') {
                // This is only for admins testing the API, not normal client usage
                try {
                    // Only do this if we don't have a client ID and the request specifically asks to use a test client
                    if (req.body.useTestClient) {
                        console.log('[DEBUG] Admin user is testing - looking for a test client');
                        const Client = mongoose.model('Client');
                        const testClient = await Client.findOne();
                        
                        if (testClient) {
                            console.log('[DEBUG] Using test client:', testClient.name);
                            clientId = testClient._id;
                        } else {
                            console.log('[DEBUG] No test clients found in the database');
                        }
                    }
                } catch (err) {
                    console.error('[DEBUG] Error finding test client:', err);
                }
            }
            
            // If after everything we still don't have a client ID and we're in dev mode,
            // return a clear error message
            if (!clientId) {
                console.error('[ERROR] No valid client ID for order creation');
                return res.status(400).json({ 
                    message: 'Заказ должен быть связан с клиентом', 
                    details: 'Для создания заказа, пользователь должен аутентифицироваться как клиент.'
                });
            }
            
            const order = new Order({
                client: clientId,
                supplier: null, // Will be assigned later
                products: items || [],
                totalOrderValue: orderTotal || 0,
                status: 'Создан',
                paymentMethod: paymentMethod || 'Карта',
                shippingMethod: shippingMethod || 'Курьерская доставка',
                shippingAddress: shippingAddress || 'Тестовый адрес',
                statusHistory: [{
                    status: 'Создан',
                    timestamp: new Date(),
                    comment: 'Заказ создан клиентом'
                }]
            });
            
            await order.save();
            return res.status(201).json(order);
        }
        
        // Original implementation follows for production...
        const { products, deliveryAddress } = req.body;

        if (!products || products.length === 0) {
            return res.status(400).json({ message: 'Необходимо указать товары' });
        }

        // Проверяем наличие товаров и рассчитываем общую сумму
        let totalOrderValue = 0;
        const productDetailsForOrder = []; // Renamed to avoid conflict
        const productsToUpdate = []; // To store products whose stock will be updated

        for (const item of products) {
            const productDoc = await Product.findById(item.product); // Renamed to productDoc
            if (!productDoc) {
                return res.status(400).json({ message: `Товар ${item.product} не найден` });
            }

            if (productDoc.stockQuantity < item.quantity) { // Changed from product.stock to productDoc.stockQuantity
                return res.status(400).json({ message: `Недостаточно товара ${productDoc.name} на складе. В наличии: ${productDoc.stockQuantity}` });
            }

            const totalPriceForItem = productDoc.price * item.quantity; // Use productDoc.price
            totalOrderValue += totalPriceForItem;

            productDetailsForOrder.push({
                product: productDoc._id,
                quantity: item.quantity,
                unitPrice: productDoc.price, // Use productDoc.price
                totalPrice: totalPriceForItem,
                // Storing product name and SKU at the time of order for historical data
                nameSnapshot: productDoc.name, 
                skuSnapshot: productDoc.sku
            });

            // Add to list for stock update
            productsToUpdate.push({ document: productDoc, quantityChange: -item.quantity });
        }

        // ---- Start Transaction-like block (Conceptual) ----
        // In a real scenario with a DB that supports transactions (like MongoDB replica sets/sharded clusters):
        // const session = await mongoose.startSession();
        // session.startTransaction();
        // try {

        // 1. Update stock for all products
        for (const pUpdate of productsToUpdate) {
            await pUpdate.document.updateStock(pUpdate.quantityChange); // Using the model method
            // If using session: await pUpdate.document.updateStock(pUpdate.quantityChange, { session });
        }

        // 2. Create the order
        // Determine a single supplier for the order - current logic takes the first product's supplier.
        // This might need refinement if an order can have products from multiple suppliers.
        // For now, assuming products in a single order are from the same supplier or this logic is acceptable.
        let orderSupplierId = null;
        if (productsToUpdate.length > 0 && productsToUpdate[0].document.supplier) {
            orderSupplierId = productsToUpdate[0].document.supplier;
        } else if (products.length > 0) {
            // Fallback if supplier info wasn't on the first product for some reason (shouldn't happen with validation)
            const firstProductForSupplier = await Product.findById(products[0].product).select('supplier');
            if(firstProductForSupplier) orderSupplierId = firstProductForSupplier.supplier;
        }
        
        if (!orderSupplierId) {
             // This case should ideally be prevented by upstream logic or product data integrity
             console.error("Could not determine supplier for the order. Products: ", products);
             return res.status(500).json({ message: 'Не удалось определить поставщика для заказа.'});
        }


        const order = new Order({
            client: req.user._id,
            supplier: orderSupplierId, 
            products: productDetailsForOrder,
            totalOrderValue,
            deliveryAddress,
            status: 'Создан',
            statusHistory: [{
                status: 'Создан',
                timestamp: new Date(),
                comment: 'Заказ создан клиентом'
            }]
        });

        await order.save(); // If using session: await order.save({ session });

        // await session.commitTransaction();
        // } catch (error) {
        //    await session.abortTransaction();
        //    console.error('Transaction error creating order:', error);
        //    // Rollback stock updates manually if not using DB transactions and an error occurs during order save
        //    for (const pUpdate of productsToUpdate) {
        //        try { await pUpdate.document.updateStock(-pUpdate.quantityChange); } catch (e) { console.error('Rollback stock update failed for ', pUpdate.document.sku, e); }
        //    }
        //    return res.status(500).json({ message: 'Ошибка при создании заказа (транзакция отменена)' });
        // } finally {
        //    session.endSession();
        // }
        // ---- End Transaction-like block ----


        // Отправляем уведомление поставщику
        await sendNotification({
            type: 'NEW_ORDER',
            recipient: order.supplier,
            data: {
                orderId: order._id,
                totalValue: totalOrderValue
            }
        });

        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Ошибка при создании заказа' });
    }
});

// Обновление статуса заказа
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status, comment, location } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Заказ не найден' });
        }

        // Проверка прав на изменение статуса
        const allowedStatuses = {
            client: ['Отменен', 'Получен'],
            supplier: ['В обработке', 'Отправлен'],
            employee: ['Подтвержден', 'В обработке', 'Отправлен', 'В пути', 'Доставлен'],
            manager: ['Подтвержден', 'В обработке', 'Отправлен', 'В пути', 'Доставлен', 'Отменен'],
            admin: ['Создан', 'Подтвержден', 'В обработке', 'Отправлен', 'В пути', 'Доставлен', 'Отменен', 'Получен']
        };

        // Админу разрешаем обновлять статус любого заказа
        if (req.user.role !== 'admin' && !allowedStatuses[req.user.role]?.includes(status)) {
            return res.status(403).json({ message: 'Нет прав на изменение статуса' });
        }

        // Additional logic for stock adjustment if an order is cancelled
        if (status === 'Отменен' && order.status !== 'Отменен') { // Check if status actually changed to Отменен
            // Revert stock for each product in the order
            for (const item of order.products) {
                try {
                    const productDoc = await Product.findById(item.product);
                    if (productDoc) {
                        await productDoc.updateStock(item.quantity); // item.quantity is positive, reverting the deduction
                        console.log(`Stock for product ${productDoc.name} (SKU: ${productDoc.sku}) reverted by ${item.quantity} due to order cancellation.`);
                    }
                } catch (stockError) {
                    console.error(`Error reverting stock for product ${item.product} during order cancellation:`, stockError);
                    // Potentially log this for manual correction
                }
            }
        }

        // Обновляем статус
        order.status = status;
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            comment,
            changedBy: req.user._id,
            location
        });

        await order.save();

        // Отправляем уведомления
        if (status === 'Подтвержден') {
            await sendNotification({
                type: 'ORDER_CONFIRMED',
                recipient: order.client,
                data: { orderId: order._id }
            });
        } else if (status === 'Отправлен') {
            await sendNotification({
                type: 'ORDER_SHIPPED',
                recipient: order.client,
                data: { orderId: order._id }
            });
        } else if (status === 'Доставлен') {
            await sendNotification({
                type: 'ORDER_DELIVERED',
                recipient: order.client,
                data: { orderId: order._id }
            });
        }

        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Ошибка при обновлении статуса заказа' });
    }
});

// Назначение сотрудника на заказ
router.patch('/:id/assign', auth, checkRole(['manager', 'admin']), async (req, res) => {
    try {
        const { employeeId } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Заказ не найден' });
        }

        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(400).json({ message: 'Сотрудник не найден' });
        }

        order.employee = employeeId;
        await order.save();

        // Отправляем уведомление сотруднику
        await sendNotification({
            type: 'ORDER_ASSIGNED',
            recipient: employeeId,
            data: { orderId: order._id }
        });

        res.json(order);
    } catch (error) {
        console.error('Error assigning employee:', error);
        res.status(500).json({ message: 'Ошибка при назначении сотрудника' });
    }
});

// Назначение поставщика на заказ (для поставщиков, которые берут заказ на выполнение)
router.patch('/:id/claim', auth, checkRole(['supplier']), async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Заказ не найден' });
        }

        // Проверяем, не назначен ли уже поставщик
        if (order.supplier && order.supplier.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: 'Этот заказ уже назначен другому поставщику' });
        }

        // Обновляем заказ, назначая текущего поставщика
        order.supplier = req.user._id;
        
        // Обновляем статус, если заказ был только создан
        if (order.status === 'Создан') {
            order.status = 'Подтвержден';
            order.statusHistory.push({
                status: 'Подтвержден',
                timestamp: new Date(),
                comment: 'Заказ принят поставщиком',
                location: 'Web Interface'
            });
        }
        
        await order.save();

        // Отправляем уведомление клиенту
        await sendNotification({
            type: 'ORDER_CLAIMED',
            recipient: order.client,
            data: { 
                orderId: order._id,
                supplierName: req.user.name
            }
        });

        res.json(order);
    } catch (error) {
        console.error('Error claiming order:', error);
        res.status(500).json({ message: 'Ошибка при назначении поставщика на заказ' });
    }
});

// Добавление трекинг-номера
router.patch('/:id/tracking', auth, checkRole(['supplier', 'employee', 'manager', 'admin']), async (req, res) => {
    try {
        const { trackingNumber } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Заказ не найден' });
        }

        order.trackingNumber = trackingNumber;
        await order.save();

        // Отправляем уведомление клиенту
        await sendNotification({
            type: 'TRACKING_ADDED',
            recipient: order.client,
            data: {
                orderId: order._id,
                trackingNumber
            }
        });

        res.json(order);
    } catch (error) {
        console.error('Error adding tracking number:', error);
        res.status(500).json({ message: 'Ошибка при добавлении трекинг-номера' });
    }
});

module.exports = router;