import { Router } from "express";
import { getQuestions } from "../controllers/question.controller.js";

const router = Router();

router.get("/:team_id", getQuestions);

export default router;
