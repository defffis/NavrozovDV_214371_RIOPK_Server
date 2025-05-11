const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

// Загружаем переменные окружения
dotenv.config({ path: '../.env' }); // Убедитесь, что путь к .env правильный

// Подключаем модели (убедитесь, что пути к моделям верны)
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Contract = require('../models/Contract');
const Cart = require('../models/Cart');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const Settings = require('../models/Settings');
const Report = require('../models/Report');
const Analytics = require('../models/Analytics');
// const Report = require('../models/Report'); // Раскомментируйте, если нужна модель Report
// const Analytics = require('../models/Analytics'); // Аналитику лучше генерировать через сервис

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bi_base';
const DEFAULT_PASSWORD = '123456';
const SALT_ROUNDS = 10; // Количество раундов для хеширования пароля

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            // useNewUrlParser: true, // Опции устарели в новых версиях mongoose
            // useUnifiedTopology: true,
        });
        console.log('MongoDB Connected...');
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1); // Выход из процесса при ошибке подключения
    }
};

const clearDatabase = async () => {
    console.log('Clearing database...');
    try {
        await Task.deleteMany({});
        await Settings.deleteMany({});
        await Report.deleteMany({});
        await Analytics.deleteMany({});
        await Notification.deleteMany({});
        await Cart.deleteMany({});
        await Product.deleteMany({});
        await Supplier.deleteMany({});
        await Employee.deleteMany({});
        await Client.deleteMany({});
        console.log('Database cleared successfully.');
    } catch (err) {
        console.error('Error clearing database:', err.message);
        throw err; // Пробрасываем ошибку дальше
    }
};

const createUsers = async () => {
    console.log('Creating users...');
    try {
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

        // Step 1: Create client, employee and admin users first
        const basicUsersData = [
            // Администратор
            {
                name: "Администратор Системы", 
                contactPerson: "Главный Админ", 
                phone: "+7(000)000-00-01",
                email: "admin@gmail.com", 
                address: "Главный офис, ул. Центральная, 1", 
                password: hashedPassword,
                Model: Client, 
                role: 'admin'
            },
            // Клиенты
            {
                name: "ООО Ромашка", 
                contactPerson: "Иванов Иван Иванович", 
                phone: "+7(916)123-45-67",
                email: "client1@example.com", 
                address: "г. Москва, ул. Ленина, 10, оф. 5", 
                password: hashedPassword,
                Model: Client, 
                role: 'client'
            },
            {
                name: "ИП Сидоров С.С.", 
                contactPerson: "Сидоров Семен Семенович", 
                phone: "+7(926)987-65-43",
                email: "client2@example.com", 
                address: "г. Санкт-Петербург, Невский пр., 25", 
                password: hashedPassword,
                Model: Client, 
                role: 'client'
            },
            {
                name: "ЗАО ТехноСтрой", 
                contactPerson: "Петрова Анна Михайловна", 
                phone: "+7(910)555-12-34",
                email: "client3@example.com", 
                address: "г. Екатеринбург, ул. Малышева, 101", 
                password: hashedPassword,
                Model: Client, 
                role: 'client'
            },
            // Сотрудники
            {
                name: "Петров Петр Петрович", 
                position: "Менеджер по закупкам", 
                department: "Отдел закупок",
                phone: "+7(903)111-22-33", 
                email: "employee1@example.com", 
                password: hashedPassword,
                Model: Employee, 
                role: 'employee'
            },
            {
                name: "Васильева Ольга Сергеевна", 
                position: "Логист", 
                department: "Отдел логистики",
                phone: "+7(905)444-55-66", 
                email: "employee2@example.com", 
                password: hashedPassword,
                Model: Employee, 
                role: 'employee'
            },
            {
                name: "Сергеев Илья Максимович", 
                position: "Аналитик", 
                department: "Аналитический отдел",
                phone: "+7(925)777-88-99", 
                email: "employee3@example.com", 
                password: hashedPassword,
                Model: Employee, 
                role: 'employee'
            }
        ];

        const createdUsers = {}; // { role_email: userDocument }

        // Create basic users
        for (const userData of basicUsersData) {
            const { Model, role, ...data } = userData;
            try {
                let user = await Model.findOne({ email: data.email });
                if (!user) {
                    user = new Model(data);
                    await user.save();
                    console.log(`Created ${role}: ${data.email}`);
                } else {
                    console.log(`${role} ${data.email} already exists. Skipping creation, using existing.`);
                }
                createdUsers[`${role}_${data.email}`] = user;
            } catch (err) {
                console.error(`Error processing ${role} ${data.email}:`, err.message);
            }
        }

        // Step 2: Create supplier records in the Supplier collection directly
        const supplierData = [
            {
                name: "АО ЭлектроПромСнаб", 
                contactPerson: "Захаров Михаил Юрьевич", 
                phone: "+7(812)555-10-20",
                email: "supplier1@example.com", 
                address: "г. Санкт-Петербург, ул. Промышленная, 5",
                categories: ["Электротехника", "Кабель"], 
                rating: 4.5, 
                reliability: 95, 
                avgDeliveryTime: 5,
                priceCompetitiveness: 85, 
                paymentTerms: "Отсрочка 30 дней", 
                password: hashedPassword
            },
            {
                name: "ООО СтройМастер", 
                contactPerson: "Козлова Анна Викторовна", 
                phone: "+7(495)777-30-40",
                email: "supplier2@example.com", 
                address: "г. Москва, ул. Строителей, 15",
                categories: ["Строительные материалы", "Инструменты"], 
                rating: 4.0, 
                reliability: 90, 
                avgDeliveryTime: 7,
                priceCompetitiveness: 80, 
                paymentTerms: "Предоплата 50%", 
                password: hashedPassword
            },
            {
                name: "ФАБРИКА МЕБЕЛИ №1", 
                contactPerson: "Алексеев Дмитрий Игоревич", 
                phone: "+7(343)222-11-00",
                email: "supplier3@example.com", 
                address: "г. Екатеринбург, ул. Мебельная, 1",
                categories: ["Мебель", "Фурнитура"], 
                rating: 4.8, 
                reliability: 98, 
                avgDeliveryTime: 10,
                priceCompetitiveness: 90, 
                paymentTerms: "Отсрочка 45 дней", 
                password: hashedPassword
            }
        ];

        // Create supplier records directly in the Supplier collection
        for (const data of supplierData) {
            try {
                let supplier = await Supplier.findOne({ email: data.email });
                if (!supplier) {
                    supplier = new Supplier(data);
                    await supplier.save();
                    console.log(`Created supplier: ${data.name} (${data.email})`);
                } else {
                    console.log(`Supplier ${data.email} already exists. Updating with latest data.`);
                    // Update existing supplier with latest data
                    Object.assign(supplier, data);
                    await supplier.save();
                }
                // Store in the createdUsers collection for easy access
                createdUsers[`supplier_${data.email}`] = supplier;
            } catch (err) {
                console.error(`Error creating supplier ${data.email}:`, err.message);
            }
        }

        console.log('Users and suppliers created successfully.');
        return createdUsers;

    } catch (err) {
        console.error('Error creating users:', err.message);
        throw err;
    }
};

