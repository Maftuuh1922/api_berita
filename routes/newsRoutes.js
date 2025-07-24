const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const puppeteer = require('puppeteer');

const categoryNames = {
  terbaru: "Terbaru",
  nasional: "Nasional",
  internasional: "Internasional",
  ekonomi: "Ekonomi",
  olahraga: "Olahraga",
  teknologi: "Teknologi",
  hiburan: "Hiburan",
  "gaya-hidup": "Gaya Hidup",
};

// Rute untuk daftar berita
router.get('/cnn-news/:category', async (req, res) => {
    const { category } = req.params;
    
    let apiUrl;
    
    switch (category) {
        case 'all':
        case 'terbaru':
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/';
            break;
        case 'nasional':
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/nasional';
            break;
        case 'internasional':
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/internasional';
            break;
        case 'ekonomi':
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/ekonomi';
            break;
        case 'olahraga':
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/olahraga';
            break;
        case 'teknologi':
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/teknologi';
            break;
        case 'hiburan':
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/hiburan';
            break;
        case 'gaya-hidup':
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/gaya-hidup';
            break;
        default:
            apiUrl = 'https://berita-indo-api-next.vercel.app/api/cnn-news/';
            break;
    }

    try {
        console.log(`[API] Mengakses URL: ${apiUrl}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[API] Data diterima:`, data);
        
        if (data && data.data && Array.isArray(data.data)) {
            res.json({ articles: data.data });
        } else {
            res.json({ articles: [] });
        }
    } catch (err) {
        console.error(`[API] Error:`, err.message);
        res.status(500).json({ 
            message: 'Gagal mengambil berita dari Berita Indo API', 
            error: err.message 
        });
    }
});

