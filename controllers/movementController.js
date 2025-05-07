import movementsModel from '../models/movementsModel.js';

export const createMovement = async (req, res) => {
	try {
		const { batch, location_from, location_to, movement_date } = req.body;

		if (!batch || !location_from || !location_to || !movement_date) {
			return res.status(400).json({ success: false, message: "Fill all inputs" });
		}

		const newMovement = new movementsModel({
			batch,
			location_from,
			location_to,
			movement_date,
		});

		await newMovement.save();

		res.status(201).json({ success: true, message: "Товар успешно загружен", movement: newMovement });
	} catch (error) {
		console.error("Error while creating movement:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
};

export const getAllMovements = async (req, res) => {
	try {
		const { batchId } = req.params;
		const movements = await movementsModel.find({ batch: batchId })
			.populate('location_from', 'address type')
			.populate('location_to', 'address type')
		res.status(200).send({
			success: true,
			message: "All movements list",
			movements,
		});
	} catch (error) {
		console.error("Error while getting movements:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
}

export const deleteMovement = async (req, res) => {
	try {
		const { id } = req.params;
		await movementsModel.findByIdAndDelete(id);
		res.status(200).send({
			success: true,
			message: "movement Deleted Successfully",
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			message: "Error while deleting movement",
			error,
		});
	}
};

export const deleteMovementsByBatchId = async (req, res) => {
	try {
		const { batchId } = req.params;
		const result = await movementsModel.deleteMany({ batch: batchId });

		if (result.deletedCount === 0) {
			return res.status(404).json({ success: false, message: "No movements found for this batch" });
		}

		res.status(200).json({ success: true, message: "Movements successfully deleted" });
	} catch (error) {
		console.error("Error deleting movements:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
};