const createProducts = async (createdUsers) => {
    console.log('Creating products...');
    const supplier1 = createdUsers['supplier_supplier1@example.com'];
    const supplier2 = createdUsers['supplier_supplier2@example.com'];
    const supplier3 = createdUsers['supplier_supplier3@example.com'];

    if (!supplier1 || !supplier2 || !supplier3) {
        console.error('Could not find all supplier IDs. Aborting product creation.');
        return [];
    }

    const productsData = [
        // Товары от supplier1
        { name: "Кабель ВВГнг 3х1.5", sku: "CAB001", description: "Силовой кабель медный", category: "Кабель", price: 55.00, cost: 30.00, supplier: supplier1._id, stockQuantity: 1000, reorderLevel: 100, targetStockLevel: 500, unitOfMeasure: "м" },
        { name: "Автоматический выключатель 1П 16А C", sku: "AUT001", description: "Однополюсный автомат", category: "Электротехника", price: 180.00, cost: 90.00, supplier: supplier1._id, stockQuantity: 500, reorderLevel: 50, targetStockLevel: 200 },
        { name: "Розетка Schneider Electric AtlasDesign", sku: "SOC001", description: "Розетка скрытой установки с/з", category: "Электротехника", price: 250.00, cost: 130.00, supplier: supplier1._id, stockQuantity: 300, reorderLevel: 30, targetStockLevel: 150 },
        { name: "Лампа светодиодная E27 10W", sku: "LED001", description: "Энергосберегающая светодиодная лампа", category: "Освещение", price: 120.00, cost: 60.00, supplier: supplier1._id, stockQuantity: 800, reorderLevel: 80, targetStockLevel: 300 },

        // Товары от supplier2
        { name: "Цемент М500, 50 кг", sku: "CEM001", description: "Портландцемент для строительных работ", category: "Строительные материалы", price: 450.00, cost: 280.00, supplier: supplier2._id, stockQuantity: 200, reorderLevel: 20, targetStockLevel: 100, unitOfMeasure: "мешок" },
        { name: "Кирпич облицовочный M150", sku: "BRI001", description: "Красный облицовочный кирпич", category: "Строительные материалы", price: 25.00, cost: 15.00, supplier: supplier2._id, stockQuantity: 5000, reorderLevel: 500, targetStockLevel: 2000, unitOfMeasure: "шт" },
        { name: "Перфоратор Bosch GBH 2-26", sku: "TOO001", description: "Профессиональный перфоратор SDS+", category: "Инструменты", price: 15000.00, cost: 9500.00, supplier: supplier2._id, stockQuantity: 50, reorderLevel: 5, targetStockLevel: 20 },
        { name: "Штукатурка гипсовая Ротбанд 30кг", sku: "PLA001", description: "Универсальная гипсовая штукатурка", category: "Сухие смеси", price: 550.00, cost: 350.00, supplier: supplier2._id, stockQuantity: 150, reorderLevel: 15, targetStockLevel: 70, unitOfMeasure: "мешок" },

        // Товары от supplier3
        { name: "Стол письменный 'Лофт'", sku: "DESK001", description: "Современный письменный стол в стиле лофт", category: "Офисная мебель", price: 12000.00, cost: 7000.00, supplier: supplier3._id, stockQuantity: 30, reorderLevel: 5, targetStockLevel: 15 },
        { name: "Стул офисный 'Комфорт'", sku: "CHR001", description: "Эргономичный офисный стул", category: "Офисная мебель", price: 8500.00, cost: 5000.00, supplier: supplier3._id, stockQuantity: 60, reorderLevel: 10, targetStockLevel: 30 },
        { name: "Шкаф для документов 'Архив-М'", sku: "CAB002", description: "Металлический шкаф для хранения документов", category: "Мебель для хранения", price: 9800.00, cost: 6200.00, supplier: supplier3._id, stockQuantity: 25, reorderLevel: 3, targetStockLevel: 10 }
    ];

    const createdProducts = [];
    for (const productData of productsData) {
        try {
            let product = await Product.findOne({ sku: productData.sku });
            if (!product) {
                product = new Product(productData);
                await product.save();
            }
            createdProducts.push(product);
        } catch (err) {
            if (err.code !== 11000) { // 11000 is the error code for duplicate key
                console.error(`Error creating product ${productData.sku}:`, err.message);
            } else {
                console.log(`Product ${productData.sku} already exists. Skipping.`);
                const existingProduct = await Product.findOne({ sku: productData.sku });
                if (existingProduct) createdProducts.push(existingProduct);
            }
        }
    }
    console.log(`${createdProducts.length} products processed successfully.`);
    return createdProducts;
};

