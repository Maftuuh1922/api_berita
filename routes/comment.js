const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Sesuaikan dengan middleware yang ada
const Comment = require('../models/Comment');
const CommentLike = require('../models/CommentLike');

// Like/Unlike Comment
router.post('/:commentId/like', protect, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { isLiked } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const existingLike = await CommentLike.findOne({ commentId, userId });

    if (isLiked && !existingLike) {
      // Add like
      await CommentLike.create({ commentId, userId });
    } else if (!isLiked && existingLike) {
      // Remove like
      await CommentLike.deleteOne({ _id: existingLike._id });
    }

    // Get updated like count
    const likeCount = await CommentLike.countDocuments({ commentId });

    res.json({
      success: true,
      likeCount,
      isLiked: isLiked
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
