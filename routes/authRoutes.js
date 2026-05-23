const express = require('express');
const { 
  register, login, getMe, verifyOTP, 
  forgotPassword, resetPassword, getDomains, resendOTP
} = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOTP);
router.get('/domains', getDomains);
router.get('/me', authMiddleware, getMe);


module.exports = router;
