const express = require("express");
const {
  deleteAccount,
  isEmailVerifiedStatus,
  changePassword
} = require("../controllers/authController");
const {
  editProfile,
  getUserProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const User = require("../models/User"); // Tambahkan ini di atas jika belum ada

const router = express.Router();

// Konfigurasi Multer untuk upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profile_images"); // pastikan folder ini ada
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------- Protected User Routes ----------
router.get("/profile", protect, async (req, res) => {
  try {
    res.status(200).json({
      user: {
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName,
        isEmailVerified: req.user.isEmailVerified,
        photoUrl: req.user.photoUrl, // tambahkan field ini
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
router.patch("/edit-profile", protect, editProfile);
router.post('/change-password', protect, changePassword);     // Ubah password
router.delete("/account", protect, deleteAccount);
router.get("/verified", protect, isEmailVerifiedStatus);
router.get("/articles", protect, async (req, res) => {
  try {
    const articles = await Article.find({ user: req.user.id });
    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
// Route upload foto profil
router.patch(
  "/profile/image",
  protect,
  upload.single("image"),
  async (req, res) => {
    try {
      // Buat URL lengkap
      const photoUrl = `${req.protocol}://${req.get('host')}/uploads/profile_images/${req.file.filename}`;

      // Update photoUrl user di database
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { photoUrl },
        { new: true }
      );

      res.status(200).json({
        message: "Foto profil berhasil diupload",
        imagePath: photoUrl,
        user: {
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoUrl,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Gagal upload foto profil" });
    }
  }
);

module.exports = router;
