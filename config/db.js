import mongoose from "mongoose";
mongoose.set('strictQuery', false);

const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URL);
		console.log(
			`Conneted To Mongodb Database ${conn.connection.host}`);
	} catch (error) {
		console.log(`Error in Mongodb ${error}`);
	}
};

export default connectDB;
