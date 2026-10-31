import { Router } from 'express';
import { PlanController } from '../controllers/plan.controller';

const router = Router();

/** Public: active plans for signup */
router.get('/', PlanController.listPublic);

export default router;
