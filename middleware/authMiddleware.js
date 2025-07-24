const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];

    // Validasi token kosong/null/undefined
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ message: 'Token tidak valid' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User tidak ditemukan' });
      }

      next();
    } catch (error) {
      console.error('Auth Error:', error);

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token kadaluarsa. Silakan login ulang.' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token tidak valid' });
      }

      return res.status(401).json({ message: 'Tidak terotorisasi' });
    }
  } else {
    return res.status(401).json({ message: 'Token diperlukan' });
  }
});

module.exports = { protect };