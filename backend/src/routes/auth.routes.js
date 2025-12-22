const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
};

// Public routes
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/\d/)
      .withMessage('Password must contain at least one number'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authMiddleware.checkAccountLock,
  authMiddleware.loginRateLimit,
  authController.login
);

// Google OAuth routes
router.get('/google', authController.googleAuth);
router.get(
  '/google/callback',
  authController.googleAuthCallback,
  // This will be handled by the frontend
  (req, res) => {
    // This should redirect to the frontend with tokens
    const { token, refreshToken } = req.user;
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`
    );
  }
);

// Password reset routes
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
  ],
  validate,
  authMiddleware.passwordResetLimit,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ],
  validate,
  authController.resetPassword
);

// Email verification routes
router.get('/verify-email/:token', authController.verifyEmail);

router.post(
  '/resend-verification',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
  ],
  validate,
  authController.resendVerificationEmail
);

// Protected routes (require authentication)
router.use(authMiddleware.verifyToken);

router.get('/me', authController.getCurrentUser);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.post(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long'),
  ],
  validate,
  authController.changePassword
);

module.exports = router;