// RUTE KONTEN DENGAN PERBAIKAN KOMPATIBILITAS PUPPETEER
router.get('/content', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ message: 'Parameter URL artikel diperlukan' });
    }

    console.log(`[SCRAPER] Memulai proses untuk URL: ${url}`);

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--disable-default-apps',
                '--disable-features=VizDisplayCompositor',
                '--disable-web-security'
            ]
        });

        const page = await browser.newPage();

        // Set user agent untuk menghindari deteksi bot
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        // Block resource yang lebih selektif - JANGAN block gambar
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            const reqUrl = req.url();
            if (
                ['stylesheet', 'font'].includes(resourceType) ||
                reqUrl.includes('ads') ||
                reqUrl.includes('analytics') ||
                reqUrl.includes('doubleclick') ||
                reqUrl.includes('googletagmanager') ||
                reqUrl.includes('facebook.com') ||
                reqUrl.includes('twitter.com')
            ) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Buka halaman
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Tunggu dan scroll dengan setTimeout yang kompatibel
        console.log('[SCRAPER] Menunggu load gambar...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Tunggu 5 detik

        // Scroll sederhana untuk trigger lazy loading
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Ambil konten
        const articleData = await page.evaluate(() => {
            // Selector gambar utama
            const imageSelectors = [
                '.detail__media img',
                '.photo__wrap img', 
                '.featured-image img',
                '.detail-photo img',
                '.article-photo img',
                '.story-photo img',
                '.content-photo img',
                '.detail__body-text img:first-of-type',
                'article img:first-of-type',
                'main img:first-of-type',
                '.article-content img:first-of-type',
                '.post-content img:first-of-type',
                '[class*="featured"] img',
                '[class*="hero"] img',
                '[class*="banner"] img'
            ];

            let mediaHtml = '';
            let foundImage = false;

            for (const selector of imageSelectors) {
                if (foundImage) break;
                try {
                    const img = document.querySelector(selector);
                    if (img) {
                        let imgSrc = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
                        if (imgSrc && (imgSrc.startsWith('http') || imgSrc.startsWith('//'))) {
                            if (imgSrc.startsWith('//')) {
                                imgSrc = 'https:' + imgSrc;
                            }
                            mediaHtml += `<div style="text-align:center;margin-bottom:20px;">
                                <img src="${imgSrc}" 
                                     style="width:100%;max-width:600px;height:auto;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.1);" 
                                     alt="${img.alt || 'Gambar utama artikel'}"
                                     loading="eager"/>
                            </div>`;
                            foundImage = true;
                        }
                    }
                } catch (e) {}
            }

            // Jika tidak ada gambar ditemukan, coba dari meta tags
            if (!foundImage) {
                const metaSelectors = [
                    'meta[property="og:image"]',
                    'meta[name="twitter:image"]',
                    'meta[property="og:image:url"]'
                ];
                for (const selector of metaSelectors) {
                    const metaImg = document.querySelector(selector);
                    if (metaImg && metaImg.content) {
                        let imgSrc = metaImg.content;
                        if (imgSrc.startsWith('//')) {
                            imgSrc = 'https:' + imgSrc;
                        }
                        mediaHtml += `<div style="text-align:center;margin-bottom:20px;">
                            <img src="${imgSrc}" 
                                 style="width:100%;max-width:600px;height:auto;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.1);" 
                                 alt="Gambar utama artikel"
                                 loading="eager"/>
                        </div>`;
                        foundImage = true;
                        break;
                    }
                }
            }

            // Jika masih tidak ada, cari gambar berdasarkan ukuran
            if (!foundImage) {
                const allImages = document.querySelectorAll('img');
                let largestImg = null;
                let largestArea = 0;
                for (const img of allImages) {
                    const width = img.naturalWidth || img.width || 0;
                    const height = img.naturalHeight || img.height || 0;
                    const area = width * height;
                    if (area > largestArea && area > 40000) {
                        let imgSrc = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
                        if (imgSrc && (imgSrc.startsWith('http') || imgSrc.startsWith('//'))) {
                            largestImg = img;
                            largestArea = area;
                        }
                    }
                }
                if (largestImg) {
                    let imgSrc = largestImg.src || largestImg.getAttribute('data-src') || largestImg.getAttribute('data-lazy-src');
                    if (imgSrc.startsWith('//')) {
                        imgSrc = 'https:' + imgSrc;
                    }
                    mediaHtml += `<div style="text-align:center;margin-bottom:20px;">
                        <img src="${imgSrc}" 
                             style="width:100%;max-width:600px;height:auto;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.1);" 
                             alt="${largestImg.alt || 'Gambar artikel'}"
                             loading="eager"/>
                    </div>`;
                    foundImage = true;
                }
            }

            // Cari video embed (jika ada)
            const videoSelectors = [
                '.video-detail__embed iframe',
                '.detail__media iframe',
                '.video-embed iframe',
                'iframe[src*="youtube"]',
                'iframe[src*="youtu.be"]'
            ];
            for (const selector of videoSelectors) {
                const videoEmbed = document.querySelector(selector);
                if (videoEmbed && videoEmbed.src) {
                    mediaHtml += `<div style="margin-bottom:20px;text-align:center;">
                        <iframe src="${videoEmbed.src}" 
                                width="100%" 
                                height="350" 
                                frameborder="0" 
                                allowfullscreen
                                style="max-width:600px;border-radius:8px;">
                        </iframe>
                    </div>`;
                    break;
                }
            }

            // Selector teks utama
            const textSelectors = [
                '.detail__body-text',
                '.detail-text',
                'div[class*="detail"][class*="body"]',
                'div[class*="detail"][class*="content"]',
                '.article-content',
                '.post-content',
                '.entry-content',
                '.content-text',
                '.article-body',
                '.story-content',
                '.news-content',
                'div[class*="article"][class*="content"]',
                'div[class*="post"][class*="content"]',
                'div[class*="story"][class*="body"]',
                'article',
                'main article',
                '[role="main"]',
                'main',
                '.container .content',
                '#content',
                '.main-content'
            ];

            let bestContent = '';
            let maxLength = 0;
            let usedSelector = '';

            textSelectors.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) {
                    const html = el.innerHTML?.trim() || '';
                    if (html.length > maxLength) {
                        maxLength = html.length;
                        bestContent = html;
                        usedSelector = selector;
                    }
                }
            });

            // Clean up the content - remove unnecessary images inside text content to avoid duplicates
            if (foundImage && bestContent) {
                bestContent = bestContent.replace(/<img[^>]*>/, '');
            }

            // Gabungkan media dan teks
            const finalContent = mediaHtml + bestContent;

            return {
                content: finalContent,
                selector: usedSelector,
                contentLength: maxLength,
                hasImage: foundImage,
                url: window.location.href,
                title: document.title || '',
                description: document.querySelector('meta[name="description"]')?.content || 
                           document.querySelector('meta[property="og:description"]')?.content || ''
            };
        });

        console.log(`[SCRAPER] Hasil ekstraksi:`, {
            selector: articleData.selector,
            contentLength: articleData.contentLength,
            hasContent: !!articleData.content,
            hasImage: articleData.hasImage,
            title: articleData.title?.substring(0, 50) + '...'
        });

        if (articleData.content && articleData.contentLength > 200) {
            res.status(200).json({
                content: articleData.content,
                meta: {
                    selector: articleData.selector,
                    contentLength: articleData.contentLength,
                    hasImage: articleData.hasImage,
                    title: articleData.title,
                    description: articleData.description
                }
            });
        } else {
            const fallbackContent = articleData.content ||
                '<div style="padding:20px;background:#f8f9fa;border-radius:8px;margin:20px 0;">' +
                '<p style="color:#6b7280;margin-bottom:10px;">Konten tidak dapat dimuat sepenuhnya. Struktur halaman mungkin berubah.</p>' +
                `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;text-decoration:underline;font-weight:500;">Klik di sini untuk membaca artikel lengkap di situs asli CNN Indonesia</a>` +
                '</div>';
            
            res.status(200).json({
                content: fallbackContent,
                meta: {
                    selector: articleData.selector || 'none',
                    contentLength: articleData.contentLength || 0,
                    hasImage: articleData.hasImage || false,
                    fallback: true,
                    title: articleData.title,
                    description: articleData.description
                }
            });
        }

    } catch (error) {
        console.error(`[SCRAPER] ERROR untuk URL ${url}:`, error.message);
        res.status(500).json({
            message: 'Gagal memproses halaman artikel.',
            error: error.message,
            url: url
        });
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('[SCRAPER] Error closing browser:', closeError.message);
            }
        }
    }
});

