require('dotenv').config();

module.exports = {
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    expiresIn: '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret',
    refreshExpiresIn: '7d',
  },
  
  // Google OAuth2
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  },
  
  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  },
  
  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    },
    resave: false,
    saveUninitialized: false
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  
  // Password reset token expiration (in milliseconds)
  resetPasswordExpiration: 3600000, // 1 hour
  
  // Email confirmation token expiration (in milliseconds)
  emailConfirmationExpiration: 86400000 // 24 hours
};
