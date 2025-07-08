// file: controllers/authController.js
const asyncHandler = require('express-async-handler'); // Pastikan Anda sudah menginstal express-async-handler
const User = require('../models/User'); // Pastikan path ke model User benar
const ErrorResponse = require('../utils/errorResponse'); // Asumsikan Anda memiliki utilitas ErrorResponse
const sendEmail = require('../utils/sendEmail'); // Asumsikan Anda memiliki utilitas sendEmail
const jwt = require('jsonwebtoken'); // Import JWT
const { OAuth2Client } = require('google-auth-library'); // Untuk memverifikasi token Google di backend
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Inisialisasi client Google OAuth2

// --- Helper Functions ---

// Helper function untuk mengirim token JWT dalam response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = user.getSignedJwtToken();
    const refreshToken = user.getRefreshToken(); // Jika Anda ingin menggunakan refresh token

    // Opsi cookie (opsional, bisa juga dikirim di body JSON)
    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000), // Misalnya 30 hari
        httpOnly: true, // Tidak bisa diakses oleh JavaScript di browser
        secure: process.env.NODE_ENV === 'production' // Hanya kirim via HTTPS di produksi
    };

    // Jika Anda ingin mengirim token di cookie (untuk web), gunakan ini:
    // res.status(statusCode).cookie('token', token, options).json({...});
    // Karena Anda sepertinya menggunakan Flutter, mengirim di body JSON lebih umum.

    res.status(statusCode).json({
        success: true,
        message: message,
        token,
        refreshToken, // Kirim refresh token juga jika digunakan
        user: {
            id: user._id,
            email: user.email,
            displayName: user.displayName,
            photoUrl: user.photoUrl,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin, // Gunakan user.lastLogin yang sudah diupdate
        }
    });
};

// --- Authentication Controllers ---

