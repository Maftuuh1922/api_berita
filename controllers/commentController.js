const asyncHandler = require('express-async-handler');
const Comment = require('../models/Comment');
const ArticleInteraction = require('../models/ArticleInteraction');
const User = require('../models/User'); // Import User model

// @desc    Get comments for a specific article
// @route   GET /api/articles/:articleIdentifier/comments
// @access  Public
const getCommentsForArticle = asyncHandler(async (req, res) => {
  const { articleIdentifier } = req.params;

  // Find top-level comments and populate their replies
  const comments = await Comment.find({
    articleIdentifier: decodeURIComponent(articleIdentifier),
    parentId: null, // Only fetch top-level comments
  })
    .sort({ timestamp: -1 }) // Newest first
    .populate({
      path: 'replies', // Populate replies
      model: 'Comment',
      options: { sort: { timestamp: 1 } }, // Oldest replies first
    })
    .lean(); // Return plain JavaScript objects for easier modification

  // Check if comments are liked by the current user if authenticated
  if (req.user) {
    for (let comment of comments) {
      comment.isLiked = comment.likedBy.includes(req.user.id);
      for (let reply of comment.replies) {
        reply.isLiked = reply.likedBy.includes(req.user.id);
      }
    }
  }

  res.json(comments);
});

// @desc    Post a new comment to an article
// @route   POST /api/articles/:articleIdentifier/comments
// @access  Private
const postComment = asyncHandler(async (req, res) => {
  const { articleIdentifier } = req.params;
  const { text } = req.body;
  const user = req.user; // User from JWT

  if (!user) {
    res.status(401);
    throw new Error('Tidak terotorisasi, silakan login');
  }

  if (!text || text.trim() === '') {
    res.status(400);
    throw new Error('Komentar tidak boleh kosong');
  }

  const comment = await Comment.create({
    articleIdentifier: decodeURIComponent(articleIdentifier),
    author: user.displayName || user.email, // Use display name or email from authenticated user
    authorPhoto: user.photoUrl,
    text,
    user: user._id, // Link comment to user
    timestamp: new Date(),
  });

  res.status(201).json(comment);
});

// @desc    Post a reply to a comment
// @route   POST /api/comments/:parentCommentId/replies
// @access  Private
const postReply = asyncHandler(async (req, res) => {
  const { parentCommentId } = req.params;
  const { text } = req.body;
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Tidak terotorisasi, silakan login');
  }

  if (!text || text.trim() === '') {
    res.status(400);
    throw new Error('Balasan tidak boleh kosong');
  }

  const parentComment = await Comment.findById(parentCommentId);
  if (!parentComment) {
    res.status(404);
    throw new Error('Komentar induk tidak ditemukan');
  }

  const reply = await Comment.create({
    articleIdentifier: parentComment.articleIdentifier, // Inherit article ID from parent
    author: user.displayName || user.email,
    authorPhoto: user.photoUrl,
    text,
    parentId: parentCommentId, // Link to parent comment
    user: user._id,
    timestamp: new Date(),
  });

  res.status(201).json(reply);
});

// @desc    Like/Unlike a comment
// @route   POST /api/comments/:commentId/like
// @access  Private
const likeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Tidak terotorisasi, silakan login');
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404);
    throw new Error('Komentar tidak ditemukan');
  }

  const userId = user._id;

  // Check if user already liked the comment
  const hasLiked = comment.likedBy.includes(userId);

  if (hasLiked) {
    // Unlike
    comment.likeCount = Math.max(0, comment.likeCount - 1); // Ensure not negative
    comment.likedBy = comment.likedBy.filter(id => id.toString() !== userId.toString());
    await comment.save();
    res.json({ message: 'Komentar tidak disukai', isLiked: false, likeCount: comment.likeCount });
  } else {
    // Like
    comment.likeCount += 1;
    comment.likedBy.push(userId);
    await comment.save();
    res.json({ message: 'Komentar disukai', isLiked: true, likeCount: comment.likeCount });
  }
});


