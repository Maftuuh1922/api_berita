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

// Debug: cek tipe handler
console.log({
    registerUser: typeof registerUser,
    loginUser: typeof loginUser,
    googleAuth: typeof googleAuth,
    getUserProfile: typeof getUserProfile,
    updateUserProfile: typeof updateUserProfile,
    deleteAccount: typeof deleteAccount,
    resendVerificationEmail: typeof resendVerificationEmail,
    verifyEmail: typeof verifyEmail,
    isEmailVerifiedStatus: typeof isEmailVerifiedStatus,
    resetPassword: typeof resetPassword,
    changePassword: typeof changePassword,
    checkEmailExists: typeof checkEmailExists,
    checkDisplayNameExists: typeof checkDisplayNameExists,
    logoutUser: typeof logoutUser,
    refreshToken: typeof refreshToken,
});

const { protect } = require('../middleware/authMiddleware'); // Pastikan nama file middleware sudah benar

const router = express.Router();

// Public routes (akan memiliki prefix /api/auth dari server.js)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth); // <--- Tanpa /auth di sini
router.post('/resend', resendVerificationEmail); // <--- Tanpa /auth di sini
router.post('/verify', verifyEmail); // <--- Tanpa /auth di sini
router.post('/reset-password', resetPassword); // <--- Tanpa /auth di sini
router.post('/check-email', checkEmailExists);
router.post('/check-displayname', checkDisplayNameExists);
router.post('/refresh', refreshToken);

// Protected routes (require JWT)
router.get('/profile', protect, getUserProfile);
router.patch('/profile', protect, updateUserProfile);
router.delete('/account', protect, deleteAccount);
router.post('/change-password', protect, changePassword); // <--- Tanpa /auth di sini
router.get('/verified', protect, isEmailVerifiedStatus); // <--- Tanpa /auth di sini
router.post('/logout', protect, logoutUser); // <--- Tanpa /auth di sini

module.exports = router;