import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cesRouter from "./ces";
import chartsRouter from "./charts";
import drdsRouter from "./drds";
import researchRouter from "./research";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cesRouter);
router.use(chartsRouter);
router.use(drdsRouter);
router.use(researchRouter);
router.use(feedbackRouter);

export default router;
