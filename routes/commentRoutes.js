const express = require('express');
const router = express.Router();
const {
  getCommentsForArticle,
  postComment,
  postReply,
  likeComment,
  likeArticle,
  saveArticle,
  shareArticle,
} = require('../controllers/commentController');

// Middleware untuk autentikasi (pastikan middleware ini ada)
const { protect } = require('../middleware/authMiddleware');

// Comment routes
router.route('/articles/:articleIdentifier/comments')
  .get(getCommentsForArticle)      // GET /api/articles/:articleIdentifier/comments
  .post(protect, postComment);     // POST /api/articles/:articleIdentifier/comments

// Reply routes
router.route('/comments/:parentCommentId/replies')
  .post(protect, postReply);       // POST /api/comments/:parentCommentId/replies

// Like comment
router.route('/comments/:commentId/like')
  .post(protect, likeComment);     // POST /api/comments/:commentId/like

// Article interaction routes
router.route('/articles/:articleUrl/like')
  .post(protect, likeArticle);     // POST /api/articles/:articleUrl/like

router.route('/articles/:articleUrl/save')
  .post(protect, saveArticle);     // POST /api/articles/:articleUrl/save

router.route('/articles/:articleUrl/share')
  .post(protect, shareArticle);    // POST /api/articles/:articleUrl/share

module.exports = router;