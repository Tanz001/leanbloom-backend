import { Router } from 'express';
import { AffiliateController } from '../controllers/affiliate.controller';
import { SubscriptionController } from '../controllers/subscription.controller';
import {
  requireAuth,
  requireAffiliate,
  requireActiveSubscription,
} from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireAffiliate);

/** Always available — renew / cancel even when locked */
router.get('/subscription', SubscriptionController.me);
router.post('/subscription/create-order', SubscriptionController.createOrder);
router.post('/subscription/capture', SubscriptionController.capture);
router.post('/subscription/cancel', SubscriptionController.cancel);

router.get('/me', AffiliateController.me);

router.use(requireActiveSubscription);

router.get('/dashboard', AffiliateController.dashboard);

router.get('/products', AffiliateController.listProducts);
router.patch('/products/:id/price', AffiliateController.setProductPrice);

router.get('/patients', AffiliateController.listPatients);
router.post('/patients', AffiliateController.createPatient);

router.get('/orders', AffiliateController.listOrders);
router.get('/commissions', AffiliateController.listCommissions);
router.get('/payments', AffiliateController.listPayments);

export default router;