const createOrders = async (createdUsers, createdProducts) => {
    console.log('Creating orders...');
    // Get users needed for orders
    const client1 = createdUsers['client_client1@example.com']; // ООО Ромашка
    const client2 = createdUsers['client_client2@example.com']; // ИП Сидоров С.С.
    const client3 = createdUsers['client_client3@example.com']; // ЗАО ТехноСтрой
    const employee1 = createdUsers['employee_employee1@example.com']; // Петров Петр Петрович (Менеджер по закупкам)
    const employee2 = createdUsers['employee_employee2@example.com']; // Васильева Ольга Сергеевна (Логист)
    const supplier1 = createdUsers['supplier_supplier1@example.com']; // АО ЭлектроПромСнаб
    const supplier2 = createdUsers['supplier_supplier2@example.com']; // ООО СтройМастер
    const supplier3 = createdUsers['supplier_supplier3@example.com']; // ФАБРИКА МЕБЕЛИ №1

    if (!client1 || !client2 || !client3 || !employee1 || !employee2 || !supplier1 || !supplier2 || !supplier3 || createdProducts.length < 5) {
        console.error('Missing required users or products for order creation. Aborting.');
        return [];
    }

    // Find products associated with each supplier
    console.log('Organizing products by supplier...');
    const supplier1Products = createdProducts.filter(p => p.supplier.toString() === supplier1._id.toString());
    const supplier2Products = createdProducts.filter(p => p.supplier.toString() === supplier2._id.toString());
    const supplier3Products = createdProducts.filter(p => p.supplier.toString() === supplier3._id.toString());

    console.log(`Products by supplier: Supplier1(${supplier1.name}): ${supplier1Products.length}, Supplier2(${supplier2.name}): ${supplier2Products.length}, Supplier3(${supplier3.name}): ${supplier3Products.length}`);

    // Get current date for order dates
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Define order statuses to use
    const orderStatuses = ['Создан', 'Подтвержден', 'В обработке', 'Отправлен', 'В пути', 'Доставлен', 'Получен'];
    const paymentStatuses = ['Не оплачен', 'Частично оплачен', 'Полностью оплачен'];
    const shippingMethods = ['Курьерская доставка', 'Самовывоз', 'Транспортная компания'];
    const regions = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Красноярск', 'Владивосток'];
    
    // Пустой массив для хранения данных заказов
    const ordersData = [];
    
    // Генерация заказов для supplier1 (АО ЭлектроПромСнаб) - 50% on-time deliveries
    console.log('Generating orders for supplier1 (АО ЭлектроПромСнаб)...');
    for (let i = 0; i < 20; i++) {  // Было 60, стало 20
        // Определяем, будет ли доставка вовремя (50% вероятность)
        const isOnTime = i < 10; // Первые 10 заказов - вовремя, остальные - с задержкой (было 30/30, стало 10/10)
        
        // Даты для заказа (разбросаны по последним 6 месяцам)
        const daysAgo = Math.floor(Math.random() * 180) + 1; // от 1 до 180 дней назад
        const orderDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        
        // Ожидаемая дата доставки (от 3 до 10 дней после заказа)
        const deliveryDays = Math.floor(Math.random() * 8) + 3;
        const estimatedDeliveryDate = new Date(orderDate.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
        
        // Фактическая дата доставки
        let actualDeliveryDate;
        if (isOnTime) {
            // Точно в срок или раньше
            const earlyDays = Math.floor(Math.random() * 2); // 0 или 1 день раньше
            actualDeliveryDate = new Date(estimatedDeliveryDate.getTime() - earlyDays * 24 * 60 * 60 * 1000);
        } else {
            // С задержкой от 1 до 5 дней
            const delayDays = Math.floor(Math.random() * 5) + 1;
            actualDeliveryDate = new Date(estimatedDeliveryDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
        }
        
        // Выбираем случайные продукты для заказа
        const numProducts = Math.floor(Math.random() * 2) + 1; // 1 или 2 продукта
        const orderProducts = [];
        
        for (let j = 0; j < numProducts && j < supplier1Products.length; j++) {
            const product = supplier1Products[j % supplier1Products.length]; // Циклически выбираем продукты
            const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 единиц
            orderProducts.push({
                product: product._id,
                quantity: quantity,
                unitPrice: product.price,
                totalPrice: product.price * quantity
            });
        }
        
        // Выбираем клиента случайным образом
        const clientOptions = [client1, client2, client3];
        const client = clientOptions[Math.floor(Math.random() * clientOptions.length)];
        
        // Формируем историю статусов
        const statusHistory = [
            { status: 'Создан', timestamp: orderDate, changedBy: employee1._id }
        ];
        
        // Добавляем промежуточные статусы
        const statusSteps = isOnTime ? orderStatuses.slice(0, 6) : orderStatuses.slice(0, 6);
        let currentDate = new Date(orderDate);
        
        for (let s = 1; s < statusSteps.length; s++) {
            // Каждый следующий статус через 1-2 дня
            currentDate = new Date(currentDate.getTime() + (Math.floor(Math.random() * 2) + 1) * 24 * 60 * 60 * 1000);
            
            // Если это дата доставки, используем actualDeliveryDate
            if (statusSteps[s] === 'Доставлен') {
                statusHistory.push({
                    status: statusSteps[s],
                    timestamp: actualDeliveryDate,
                    changedBy: employee2._id,
                    comment: isOnTime ? "Доставка выполнена вовремя" : "Доставка с задержкой"
                });
            } else {
                statusHistory.push({
                    status: statusSteps[s],
                    timestamp: currentDate,
                    changedBy: s < 3 ? employee1._id : employee2._id
                });
            }
        }
        
        // Добавляем заказ в массив
        ordersData.push({
            client: client._id,
            employee: Math.random() > 0.5 ? employee1._id : employee2._id,
            supplier: supplier1._id,
            products: orderProducts,
            orderDate: orderDate,
            estimatedDeliveryDate: estimatedDeliveryDate,
            actualDeliveryDate: actualDeliveryDate,
            status: 'Доставлен',
            paymentStatus: 'Полностью оплачен',
            paymentMethod: Math.random() > 0.5 ? 'Безналичный расчет' : 'Карта',
            shippingMethod: shippingMethods[Math.floor(Math.random() * shippingMethods.length)],
            trackingNumber: "TR" + Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
            shippingCost: Math.floor(Math.random() * 1000) + 500,
            notes: isOnTime ? "Стандартный заказ" : "Заказ с задержкой доставки",
            region: regions[Math.floor(Math.random() * regions.length)],
            statusHistory: statusHistory
        });
    }
    
    // Генерация заказов для supplier2 (ООО СтройМастер) - 50% on-time deliveries
    console.log('Generating orders for supplier2 (ООО СтройМастер)...');
    for (let i = 0; i < 20; i++) {  // Было 90, стало 20
        // Определяем, будет ли доставка вовремя (50% вероятность)
        const isOnTime = i < 10; // Первые 10 заказов - вовремя, остальные - с задержкой (было 45/45, стало 10/10)
        
        // Даты для заказа (разбросаны по последним 6 месяцам)
        const daysAgo = Math.floor(Math.random() * 180) + 1; // от 1 до 180 дней назад
        const orderDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        
        // Ожидаемая дата доставки (от 3 до 10 дней после заказа)
        const deliveryDays = Math.floor(Math.random() * 8) + 3;
        const estimatedDeliveryDate = new Date(orderDate.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
        
        // Фактическая дата доставки
        let actualDeliveryDate;
        if (isOnTime) {
            // Точно в срок или раньше
            const earlyDays = Math.floor(Math.random() * 2); // 0 или 1 день раньше
            actualDeliveryDate = new Date(estimatedDeliveryDate.getTime() - earlyDays * 24 * 60 * 60 * 1000);
        } else {
            // С задержкой от 1 до 5 дней
            const delayDays = Math.floor(Math.random() * 5) + 1;
            actualDeliveryDate = new Date(estimatedDeliveryDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
        }
        
        // Выбираем случайные продукты для заказа
        const numProducts = Math.floor(Math.random() * 2) + 1; // 1 или 2 продукта
        const orderProducts = [];
        
        for (let j = 0; j < numProducts && j < supplier2Products.length; j++) {
            const product = supplier2Products[j % supplier2Products.length]; // Циклически выбираем продукты
            const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 единиц
            orderProducts.push({
                product: product._id,
                quantity: quantity,
                unitPrice: product.price,
                totalPrice: product.price * quantity
            });
        }
        
        // Выбираем клиента случайным образом
        const clientOptions = [client1, client2, client3];
        const client = clientOptions[Math.floor(Math.random() * clientOptions.length)];
        
        // Формируем историю статусов
        const statusHistory = [
            { status: 'Создан', timestamp: orderDate, changedBy: employee1._id }
        ];
        
        // Добавляем промежуточные статусы
        const statusSteps = isOnTime ? orderStatuses.slice(0, 6) : orderStatuses.slice(0, 6);
        let currentDate = new Date(orderDate);
        
        for (let s = 1; s < statusSteps.length; s++) {
            // Каждый следующий статус через 1-2 дня
            currentDate = new Date(currentDate.getTime() + (Math.floor(Math.random() * 2) + 1) * 24 * 60 * 60 * 1000);
            
            // Если это дата доставки, используем actualDeliveryDate
            if (statusSteps[s] === 'Доставлен') {
                statusHistory.push({
                    status: statusSteps[s],
                    timestamp: actualDeliveryDate,
                    changedBy: employee2._id,
                    comment: isOnTime ? "Доставка выполнена вовремя" : "Доставка с задержкой"
                });
            } else {
                statusHistory.push({
                    status: statusSteps[s],
                    timestamp: currentDate,
                    changedBy: s < 3 ? employee1._id : employee2._id
                });
            }
        }
        
        // Добавляем заказ в массив
        ordersData.push({
            client: client._id,
            employee: Math.random() > 0.5 ? employee1._id : employee2._id,
            supplier: supplier2._id,
            products: orderProducts,
            orderDate: orderDate,
            estimatedDeliveryDate: estimatedDeliveryDate,
            actualDeliveryDate: actualDeliveryDate,
            status: 'Доставлен',
            paymentStatus: 'Полностью оплачен',
            paymentMethod: Math.random() > 0.5 ? 'Безналичный расчет' : 'Карта',
            shippingMethod: shippingMethods[Math.floor(Math.random() * shippingMethods.length)],
            trackingNumber: "TR" + Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
            shippingCost: Math.floor(Math.random() * 1000) + 500,
            notes: isOnTime ? "Стандартный заказ" : "Заказ с задержкой доставки",
            region: regions[Math.floor(Math.random() * regions.length)],
            statusHistory: statusHistory
        });
    }
    
    // Генерация заказов для supplier3 (ФАБРИКА МЕБЕЛИ №1) - 100% on-time deliveries
    console.log('Generating orders for supplier3 (ФАБРИКА МЕБЕЛИ №1)...');
    for (let i = 0; i < 10; i++) {  // Было 30, стало 10
        // Все доставки вовремя (100%)
        const isOnTime = true;
        
        // Даты для заказа (разбросаны по последним 6 месяцам)
        const daysAgo = Math.floor(Math.random() * 180) + 1; // от 1 до 180 дней назад
        const orderDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        
        // Ожидаемая дата доставки (от 3 до 10 дней после заказа)
        const deliveryDays = Math.floor(Math.random() * 8) + 3;
        const estimatedDeliveryDate = new Date(orderDate.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
        
        // Фактическая дата доставки - всегда вовремя или раньше
        const earlyDays = Math.floor(Math.random() * 2); // 0 или 1 день раньше
        const actualDeliveryDate = new Date(estimatedDeliveryDate.getTime() - earlyDays * 24 * 60 * 60 * 1000);
        
        // Выбираем случайные продукты для заказа
        const numProducts = Math.floor(Math.random() * 2) + 1; // 1 или 2 продукта
        const orderProducts = [];
        
        for (let j = 0; j < numProducts && j < supplier3Products.length; j++) {
            const product = supplier3Products[j % supplier3Products.length]; // Циклически выбираем продукты
            const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 единиц
            orderProducts.push({
                product: product._id,
                quantity: quantity,
                unitPrice: product.price,
                totalPrice: product.price * quantity
            });
        }
        
        // Выбираем клиента случайным образом
        const clientOptions = [client1, client2, client3];
        const client = clientOptions[Math.floor(Math.random() * clientOptions.length)];
        
        // Формируем историю статусов
        const statusHistory = [
            { status: 'Создан', timestamp: orderDate, changedBy: employee1._id }
        ];
        
        // Добавляем промежуточные статусы
        const statusSteps = orderStatuses.slice(0, 6); // Все этапы до "Доставлен"
        let currentDate = new Date(orderDate);
        
        for (let s = 1; s < statusSteps.length; s++) {
            // Каждый следующий статус через 1-2 дня
            currentDate = new Date(currentDate.getTime() + (Math.floor(Math.random() * 2) + 1) * 24 * 60 * 60 * 1000);
            
            // Если это дата доставки, используем actualDeliveryDate
            if (statusSteps[s] === 'Доставлен') {
                statusHistory.push({
                    status: statusSteps[s],
                    timestamp: actualDeliveryDate,
                    changedBy: employee2._id,
                    comment: "Доставка выполнена вовремя"
                });
            } else {
                statusHistory.push({
                    status: statusSteps[s],
                    timestamp: currentDate,
                    changedBy: s < 3 ? employee1._id : employee2._id
                });
            }
        }
        
        // Высокие суммы заказов для этого поставщика
        const orderTotal = Math.floor(Math.random() * 100000) + 50000; // от 50,000 до 150,000
        
        // Добавляем заказ в массив
        ordersData.push({
            client: client._id,
            employee: Math.random() > 0.5 ? employee1._id : employee2._id,
            supplier: supplier3._id,
            products: orderProducts,
            orderDate: orderDate,
            estimatedDeliveryDate: estimatedDeliveryDate,
            actualDeliveryDate: actualDeliveryDate,
            status: 'Доставлен',
            paymentStatus: 'Полностью оплачен',
            paymentMethod: Math.random() > 0.5 ? 'Безналичный расчет' : 'Карта',
            shippingMethod: shippingMethods[Math.floor(Math.random() * shippingMethods.length)],
            trackingNumber: "TR" + Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
            shippingCost: Math.floor(Math.random() * 1000) + 500,
            notes: "Премиальная мебель с идеальной доставкой",
            region: regions[Math.floor(Math.random() * regions.length)],
            statusHistory: statusHistory,
            totalOrderValue: orderTotal // Устанавливаем высокую стоимость заказа
        });
    }

    // Создаем заказы
    console.log(`Creating ${ordersData.length} orders in database...`);
    const createdOrders = [];
    let count = 0;
    
    for (const orderData of ordersData) {
        try {
            // Check that products array is valid before proceeding
            if (!orderData.products || orderData.products.length === 0) {
                console.warn('Skipping order due to empty products array');
                continue;
            }
            
            // Ensure totalOrderValue is calculated for orders that don't have it set explicitly
            if (!orderData.totalOrderValue) {
                orderData.totalOrderValue = orderData.products.reduce((sum, product) => sum + (product.totalPrice || 0), 0);
            }
            
            // Create the order
            const order = new Order(orderData);
            await order.save();
            createdOrders.push(order);
            
            count++;
            if (count % 20 === 0) {
                console.log(`Created ${count} orders so far...`);
            }
        } catch (err) {
            console.error('Error creating order:', err.message);
        }
    }
    
    console.log(`Created ${createdOrders.length} orders successfully.`);
    
    // Распечатаем статистику по доставкам для каждого поставщика
    const supplier1Orders = createdOrders.filter(o => o.supplier.toString() === supplier1._id.toString());
    const supplier2Orders = createdOrders.filter(o => o.supplier.toString() === supplier2._id.toString());
    const supplier3Orders = createdOrders.filter(o => o.supplier.toString() === supplier3._id.toString());
    
    const supplier1OnTime = supplier1Orders.filter(o => !o.deliveryDelay || o.deliveryDelay === 0).length;
    const supplier2OnTime = supplier2Orders.filter(o => !o.deliveryDelay || o.deliveryDelay === 0).length;
    const supplier3OnTime = supplier3Orders.filter(o => !o.deliveryDelay || o.deliveryDelay === 0).length;
    
    console.log(`Supplier1 (${supplier1.name}): ${supplier1OnTime} on-time out of ${supplier1Orders.length} (${Math.round(supplier1OnTime / supplier1Orders.length * 100)}%)`);
    console.log(`Supplier2 (${supplier2.name}): ${supplier2OnTime} on-time out of ${supplier2Orders.length} (${Math.round(supplier2OnTime / supplier2Orders.length * 100)}%)`);
    console.log(`Supplier3 (${supplier3.name}): ${supplier3OnTime} on-time out of ${supplier3Orders.length} (${Math.round(supplier3OnTime / supplier3Orders.length * 100)}%)`);
    
    return createdOrders;
};

const createContracts = async (createdUsers, createdProducts) => {
    console.log('Creating contracts...');
    // Get suppliers from the created users object
    const supplier1 = createdUsers['supplier_supplier1@example.com']; // АО ЭлектроПромСнаб
    const supplier2 = createdUsers['supplier_supplier2@example.com']; // ООО СтройМастер
    const supplier3 = createdUsers['supplier_supplier3@example.com']; // ФАБРИКА МЕБЕЛИ №1

    if (!supplier1 || !supplier2 || !supplier3 || createdProducts.length < 5) {
        console.error('Missing required suppliers or products for contract creation. Aborting.');
        return;
    }

    // Find products associated with each supplier
    console.log('Organizing products by supplier...');
    const supplier1Products = createdProducts.filter(p => p.supplier.toString() === supplier1._id.toString());
    const supplier2Products = createdProducts.filter(p => p.supplier.toString() === supplier2._id.toString());
    const supplier3Products = createdProducts.filter(p => p.supplier.toString() === supplier3._id.toString());

    console.log(`Products by supplier: Supplier1(${supplier1.name}): ${supplier1Products.length}, Supplier2(${supplier2.name}): ${supplier2Products.length}, Supplier3(${supplier3.name}): ${supplier3Products.length}`);

    // Get current date for contract status determination
    const now = new Date();
    const currentYear = now.getFullYear();

    const contractsData = [
        // Active contract for supplier1
        {
            supplier: supplier1._id,
            startDate: new Date(currentYear, 0, 1), // Jan 1st this year
            endDate: new Date(currentYear, 11, 31), // Dec 31st this year
            products: supplier1Products.length > 0 ? supplier1Products.slice(0, 2).map(p => p._id) : [], 
            terms: "Поставка электротехнических товаров на выгодных условиях",
            paymentTerms: "Оплата в течение 14 дней после получения товара",
            status: "Активен"
        },
        
        // Active contract for supplier2
        {
            supplier: supplier2._id,
            startDate: new Date(currentYear, 6, 1), // July 1st this year
            endDate: new Date(currentYear + 1, 5, 30), // June 30th next year
            products: supplier2Products.length > 0 ? supplier2Products.slice(0, 2).map(p => p._id) : [],
            terms: "Поставка строительных материалов с фиксированными ценами",
            paymentTerms: "50% предоплата, 50% после доставки",
            status: "Активен"
        },
        
        // Active contract for supplier3
        {
            supplier: supplier3._id,
            startDate: new Date(currentYear, 0, 1), // Jan 1st this year
            endDate: new Date(currentYear, 11, 31), // Dec 31st this year
            products: supplier3Products.length > 0 ? supplier3Products.slice(0, 2).map(p => p._id) : [],
            terms: "Поставка офисной мебели с гарантией 2 года",
            paymentTerms: "100% оплата при оформлении заказа",
            status: "Активен"
        },
        
        // Expired contract for supplier1
        {
            supplier: supplier1._id,
            startDate: new Date(currentYear - 1, 0, 1), // Jan 1st last year
            endDate: new Date(currentYear - 1, 11, 31), // Dec 31st last year
            products: supplier1Products.length > 1 ? supplier1Products.slice(1, 3).map(p => p._id) : [],
            terms: "Предыдущий договор на поставку кабельной продукции",
            paymentTerms: "Оплата в течение 30 дней",
            status: "Истек"
        },
        
        // Expired contract for supplier2
        {
            supplier: supplier2._id,
            startDate: new Date(currentYear - 2, 3, 1), // Apr 1st two years ago
            endDate: new Date(currentYear - 1, 2, 31), // Mar 31st last year
            products: supplier2Products.length > 1 ? supplier2Products.slice(1, 3).map(p => p._id) : [],
            terms: "Поставка стройматериалов по старым ценам",
            paymentTerms: "Предоплата 30%, оплата 70% в течение 45 дней",
            status: "Истек"
        }
    ];

    try {
        // Clear existing contracts to avoid duplicates
        await Contract.deleteMany({});
        
        // Create each contract individually to handle any errors
        for (const contractData of contractsData) {
            try {
                // Make sure we have products to assign
                if (!contractData.products || contractData.products.length === 0) {
                    console.warn(`No products available for supplier ${contractData.supplier}. Skipping contract.`);
                    continue;
                }
                
                // Create the contract
                const contract = new Contract(contractData);
                await contract.save();
                console.log(`Created contract: Supplier ${contractData.supplier}, Products: ${contractData.products.length}, Status: ${contractData.status}`);
            } catch (err) {
                console.error(`Error creating individual contract:`, err.message);
            }
        }
        
        console.log(`Contract creation completed.`);
    } catch (err) {
        console.error('Error creating contracts:', err.message);
    }
};

const createCarts = async (createdUsers, createdProducts) => {
    console.log('Creating carts...');
    // Assuming admin, client1, client2, employee1 might have carts
    // For simplicity, we link carts to Client or Employee IDs as 'user'
    const userForCart1 = createdUsers['client_client1@example.com'];
    const userForCart2 = createdUsers['employee_employee1@example.com']; // Employee might also plan purchases

    if (!userForCart1 || !userForCart2 || createdProducts.length < 3) {
        console.error('Missing users or products for cart creation. Aborting.');
        return;
    }

    const cartsData = [
        {
            user: userForCart1._id,
            items: [
                { productId: createdProducts[0]._id, quantity: 2, unitPrice: createdProducts[0].price },
                { productId: createdProducts[2]._id, quantity: 1, unitPrice: createdProducts[2].price }
            ]
        },
        {
            user: userForCart2._id,
            items: [
                { productId: createdProducts[4]._id, quantity: 5, unitPrice: createdProducts[4].price }
            ]
        }
    ];

    try {
        // Ensure user uniqueness for carts by checking before inserting
        for (const cartData of cartsData) {
            const existingCart = await Cart.findOne({ user: cartData.user });
            if (!existingCart) {
                await Cart.create(cartData);
            } else {
                // Optionally update existing cart or skip
                console.log(`Cart for user ${cartData.user} already exists. Skipping.`);
            }
        }
        console.log(`Carts processed (created or skipped).`);
    } catch (err) {
        console.error('Error creating carts:', err.message);
    }
};

const createNotifications = async (createdUsers, createdOrders) => {
    console.log('Creating notifications...');
    const adminUser = createdUsers['admin_admin@gmail.com'];
    const client1 = createdUsers['client_client1@example.com'];
    const employee1 = createdUsers['employee_employee1@example.com'];

    if (!adminUser || !client1 || !employee1 || createdOrders.length === 0) {
        console.error('Missing users or orders for notification creation. Aborting.');
        return;
    }

    const notificationsData = [
        {
            userId: adminUser._id, title: "Система обновлена",
            message: "Плановое обновление системы успешно завершено.", type: "info"
        },
        {
            userId: client1._id, title: "Ваш заказ в пути",
            message: `Заказ #${createdOrders[0].id.toString().slice(-6)} отправлен и скоро будет у вас.`,
            type: "order", link: `/orders/${createdOrders[0]._id}`
        },
        {
            userId: employee1._id, title: "Низкий уровень запасов",
            message: "Продукт 'Кабель ВВГнг 3х1.5' (CAB001) достиг уровня перезказа.",
            type: "inventory", link: "/products/CAB001" // Assuming link structure
        },
         {
            userId: client1._id, title: "Акция!",
            message: "Скидка 20% на все инструменты до конца месяца!",
            type: "info", link: "/promotions"
        }
    ];

    try {
        await Notification.insertMany(notificationsData, { ordered: false });
        console.log(`${notificationsData.length} notifications created successfully.`);
    } catch (err) {
        console.error('Error creating notifications:', err.message);
    }
};

const createTasks = async (createdUsers, createdOrders, createdProducts) => {
    console.log('Creating tasks...');
    const employee1 = createdUsers['employee_employee1@example.com'];
    const employee2 = createdUsers['employee_employee2@example.com'];
    const employee3 = createdUsers['employee_employee3@example.com'];


    if (!employee1 || !employee2 || !employee3) {
        console.error('Missing employees for task creation. Aborting.');
        return;
    }

    const tasksData = [
        {
            title: "Проверить статус заказа #XYZ", description: "Связаться с клиентом ООО Ромашка по заказу.",
            assignedTo: employee1._id, createdBy: employee2._id, priority: 'High', status: 'In Progress',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
            related: createdOrders.length > 0 ? { type: 'Order', id: createdOrders[0]._id } : { type: 'None' },
            tags: ['клиентский_сервис', 'заказы']
        },
        {
            title: "Подготовить отчет по продажам за Q1", description: "Собрать данные и подготовить презентацию.",
            assignedTo: employee3._id, createdBy: employee1._id, priority: 'Medium', status: 'Pending',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
            tags: ['отчетность', 'аналитика']
        },
        {
            title: "Заказать партию кабеля ВВГнг", description: "Уровень запасов низкий, необходимо пополнить.",
            assignedTo: employee1._id, createdBy: employee1._id, priority: 'Urgent', status: 'Pending',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Due tomorrow
            related: createdProducts.length > 0 ? { type: 'Product', id: createdProducts[0]._id } : { type: 'None' },
            tags: ['закупки', 'склад']
        }
    ];

    try {
        await Task.insertMany(tasksData, { ordered: false });
        console.log(`${tasksData.length} tasks created successfully.`);
    } catch (err) {
        console.error('Error creating tasks:', err.message);
    }
};

const createSettings = async () => {
    console.log('Creating default settings...');
    try {
        const existingSettings = await Settings.findOne();
        if (!existingSettings) {
            const defaultSettings = new Settings({
                general: {
                    siteName: 'SupplyBI Pro',
                    siteDescription: 'Advanced Supply Chain Management System',
                    maintenanceMode: false,
                    allowRegistration: true,
                    maxUploadSize: 10, // MB
                    defaultCurrency: 'RUB'
                },
                email: {
                    smtpServer: 'smtp.example.com',
                    smtpPort: 587,
                    smtpUsername: 'user@example.com',
                    smtpPassword: 'password',
                    senderEmail: 'noreply@supplybi.pro',
                    senderName: 'SupplyBI Pro Notifications'
                },
                security: {
                    sessionTimeout: 90, // minutes
                    maxLoginAttempts: 5,
                    passwordResetExpiry: 12, // hours
                    requireEmailVerification: false, // Simpler for demo
                    twoFactorAuth: false
                },
                notifications: {
                    emailNotifications: true,
                    smsNotifications: false, // Assume no SMS gateway for now
                    orderStatusChanges: true,
                    newOrderNotification: true,
                    paymentNotification: true,
                    systemAlerts: true
                }
            });
            await defaultSettings.save();
            console.log('Default settings created.');
        } else {
            console.log('Settings already exist. Skipping creation.');
        }
    } catch (err) {
        console.error('Error creating settings:', err.message);
    }
};

const createReports = async (createdUsers) => {
    console.log('Creating sample reports...');
    const client1 = createdUsers['client_client1@example.com'];
    const employee3 = createdUsers['employee_employee3@example.com'];


    if (!client1 || !employee3) {
        console.error('Missing users for report creation. Aborting.');
        return;
    }

    const reportsData = [
        {
            title: "Ежемесячный отчет по поставкам",
            content: "Анализ эффективности поставок за Май 2024. Общее количество заказов: 150. Своевременные доставки: 95%. Среднее время доставки: 3.2 дня.",
            createdBy: employee3._id, // Employee creating report
            email: employee3.email
        },
        {
            title: "Жалоба на качество товара",
            content: "Получен товар (Кабель ВВГнг, заказ #12345) с поврежденной изоляцией. Прошу разобраться.",
            createdBy: client1._id, // Client submitting a report/complaint
            email: client1.email
        }
    ];

    try {
        await Report.insertMany(reportsData, { ordered: false });
        console.log(`${reportsData.length} reports created successfully.`);
    } catch (err) {
        console.error('Error creating reports:', err.message);
    }
};

const createAnalytics = async (createdUsers, createdOrders, createdProducts) => {
    console.log('Creating sample analytics data...');
    const supplier1 = createdUsers['supplier_supplier1@example.com']; // АО ЭлектроПромСнаб
    const supplier2 = createdUsers['supplier_supplier2@example.com']; // ООО СтройМастер  
    const supplier3 = createdUsers['supplier_supplier3@example.com']; // ФАБРИКА МЕБЕЛИ №1

    if (!supplier1 || !supplier2 || !supplier3 || createdProducts.length < 2 || createdOrders.length < 1) {
        console.error('Missing data for analytics creation. Aborting.');
        return;
    }

    console.log(`Generating analytics based on ${createdOrders.length} orders...`);

    // Group orders by supplier
    const supplierOrders = {
        [supplier1._id.toString()]: createdOrders.filter(o => o.supplier && o.supplier.toString() === supplier1._id.toString()),
        [supplier2._id.toString()]: createdOrders.filter(o => o.supplier && o.supplier.toString() === supplier2._id.toString()),
        [supplier3._id.toString()]: createdOrders.filter(o => o.supplier && o.supplier.toString() === supplier3._id.toString())
    };

    console.log(`Orders by supplier: Supplier1: ${supplierOrders[supplier1._id.toString()].length}, Supplier2: ${supplierOrders[supplier2._id.toString()].length}, Supplier3: ${supplierOrders[supplier3._id.toString()].length}`);

    // Helper to calculate delivery performance for a supplier
    const calculateSupplierMetrics = (supplierId, supplierName) => {
        const orders = supplierOrders[supplierId.toString()] || [];
        const totalOrders = orders.length;
        
        if (totalOrders === 0) {
            return {
                supplier: supplierId,
                supplierName: supplierName,
                totalOrders: 0,
                revenue: 0,
                onTimeDelivery: 0,
                lateDelivery: 0,
                onTimeDeliveryRate: 0,
                qualityScore: 0,
                costEfficiencyScore: 0,
                quality: 0,
                costEfficiency: 0
            };
        }

        // Calculate metrics based on actual orders
        const completedOrders = orders.filter(o => o.status === 'Доставлен' || o.status === 'Получен');
        const onTimeOrders = completedOrders.filter(o => 
            o.estimatedDeliveryDate && o.actualDeliveryDate && 
            new Date(o.actualDeliveryDate) <= new Date(o.estimatedDeliveryDate)
        );
        const lateOrders = completedOrders.filter(o => 
            o.estimatedDeliveryDate && o.actualDeliveryDate && 
            new Date(o.actualDeliveryDate) > new Date(o.estimatedDeliveryDate)
        );
        
        const revenue = orders.reduce((sum, o) => sum + (o.totalOrderValue || 0), 0);
        
        // Calculate on-time delivery rate - if no completed orders, use a default value
        let onTimeRate = completedOrders.length > 0 
            ? (onTimeOrders.length / completedOrders.length) * 100 
            : 85 + Math.random() * 10; // Default for new suppliers with no completed orders
        
        // Generate a quality score that reflects the delivery performance
        // Higher on-time rate = higher quality score, with some randomness
        const qualityScore = onTimeRate > 90 
            ? 90 + Math.random() * 10 
            : onTimeRate > 80 
                ? 80 + Math.random() * 10 
                : 70 + Math.random() * 10;
        
        // Cost efficiency based on supplier price competitiveness
        const supplier = [supplier1, supplier2, supplier3].find(s => s._id.toString() === supplierId.toString());
        const costEfficiency = supplier ? supplier.priceCompetitiveness : 75 + Math.random() * 15;
        
        return {
            supplier: supplierId,
            supplierName: supplierName,
            totalOrders: totalOrders,
            revenue: revenue,
            onTimeDelivery: onTimeOrders.length,
            lateDelivery: lateOrders.length,
            onTimeDeliveryRate: Math.round(onTimeRate * 10) / 10, // Round to 1 decimal place
            qualityScore: Math.round(qualityScore * 10) / 10,
            costEfficiencyScore: Math.round(costEfficiency * 10) / 10,
            quality: Math.round(qualityScore), // Explicit quality score (0-100)
            costEfficiency: Math.round(costEfficiency) // Explicit cost efficiency (0-100)
        };
    };

    // Helper to get a date for the beginning of the current month
    const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
    
    // Get current date and date ranges for analytics periods
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Генерация данных для ежедневной аналитики за последние 30 дней
    const dailyAnalyticsData = [];
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        // Filter orders for this specific day
        const dayOrders = createdOrders.filter(o => {
            const orderDate = new Date(o.orderDate);
            return orderDate.getFullYear() === date.getFullYear() && 
                   orderDate.getMonth() === date.getMonth() && 
                   orderDate.getDate() === date.getDate();
        });
        
        // Calculate metrics for this day
        const dayTotalOrders = dayOrders.length;
        const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.totalOrderValue || 0), 0);
        const dayCompletedOrders = dayOrders.filter(o => o.status === 'Доставлен' || o.status === 'Получен');
        const dayOnTimeOrders = dayCompletedOrders.filter(o => 
            o.estimatedDeliveryDate && o.actualDeliveryDate && 
            new Date(o.actualDeliveryDate) <= new Date(o.estimatedDeliveryDate)
        );
        const dayLateOrders = dayCompletedOrders.filter(o => 
            o.estimatedDeliveryDate && o.actualDeliveryDate && 
            new Date(o.actualDeliveryDate) > new Date(o.estimatedDeliveryDate)
        );
        
        // Create supplier metrics for this day
        const daySupplierMetrics = [
            calculateSupplierMetrics(supplier1._id, supplier1.name),
            calculateSupplierMetrics(supplier2._id, supplier2.name),
            calculateSupplierMetrics(supplier3._id, supplier3.name)
        ];
        
        // Add product metrics with categories for daily analytics
        const productMetrics = {
            // Adding inventory summary for the dashboard
            inventorySummary: {
                totalProducts: createdProducts.length,
                totalStockQuantity: createdProducts.reduce((sum, product) => sum + product.stockQuantity, 0),
                currentTotalInventoryValueByCost: createdProducts.reduce((sum, product) => sum + (product.cost * product.stockQuantity), 0),
                productsBelowReorder: createdProducts.filter(p => p.stockQuantity < p.reorderLevel).length,
                lowStockProductsCount: Math.floor(createdProducts.length * 0.2),
                productsBelowReorderLevelDetails: createdProducts.filter(p => p.stockQuantity < p.reorderLevel).map(p => ({
                    productId: p._id,
                    name: p.name,
                    sku: p.sku,
                    currentStock: p.stockQuantity,
                    reorderLevel: p.reorderLevel
                }))
            },
            // Add category data needed for charts
            byCategory: [
                {
                    category: "Электротехника",
                    totalSold: Math.floor(Math.random() * 20) + 10,
                    totalRevenue: 50000 + Math.random() * 20000,
                    profitMargin: 15000 + Math.random() * 5000,
                    profitMarginPercentage: 25 + Math.random() * 5
                },
                {
                    category: "Кабель",
                    totalSold: Math.floor(Math.random() * 50) + 20,
                    totalRevenue: 30000 + Math.random() * 15000,
                    profitMargin: 10000 + Math.random() * 3000,
                    profitMarginPercentage: 28 + Math.random() * 4
                },
                {
                    category: "Строительные материалы",
                    totalSold: Math.floor(Math.random() * 100) + 50,
                    totalRevenue: 80000 + Math.random() * 30000,
                    profitMargin: 24000 + Math.random() * 8000,
                    profitMarginPercentage: 30 + Math.random() * 5
                },
                {
                    category: "Офисная мебель",
                    totalSold: Math.floor(Math.random() * 15) + 5,
                    totalRevenue: 100000 + Math.random() * 40000,
                    profitMargin: 35000 + Math.random() * 12000,
                    profitMarginPercentage: 35 + Math.random() * 5
                },
                {
                    category: "Инструменты",
                    totalSold: Math.floor(Math.random() * 25) + 10,
                    totalRevenue: 40000 + Math.random() * 20000,
                    profitMargin: 14000 + Math.random() * 6000,
                    profitMarginPercentage: 32 + Math.random() * 6
                }
            ]
        };
        
        // Calculate delivery success rate
        const deliverySuccessRate = dayCompletedOrders.length > 0 
            ? (dayOnTimeOrders.length / dayCompletedOrders.length) * 100 
            : 85 + Math.random() * 10; // Default when no completed orders
        
        dailyAnalyticsData.push({
            period: 'daily',
            date: date,
            totalOrders: dayTotalOrders,
            totalRevenue: dayRevenue,
            totalSuppliers: 3,
            deliveryMetrics: {
                onTime: dayOnTimeOrders.length,
                delayed: dayLateOrders.length,
                averageDeliveryTime: 3 + Math.random() * 2, // Approximation based on typical values
                deliverySuccessRate: Math.round(deliverySuccessRate * 10) / 10,
            },
            regionMetrics: [
                { 
                    region: "Минск", 
                    orders: Math.floor(dayTotalOrders * 0.35),
                    revenue: dayRevenue * 0.35,
                    averageDeliveryTime: 2 + Math.random() * 1.5,
                    deliverySuccessRate: 88 + Math.random() * 10
                },
                { 
                    region: "Гомель", 
                    orders: Math.floor(dayTotalOrders * 0.20),
                    revenue: dayRevenue * 0.20,
                    averageDeliveryTime: 3 + Math.random() * 1.5,
                    deliverySuccessRate: 85 + Math.random() * 12
                },
                { 
                    region: "Брест", 
                    orders: Math.floor(dayTotalOrders * 0.15),
                    revenue: dayRevenue * 0.15,
                    averageDeliveryTime: 4 + Math.random() * 2,
                    deliverySuccessRate: 82 + Math.random() * 13
                },
                { 
                    region: "Витебск", 
                    orders: Math.floor(dayTotalOrders * 0.15),
                    revenue: dayRevenue * 0.15,
                    averageDeliveryTime: 5 + Math.random() * 2,
                    deliverySuccessRate: 80 + Math.random() * 15
                },
                { 
                    region: "Могилев", 
                    orders: Math.floor(dayTotalOrders * 0.15),
                    revenue: dayRevenue * 0.15,
                    averageDeliveryTime: 3.5 + Math.random() * 1.8,
                    deliverySuccessRate: 84 + Math.random() * 14
                }
            ],
            // Adding supplier and product metrics to daily analytics
            supplierMetrics: daySupplierMetrics,
            productMetrics: productMetrics,
            kpis: {
                supplierPerformanceIndex: Math.floor(Math.random() * 15) + 85, 
                deliveryEfficiencyIndex: Math.floor(Math.random() * 10) + 85,
                inventoryHealthIndex: Math.floor(Math.random() * 20) + 70, 
                costOptimizationIndex: Math.floor(Math.random() * 15) + 75,
                customerSatisfactionIndex: Math.floor(Math.random() * 10) + 85
            }
        });
    }

    // Create monthly analytics data
    const allTimeSupplierMetrics = [
        calculateSupplierMetrics(supplier1._id, supplier1.name),
        calculateSupplierMetrics(supplier2._id, supplier2.name),
        calculateSupplierMetrics(supplier3._id, supplier3.name)
    ];

    const analyticsData = [
        {
            period: 'monthly',
            date: startOfMonth(new Date()),
            totalOrders: createdOrders.length,
            totalRevenue: createdOrders.reduce((sum, order) => sum + order.totalOrderValue, 0),
            totalSuppliers: 3, 
            deliveryMetrics: {
                onTime: createdOrders.filter(o => 
                    o.status === 'Доставлен' && o.estimatedDeliveryDate && o.actualDeliveryDate && 
                    new Date(o.actualDeliveryDate) <= new Date(o.estimatedDeliveryDate)
                ).length,
                delayed: createdOrders.filter(o => 
                    o.status === 'Доставлен' && o.estimatedDeliveryDate && o.actualDeliveryDate && 
                    new Date(o.actualDeliveryDate) > new Date(o.estimatedDeliveryDate)
                ).length,
                averageDeliveryTime: 4.2,
                deliverySuccessRate: 92.5,
                returnRate: 3.2,
                damagedInTransit: 1.5,
                customerSatisfaction: 87,
                costPerDelivery: 650
            },
            supplierMetrics: [
                {
                    supplier: supplier1._id,
                    supplierName: "ОАО БелЭлектроСнаб",
                    totalOrders: createdOrders.filter(o => o.supplier && o.supplier.equals(supplier1._id)).length,
                    revenue: createdOrders.filter(o => o.supplier && o.supplier.equals(supplier1._id)).reduce((sum, order) => sum + order.totalOrderValue, 0),
                    onTimeDelivery: Math.floor(createdOrders.filter(o => o.supplier && o.supplier.equals(supplier1._id)).length * 0.92), // 92% on-time
                    lateDelivery: Math.ceil(createdOrders.filter(o => o.supplier && o.supplier.equals(supplier1._id)).length * 0.08), // 8% late
                    onTimeDeliveryRate: 94.2, 
                    qualityScore: 95, 
                    costEfficiencyScore: 88,
                    averageProfitMargin: 22.5,
                    totalProfitGenerated: 125000,
                    supplierPerformanceIndex: 92,
                    quality: 95, // Explicit quality score (0-100)
                    costEfficiency: 88 // Explicit cost efficiency (0-100)
                },
                {
                    supplier: supplier2._id,
                    supplierName: "ООО МинскСтрой",
                    totalOrders: createdOrders.filter(o => o.supplier && o.supplier.equals(supplier2._id)).length,
                    revenue: createdOrders.filter(o => o.supplier && o.supplier.equals(supplier2._id)).reduce((sum, order) => sum + order.totalOrderValue, 0),
                    onTimeDelivery: Math.floor(createdOrders.filter(o => o.supplier && o.supplier.equals(supplier2._id)).length * 0.86), // 86% on-time
                    lateDelivery: Math.ceil(createdOrders.filter(o => o.supplier && o.supplier.equals(supplier2._id)).length * 0.14), // 14% late
                    onTimeDeliveryRate: 90.8, 
                    qualityScore: 92, 
                    costEfficiencyScore: 85,
                    averageProfitMargin: 18.7,
                    totalProfitGenerated: 95000,
                    supplierPerformanceIndex: 87,
                    quality: 92, // Explicit quality score (0-100)
                    costEfficiency: 85 // Explicit cost efficiency (0-100)
                },
                {
                    supplier: supplier3._id,
                    supplierName: "МЕБЕЛЬНАЯ ФАБРИКА ПИНСКДРЕВ",
                    totalOrders: 10, // Было 7, установим в соответствии с новым количеством заказов (10)
                    revenue: 185000,
                    onTimeDelivery: 10, // 100% on-time deliveries for this supplier, обновим в соответствии с новым количеством
                    lateDelivery: 0, // 0% late deliveries
                    onTimeDeliveryRate: 98.1, 
                    qualityScore: 97, 
                    costEfficiencyScore: 82,
                    averageProfitMargin: 28.3,
                    totalProfitGenerated: 52255,
                    supplierPerformanceIndex: 94,
                    quality: 97, // Explicit quality score (0-100)
                    costEfficiency: 82 // Explicit cost efficiency (0-100)
                }
            ],
            productMetrics: {
                // Adding inventory summary for the dashboard - same as daily but ensure it's here
                inventorySummary: {
                    totalProducts: createdProducts.length,
                    totalStockQuantity: createdProducts.reduce((sum, product) => sum + product.stockQuantity, 0),
                    currentTotalInventoryValueByCost: createdProducts.reduce((sum, product) => sum + (product.cost * product.stockQuantity), 0),
                    productsBelowReorder: createdProducts.filter(p => p.stockQuantity < p.reorderLevel).length,
                    lowStockProductsCount: Math.floor(createdProducts.length * 0.2),
                    productsBelowReorderLevelDetails: createdProducts.filter(p => p.stockQuantity < p.reorderLevel).map(p => ({
                        productId: p._id,
                        name: p.name,
                        sku: p.sku,
                        currentStock: p.stockQuantity,
                        reorderLevel: p.reorderLevel
                    }))
                },
                // Category data for monthly period - similar to daily but different numbers
                byCategory: [
                    {
                        category: "Электротехника", 
                        totalSold: 45, 
                        revenue: 120000,
                        profitMargin: 30000,
                        profitMarginPercentage: 25,
                        topProducts: [{ product: createdProducts[1]._id, quantity: 15, revenue: createdProducts[1].price * 15 }]
                    },
                    {
                        category: "Кабель", 
                        totalSold: 80, 
                        revenue: 58000,
                        profitMargin: 17400,
                        profitMarginPercentage: 30,
                        topProducts: [{ product: createdProducts[0]._id, quantity: 30, revenue: createdProducts[0].price * 30 }]
                    },
                    {
                        category: "Строительные материалы", 
                        totalSold: 210, 
                        revenue: 95000,
                        profitMargin: 28500,
                        profitMarginPercentage: 30,
                        topProducts: [{ product: createdProducts[4]._id, quantity: 50, revenue: createdProducts[4].price * 50 }]
                    },
                    {
                        category: "Офисная мебель", 
                        totalSold: 25, 
                        revenue: 185000,
                        profitMargin: 64750,
                        profitMarginPercentage: 35,
                        topProducts: [{ product: createdProducts[2]._id, quantity: 8, revenue: createdProducts[2].price * 8 }]
                    },
                    {
                        category: "Инструменты", 
                        totalSold: 60, 
                        revenue: 72000,
                        profitMargin: 23040,
                        profitMarginPercentage: 32,
                        topProducts: [{ product: createdProducts[3]._id, quantity: 20, revenue: createdProducts[3].price * 20 }]
                    }
                ]
            },
            regionMetrics: [
                { 
                    region: "Минск", 
                    orders: 145, 
                    revenue: 875000, 
                    averageDeliveryTime: 2.8,
                    deliverySuccessRate: 94.5,
                    returnRate: 2.8,
                    costPerDelivery: 600
                },
                { 
                    region: "Санкт-Петербург", 
                    orders: 38, 
                    revenue: 720000, 
                    averageDeliveryTime: 3.2,
                    deliverySuccessRate: 93.1,
                    returnRate: 3.2,
                    costPerDelivery: 650
                },
                { 
                    region: "Екатеринбург", 
                    orders: 24, 
                    revenue: 520000, 
                    averageDeliveryTime: 4.5,
                    deliverySuccessRate: 89.7,
                    returnRate: 3.8,
                    costPerDelivery: 780
                },
                { 
                    region: "Новосибирск", 
                    orders: 18, 
                    revenue: 320000, 
                    averageDeliveryTime: 5.7,
                    deliverySuccessRate: 87.2,
                    returnRate: 4.5,
                    costPerDelivery: 950
                },
                { 
                    region: "Казань", 
                    orders: 31, 
                    revenue: 580000, 
                    averageDeliveryTime: 3.9,
                    deliverySuccessRate: 91.3,
                    returnRate: 3.5,
                    costPerDelivery: 720
                }
            ],
            forecasts: {
                nextPeriodOrders: Math.round(createdOrders.length * 1.1), // Simple 10% increase forecast
                nextPeriodRevenue: Math.round(createdOrders.reduce((sum, order) => sum + order.totalOrderValue, 0) * 1.1),
                demandTrend: 'rising',
            },
            kpis: {
                supplierPerformanceIndex: 93, deliveryEfficiencyIndex: 88,
                inventoryHealthIndex: 75, costOptimizationIndex: 80,
                customerSatisfactionIndex: 90 // Placeholder
            }
        }
    ];

    try {
        // Ensure unique period-date combination
        for (const analyticEntry of analyticsData) {
            const existingAnalytic = await Analytics.findOne({ period: analyticEntry.period, date: analyticEntry.date });
            if (!existingAnalytic) {
                await Analytics.create(analyticEntry);
            } else {
                console.log(`Analytics for ${analyticEntry.period} ${analyticEntry.date.toISOString()} already exists. Skipping.`);
            }
        }
        
        // Добавляем ежедневную аналитику
        for (const dailyEntry of dailyAnalyticsData) {
            const existingDailyAnalytic = await Analytics.findOne({ period: 'daily', date: dailyEntry.date });
            if (!existingDailyAnalytic) {
                await Analytics.create(dailyEntry);
            }
        }
        
        console.log('Analytics data processed.');
    } catch (err) {
        console.error('Error creating analytics data:', err.message, err.stack);
    }
};


// Основная функция инициализации
const initializeDatabase = async () => {
    await connectDB();
    await clearDatabase();

    const createdUsers = await createUsers();
    const createdProducts = await createProducts(createdUsers);
    const createdOrders = await createOrders(createdUsers, createdProducts);
    await createContracts(createdUsers, createdProducts);
    await createCarts(createdUsers, createdProducts); // User in Cart refers to Client/Employee
    await createNotifications(createdUsers, createdOrders);
    await createTasks(createdUsers, createdOrders, createdProducts);
    await createSettings();
    await createReports(createdUsers);
    await createAnalytics(createdUsers, createdOrders, createdProducts);


    console.log('Database initialization completed.');

    // Закрываем соединение с базой данных
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
};

// Запуск инициализации
initializeDatabase(); 