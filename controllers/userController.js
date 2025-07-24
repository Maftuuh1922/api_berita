const User = require("../models/User");
const bcrypt = require("bcryptjs");
const fs = require('fs');
const uploadDir = 'uploads/profile_images';
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, { recursive: true });
}


const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // diasumsikan sudah diisi oleh middleware protect
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data profil", error: error.message });
  }
};

const editProfile = async (req, res) => {
  try {
    const { username, displayName } = req.body;

    // Update username dan displayName
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, displayName },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui profil", error: error.message });
  }
};

module.exports = { editProfile, getUserProfile };
