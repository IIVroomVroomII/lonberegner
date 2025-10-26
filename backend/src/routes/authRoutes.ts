import { Router } from 'express';
import { register, login, mobileLogin, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, mobileLoginSchema } from '../validators/authValidators';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/mobile-login', validate(mobileLoginSchema), mobileLogin);
router.get('/me', authenticate, getMe);

export default router;
