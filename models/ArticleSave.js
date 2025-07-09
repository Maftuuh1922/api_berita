const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArticleSave = sequelize.define('ArticleSave', {
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
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'article_saves',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'articleUrl']
    }
  ]
});

module.exports = ArticleSave;
