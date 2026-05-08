import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cesRouter from "./ces";
import chartsRouter from "./charts";
import drdsRouter from "./drds";
import researchRouter from "./research";
import feedbackRouter from "./feedback";
import questionBankRouter from "./question-bank";
import ceIntelligenceRouter from "./ce-intelligence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cesRouter);
router.use(chartsRouter);
router.use(drdsRouter);
router.use(researchRouter);
router.use(feedbackRouter);
router.use(questionBankRouter);
router.use(ceIntelligenceRouter);

export default router;
