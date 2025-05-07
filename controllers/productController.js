import batchesModel from '../models/batchesModel.js';
import packagesModel from '../models/packagesModel.js';
import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';
import locationsModel from '../models/locationsModel.js';
import suppliersModel from '../models/suppliersModel.js';
import XLSX from "xlsx";
import axios from "axios";


export const readFile = async (req, res) => {
	try {
		const file = req.file;
		if (!file) {
			return res.status(400).send({ message: 'Файл не выбран' });
		}

		// Читаем файл и парсим его в JSON
		const workbook = XLSX.read(file.buffer, { type: 'buffer' });
		const sheetName = workbook.SheetNames[0]; // Получаем имя первого листа
		const sheet = workbook.Sheets[sheetName];

		// Преобразуем данные из Excel в массив объектов
		const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Получаем данные как массив

		data.shift();

		console.log(data)
		const productsToCreate = [];
		const lastProduct = await productModel.findOne().sort({ serial_num: -1 });
		let newSerialNumber = lastProduct ? parseInt(lastProduct.serial_num, 10) + 1 : 0;

		for (const row of data) {
			if (row[0] === 'категория')
				continue;
			if (row.length === 6) {
				const [categoryName, locationName, supplierName, productName, price, quantity] = row;

				const category = await categoryModel.findOne({ name: { $regex: new RegExp(categoryName, 'i') } });
				const location = await locationsModel.findOne({ address: { $regex: new RegExp(locationName, 'i') } });
				const supplier = await suppliersModel.findOne({ sup_name: { $regex: new RegExp(supplierName, 'i') } });

				if (category !== null && location !== null && supplier !== null) {

					const newProduct = {
						name: productName,
						price: parseFloat(price),
						quantity: parseInt(quantity),
						category: category._id,
						location: location._id,
						supplier: supplier._id,
						serial_num: newSerialNumber,
					};

					newSerialNumber += 1
					productsToCreate.push(newProduct);
				}
			}
		}

		if (productsToCreate.length > 0) {
			await productModel.insertMany(productsToCreate);
			return res.status(200).send({ message: 'Товары успешно добавлены', success: true, products: productsToCreate });
		} else {
			return res.status(400).send({ message: 'Не удалось найти все необходимые данные для добавления товаров' });
		}

	} catch (error) {
		console.error('Ошибка при загрузке файла:', error);
		return res.status(500).send({ message: 'Ошибка при обработке файла' });
	}
}
export const createProduct = async (req, res) => {
	try {
		const { name, price, quantity, category, location, supplier } = req.body;

		// Проверка на наличие всех обязательных полей
		if (!name || !price || !quantity || !category || !location || !supplier) {
			return res.status(400).json({ success: false, message: "Fill all inputs" });
		}

		const lastProduct = await productModel.findOne().sort({ serial_num: -1 });
		const newSerialNumber = lastProduct ? parseInt(lastProduct.serial_num, 10) + 1 : 0;

		// Создание нового продукта
		const newProduct = new productModel({
			name,
			price,
			quantity,
			category,
			location,
			supplier,
			serial_num: newSerialNumber,
		});

		await newProduct.save();

		res.status(201).json({ success: true, message: "Товар успешно создан", product: newProduct });
	} catch (error) {
		console.error("Error while creating product:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
};

export const getAllProduct = async (req, res) => {
	try {
		const products = await productModel.find({})
			.populate('supplier', 'sup_name')
			.populate('category', 'name')
			.populate('location', 'address')
		res.status(200).send({
			success: true,
			message: "All products list",
			products,
		});
	} catch (error) {
		console.error("Error while getting product:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
}

export const getOneProduct = async (req, res) => {
	try {
		const product = await productModel.findOne({ _id: req.params.id })
			.populate('supplier', 'sup_name')
			.populate('category', 'name')
			.populate('location', 'address')
		res.status(200).send({
			success: true,
			message: "Get single product SUccessfully",
			product,
		});
	} catch (error) {
		console.log(error);
		res.status(400).send({
			success: false,
			error,
			message: "Error While getting Single product",
		});
	}
};

export const deleteProduct = async (req, res) => {
	const { id } = req.params;

	try {
		// Получение всех упаковок, связанных с товаром
		const packages = await packagesModel.find({ product: id });

		// Получение всех партий, связанных с этими упаковками
		const packageIds = packages.map(pkg => pkg._id);
		const batches = await batchesModel.find({ package: { $in: packageIds } });
		const batchIds = batches.map(batch => batch._id);

		// Удаление всех перемещений, связанных с партиями
		for (const batchId of batchIds) {
			await axios.delete(`http://localhost:4000/api/movement/delete-movements/${batchId}`);
		}

		// Удаление партий
		await batchesModel.deleteMany({ package: { $in: packageIds } });

		// Удаление упаковок, связанных с товаром
		await packagesModel.deleteMany({ product: id });

		// Удаление товара
		await productModel.findByIdAndDelete(id);

		res.status(200).json({ success: true, message: "Товар и связанные данные успешно удалены" });
	} catch (error) {
		console.error("Ошибка при удалении товара и связанных данных:", error);
		res.status(500).json({ success: false, message: "Ошибка при удалении товара и связанных данных" });
	}
};


export const updateProduct = async (req, res) => {
	try {
		const { name, price, quantity, category, location, supplier } = req.body;
		console.log(name, price, quantity, category, location, supplier)
		if (!name || !price || !quantity || !category || !location || !supplier) {
			return res.status(400).json({ success: false, message: "Fill all inputs" });
		}
		const { id } = req.params;


		const product = await productModel.findByIdAndUpdate(
			id,
			{
				name,
				price,
				quantity,
				category,
				location,
				supplier
			},
			{ new: true }
		);
		res.status(200).send({
			success: true,
			messsage: "Product Updated Successfully",
			product,
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			error,
			message: "Error while updating product",
		});
	}
};