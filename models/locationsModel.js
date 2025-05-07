import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
	address: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		required: true,
		enum: ["Логистический центр", "Точка выдачи", "Склад", "Магазин"],
	},
});

export default mongoose.model("Location", locationSchema);
