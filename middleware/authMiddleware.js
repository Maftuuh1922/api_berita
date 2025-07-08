const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler'); // Helper for async routes
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user from token payload (excluding password)
      req.user = await User.findById(decoded.id).select('-password');

      // Check if user exists (edge case if user deleted after token issued)
      if (!req.user) {
        res.status(401);
        throw new Error('Tidak terotorisasi, user tidak ditemukan');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token kadaluarsa. Silakan login ulang.');
      }
      throw new Error('Tidak terotorisasi, token gagal');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Tidak terotorisasi, tidak ada token');
  }
});

module.exports = { protect };