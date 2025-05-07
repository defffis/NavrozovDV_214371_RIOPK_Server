import express from "express";
import multer from "multer";
import { requireSignIn } from "../middleware/authMiddleware.js";
import {
	getAllProduct,
	createProduct,
	deleteProduct,
	updateProduct,
	getOneProduct,
	readFile
} from "./../controllers/productController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
//routes
// create product
router.post(
	"/create-product",
	createProduct
);

//update product
router.put(
	"/update-product/:id",
	requireSignIn,
	updateProduct
);

//getAll product
router.get("/get-product", getAllProduct);

//getOne product
router.get("/get-product/:id", getOneProduct);

//readFile
router.post('/read-file', upload.single('file'), readFile);

//delete product
router.delete(
	"/delete-product/:id",
	requireSignIn,
	deleteProduct
);

export default router;
