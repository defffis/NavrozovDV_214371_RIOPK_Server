import express from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import {
	getAllPackages,
	createPackage,
	deletePackage,
	updatePackage,
} from "./../controllers/packageController.js";

const router = express.Router();

//routes
// create package
router.post(
	"/create-package",
	createPackage
);

//update package
router.put(
	"/update-package/:id",
	requireSignIn,
	updatePackage
);

//getAll package
router.get("/get-package", getAllPackages);


//delete package
router.delete(
	"/delete-package/:id",
	requireSignIn,
	deletePackage
);

export default router;
