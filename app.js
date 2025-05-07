import express from 'express';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoute.js';
import categoryRoute from './routes/categoryRoute.js';
import locationRoute from './routes/locationRoute.js';
import supplierRoute from './routes/supplierRoute.js';
import productRoute from './routes/productRoute.js';
import batchRoute from './routes/batchRoute.js';
import packageRoute from './routes/packageRoute.js';
import movementRoute from './routes/movementRoute.js';
import reportsRoute from './routes/reportsRoute.js'
import dotenv from "dotenv";
import cors from 'cors';
import morgan from 'morgan';

dotenv.config();

connectDB()
const PORT = process.env.PORT || 4000;
const app = express()

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));


app.use('/api/user', userRoutes)
app.use('/api/category', categoryRoute)
app.use('/api/location', locationRoute)
app.use('/api/supplier', supplierRoute)
app.use('/api/product', productRoute)
app.use('/api/batch', batchRoute)
app.use('/api/package', packageRoute)
app.use('/api/movement', movementRoute)
app.use('/api/report', reportsRoute)


app.listen(PORT, () => {
	console.log(
		`Server Running on port ${PORT}`);
});
