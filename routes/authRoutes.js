// file: routes/authRoutes.js
const express = require('express');
const {
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
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ---------- Public Routes ----------
router.post('/register', registerUser); // Daftar baru
router.post('/login', loginUser);       // Login pengguna
router.post('/google', googleAuth);     // Login dengan Google

router.post('/resend', resendVerificationEmail);  // Kirim ulang OTP
router.post('/verify', verifyEmail);              // Verifikasi email via OTP

router.post('/reset-password', resetPassword);    // Reset password
router.post('/check-email', checkEmailExists);    // Cek email apakah sudah terdaftar
router.post('/check-displayname', checkDisplayNameExists); // (Opsional, tergantung pemakaian)
router.post('/refresh', refreshToken);            // Refresh access token

// ---------- Protected Routes ----------
router.get('/profile', protect, getUserProfile);              // Lihat profil
router.patch('/profile', protect, updateUserProfile);         // Update profil
router.delete('/account', protect, deleteAccount);            // Hapus akun
router.post('/change-password', protect, changePassword);     // Ubah password
router.get('/verified', protect, isEmailVerifiedStatus);      // Cek status verifikasi email
router.post('/logout', protect, logoutUser);                  // Logout

module.exports = router;
