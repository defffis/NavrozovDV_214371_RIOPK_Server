import locationsModel from "../models/locationsModel.js";

//create location
export const createLocationController = async (req, res) => {
	try {
		const { address, type } = req.body;
		console.log(req.headers.authorization)
		if (!address || !type) {
			return res.status(204).send({ message: "data is required" });
		}
		const existingLocation = await locationsModel.findOne({ address });
		if (existingLocation) {
			return res.status(203).send({
				success: false,
				message: "Location Already Exisits",
			});
		}
		const location = await new locationsModel({
			address,
			type,
		}).save();

		res.status(200).send({
			success: true,
			message: "new location created",
			location,
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			error,
			message: "Error in creating location",
		});
	}
};

//update location
export const updateLocationController = async (req, res) => {
	try {
		const { address, type } = req.body;
		const { id } = req.params;
		const location = await locationsModel.findByIdAndUpdate(
			id,
			{ address, type },
			{ new: true }
		);
		res.status(200).send({
			success: true,
			messsage: "Location Updated Successfully",
			location,
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			error,
			message: "Error while updating location",
		});
	}
};

// get all locations
export const getAllLocationsController = async (req, res) => {
	try {
		const locations = await locationsModel.find({});
		res.status(200).send({
			success: true,
			message: "All locations list",
			locations,
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			error,
			message: "Error while getting all locations",
		});
	}
};

//delete location
export const deleteLocationController = async (req, res) => {
	try {
		const { id } = req.params;
		await locationsModel.findByIdAndDelete(id);
		res.status(200).send({
			success: true,
			message: "Location Deleted Successfully",
		});
	} catch (error) {

		res.status(400).send({
			success: false,
			message: "Error while deleting location",
			error,
		});
	}
};
