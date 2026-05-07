import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cesRouter from "./ces";
import chartsRouter from "./charts";
import drdsRouter from "./drds";
import researchRouter from "./research";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cesRouter);
router.use(chartsRouter);
router.use(drdsRouter);
router.use(researchRouter);

export default router;
