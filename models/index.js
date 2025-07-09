const sequelize = require('../config/database');
const User = require('./User');
const Article = require('./Article');
const Like = require('./Like');
const Save = require('./Save');
const Comment = require('./Comment');
const CommentLike = require('./CommentLike');

// Article associations
Article.hasMany(Like, { foreignKey: 'articleId' });
Article.hasMany(Save, { foreignKey: 'articleId' });
Article.hasMany(Comment, { foreignKey: 'articleId' });

// User associations
User.hasMany(Like, { foreignKey: 'userId' });
User.hasMany(Save, { foreignKey: 'userId' });
User.hasMany(Comment, { foreignKey: 'userId' });
User.hasMany(CommentLike, { foreignKey: 'userId' });

// Like associations
Like.belongsTo(Article, { foreignKey: 'articleId' });
Like.belongsTo(User, { foreignKey: 'userId' });

// Save associations
Save.belongsTo(Article, { foreignKey: 'articleId' });
Save.belongsTo(User, { foreignKey: 'userId' });

// Comment associations
Comment.belongsTo(Article, { foreignKey: 'articleId' });
Comment.belongsTo(User, { foreignKey: 'userId' });
Comment.hasMany(CommentLike, { foreignKey: 'commentId' });

// CommentLike associations
CommentLike.belongsTo(Comment, { foreignKey: 'commentId' });
CommentLike.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Article,
  Like,
  Save,
  Comment,
  CommentLike
};
