const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, // Nullable for OAuth users
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emailVerificationExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  lockUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  paranoid: true, // Enable soft delete
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

// Instance method to check password
User.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Check if account is locked
User.prototype.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
User.prototype.incLoginAttempts = async function () {
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
  
  if (this.lockUntil && this.lockUntil < Date.now()) {
    // Reset attempts if lock has expired
    return await this.update({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account if max attempts reached
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  
  return await this.update(updates);
};

// Reset login attempts on successful login
User.prototype.resetLoginAttempts = async function () {
  return await this.update({
    loginAttempts: 0,
    lockUntil: null,
    lastLogin: new Date()
  });
};

// Generate password reset token
User.prototype.createPasswordResetToken = async function () {
  const { v4: uuidv4 } = require('uuid');
  const resetToken = uuidv4();
  const resetTokenExpiry = Date.now() + 3600000; // 1 hour
  
  await this.update({
    passwordResetToken: resetToken,
    passwordResetExpires: new Date(resetTokenExpiry)
  });
  
  return resetToken;
};

// Generate email verification token
User.prototype.createEmailVerificationToken = async function () {
  const { v4: uuidv4 } = require('uuid');
  const verificationToken = uuidv4();
  const verificationExpiry = Date.now() + 86400000; // 24 hours
  
  await this.update({
    emailVerificationToken: verificationToken,
    emailVerificationExpires: new Date(verificationExpiry)
  });
  
  return verificationToken;
};

module.exports = User;
