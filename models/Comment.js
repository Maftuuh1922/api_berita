const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  articleIdentifier: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  likedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  likeCount: {
    type: Number,
    default: 0,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual field untuk replies
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
});

module.exports = mongoose.model('Comment', commentSchema);
