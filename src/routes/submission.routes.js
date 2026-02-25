import { Router } from "express";
import { submitCode } from "../controllers/submission.controller.js";

const router = Router();

router.post("/", submitCode);

export default router;
