const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Sesuaikan dengan middleware yang ada
const Article = require('../models/Article');
const Like = require('../models/Like');
const Save = require('../models/Save');
const Comment = require('../models/Comment');
const User = require('../models/User');

// Get Article Stats
router.get('/stats', protect, async (req, res) => {
  try {
    const { url } = req.query;
    const userId = req.user.id;

    if (!url) {
      return res.status(400).json({ error: 'Article URL is required' });
    }

    // Get or create article record
    let article = await Article.findOne({ url });
    if (!article) {
      article = await Article.create({ url, title: '', content: '' });
    }

    // Get like count and user's like status
    const likeCount = await Like.countDocuments({ articleUrl: url });
    const userLike = await Like.findOne({ articleUrl: url, userId });

    // Get comment count
    const commentCount = await Comment.countDocuments({ articleUrl: url });

    // Get user's save status
    const userSave = await Save.findOne({ articleUrl: url, userId });

    res.json({
      likeCount,
      commentCount,
      isLiked: !!userLike,
      isSaved: !!userSave
    });
  } catch (error) {
    console.error('Error getting article stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike Article
router.post('/like', protect, async (req, res) => {
  try {
    const { articleUrl, isLiked } = req.body;
    const userId = req.user.id;

    if (!articleUrl) {
      return res.status(400).json({ error: 'Article URL is required' });
    }

    // Get or create article record
    let article = await Article.findOne({ url: articleUrl });
    if (!article) {
      article = await Article.create({ url: articleUrl, title: '', content: '' });
    }

    const existingLike = await Like.findOne({ articleUrl, userId });

    if (isLiked && !existingLike) {
      // Add like
      await Like.create({ articleId: article._id, articleUrl, userId });
    } else if (!isLiked && existingLike) {
      // Remove like
      await Like.deleteOne({ _id: existingLike._id });
    }

    // Get updated like count
    const likeCount = await Like.countDocuments({ articleUrl });

    res.json({
      success: true,
      likeCount,
      isLiked: isLiked
    });
  } catch (error) {
    console.error('Error liking article:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save/Unsave Article
router.post('/save', protect, async (req, res) => {
  try {
    const { articleUrl, isSaved } = req.body;
    const userId = req.user.id;

    if (!articleUrl) {
      return res.status(400).json({ error: 'Article URL is required' });
    }

    // Get or create article record
    let article = await Article.findOne({ url: articleUrl });
    if (!article) {
      article = await Article.create({ url: articleUrl, title: '', content: '' });
    }

    const existingSave = await Save.findOne({ articleUrl, userId });

    if (isSaved && !existingSave) {
      // Add save
      await Save.create({ articleId: article._id, articleUrl, userId });
    } else if (!isSaved && existingSave) {
      // Remove save
      await Save.deleteOne({ _id: existingSave._id });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving article:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Saved Articles
router.get('/saved', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const savedArticles = await Save.find({ userId })
      .populate('articleId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const articles = savedArticles.map(save => ({
      id: save.articleId._id,
      url: save.articleUrl,
      title: save.title || save.articleId.title,
      content: save.articleId.content,
      createdAt: save.createdAt
    }));

    res.json({ articles });
  } catch (error) {
    console.error('Error getting saved articles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Comments
router.get('/comments', protect, async (req, res) => {
  try {
    const { url } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!url) {
      return res.status(400).json({ error: 'Article URL is required' });
    }

    const comments = await Comment.find({ 
      articleUrl: url, 
      parentId: null 
    })
    .populate('userId', 'username email')
    .populate({
      path: 'replies',
      populate: {
        path: 'userId',
        select: 'username email'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.json({ comments });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add Comment
router.post('/comments', protect, async (req, res) => {
  try {
    const { articleUrl, comment, parentId } = req.body;
    const userId = req.user.id;

    if (!articleUrl || !comment) {
      return res.status(400).json({ error: 'Article URL and comment are required' });
    }

    // Get or create article record
    let article = await Article.findOne({ url: articleUrl });
    if (!article) {
      article = await Article.create({ url: articleUrl, title: '', content: '' });
    }

    const newComment = await Comment.create({
      articleId: article._id,
      articleUrl,
      userId,
      content: comment,
      parentId: parentId || null
    });

    // If this is a reply, add to parent's replies array
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $push: { replies: newComment._id }
      });
    }

    // Get updated comment count
    const commentCount = await Comment.countDocuments({ articleUrl });

    // Return the created comment with user info
    const commentWithUser = await Comment.findById(newComment._id)
      .populate('userId', 'username email');

    res.status(201).json({
      success: true,
      comment: commentWithUser,
      commentCount
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Comment
router.delete('/comments/:commentId', protect, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(commentId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
