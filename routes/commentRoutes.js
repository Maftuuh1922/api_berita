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
  updateComment,
  deleteComment,
  getRepliesForComment
} = require('../controllers/commentController');

const { protect } = require('../middleware/authMiddleware');

// ======================
// 📌 Comment Routes
// ======================

// Ambil semua komentar untuk artikel
router.get('/articles/:articleIdentifier/comments', getCommentsForArticle);

// Kirim komentar ke artikel
router.post('/articles/:articleIdentifier/comments', protect, postComment);

// Edit komentar
router.put('/comments/:commentId', protect, updateComment);

// Hapus komentar
router.delete('/comments/:commentId', protect, deleteComment);

// ======================
// 📌 Reply Routes
// ======================

// Balas komentar
router.post('/comments/:parentCommentId/replies', protect, postReply);
router.get('/comments/:parentCommentId/replies', getRepliesForComment);

// ======================
// 📌 Interaksi Komentar
// ======================

// Like komentar
router.post('/comments/:commentId/like', protect, likeComment);

// ======================
// 📌 Interaksi Artikel
// ======================

// Like artikel
router.post('/articles/:articleUrl/like', protect, likeArticle);

// Save artikel
router.post('/articles/:articleUrl/save', protect, saveArticle);

// Share artikel
router.post('/articles/:articleUrl/share', protect, shareArticle);

module.exports = router;
