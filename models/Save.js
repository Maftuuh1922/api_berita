const mongoose = require('mongoose');

const saveSchema = new mongoose.Schema({
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
  },
  title: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate saves
saveSchema.index({ articleId: 1, userId: 1 }, { unique: true });
saveSchema.index({ articleUrl: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Save', saveSchema);
