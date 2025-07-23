const User = require("../models/User");
const bcrypt = require("bcryptjs");


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

// Edit profil: displayName dan password
const editProfile = async (req, res) => {
  try {
    const userId = req.user.id; // diasumsikan middleware protect sudah menambahkan req.user
    const { displayName, password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (displayName) {
      user.displayName = displayName;
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: "Password minimal 8 karakter" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui",
      user: {
        id: user._id,
        email: user.email,
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
