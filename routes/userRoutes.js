const express = require('express');
const {
    deleteAccount,
    isEmailVerifiedStatus,
} = require('../controllers/authController');
const { editProfile, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ---------- Protected User Routes ----------
router.get('/profile', protect, getUserProfile);
router.patch('/edit-profile', protect, editProfile);
router.delete('/account', protect, deleteAccount);
router.get('/verified', protect, isEmailVerifiedStatus);

module.exports = router;
