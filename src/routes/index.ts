import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import affiliateRoutes from './affiliate.routes';
import storefrontRoutes from './storefront.routes';
import planRoutes from './plan.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/affiliate', affiliateRoutes);
router.use('/storefront', storefrontRoutes);
router.use('/plans', planRoutes);

export default router;
