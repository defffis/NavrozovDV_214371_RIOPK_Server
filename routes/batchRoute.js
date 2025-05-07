import express from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import {
	getAllBatches,
	createBatch,
	deleteBatch,
	updateBatch,
} from "./../controllers/batchController.js";

const router = express.Router();

//routes
// create batch
router.post(
	"/create-batch",
	createBatch
);

//update batch
router.put(
	"/update-batch/:id",
	requireSignIn,
	updateBatch
);

//getAll batch
router.get("/get-batch", getAllBatches);


//delete batch
router.delete(
	"/delete-batch/:id",
	requireSignIn,
	deleteBatch
);

export default router;
