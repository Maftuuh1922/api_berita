// file: routes/authRoutes.js
const express = require('express');
const {
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
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ---------- Public Routes ----------
router.post('/register', registerUser); // Daftar baru
router.post('/registerUser', registerUser); // Endpoint tambahan untuk pendaftaran user
router.post('/login', loginUser);       // Login pengguna
router.post('/google', googleAuth);     // Login dengan Google

router.post('/resend', resendVerificationEmail);  // Kirim ulang OTP
router.post('/verify', verifyEmail);              // Verifikasi email via OTP
router.post("/check-expiry", checkOtpExpiry); // Cek apakah OTP sudah kadaluarsa


router.post('/reset-password', resetPassword);    // Reset password
router.post('/check-email', checkEmailExists);    // Cek email apakah sudah terdaftar
router.post('/check-displayname', checkDisplayNameExists); // (Opsional, tergantung pemakaian)
router.post('/refresh', refreshToken);            // Refresh access token

// ---------- Protected Routes ----------
router.delete('/account', protect, deleteAccount);            // Hapus akun
router.post('/change-password', protect, changePassword);     // Ubah password
router.get('/verified', protect, isEmailVerifiedStatus);      // Cek status verifikasi email
router.post('/logout', protect, logoutUser);                  // Logout

module.exports = router;