// @desc    Register new user
// @route   POST /api/v1/auth/register (disarankan menggunakan /api/auth/register jika konsisten)
// @access  Public
exports.registerUser = asyncHandler(async (req, res, next) => {
    const { displayName, email, password } = req.body;

    // Validasi input
    if (!displayName || !email || !password) {
        throw new ErrorResponse('Semua field harus diisi', 400);
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        throw new ErrorResponse('Email sudah terdaftar', 400);
    }

    // Create user
    const user = await User.create({
        displayName,
        email,
        password, // Password akan di-hash oleh pre-save hook di model User
        isEmailVerified: false // Default false, akan diverifikasi via email
    });

    // Generate email verification code
    const verificationCode = user.getEmailVerificationCode();
    await user.save({ validateBeforeSave: false }); // Simpan tanpa memicu pre-save hook untuk password lagi

    let emailSent = false;
    try {
        // Buat URL verifikasi (ganti dengan URL frontend Anda)
        // Saya asumsikan Anda ingin menggunakan URL ini di Flutter
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verificationCode}&email=${user.email}`;

        await sendEmail({
            to: user.email,
            subject: 'Verifikasi Email Akun Aplikasi Berita Anda',
            text: `Halo ${user.displayName},\n\nTerima kasih telah mendaftar di Aplikasi Berita. Untuk mengaktifkan akun Anda, silakan masukkan kode verifikasi berikut di aplikasi Anda: ${verificationCode}\n\nAtau klik link ini: ${verificationUrl}\n\nKode ini akan kadaluarsa dalam 10 menit.\n\nSalam,\nTim Aplikasi Berita`,
            html: `<p>Halo ${user.displayName},</p><p>Terima kasih telah mendaftar di Aplikasi Berita. Untuk mengaktifkan akun Anda, silakan masukkan kode verifikasi berikut di aplikasi Anda:</p><h2>${verificationCode}</h2><p>Atau klik <a href="${verificationUrl}">link ini</a> untuk memverifikasi email Anda.</p><p>Kode ini akan kadaluarsa dalam 10 menit.</p><p>Salam,</p><p>Tim Aplikasi Berita</p>`,
        });
        emailSent = true;
    } catch (err) {
        console.error('Error sending verification email:', err);
        // Hapus user jika email verifikasi gagal terkirim (opsional, tergantung kebijakan Anda)
        await user.deleteOne();
        throw new ErrorResponse('Email verifikasi tidak dapat dikirim. Silakan coba lagi.', 500);
    }

    res.status(201).json({
        success: true,
        message: 'Registrasi berhasil. Email verifikasi telah dikirim.',
        emailSent: emailSent,
        userId: user._id, // Return user ID if needed by frontend
    });
});

// @desc    Auth user & get token
// @route   POST /api/v1/auth/login (disarankan menggunakan /api/auth/login)
// @access  Public
exports.loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
        throw new ErrorResponse('Email dan password harus diisi', 400);
    }

    // Check for user email, dan sertakan password karena 'select: false'
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        throw new ErrorResponse('Kredensial tidak valid', 401);
    }

    // Bandingkan password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        throw new ErrorResponse('Kredensial tidak valid', 401);
    }

    // Cek apakah email sudah diverifikasi
    if (!user.isEmailVerified) {
        throw new ErrorResponse('Silakan verifikasi email Anda terlebih dahulu.', 401);
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false }); // Simpan tanpa memicu pre-save hook untuk password lagi

    // Jika semua valid, kirim token
    sendTokenResponse(user, 200, res, 'Login berhasil');
});

// @desc    Google login/register
// @route   POST /api/v1/auth/google (disarankan menggunakan /api/auth/google)
// @access  Public
exports.googleLogin = asyncHandler(async (req, res, next) => {
    const { token } = req.body; // This token is the Google ID Token from Flutter

    if (!token) {
        throw new ErrorResponse('Token Google tidak ditemukan', 400);
    }

    let payload;
    try {
        // VERIFIKASI TOKEN GOOGLE DI SISI SERVER (PENTING UNTUK PRODUKSI!)
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, // Ganti dengan Client ID aplikasi Anda
        });
        payload = ticket.getPayload();

    } catch (verifyError) {
        console.error('Google ID Token Verification Error:', verifyError);
        throw new ErrorResponse('Autentikasi Google gagal: Token tidak valid', 401);
    }

    const { email, name: displayName, picture: photoUrl, sub: googleId } = payload;

    if (!email) {
        throw new ErrorResponse('Email tidak ditemukan di token Google', 400);
    }

    let user = await User.findOne({ email });

    if (user) {
        // User already exists, update info if needed, and log them in
        user.googleId = googleId; // Update googleId if not set
        user.displayName = displayName || user.displayName;
        user.photoUrl = photoUrl || user.photoUrl;
        user.isEmailVerified = true; // Google emails are considered verified
        user.lastLogin = new Date(); // Update last login
        await user.save({ validateBeforeSave: false });
    } else {
        // Register new user with Google info
        const tempPassword = Math.random().toString(36).slice(-8); // Random password (akan di-hash oleh pre-save hook)
        user = await User.create({
            displayName,
            email,
            password: tempPassword,
            photoUrl,
            isEmailVerified: true, // Assume email from Google is verified
            googleId,
            lastLogin: new Date(),
        });
        // Jika Anda ingin mengirim email sambutan, lakukan di sini
    }

    if (user) {
        sendTokenResponse(user, 200, res, 'Login Google berhasil');
    } else {
        throw new ErrorResponse('Gagal memproses login Google', 500);
    }
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me (disarankan /api/profile atau /api/auth/me)
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    // req.user akan diset oleh middleware protect
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new ErrorResponse('User tidak ditemukan', 404);
    }

    res.status(200).json({
        success: true,
        data: {
            id: user._id,
            displayName: user.displayName,
            email: user.email,
            photoUrl: user.photoUrl,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
        }
    });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword (disarankan /api/auth/reset-password)
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        throw new ErrorResponse('Email harus diisi', 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
        // Mengirim respons yang sama untuk alasan keamanan agar tidak mengidentifikasi email yang terdaftar
        return res.status(200).json({ success: true, message: 'Jika email terdaftar, instruksi reset password telah dikirim.' });
    }

    // Buat token reset password
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false }); // Simpan token dan waktu kadaluarsa

    // Buat URL reset (ganti dengan URL frontend Anda)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const message = `Anda menerima email ini karena Anda (atau orang lain) telah meminta reset password. Silakan klik link berikut untuk mereset password Anda: \n\n ${resetUrl}\n\nLink ini akan kadaluarsa dalam 10 menit.`;

    try {
        await sendEmail({
            to: user.email,
            subject: 'Permintaan Reset Password',
            text: message,
            html: `<p>Anda menerima email ini karena Anda (atau orang lain) telah meminta reset password.</p><p>Silakan klik link berikut untuk mereset password Anda:</p><p><a href="${resetUrl}">Reset Password</a></p><p>Link ini akan kadaluarsa dalam 10 menit.</p>`,
        });

        res.status(200).json({ success: true, message: 'Email reset password berhasil dikirim' });
    } catch (err) {
        console.error('Error sending reset password email:', err);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        throw new ErrorResponse('Email tidak dapat dikirim', 500);
    }
});

// @desc    Reset password (dari link email)
// @route   PUT /api/v1/auth/resetpassword/:resettoken (disarankan /api/auth/reset-password/:token)
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { password } = req.body; // Password baru dari body request

    if (!password) {
        throw new ErrorResponse('Password baru harus diisi', 400);
    }

    const hashedResetToken = require('crypto')
        .createHash('sha256')
        .update(req.params.resettoken) // Menggunakan resettoken dari URL
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken: hashedResetToken,
        resetPasswordExpire: { $gt: Date.now() }
    }).select('+password'); // Select password untuk update

    if (!user) {
        throw new ErrorResponse('Token reset password tidak valid atau sudah kadaluarsa', 400);
    }

    // Set password baru
    user.password = password; // Password akan di-hash oleh pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save(); // Simpan user dengan password baru yang sudah di-hash

    sendTokenResponse(user, 200, res, 'Password berhasil direset');
});

// @desc    Update user profile details
// @route   PUT /api/v1/auth/updatedetails (disarankan PATCH /api/profile)
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new ErrorResponse('User tidak ditemukan', 404);
    }

    // Update fields
    user.displayName = req.body.displayName || user.displayName;
    user.photoUrl = req.body.photoUrl || user.photoUrl;
    
    // Email update: Perlu penanganan khusus karena `email` adalah unique dan `isEmailVerified` mungkin berubah.
    // Jika email diubah, sebaiknya email verifikasi diulang.
    if (req.body.email && req.body.email !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists && emailExists._id.toString() !== user._id.toString()) {
            throw new ErrorResponse('Email sudah terdaftar oleh pengguna lain', 400);
        }
        user.email = req.body.email;
        user.isEmailVerified = false; // Set kembali ke false jika email berubah
        // Kirim email verifikasi baru di sini
        const verificationCode = user.getEmailVerificationCode();
        await user.save({ validateBeforeSave: false }); // Save without re-hashing password

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verificationCode}&email=${user.email}`;
        const message = `Email Anda telah diubah. Silakan verifikasi email baru Anda dengan mengklik tautan ini: \n\n ${verificationUrl} \n\n Atau masukkan kode verifikasi Anda: ${verificationCode}`;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Verifikasi Email Baru Anda',
                text: message,
                html: `<p>Email Anda telah diubah. Silakan verifikasi email baru Anda dengan mengklik tautan ini: <a href="${verificationUrl}">Verifikasi Email</a></p><p>Atau masukkan kode verifikasi Anda: <strong>${verificationCode}</strong></p>`
            });
        } catch (err) {
            console.error('Error sending new verification email:', err);
            // Anda bisa memutuskan apakah akan membatalkan update atau hanya log error
        }
    }

    const updatedUser = await user.save(); // Mongoose pre-save hook akan hash password jika diupdate

    res.json({
        success: true,
        message: 'Profil berhasil diperbarui',
        user: {
            id: updatedUser._id,
            displayName: updatedUser.displayName,
            email: updatedUser.email,
            photoUrl: updatedUser.photoUrl,
            isEmailVerified: updatedUser.isEmailVerified,
            createdAt: updatedUser.createdAt,
            lastLogin: updatedUser.lastLogin,
        },
        token: updatedUser.getSignedJwtToken(), // Re-issue token with updated info
    });
});

