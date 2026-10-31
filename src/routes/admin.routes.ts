import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { DomainController } from '../controllers/domain.controller';
import { PlanController } from '../controllers/plan.controller';
import { SubscriptionController } from '../controllers/subscription.controller';
import { requireAuth, requireMasterAdmin } from '../middleware/auth';
import {
  affiliateLogoUpload,
  productImageUpload,
} from '../middleware/upload';

const router = Router();

router.use(requireAuth, requireMasterAdmin);

router.get('/users', AdminController.listUsers);
router.get('/dashboard/stats', AdminController.dashboardStats);

router.get('/domains', DomainController.list);
router.post('/domains', DomainController.create);
router.patch('/domains/:id', DomainController.update);
router.post('/domains/:id/verify', DomainController.verify);
router.delete('/domains/:id', DomainController.remove);

router.get('/affiliates', AdminController.listAffiliates);
router.get('/affiliates/:id', AdminController.getAffiliate);
router.post(
  '/affiliates',
  affiliateLogoUpload.single('logo'),
  AdminController.createAffiliate
);
router.patch(
  '/affiliates/:id',
  affiliateLogoUpload.single('logo'),
  AdminController.updateAffiliate
);
router.delete('/affiliates/:id', AdminController.deleteAffiliate);

router.get('/products', AdminController.listProducts);
router.get('/pricing', AdminController.listPricing);
router.get('/products/:id', AdminController.getProduct);

router.get('/plans', PlanController.listAdmin);
router.post('/plans', PlanController.create);
router.patch('/plans/:id', PlanController.update);
router.delete('/plans/:id', PlanController.remove);
router.get('/subscriptions', SubscriptionController.listAdmin);

router.get('/patients', AdminController.listPatients);
router.post('/patients', AdminController.createPatient);
router.patch('/patients/:id', AdminController.updatePatient);
router.delete('/patients/:id', AdminController.deletePatient);
router.get('/orders', AdminController.listOrders);
router.post('/orders', AdminController.createOrder);
router.patch('/orders/:id', AdminController.updateOrder);
router.delete('/orders/:id', AdminController.deleteOrder);
router.post(
  '/products',
  productImageUpload.single('image'),
  AdminController.createProduct
);
router.patch(
  '/products/:id',
  productImageUpload.single('image'),
  AdminController.updateProduct
);
router.delete('/products/:id', AdminController.deleteProduct);

export default router;
