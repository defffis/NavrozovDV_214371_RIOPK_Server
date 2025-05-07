import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
	sup_name: {
		type: String,
		required: true,
	},
	info: {
		type: String,
		required: true,
	},
});

export default mongoose.model("Supplier", supplierSchema);
