import { Router } from 'express';
import { StorefrontController } from '../controllers/storefront.controller';

const router = Router();

router.get('/tenants', StorefrontController.listTenants);
router.get('/tenant', StorefrontController.resolveTenant);
router.get('/:affiliateId/products', StorefrontController.listProducts);
router.post('/checkout', StorefrontController.checkout);
router.post('/buy-lead', StorefrontController.captureBuyLead);

export default router;