// @desc    Update password (when logged in)
// @route   PUT /api/v1/auth/updatepassword (disarankan POST /api/auth/change-password)
// @access  Private
exports.changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ErrorResponse('Password lama dan password baru harus diisi', 400);
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
        throw new ErrorResponse('User tidak ditemukan', 404);
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
        throw new ErrorResponse('Password saat ini salah', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save(); // Pre-save hook will hash the new password

    sendTokenResponse(user, 200, res, 'Password berhasil diubah');
});

// @desc    Delete user account
// @route   DELETE /api/v1/auth/account (disarankan DELETE /api/account)
// @access  Private
exports.deleteAccount = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new ErrorResponse('User tidak ditemukan', 404);
    }

    await user.deleteOne(); // Gunakan deleteOne() atau remove()

    res.status(200).json({ success: true, message: 'Akun berhasil dihapus' });
});

// @desc    Resend email verification
// @route   POST /api/v1/auth/resend-verification (disarankan /api/auth/resend)
// @access  Public
exports.resendVerificationEmail = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        throw new ErrorResponse('Email harus diisi', 400);
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ErrorResponse('Email tidak ditemukan', 404);
    }

    if (user.isEmailVerified) {
        throw new ErrorResponse('Email ini sudah terverifikasi', 400);
    }

    const verificationCode = user.getEmailVerificationCode();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verificationCode}&email=${user.email}`;

    try {
        await sendEmail({
            to: user.email,
            subject: 'Verifikasi Email Akun Aplikasi Berita Anda (Kirim Ulang)',
            text: `Halo ${user.displayName},\n\nAnda meminta kirim ulang kode verifikasi. Berikut kode Anda: ${verificationCode}\n\nAtau klik link ini: ${verificationUrl}\n\nKode ini akan kadaluarsa dalam 10 menit.\n\nSalam,\nTim Aplikasi Berita`,
            html: `<p>Halo ${user.displayName},</p><p>Anda meminta kirim ulang kode verifikasi. Berikut kode Anda:</p><h2>${verificationCode}</h2><p>Atau klik <a href="${verificationUrl}">link ini</a> untuk memverifikasi email Anda.</p><p>Kode ini akan kadaluarsa dalam 10 menit.</p><p>Salam,</p><p>Tim Aplikasi Berita</p>`,
        });

        res.json({
            success: true,
            message: 'Email verifikasi berhasil dikirim ulang.',
        });
    } catch (err) {
        console.error('Error resending verification email:', err);
        throw new ErrorResponse('Email verifikasi tidak dapat dikirim ulang. Silakan coba lagi.', 500);
    }
});

// @desc    Verify email with code (REVISED - NOW RETURNS JWT TOKEN)
// @route   POST /api/v1/auth/verify (disarankan /api/auth/verify)
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
    const { code } = req.body;

    if (!code) {
        throw new ErrorResponse('Kode verifikasi harus diisi', 400);
    }

    // Find user by verification code (exclude password)
    const user = await User.findOne({ 
        emailVerificationCode: code, 
        emailVerificationExpires: { $gt: Date.now() } 
    }).select('-password');

    if (!user) {
        throw new ErrorResponse('Kode verifikasi tidak valid atau sudah kadaluarsa', 400);
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    user.lastLogin = new Date(); // Update last login
    await user.save({ validateBeforeSave: false });

    // ✅ FIXED: Send JWT token after successful verification
    // This allows user to be automatically logged in after verification
    sendTokenResponse(user, 200, res, 'Email berhasil diverifikasi');
});

// @desc    Check email verified status
// @route   GET /api/v1/auth/verified (disarankan /api/auth/verified)
// @access  Private (requires JWT to identify user)
exports.isEmailVerifiedStatus = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new ErrorResponse('User tidak ditemukan', 404);
    }

    res.json({ 
        success: true,
        verified: user.isEmailVerified 
    });
});

// @desc    Check if email exists
// @route   POST /api/v1/auth/check-email (disarankan /api/auth/check-email)
// @access  Public
exports.checkEmailExists = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        throw new ErrorResponse('Email harus diisi', 400);
    }

    const userExists = await User.findOne({ email });
    res.json({ 
        success: true,
        exists: !!userExists 
    });
});

// @desc    Check if display name exists
// @route   POST /api/v1/auth/check-displayname (disarankan /api/auth/check-displayname)
// @access  Public
exports.checkDisplayNameExists = asyncHandler(async (req, res, next) => {
    const { displayName } = req.body;

    if (!displayName) {
        throw new ErrorResponse('Display name harus diisi', 400);
    }

    const userExists = await User.findOne({ displayName });
    res.json({ 
        success: true,
        exists: !!userExists 
    });
});

// @desc    Log user out / clear cookie (if using httpOnly cookies)
// @route   GET /api/v1/auth/logout (disarankan POST /api/auth/logout)
// @access  Private
exports.logoutUser = asyncHandler(async (req, res, next) => {
    // Jika Anda menggunakan cookie httpOnly untuk JWT (umum di web), Anda akan membersihkannya di sini.
    // res.cookie('token', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });

    // Untuk JWT di Flutter (disimpan di sisi klien), ini mungkin hanya pemberitahuan ke backend
    // bahwa pengguna keluar, atau hanya untuk konsistensi.
    // Token yang disimpan di klien harus dihapus di sisi klien.
    
    // Optional: Update user's last activity
    if (req.user && req.user.id) {
        try {
            await User.findByIdAndUpdate(req.user.id, { lastActivity: new Date() });
        } catch (err) {
            console.error('Error updating last activity on logout:', err);
        }
    }

    res.status(200).json({ success: true, message: 'Logout berhasil' });
});

// @desc    Refresh JWT token
// @route   POST /api/v1/auth/refresh (disarankan /api/auth/refresh)
// @access  Public
exports.refreshToken = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        throw new ErrorResponse('Refresh token tidak ditemukan', 400);
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            throw new ErrorResponse('User tidak ditemukan untuk refresh token ini', 401);
        }

        // Generate new access token
        sendTokenResponse(user, 200, res, 'Token berhasil diperbarui');
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ErrorResponse('Refresh token kadaluarsa. Silakan login ulang.', 401);
        }
        throw new ErrorResponse('Refresh token tidak valid', 401);
    }
});

// @desc    Get verification code info (for debugging - remove in production)
// @route   GET /api/v1/auth/verification-info/:email
// @access  Public (REMOVE IN PRODUCTION!)
exports.getVerificationInfo = asyncHandler(async (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        throw new ErrorResponse('Endpoint ini tidak tersedia di produksi', 404);
    }

    const { email } = req.params;
    const user = await User.findOne({ email });

    if (!user) {
        throw new ErrorResponse('User tidak ditemukan', 404);
    }

    res.json({
        success: true,
        data: {
            hasVerificationCode: !!user.emailVerificationCode,
            codeExpires: user.emailVerificationExpires,
            isExpired: user.emailVerificationExpires < Date.now(),
            isVerified: user.isEmailVerified
        }
    });
});