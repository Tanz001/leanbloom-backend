import { Router } from 'express';
import { AffiliateController } from '../controllers/affiliate.controller';
import { requireAuth, requireAffiliate } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAffiliate);

router.get('/me', AffiliateController.me);
router.get('/dashboard', AffiliateController.dashboard);

router.get('/products', AffiliateController.listProducts);
router.patch('/products/:id/price', AffiliateController.setProductPrice);

router.get('/patients', AffiliateController.listPatients);
router.post('/patients', AffiliateController.createPatient);

router.get('/orders', AffiliateController.listOrders);
router.get('/commissions', AffiliateController.listCommissions);
router.get('/payments', AffiliateController.listPayments);

export default router;