// @desc    Like/Unlike an article
// @route   POST /api/articles/:articleUrl/like
// @access  Private
const likeArticle = asyncHandler(async (req, res) => {
  const { articleUrl } = req.params;
  const { isLiked } = req.body; // Flutter sends this state directly
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Tidak terotorisasi, silakan login');
  }

  let interaction = await ArticleInteraction.findOne({
    user: user._id,
    articleUrl: decodeURIComponent(articleUrl),
  });

  if (!interaction) {
    // Create new interaction if it doesn't exist
    interaction = await ArticleInteraction.create({
      user: user._id,
      articleUrl: decodeURIComponent(articleUrl),
      isLiked: isLiked,
      isBookmarked: false, // Default for other fields
    });
  } else {
    // Update existing interaction
    interaction.isLiked = isLiked;
    await interaction.save();
  }

  // Optionally update aggregate like count for the article (if you implement it)
  // For simplicity, this endpoint only tracks user's like status.
  // Aggregate count could be a separate collection or managed by a more complex system.

  res.json({
    message: isLiked ? 'Artikel disukai' : 'Artikel tidak disukai',
    isLiked: interaction.isLiked,
  });
});

// @desc    Save/Unsave an article (bookmark)
// @route   POST /api/articles/:articleUrl/save
// @access  Private
const saveArticle = asyncHandler(async (req, res) => {
  const { articleUrl } = req.params;
  const { isSaved } = req.body; // Flutter sends this state directly
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Tidak terotorisasi, silakan login');
  }

  let interaction = await ArticleInteraction.findOne({
    user: user._id,
    articleUrl: decodeURIComponent(articleUrl),
  });

  if (!interaction) {
    // Create new interaction if it doesn't exist
    interaction = await ArticleInteraction.create({
      user: user._id,
      articleUrl: decodeURIComponent(articleUrl),
      isLiked: false, // Default for other fields
      isBookmarked: isSaved,
    });
  } else {
    // Update existing interaction
    interaction.isBookmarked = isSaved;
    await interaction.save();
  }

  res.json({
    message: isSaved ? 'Artikel disimpan' : 'Artikel tidak disimpan',
    isSaved: interaction.isBookmarked,
  });
});

// @desc    Share an article (log the action)
// @route   POST /api/articles/:articleUrl/share
// @access  Private (or Public, depending on logging needs)
const shareArticle = asyncHandler(async (req, res) => {
  const { articleUrl } = req.params;
  const user = req.user; // User may or may not be authenticated

  // For simplicity, we just send a success response.
  // In a real app, you might log this action, increment a share count, etc.
  console.log(`Article shared: ${decodeURIComponent(articleUrl)} by user ${user ? user.id : 'guest'}`);

  let interaction = await ArticleInteraction.findOne({
    user: user ? user._id : null, // If guest, maybe don't record or use a default guest ID
    articleUrl: decodeURIComponent(articleUrl),
  });

  if (interaction) {
    interaction.shareCount = (interaction.shareCount || 0) + 1;
    await interaction.save();
  } else if (user) { // Only create interaction if user is logged in
    await ArticleInteraction.create({
      user: user._id,
      articleUrl: decodeURIComponent(articleUrl),
      shareCount: 1,
    });
  }

  res.json({ message: 'Artikel berhasil dibagikan' });
});

// @desc    Get article statistics (likes, saves, shares)
// @route   GET /api/articles/:articleUrl/stats
// @access  Public
const getArticleStats = asyncHandler(async (req, res) => {
  const { articleUrl } = req.params;
  const user = req.user; // May be null if not authenticated

  // Aggregate stats for the article
  const interactions = await ArticleInteraction.find({
    articleUrl: decodeURIComponent(articleUrl),
  });

  const stats = {
    totalLikes: interactions.filter(i => i.isLiked).length,
    totalSaves: interactions.filter(i => i.isBookmarked).length,
    totalShares: interactions.reduce((sum, i) => sum + (i.shareCount || 0), 0),
  };

  // If user is authenticated, include their personal interaction status
  if (user) {
    const userInteraction = interactions.find(i => i.user.toString() === user._id.toString());
    stats.userLiked = userInteraction ? userInteraction.isLiked : false;
    stats.userSaved = userInteraction ? userInteraction.isBookmarked : false;
  }

  res.json(stats);
});

// @desc    Get user's saved articles
// @route   GET /api/user/saved-articles
// @access  Private
const getSavedArticles = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Tidak terotorisasi, silakan login');
  }

  const savedInteractions = await ArticleInteraction.find({
    user: user._id,
    isBookmarked: true,
  }).sort({ updatedAt: -1 });

  const savedArticles = savedInteractions.map(interaction => ({
    articleUrl: interaction.articleUrl,
    savedAt: interaction.updatedAt,
  }));

  res.json(savedArticles);
});

module.exports = {
  getCommentsForArticle,
  postComment,
  postReply,
  likeComment,
  likeArticle,
  saveArticle,
  shareArticle,
  getArticleStats,
  getSavedArticles,
};