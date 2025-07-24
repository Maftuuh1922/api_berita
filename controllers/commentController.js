const asyncHandler = require("express-async-handler");
const Comment = require("../models/Comment");
const ArticleInteraction = require("../models/ArticleInteraction");
const User = require("../models/User");

// ✅ GET all top-level comments for a specific article
const getCommentsForArticle = asyncHandler(async (req, res) => {
  const { articleIdentifier } = req.params;

  const comments = await Comment.find({
    articleIdentifier: decodeURIComponent(articleIdentifier),
    parentId: null,
  })
    .sort({ timestamp: -1 })
    .populate({
      path: "replies",
      model: "Comment",
      options: { sort: { timestamp: 1 } },
    })
    .lean();

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

// ✅ GET replies to a specific comment
const getRepliesForComment = asyncHandler(async (req, res) => {
  const { parentCommentId } = req.params;

  const replies = await Comment.find({ parentId: parentCommentId })
    .sort({ timestamp: 1 })
    .lean();

  if (req.user) {
    for (let reply of replies) {
      reply.isLiked = reply.likedBy.includes(req.user.id);
    }
  }

  res.json(replies);
});

const postComment = asyncHandler(async (req, res) => {
  const { articleIdentifier } = req.params;
  const { text } = req.body;
  const user = req.user;

  if (!user || !user._id) {
    res.status(401);
    throw new Error("User tidak terautentikasi");
  }

  if (!text || text.trim() === "") {
    res.status(400);
    throw new Error("Komentar tidak boleh kosong");
  }

  let decodedIdentifier;
  try {
    decodedIdentifier = decodeURIComponent(articleIdentifier);
  } catch (err) {
    res.status(400);
    throw new Error("Article identifier tidak valid.");
  }

  const now = new Date();

  const comment = await Comment.create({
    articleIdentifier: decodedIdentifier,
    author: user.displayName || user.email,
    authorPhoto: user.photoUrl,
    text,
    user: user._id,
    timestamp: now,
    likeCount: 0,
    likedBy: [],
    parentId: null,
  });

  res.status(201).json({
    ...comment.toObject(),
    replies: [],
    isLiked: false,
  });
});

// ✅ POST reply to comment
const postReply = asyncHandler(async (req, res) => {
  const { parentCommentId } = req.params;
  const { text } = req.body;
  const user = req.user;

  if (!text || text.trim() === "") {
    res.status(400);
    throw new Error("Balasan tidak boleh kosong");
  }

  const parentComment = await Comment.findById(parentCommentId);
  if (!parentComment) {
    res.status(404);
    throw new Error("Komentar induk tidak ditemukan");
  }

  const reply = await Comment.create({
    articleIdentifier: parentComment.articleIdentifier,
    author: user.displayName || user.email,
    authorPhoto: user.photoUrl,
    text,
    parentId: parentCommentId,
    user: user._id,
    timestamp: new Date(),
    likeCount: 0,
    likedBy: [],
  });

  res.status(201).json({
    ...reply.toObject(),
    isLiked: false,
  });
});

// ✅ Like/unlike comment
const likeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const user = req.user;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Komentar tidak ditemukan");
  }

  const userId = user._id;
  const hasLiked = comment.likedBy.includes(userId);

  if (hasLiked) {
    comment.likeCount = Math.max(0, comment.likeCount - 1);
    comment.likedBy = comment.likedBy.filter(
      (id) => id.toString() !== userId.toString()
    );
  } else {
    comment.likeCount += 1;
    comment.likedBy.push(userId);
  }

  await comment.save();

  res.json({
    message: hasLiked ? "Komentar tidak disukai" : "Komentar disukai",
    isLiked: !hasLiked,
    likeCount: comment.likeCount,
  });
});

