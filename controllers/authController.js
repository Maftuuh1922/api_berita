// file: controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// --- Helper Functions ---
const sendTokenResponse = (user, statusCode, res, message = "Success") => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const cookieExpire = process.env.JWT_COOKIE_EXPIRE || 30;
  const options = {
    expires: new Date(Date.now() + cookieExpire * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.status(statusCode).json({
    success: true,
    message: message,
    token,
    refreshToken,
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
};

const bcrypt = require("bcryptjs");

// Fungsi untuk generate OTP, bisa juga pakai method User
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validasi input dasar
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Semua field harus diisi" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password minimal 8 karakter" });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    // Cek apakah username sudah dipakai
    const usernameTaken = await User.findOne({ username: username.trim() });
    if (usernameTaken) {
      return res.status(400).json({ message: "Username sudah dipakai" });
    }

    // Buat user baru
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase(),
      password,
      displayName: username.trim(), // displayName otomatis = username
      isEmailVerified: false,
    });

    // Generate OTP dan simpan ke user
    const otp = user.generateEmailVerificationOTP();

    await user.save();

    // TODO: Kirim OTP ke email user via email service (SMTP, SendGrid, Mailgun, dll)

    return res.status(201).json({
      success: true,
      message: "Registrasi berhasil. Silakan cek email untuk verifikasi.",
      email: user.email,
    });
  } catch (err) {
    console.error("[Register Error]", err);
    return res.status(500).json({
      message: "Terjadi kesalahan server. Coba lagi nanti.",
    });
  }
};


const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Cek apakah user ada
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Email atau password salah" });
    }

    // Cek password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Email atau password salah" });
    }

    // Kirim response dengan token
    sendTokenResponse(user, 200, res, "Login berhasil");
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Gagal login", error: error.message });
  }
};

const googleAuth = (req, res) => {
  /* ... */
};
const getUserProfile = (req, res) => {
  /* ... */
};
const updateUserProfile = (req, res) => {
  /* ... */
};
const deleteAccount = (req, res) => {
  /* ... */
};
const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email sudah diverifikasi" });
    }

    const newOTP = user.generateEmailVerificationOTP();
    await user.save();

    // TODO: Kirim ulang OTP via email (SMTP / SendGrid)
    console.log(`OTP untuk ${email}: ${newOTP}`);

    return res
      .status(200)
      .json({
        success: true,
        message: "OTP telah dikirim ulang ke email Anda",
      });
  } catch (error) {
    console.error("[Resend OTP Error]", error);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan server. Coba lagi nanti." });
  }
};

const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    if (!otp || !user.isOTPValid(otp)) {
      return res
        .status(400)
        .json({ message: "OTP tidak valid atau kadaluarsa" });
    }

    user.isEmailVerified = true;
    user.clearOTP();
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Email berhasil diverifikasi" });
  } catch (error) {
    console.error("[Verify Email Error]", error);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan server. Coba lagi nanti." });
  }
};

const isEmailVerifiedStatus = (req, res) => {
  const { email } = req.body;

  User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      return res.status(200).json({ isEmailVerified: user.isEmailVerified });
    })
    .catch((error) => {
      console.error("[Check Email Verified Status Error]", error);
      return res
        .status(500)
        .json({ message: "Terjadi kesalahan server. Coba lagi nanti." });
    });
};

const resetPassword = (req, res) => {
  /* ... */
};
const changePassword = (req, res) => {
  /* ... */
};
const checkEmailExists = (req, res) => {
  /* ... */
};
const checkDisplayNameExists = (req, res) => {
  /* ... */
};
const logoutUser = (req, res) => {
  /* ... */
};
const refreshToken = (req, res) => {
  /* ... */
};

module.exports = {
  registerUser,
  loginUser,
  googleAuth,
  getUserProfile,
  updateUserProfile,
  deleteAccount,
  resendVerificationEmail,
  verifyEmail,
  isEmailVerifiedStatus,
  resetPassword,
  changePassword,
  checkEmailExists,
  checkDisplayNameExists,
  logoutUser,
  refreshToken,
};
