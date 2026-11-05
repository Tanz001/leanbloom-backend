import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/signup/request-otp', AuthController.requestSignupOtp);
router.post('/signup/verify-otp', AuthController.verifySignupOtp);
router.post('/forgot-password/request-otp', AuthController.requestPasswordOtp);
router.post('/forgot-password/verify-otp', AuthController.verifyPasswordOtp);
router.post('/forgot-password/reset', AuthController.resetPassword);
router.post('/signup/affiliate', AuthController.signupAffiliate);
router.get('/me', requireAuth, AuthController.me);
router.patch('/me', requireAuth, AuthController.updateProfile);
router.post('/change-password', requireAuth, AuthController.changePassword);

export default router;
