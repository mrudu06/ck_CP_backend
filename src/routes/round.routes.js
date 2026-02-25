import { Router } from "express";
import { startRound, startCpTimer } from "../controllers/round.controller.js";

const router = Router();

router.post("/start", startRound);
router.post("/start-timer", startCpTimer);

export default router;
