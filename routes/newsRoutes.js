const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const puppeteer = require('puppeteer');

// Rute untuk daftar berita (tidak berubah)
router.get('/cnn-news/:category', async (req, res) => {
    const { category } = req.params;
    const BASE_URL = 'https://berita-indo-api-next.vercel.app/api/cnn-news';
    try {
        const response = await fetch(`${BASE_URL}/${category}`);
        if (!response.ok) throw new Error(`Gagal fetch dari sumber: ${response.statusText}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Gagal ambil daftar berita', error: err.message });
    }
});


// RUTE KONTEN DENGAN METODE SCRAPING FINAL
router.get('/content', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ message: 'Parameter URL artikel diperlukan' });
    }
    console.log(`[SCRAPER] Memulai proses untuk URL: ${url}`);

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const articleData = await page.evaluate(() => {
            // Cari kontainer utama isi berita
            const container = document.querySelector('.detail__body-text, .read__content, article');
            if (!container) return null;

            // Hapus semua elemen yang tidak kita inginkan dari dalam kontainer
            container.querySelectorAll('script, style, iframe, .baca-juga, .related-news, .adsbygoogle, [class*="video"]').forEach(el => el.remove());

            // Ambil gambar utama secara terpisah untuk diletakkan di paling atas
            const mainImage = document.querySelector('.detail__media img, .photo__wrap img, .featured-image img');
            const imageHtml = mainImage ? `<img src="${mainImage.src}" style="width:100%; height:auto; border-radius:8px; margin-bottom:16px;" />` : '';

            // Kembalikan HTML dari gambar dan isi kontainer yang sudah dibersihkan
            return imageHtml + container.innerHTML;
        });
        
        if (articleData && articleData.length > 100) {
            console.log(`[SCRAPER] Sukses! Konten ditemukan untuk URL: ${url}`);
            res.status(200).json({ content: articleData });
        } else {
            console.log(`[SCRAPER] GAGAL: Konten yang diekstrak terlalu pendek atau tidak valid.`);
            res.status(404).json({ message: 'Tidak dapat menemukan konten yang signifikan.' });
        }

    } catch (error) {
        console.error(`[SCRAPER] ERROR untuk URL ${url}:`, error.message);
        res.status(500).json({ message: 'Gagal memproses halaman artikel.' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

module.exports = router;