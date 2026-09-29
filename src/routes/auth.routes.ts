import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/signup/affiliate', AuthController.signupAffiliate);
router.get('/me', requireAuth, AuthController.me);
router.patch('/me', requireAuth, AuthController.updateProfile);
router.post('/change-password', requireAuth, AuthController.changePassword);

export default router;
