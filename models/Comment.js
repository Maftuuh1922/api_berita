const mongoose = require('mongoose');

const CommentSchema = mongoose.Schema(
  {
    articleIdentifier: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    authorPhoto: {
      type: String,
      default: null,
    },
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    likedBy: [{ // Array of user IDs who liked this comment
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    replyCount: {
      type: Number,
      default: 0,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null, // Null for top-level comments
    },
    replies: [ // This field will store actual reply objects
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    // Untuk referensi ke user yang membuat komentar (opsional tapi disarankan)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Bisa false jika memungkinkan komentar anonim
    },
  },
  {
    timestamps: true,
  }
);

// Middleware untuk mengupdate replyCount pada parent comment
CommentSchema.pre('save', async function (next) {
  if (this.parentId && this.isNew) { // If it's a new reply
    await mongoose.model('Comment').findByIdAndUpdate(this.parentId, {
      $inc: { replyCount: 1 },
      $push: { replies: this._id }
    });
  }
  next();
});

CommentSchema.post('remove', async function (doc, next) {
  // If a parent comment is removed, remove all its replies
  await mongoose.model('Comment').deleteMany({ parentId: doc._id });

  // If a reply is removed, decrement parent's replyCount
  if (doc.parentId) {
    await mongoose.model('Comment').findByIdAndUpdate(doc.parentId, {
      $inc: { replyCount: -1 },
      $pull: { replies: doc._id }
    });
  }
  next();
});

module.exports = mongoose.model('Comment', CommentSchema);