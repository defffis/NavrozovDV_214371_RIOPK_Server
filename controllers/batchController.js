import batchModel from '../models/batchesModel.js';

export const createBatch = async (req, res) => {
	try {
		const { prodPackage, location, status } = req.body;

		if (!prodPackage || !location || !status) {
			return res.status(400).json({ success: false, message: "Fill all inputs" });
		}

		const lastBatch = await batchModel.findOne().sort({ batch_num: -1 });
		const newNumber = lastBatch ? parseInt(lastBatch.batch_num, 10) + 1 : 0;

		const newBatch = new batchModel({
			package: prodPackage,
			location,
			status,
			batch_num: newNumber,
		});

		await newBatch.save();

		res.status(201).json({ success: true, message: "Товар успешно загружен", batch: newBatch });
	} catch (error) {
		console.error("Error while creating batch:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
};

export const getAllBatches = async (req, res) => {
	try {
		const batches = await batchModel.find({})
			.populate({
				path: 'package',
				populate: {
					path: 'product',  // Доступ к продукту 
					select: 'name price',
				},
				select: 'package_num expiration_date', // Поля, которые нужно получить из package
			})
			.populate('location', 'address')
		res.status(200).send({
			success: true,
			message: "All batches list",
			batches,
		});
	} catch (error) {
		console.error("Error while getting batches:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
}

export const deleteBatch = async (req, res) => {
	try {
		const { id } = req.params;
		await batchModel.findByIdAndDelete(id);
		res.status(200).send({
			success: true,
			message: "Batch Deleted Successfully",
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			message: "Error while deleting batch",
			error,
		});
	}
};


export const updateBatch = async (req, res) => {
	try {
		const { prodPackage, location, status } = req.body;
		console.log(prodPackage, location, status)

		if (!prodPackage || !location || !status) {
			return res.status(400).json({ success: false, message: "Fill all inputs" });
		}

		const { id } = req.params;
		const updatedBatch = await batchModel.findByIdAndUpdate(
			id,
			{
				package: prodPackage,
				location,
				status,
			},
			{ new: true }
		);
		res.status(200).send({
			success: true,
			messsage: "Batch Updated Successfully",
			batch: updatedBatch,
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			error,
			message: "Error while updating batch",
		});
	}
};