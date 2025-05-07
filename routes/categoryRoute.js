import express from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import {
	categoryControlller,
	createCategoryController,
	deleteCategoryController,
	singleCategoryController,
	updateCategoryController,
} from "./../controllers/categoryController.js";

const router = express.Router();

//routes
// create category
router.post(
	"/create-category",
	createCategoryController
);

//update category
router.put(
	"/update-category/:id",
	requireSignIn,
	updateCategoryController
);

//getALl category
router.get("/get-category", categoryControlller);

//single category
router.get("/single-category/:slug", singleCategoryController);

//delete category
router.delete(
	"/delete-category/:id",
	requireSignIn,
	deleteCategoryController
);

export default router;
