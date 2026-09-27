import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import affiliateRoutes from './affiliate.routes';
import storefrontRoutes from './storefront.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/affiliate', affiliateRoutes);
router.use('/storefront', storefrontRoutes);

export default router;
