// file: controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

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

const pendingUsers = new Map();
const bcrypt = require("bcryptjs");

// Fungsi untuk generate OTP, bisa juga pakai method User
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Semua field harus diisi" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password minimal 8 karakter" });
    }

    // Cek email dan username di database
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    const usernameTaken = await User.findOne({ username: username.trim() });
    if (usernameTaken) {
      return res.status(400).json({ message: "Username sudah dipakai" });
    }

    // Generate OTP manual (4–6 digit)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 1 * 60 * 1000; // 1 menit

    // Simpan ke Map sementara
    pendingUsers.set(email.toLowerCase(), {
      username: username.trim(),
      email: email.toLowerCase(),
      password: password,
      displayName: username.trim(),
      otp,
      expiresAt,
    });

    // Kirim email OTP
    await sendEmail({
      to: email,
      subject: "Verifikasi Email Anda",
      text: `Kode OTP Anda adalah: ${otp}`,
      html: `<p>Halo ${username},</p>
         <p>Berikut kode OTP untuk verifikasi email:</p>
         <h2>${otp}</h2>
         <p>OTP ini berlaku selama 1 menit.</p>`,
    });

    return res.status(200).json({
      success: true,
      message: "Kode OTP telah dikirim ke email Anda.",
      email: email,
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
const deleteAccount = (req, res) => {
  /* ... */
};
const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;

  try {
    // Ambil data pending user dari Map
    const pending = pendingUsers.get(email?.toLowerCase());

    if (!pending) {
      return res.status(404).json({ message: "Data pendaftaran tidak ditemukan atau sudah kadaluarsa" });
    }

    // Generate OTP baru
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 1 * 60 * 1000; // 1 menit

    // Update OTP dan expiry di pendingUsers
    pending.otp = otp;
    pending.expiresAt = expiresAt;
    pendingUsers.set(email.toLowerCase(), pending);

    // Kirim email OTP baru
    await sendEmail({
      to: email,
      subject: "Verifikasi Email Anda",
      text: `Kode OTP Anda adalah: ${otp}`,
      html: `<p>Halo ${pending.username},</p>
         <p>Berikut kode OTP untuk verifikasi email:</p>
         <h2>${otp}</h2>
         <p>OTP ini berlaku selama 1 menit.</p>`,
    });

    res.status(200).json({ message: "OTP dikirim ulang", expiresAt });
  } catch (err) {
    console.error("Gagal mengirim OTP:", err);
    res.status(500).json({ message: "Gagal mengirim OTP ulang" });
  }
};

const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const pending = pendingUsers.get(email?.toLowerCase());

    if (!pending) {
      return res.status(404).json({
        message: "Data pendaftaran tidak ditemukan atau sudah kadaluarsa",
      });
    }

    if (pending.otp !== otp || Date.now() > pending.expiresAt) {
      return res
        .status(400)
        .json({ message: "OTP tidak valid atau kadaluarsa" });
    }

    // Simpan user ke database
    const user = new User({
      username: pending.username,
      email: pending.email,
      password: pending.password,
      displayName: pending.displayName,
      isEmailVerified: true,
    });

    await user.save();

    // Hapus dari cache setelah berhasil
    pendingUsers.delete(email.toLowerCase());

    return res.status(201).json({
      success: true,
      message: "Email berhasil diverifikasi. Akun Anda telah dibuat.",
    });
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

const checkOtpExpiry = (req, res) => {
  const { email } = req.body;

  const pending = pendingUsers.get(email?.toLowerCase());

  if (!pending) {
    return res
      .status(404)
      .json({ message: "OTP tidak ditemukan atau sudah kadaluarsa" });
  }

  return res.status(200).json({
    success: true,
    email: pending.email,
    expiresAt: pending.expiresAt,
  });
};

const resetPassword = (req, res) => {
  /* ... */
};
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // diasumsikan sudah diisi oleh middleware protect
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Password lama dan baru wajib diisi" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password baru minimal 8 karakter" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password lama salah" });
    }

    user.password = newPassword; // Tidak perlu hash manual
    await user.save();

    res.status(200).json({ success: true, message: "Password berhasil diubah" });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengganti password", error: error.message });
  }
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
  deleteAccount,
  resendVerificationEmail,
  verifyEmail,
  isEmailVerifiedStatus,
  checkOtpExpiry,
  resetPassword,
  changePassword,
  checkEmailExists,
  checkDisplayNameExists,
  logoutUser,
  refreshToken,
};
