const jwt = require('jsonwebtoken');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { User } = require('../models');
const authConfig = require('../config/auth.config');
const { TokenBlacklist } = require('../models');

// Rate limiting for login attempts
const loginRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 15 * 60, // per 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes after 5 attempts
});

// Rate limiting for password reset requests
const passwordResetLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 3600, // per hour
});

// Rate limiting for API requests
const apiRateLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 15 * 60, // per 15 minutes
});

// Verify JWT token
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({ where: { token } });
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, authConfig.jwt.secret);
    
    // Check if user still exists
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists or is inactive',
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

// Check if user has required role
exports.checkRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (Array.isArray(roles) && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Rate limiting middleware
exports.loginRateLimit = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await loginRateLimiter.consume(ip);
    next();
  } catch (error) {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.',
      retryAfter: error.msBeforeNext / 1000,
    });
  }
};

exports.passwordResetLimit = async (req, res, next) => {
  try {
    const { email } = req.body;
    await passwordResetLimiter.consume(email);
    next();
  } catch (error) {
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests. Please try again later.',
      retryAfter: error.msBeforeNext / 1000,
    });
  }
};

exports.apiRateLimit = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await apiRateLimiter.consume(ip);
    next();
  } catch (error) {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: error.msBeforeNext / 1000,
    });
  }
};

// Check if email is verified
exports.requireEmailVerification = (req, res, next) => {
  if (req.user && !req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to access this resource',
    });
  }
  next();
};

// Check if account is locked
exports.checkAccountLock = async (req, res, next) => {
  const { email } = req.body;
  
  try {
    const user = await User.findOne({ where: { email } });
    
    if (user && user.isLocked()) {
      const timeLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account is locked. Please try again in ${timeLeft} minutes.`,
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
