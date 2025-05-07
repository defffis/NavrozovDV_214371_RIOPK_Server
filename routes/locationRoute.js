import express from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import {
	getAllLocationsController,
	createLocationController,
	deleteLocationController,
	updateLocationController,
} from "./../controllers/locationController.js";

const router = express.Router();

//routes
// create loc
router.post(
	"/create-location",
	createLocationController
);

//update loc
router.put(
	"/update-location/:id",
	requireSignIn,
	updateLocationController
);

//getAll loc
router.get("/get-location", getAllLocationsController);

//delete loc
router.delete(
	"/delete-location/:id",
	requireSignIn,
	deleteLocationController
);

export default router;
