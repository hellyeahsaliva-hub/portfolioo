const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { User } = require('../models');
const authConfig = require('./auth.config');

// Configure Google OAuth2 strategy
passport.use(new GoogleStrategy({
    clientID: authConfig.google.clientID,
    clientSecret: authConfig.google.clientSecret,
    callbackURL: `${process.env.API_URL || 'http://localhost:3001'}${authConfig.google.callbackURL}`,
    passReqToCallback: true,
    scope: ['profile', 'email'],
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({
        where: {
          [Op.or]: [
            { googleId: profile.id },
            { email: profile.emails[0].value },
          ],
        },
      });

      if (user) {
        // Update user with Google ID if not already set
        if (!user.googleId) {
          user = await user.update({
            googleId: profile.id,
            isEmailVerified: true, // Mark email as verified if using Google
          });
        }
        return done(null, user);
      }

      // Create new user
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        isEmailVerified: true, // Mark email as verified
        role: 'user',
      });

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }
));

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
