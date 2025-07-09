const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArticleLike = sequelize.define('ArticleLike', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  articleUrl: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'article_likes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'articleUrl']
    }
  ]
});

module.exports = ArticleLike;
