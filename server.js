require('dotenv').config(); // Muat variabel lingkungan dari .env
const express = require('express');
const path = require('path');
const connectDB = require('./config/db'); // Koneksi MongoDB
const authRoutes = require('./routes/authRoutes');
const commentRoutes = require('./routes/commentRoutes');
const uploadRoutes = require('./routes/uploadRoutes'); // Import rute upload
const newsRoutes = require('./routes/newsRoutes'); // ← Tambahan untuk proxy berita
const { errorHandler } = require('./middleware/errorMiddleware');
const cors = require('cors'); // Import CORS

// Koneksi ke database
connectDB();

const app = express();

// Middleware
app.use(express.json()); // Body parser untuk JSON
app.use(express.urlencoded({ extended: false })); // Body parser untuk URL-encoded data

// Izinkan CORS dari semua origin untuk pengembangan (SESUAIKAN UNTUK PRODUKSI!)
app.use(cors({
  origin: '*', // Untuk produksi, ganti dengan domain frontend Anda
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Melayani folder unggahan secara statis
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rute API
app.use('/api/auth', authRoutes);
app.use('/api', commentRoutes); // Rute komentar
app.use('/api', uploadRoutes);  // Rute upload
app.use('/api/news', newsRoutes); // ← Rute proxy berita tambahan

// Rute untuk /api (opsional, untuk uji koneksi)
app.get('/api', (req, res) => {
  res.send('API Aplikasi Berita (backend) berjalan dan dapat dijangkau!');
});

// Rute dasar
app.get('/', (req, res) => {
  res.send('API Aplikasi Berita sedang berjalan...');
});

// Middleware penanganan error kustom
app.use(errorHandler);

// Jalankan server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