// Debug endpoint untuk testing selectors
router.get('/debug-selectors', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ message: 'Parameter URL diperlukan' });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        
        const selectorResults = await page.evaluate(() => {
            const selectors = [
                '.detail__body-text',
                '.detail-text',
                '.article-content',
                '.content-text',
                '.post-content',
                'article',
                'main'
            ];
            
            const results = {};
            
            selectors.forEach(selector => {
                try {
                    const element = document.querySelector(selector);
                    results[selector] = {
                        found: !!element,
                        textLength: element ? element.innerText?.length || 0 : 0,
                        htmlLength: element ? element.innerHTML?.length || 0 : 0
                    };
                } catch (e) {
                    results[selector] = { error: e.message };
                }
            });
            
            return results;
        });
        
        res.json({
            url: url,
            selectorResults: selectorResults
        });
        
    } catch (error) {
        res.status(500).json({ 
            message: 'Error dalam debug',
            error: error.message 
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

router.get('/', (req, res) => {
    res.json({ berita: [] });
});

// Endpoint detail berita berdasarkan ID
router.get('/:id', async (req, res) => {
    try {
        const News = require('../models/News');
        const news = await News.findById(req.params.id);
        if (!news) {
            return res.status(404).json({ message: 'Berita tidak ditemukan' });
        }
        res.status(200).json({ success: true, news });
    } catch (error) {
        res.status(500).json({ 
            message: 'Gagal mengambil detail berita', 
            error: error.message 
        });
    }
});

module.exports = router;