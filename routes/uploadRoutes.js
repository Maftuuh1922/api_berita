const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User'); // Import User model

const router = express.Router();

// Konfigurasi storage untuk Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Gambar akan disimpan di folder 'uploads' di root project
  },
  filename: (req, file, cb) => {
    // Buat nama file unik: userId-timestamp.ext
    const extname = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${extname}`);
  },
});

// Filter file untuk hanya mengizinkan gambar
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Batasi ukuran file hingga 5MB
});

// @desc    Upload profile image
// @route   POST /api/upload-profile-image
// @access  Private
router.post('/upload-profile-image', protect, upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Tidak ada file gambar yang diunggah.');
  }

  const user = await User.findById(req.user.id);
  if (user) {
    // Simpan path gambar di database
    // Contoh: http://localhost:5000/uploads/gambar.jpg
    user.photoUrl = `/uploads/${req.file.filename}`;
    await user.save({ validateBeforeSave: false }); // Hindari hashing password lagi

    res.json({
      message: 'Unggah gambar profil berhasil',
      imageUrl: user.photoUrl,
    });
  } else {
    res.status(404);
    throw new Error('User tidak ditemukan');
  }
});

module.exports = router;