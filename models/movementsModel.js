import mongoose from "mongoose";

const movementSchema = new mongoose.Schema({
	batch: {
		type: mongoose.ObjectId,
		ref: "Batches",
		required: true,
	},
	location_from: {
		type: mongoose.ObjectId,
		ref: "Location",
		required: true,
	},
	location_to: {
		type: mongoose.ObjectId,
		ref: "Location",
		required: true,
	},
	movement_date: {
		type: Date,
		required: true,
	},
});

export default mongoose.model("Movement", movementSchema);
