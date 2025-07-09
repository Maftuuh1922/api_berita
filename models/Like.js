const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  articleUrl: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate likes
likeSchema.index({ articleId: 1, userId: 1 }, { unique: true });
likeSchema.index({ articleUrl: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
