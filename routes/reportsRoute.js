import express from "express";
import { requireSignIn } from "../middleware/authMiddleware.js";
import {
	productReport,
	batchReport,
	packageReport,
} from "./../controllers/reportController.js";

const router = express.Router();

router.post(
	"/product-report",
	productReport
);

router.post(
	"/batch-report",
	batchReport
);

router.post(
	"/package-report",
	packageReport
);

export default router;
