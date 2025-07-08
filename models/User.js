// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = mongoose.Schema(
  {
    displayName: {
      type: String,
      // Hapus 'required: [true, 'Nama tampilan wajib diisi']' dari sini
    },
    email: {
      type: String,
      required: [true, 'Email wajib diisi'],
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Silakan masukkan email yang valid',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password wajib diisi'],
      minlength: 6,
      select: false,
    },
    photoUrl: {
      type: String,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enkripsi password sebelum menyimpan
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) { // Tambahkan !this.password check
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Metode untuk membandingkan password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Metode untuk membuat JWT
UserSchema.methods.getSignedJwtToken = function () {
  const payload = {
    id: this._id,
    email: this.email,
    displayName: this.displayName,
    photoUrl: this.photoUrl,
    verified: this.isEmailVerified,
    createdAt: this.createdAt ? this.createdAt.toISOString() : null,
    lastLogin: new Date().toISOString(),
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};

// Metode untuk membuat refresh token
UserSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Metode untuk membuat kode verifikasi email
UserSchema.methods.getEmailVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationCode = code;
  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
  return code;
};

// Metode untuk membuat token reset password
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = require('crypto').randomBytes(20).toString('hex');
  this.resetPasswordToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model('User', UserSchema);