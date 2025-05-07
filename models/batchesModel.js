import mongoose from "mongoose";

const batchesSchema = new mongoose.Schema({
	batch_num: {
		type: String,
		required: true,
	},
	package: {
		type: mongoose.ObjectId,
		ref: "Packages",
		required: true,
	},
	location: {
		type: mongoose.ObjectId,
		ref: "Location",
		required: true,
	},
	status: {
		type: String,
		default: "На складе",
		enum: ["На складе", "Отправлено", "Продано", "Возврат"],
	},
});

export default mongoose.model("Batches", batchesSchema);
