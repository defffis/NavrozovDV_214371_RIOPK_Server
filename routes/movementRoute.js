import express from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import {
	getAllMovements,
	createMovement,
	deleteMovement,
	deleteMovementsByBatchId
} from "./../controllers/movementController.js";

const router = express.Router();

//routes
router.post(
	"/create-movement",
	createMovement
);

router.get("/get-movement/:batchId", getAllMovements);


router.delete(
	"/delete-movement/:id",
	requireSignIn,
	deleteMovement
);

router.delete(
	"/delete-movements/:batchId",
	deleteMovementsByBatchId
);

export default router;
