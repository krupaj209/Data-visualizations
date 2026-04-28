import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cesRouter from "./ces";
import chartsRouter from "./charts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cesRouter);
router.use(chartsRouter);

export default router;
