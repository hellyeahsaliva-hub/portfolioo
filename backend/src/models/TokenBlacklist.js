const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TokenBlacklist = sequelize.define('TokenBlacklist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id',
    },
  },
  reason: {
    type: DataTypes.ENUM('logout', 'password_change', 'account_deactivated', 'other'),
    allowNull: false,
    defaultValue: 'logout',
  },
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['token'],
      unique: true,
    },
    {
      fields: ['expiresAt'],
    },
  ],
});

// Cleanup expired tokens
TokenBlacklist.cleanupExpiredTokens = async function() {
  return this.destroy({
    where: {
      expiresAt: {
        [Op.lt]: new Date(),
      },
    },
  });
};

// Schedule token cleanup every hour
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    try {
      await TokenBlacklist.cleanupExpiredTokens();
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }, 60 * 60 * 1000); // Run every hour
}

module.exports = TokenBlacklist;
