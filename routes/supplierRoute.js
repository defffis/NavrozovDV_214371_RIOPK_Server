import express from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import {
	getAllSuppliersController,
	createSupplierController,
	deleteSupplierController,
	updateSupplierController,
} from "./../controllers/supplierController.js";

const router = express.Router();

//routes
// create sup
router.post(
	"/create-supplier",
	createSupplierController
);

//update sup
router.put(
	"/update-supplier/:id",
	requireSignIn,
	updateSupplierController
);

//getAll sup
router.get("/get-supplier", getAllSuppliersController);

//delete sup
router.delete(
	"/delete-supplier/:id",
	requireSignIn,
	deleteSupplierController
);

export default router;
