import supModel from "../models/suppliersModel.js";

//create sup
export const createSupplierController = async (req, res) => {
	try {
		const { sup_name, info } = req.body;

		if (!sup_name || !info) {
			return res.status(401).send({ message: "data is required" });
		}
		const existingSupplier = await supModel.findOne({ sup_name });
		if (existingSupplier) {
			return res.status(200).send({
				success: false,
				message: "Supplier Already Exisits",
			});
		}
		const supplier = await new supModel({
			sup_name,
			info,
		}).save();

		res.status(201).send({
			success: true,
			message: "new supplier created",
			supplier,
		});
	} catch (error) {

		res.status(500).send({
			success: false,
			error,
			message: "Error in creating supplier",
		});
	}
};

//update sup
export const updateSupplierController = async (req, res) => {
	try {
		const { sup_name, info } = req.body;
		const { id } = req.params;
		const supplier = await supModel.findByIdAndUpdate(
			id,
			{ sup_name, info },
			{ new: true }
		);
		res.status(200).send({
			success: true,
			messsage: "Supplier Updated Successfully",
			supplier,
		});
	} catch (error) {

		res.status(500).send({
			success: false,
			error,
			message: "Error while updating supplier",
		});
	}
};

//get all sup
export const getAllSuppliersController = async (req, res) => {
	try {
		const suppliers = await supModel.find({});
		res.status(200).send({
			success: true,
			message: "All suppliers list",
			suppliers,
		});
	} catch (error) {

		res.status(500).send({
			success: false,
			error,
			message: "Error while getting all suppliers",
		});
	}
};

//delete sup
export const deleteSupplierController = async (req, res) => {
	try {
		const { id } = req.params;
		await supModel.findByIdAndDelete(id);
		res.status(200).send({
			success: true,
			message: "Supplier Deleted Successfully",
		});
	} catch (error) {

		res.status(500).send({
			success: false,
			message: "Error while deleting supplier",
			error,
		});
	}
};
