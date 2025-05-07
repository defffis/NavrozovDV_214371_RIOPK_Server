import PDFDocument from "pdfkit";
import fs from "fs";
import axios from "axios";

export const productReport = async (req, res) => {
	const { date } = req.body;

	const { data: productsData } = await axios.get("http://localhost:4000/api/product/get-product");
	let products = productsData.products;

	if (products.length === 0) {
		res.status(204).send({
			success: false,
			message: "Нет продуктов для отчета",
		});
		return;
	}

	try {
		const doc = new PDFDocument();

		const fileName = `D:\\reports\\productReport${date}.pdf`;
		const stream = fs.createWriteStream(fileName);
		doc.pipe(stream);

		doc.font("C:\\Windows\\Fonts\\Arial.ttf").fontSize(20).text("Отчет о продуктах", { align: "center" });
		doc.moveDown();

		doc.font("C:\\Windows\\Fonts\\Arial.ttf").fontSize(12);
		doc.text("Серийный номер | Название | Цена | Поставщик | Категория | Точка нахождения | Количество", {
			align: "left",
		});
		doc.moveDown();

		for (const product of products) {
			const prodSupplier = (product.supplier && product.supplier.sup_name) ? product.supplier.sup_name : 'Неизвестно'
			const prodLocation = (product.location && product.location.address) ? product.location.address : 'Неизвестно'
			const prodCategory = (product.category && product.category.name) ? product.category.name : 'Неизвестно'
			doc.text(`${product.serial_num}| ${product.name} | ${product.price} | ${prodSupplier} | ${prodCategory} | ${prodLocation} | ${product.quantity}`, { align: "left" });
		}

		doc.moveDown();
		doc.end();

		res.status(200).send({
			success: true,
			message: "PDF-файл успешно создан"
		});
	} catch (error) {
		console.error("Ошибка при создании PDF-файла:", error);
		res.status(500).send({
			success: false,
			message: "Ошибка при создании PDF-файла",
		});
	}
};


export const batchReport = async (req, res) => {
	const { date } = req.body;

	// Получение данных о продуктах и их перемещениях
	const { data: batchesData } = await axios.get("http://localhost:4000/api/batch/get-batch");
	let batches = batchesData.batches;

	if (batches.length === 0) {
		res.status(204).send({
			success: false,
			message: "Нет партий для отчета",
		});
		return;
	}

	try {
		const doc = new PDFDocument();

		const fileName = `D:\\reports\\batchReport${date}.pdf`;
		const stream = fs.createWriteStream(fileName);
		doc.pipe(stream);

		// Заголовок отчета
		doc.font("C:\\Windows\\Fonts\\Arial.ttf").fontSize(20).text("Отчет о партиях", { align: "center" });
		doc.moveDown();

		doc.font("C:\\Windows\\Fonts\\Arial.ttf").fontSize(12);

		for (const batch of batches) {
			const batchLocation = batch.location ? batch.location.address : "Неизвестно";
			const batchStatus = batch.status || "Не указано";

			// Основная информация о партии
			doc.text(`Партия №: ${batch.batch_num}`, { align: "left" });
			doc.text(`Товар: ${batch?.package?.product?.name || "Неизвестно"}`, { align: "left" });
			doc.text(`Местоположение: ${batchLocation}`, { align: "left" });
			doc.text(`Статус: ${batchStatus}`, { align: "left" });
			doc.moveDown();

			// Заголовок для перемещений
			doc.text("Перемещения:", { align: "left", underline: true });
			doc.moveDown(0.5);

			const { data: movementData } = await axios.get(`http://localhost:4000/api/movement/get-movement/${batch._id}`);
			let movements = movementData.movements;
			// Таблица перемещений с отступом вправо
			if (movements && movements.length > 0) {
				movements.forEach((movement, index) => {
					const fromLocation = movement.location_from.address || "Неизвестно";
					const toLocation = movement.location_to.address || "Неизвестно";
					const movementDate = movement.movement_date || "Не указана";

					// Отступ для блока перемещений
					doc.text(`Перемещение ${index + 1}`, { align: "left", indent: 20 });
					doc.text(`Откуда: ${fromLocation}`, { align: "left", indent: 40 });
					doc.text(`Куда: ${toLocation}`, { align: "left", indent: 40 });
					doc.text(`Дата: ${movementDate}`, { align: "left", indent: 40 });
					doc.moveDown(0.5);
				});
			} else {
				doc.text("Нет данных о перемещениях", { align: "left", indent: 20 });
			}

			doc.moveDown(1.5);
		}

		doc.end();

		res.status(200).send({
			success: true,
			message: "PDF-файл успешно создан"
		});
	} catch (error) {
		console.error("Ошибка при создании PDF-файла:", error);
		res.status(500).send({
			success: false,
			message: "Ошибка при создании PDF-файла",
		});
	}
};


export const packageReport = async (req, res) => {
	const { date } = req.body;

	const { data: packageData } = await axios.get("http://localhost:4000/api/package/get-package");

	let prodPackages = packageData.packages;

	if (prodPackages.length === 0) {
		res.status(204).send({
			success: false,
			message: "Нет упаковок для отчета",
		});
		return;
	}

	try {
		const doc = new PDFDocument();

		const fileName = `D:\\reports\\packageReport${date}.pdf`;
		const stream = fs.createWriteStream(fileName);
		doc.pipe(stream);

		doc.font("C:\\Windows\\Fonts\\Arial.ttf").fontSize(20).text("Отчет об упаковках", { align: "center" });
		doc.moveDown();

		doc.font("C:\\Windows\\Fonts\\Arial.ttf").fontSize(12);
		doc.text("Номер упаковки | Товар | Дата упаковки | Срок годности (ДО) ", {
			align: "left",
		});
		doc.moveDown();

		for (const prodPackage of prodPackages) {
			doc.text(`${prodPackage.package_num} | ${prodPackage.product.name} | ${prodPackage.manufacture_date} | ${prodPackage.expiration_date}`, { align: "left" });
		}

		doc.moveDown();
		doc.end();

		res.status(200).send({
			success: true,
			message: "PDF-файл успешно создан"
		});
	} catch (error) {
		console.error("Ошибка при создании PDF-файла:", error);
		res.status(500).send({
			success: false,
			message: "Ошибка при создании PDF-файла",
		});
	}
};