// ✅ Like/unlike article
const likeArticle = asyncHandler(async (req, res) => {
  const { articleUrl } = req.params;
  const { isLiked } = req.body;
  const user = req.user;

  let interaction = await ArticleInteraction.findOne({
    user: user._id,
    articleUrl: decodeURIComponent(articleUrl),
  });

  if (!interaction) {
    interaction = await ArticleInteraction.create({
      user: user._id,
      articleUrl: decodeURIComponent(articleUrl),
      isLiked,
      isBookmarked: false,
    });
  } else {
    interaction.isLiked = isLiked;
    await interaction.save();
  }

  res.json({
    message: isLiked ? "Artikel disukai" : "Artikel tidak disukai",
    isLiked: interaction.isLiked,
  });
});

// ✅ Save/un-save article
const saveArticle = asyncHandler(async (req, res) => {
  const { articleUrl } = req.params;
  const { isSaved } = req.body;
  const user = req.user;

  let interaction = await ArticleInteraction.findOne({
    user: user._id,
    articleUrl: decodeURIComponent(articleUrl),
  });

  if (!interaction) {
    interaction = await ArticleInteraction.create({
      user: user._id,
      articleUrl: decodeURIComponent(articleUrl),
      isLiked: false,
      isBookmarked: isSaved,
    });
  } else {
    interaction.isBookmarked = isSaved;
    await interaction.save();
  }

  res.json({
    message: isSaved ? "Artikel disimpan" : "Artikel tidak disimpan",
    isSaved: interaction.isBookmarked,
  });
});

// ✅ Share article
const shareArticle = asyncHandler(async (req, res) => {
  const { articleUrl } = req.params;
  const user = req.user;

  let interaction = await ArticleInteraction.findOne({
    user: user ? user._id : null,
    articleUrl: decodeURIComponent(articleUrl),
  });

  if (interaction) {
    interaction.shareCount = (interaction.shareCount || 0) + 1;
    await interaction.save();
  } else if (user) {
    await ArticleInteraction.create({
      user: user._id,
      articleUrl: decodeURIComponent(articleUrl),
      shareCount: 1,
    });
  }

  res.json({ message: "Artikel berhasil dibagikan" });
});

// ✅ Get stats for article
const getArticleStats = asyncHandler(async (req, res) => {
  const { articleUrl } = req.params;
  const user = req.user;

  const interactions = await ArticleInteraction.find({
    articleUrl: decodeURIComponent(articleUrl),
  });

  const stats = {
    totalLikes: interactions.filter((i) => i.isLiked).length,
    totalSaves: interactions.filter((i) => i.isBookmarked).length,
    totalShares: interactions.reduce((sum, i) => sum + (i.shareCount || 0), 0),
  };

  if (user) {
    const userInteraction = interactions.find(
      (i) => i.user.toString() === user._id.toString()
    );
    stats.userLiked = userInteraction ? userInteraction.isLiked : false;
    stats.userSaved = userInteraction ? userInteraction.isBookmarked : false;
  }

  res.json(stats);
});

// ✅ Get saved articles by user
const getSavedArticles = asyncHandler(async (req, res) => {
  const user = req.user;

  const savedInteractions = await ArticleInteraction.find({
    user: user._id,
    isBookmarked: true,
  }).sort({ updatedAt: -1 });

  const savedArticles = savedInteractions.map((i) => ({
    articleUrl: i.articleUrl,
    savedAt: i.updatedAt,
  }));

  res.json(savedArticles);
});

// ✅ Update comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { text } = req.body;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Komentar tidak ditemukan");
  }

  if (comment.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Kamu tidak diizinkan mengedit komentar ini");
  }

  comment.text = text;
  await comment.save();

  res.json({ message: "Komentar berhasil diperbarui", comment });
});

// ✅ Delete comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Komentar tidak ditemukan");
  }

  if (comment.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Kamu tidak diizinkan menghapus komentar ini");
  }

  await Comment.deleteMany({ parentId: comment._id });
  await comment.deleteOne();

  res.json({ message: "Komentar berhasil dihapus" });
});

module.exports = {
  getCommentsForArticle,
  getRepliesForComment,
  postComment,
  postReply,
  likeComment,
  likeArticle,
  saveArticle,
  shareArticle,
  getArticleStats,
  getSavedArticles,
  updateComment,
  deleteComment,
};
