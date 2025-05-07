import mongoose from "mongoose";

const packagesSchema = new mongoose.Schema({
	package_num: {
		type: String,
		required: true,
	},
	product:{
		type: mongoose.ObjectId,
		ref: "Products",
		required: true,
	},
	manufacture_date: {
		type: Date, 
		required: true,  
	},
	expiration_date: {
		type: Date,  
		required: true,  
	},
});

export default mongoose.model("Packages", packagesSchema);
