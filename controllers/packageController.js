import packageModel from '../models/packagesModel.js';

export const createPackage = async (req, res) => {
	try {
		const { product, manufacture_date, expiration_date } = req.body;

		if (!product || !manufacture_date || !expiration_date) {
			return res.status(400).json({ success: false, message: "Fill all inputs" });
		}

		const lastPackage = await packageModel.findOne().sort({ package_num: -1 });
		const newNumber = lastPackage ? parseInt(lastPackage.package_num, 10) + 1 : 0;

		// Создание новой упаковки
		const newPackage = new packageModel({
			product,
			manufacture_date,
			expiration_date,
			package_num: newNumber,
		});

		await newPackage.save();

		res.status(201).json({ success: true, message: "Товар успешно упакован", package: newPackage });
	} catch (error) {
		console.error("Error while creating package:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
};

export const getAllPackages = async (req, res) => {
	try {
		const prodPackages = await packageModel.find({})
			.populate('product', 'name location')
		res.status(200).send({
			success: true,
			message: "All packages list",
			packages: prodPackages,
		});
	} catch (error) {
		console.error("Error while getting packages:", error);
		res.status(500).json({ success: false, message: "Server error, try again later" });
	}
}

export const deletePackage = async (req, res) => {
	try {
		const { id } = req.params;
		await packageModel.findByIdAndDelete(id);
		res.status(200).send({
			success: true,
			message: "Package Deleted Successfully",
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			message: "Error while deleting package",
			error,
		});
	}
};


export const updatePackage = async (req, res) => {
	try {
		const { product, manufacture_date, expiration_date } = req.body;
		console.log(product, manufacture_date, expiration_date)

		if (!product || !manufacture_date || !expiration_date) {
			return res.status(400).json({ success: false, message: "Fill all inputs" });
		}

		const { id } = req.params;
		const updatedPackage = await packageModel.findByIdAndUpdate(
			id,
			{
				product,
				manufacture_date,
				expiration_date,
			},
			{ new: true }
		);
		res.status(200).send({
			success: true,
			messsage: "Package Updated Successfully",
			package: updatedPackage,
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			error,
			message: "Error while updating package",
		});
	}
};