import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		price: {
			type: Number,
			required: true,
		},
		category: {
			type: mongoose.ObjectId,
			ref: "Category",
			required: true,
		},
		location: {
			type: mongoose.ObjectId,
			ref: "Location",
			required: true,
		},
		quantity: {
			type: Number,
			required: true,
		},
		supplier: {
			type: mongoose.ObjectId,
			ref: "Supplier",
			required: true,
		},
		serial_num: {
			type: String,
			required: true,
			unique: true,
		}
	},
);

export default mongoose.model("Products", productSchema);
