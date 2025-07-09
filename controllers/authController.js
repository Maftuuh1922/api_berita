// file: controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// --- Helper Functions ---
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const cookieExpire = process.env.JWT_COOKIE_EXPIRE || 30;
    const options = {
        expires: new Date(Date.now() + cookieExpire * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
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
        }
    });
};

const registerUser = (req, res) => { /* ... */ };
const loginUser = (req, res) => { /* ... */ };
const googleAuth = (req, res) => { /* ... */ };
const getUserProfile = (req, res) => { /* ... */ };
const updateUserProfile = (req, res) => { /* ... */ };
const deleteAccount = (req, res) => { /* ... */ };
const resendVerificationEmail = (req, res) => { /* ... */ };
const verifyEmail = (req, res) => { /* ... */ };
const isEmailVerifiedStatus = (req, res) => { /* ... */ };
const resetPassword = (req, res) => { /* ... */ };
const changePassword = (req, res) => { /* ... */ };
const checkEmailExists = (req, res) => { /* ... */ };
const checkDisplayNameExists = (req, res) => { /* ... */ };
const logoutUser = (req, res) => { /* ... */ };
const refreshToken = (req, res) => { /* ... */ };

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