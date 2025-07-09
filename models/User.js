// file: models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    displayName: {
        type: String,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    // Field untuk OTP email verification
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationOTP: {
        type: String,
        default: null
    },
    emailVerificationOTPExpires: {
        type: Date,
        default: null
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    googleId: String,
    // Field tambahan untuk kompatibilitas
    photoUrl: {
        type: String,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index untuk performa
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ emailVerificationOTP: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.matchPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method untuk kompatibilitas dengan kode lama
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method untuk generate OTP
userSchema.methods.generateEmailVerificationOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
    this.emailVerificationOTP = otp;
    this.emailVerificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 menit
    return otp;
};

// Method untuk cek apakah OTP masih valid
userSchema.methods.isOTPValid = function(otp) {
    return this.emailVerificationOTP === otp && 
           this.emailVerificationOTPExpires > Date.now();
};

// Method untuk clear OTP
userSchema.methods.clearOTP = function() {
    this.emailVerificationOTP = undefined;
    this.emailVerificationOTPExpires = undefined;
};

// HANYA EKSPOR MODEL USER DI SINI
module.exports = mongoose.model('User', userSchema);