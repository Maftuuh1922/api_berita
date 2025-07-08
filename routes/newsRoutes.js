const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const BASE_URL = 'https://berita-indo-api-next.vercel.app/api/cnn-news';

router.get('/:category', async (req, res) => {
  const { category } = req.params;

  const allowedCategories = [
    'nasional', 'internasional', 'ekonomi', 'olahraga', 'teknologi', 'hiburan', 'terbaru'
  ];
  if (!allowedCategories.includes(category)) {
    return res.status(400).json({ message: 'Kategori tidak valid' });
  }

  try {
    const response = await fetch(`${BASE_URL}/${category}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Gagal fetch berita:', err.message);
    res.status(500).json({ message: 'Gagal ambil berita', error: err.message });
  }
});

module.exports = router;
