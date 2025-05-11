const ExcelJS = require('exceljs');

/**
 * Генерирует Excel файл с данными о заказах
 * @param {Array} orders - Массив заказов для экспорта
 * @returns {Promise<Buffer>} Buffer с данными Excel файла
 */
const exportOrdersToExcel = async (orders) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Заказы');

    // Определяем колонки
    worksheet.columns = [
        { header: 'ID заказа', key: 'orderId', width: 15 },
        { header: 'Дата заказа', key: 'orderDate', width: 20 },
        { header: 'Статус', key: 'status', width: 15 },
        { header: 'Клиент', key: 'client', width: 25 },
        { header: 'Email клиента', key: 'clientEmail', width: 25 },
        { header: 'Телефон клиента', key: 'clientPhone', width: 20 },
        { header: 'Поставщик', key: 'supplier', width: 25 },
        { header: 'Сотрудник', key: 'employee', width: 25 },
        { header: 'Товары', key: 'products', width: 40 },
        { header: 'Сумма заказа', key: 'totalValue', width: 15 },
        { header: 'Трекинг номер', key: 'trackingNumber', width: 20 },
        { header: 'Ожидаемая дата доставки', key: 'estimatedDeliveryDate', width: 25 },
        { header: 'Фактическая дата доставки', key: 'actualDeliveryDate', width: 25 }
    ];

    // Стилизация заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };

    // Добавляем данные
    orders.forEach(order => {
        worksheet.addRow({
            orderId: order._id.toString(),
            orderDate: order.orderDate.toLocaleString('ru-RU'),
            status: order.status,
            client: order.client?.name || 'Н/Д',
            clientEmail: order.client?.email || 'Н/Д',
            clientPhone: order.client?.phone || 'Н/Д',
            supplier: order.supplier?.name || 'Н/Д',
            employee: order.employee?.name || 'Не назначен',
            products: order.products.map(p => 
                `${p.product.name} (${p.quantity} шт. × ${p.unitPrice.toLocaleString('ru-RU')} ₽)`
            ).join('\n'),
            totalValue: order.totalOrderValue.toLocaleString('ru-RU'),
            trackingNumber: order.trackingNumber || 'Не указан',
            estimatedDeliveryDate: order.estimatedDeliveryDate 
                ? order.estimatedDeliveryDate.toLocaleDateString('ru-RU')
                : 'Не указана',
            actualDeliveryDate: order.actualDeliveryDate
                ? order.actualDeliveryDate.toLocaleDateString('ru-RU')
                : 'Не указана'
        });
    });

    // Стилизация ячеек
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Пропускаем заголовки
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        }
    });

    // Форматирование числовых значений
    worksheet.getColumn('totalValue').numFmt = '# ##0.00 ₽';

    // Выравнивание текста
    worksheet.getColumn('products').alignment = { wrapText: true };
    worksheet.getColumn('status').alignment = { horizontal: 'center' };
    worksheet.getColumn('orderDate').alignment = { horizontal: 'center' };
    worksheet.getColumn('estimatedDeliveryDate').alignment = { horizontal: 'center' };
    worksheet.getColumn('actualDeliveryDate').alignment = { horizontal: 'center' };

    // Условное форматирование для статусов
    worksheet.addConditionalFormatting({
        ref: 'C2:C1000', // Колонка статуса
        rules: [
            {
                type: 'containsText',
                operator: 'containsText',
                text: 'Отменен',
                style: {
                    fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF9999' } }
                }
            },
            {
                type: 'containsText',
                operator: 'containsText',
                text: 'Доставлен',
                style: {
                    fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF99FF99' } }
                }
            },
            {
                type: 'containsText',
                operator: 'containsText',
                text: 'В пути',
                style: {
                    fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF99CC' } }
                }
            }
        ]
    });

    // Автофильтр
    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length }
    };

    // Закрепляем заголовки
    worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    return await workbook.xlsx.writeBuffer();
};

module.exports = {
    exportOrdersToExcel
}; 