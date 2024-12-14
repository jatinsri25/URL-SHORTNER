// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/url-shortener')
    .then(() => {
        console.log('Successfully connected to MongoDB.');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    });

// URL Schema
const urlSchema = new mongoose.Schema({
    originalUrl: { type: String, required: true },
    shortCode: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    clicks: { type: Number, default: 0 },
    lastClickedAt: Date
});

const Url = mongoose.model('Url', urlSchema);

// Generate short code
const generateShortCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// API Routes
// 1. Shorten URL
app.post('/api/shorten', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const shortCode = generateShortCode();
        const newUrl = new Url({
            originalUrl: url,
            shortCode
        });

        await newUrl.save();
        console.log('URL shortened successfully:', shortCode);
        res.json({ shortCode });
    } catch (error) {
        console.error('Error in /api/shorten:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// 2. Get URL History
app.get('/api/history', async (req, res) => {
    try {
        const urls = await Url.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('shortCode originalUrl createdAt clicks');
        res.json(urls);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// 3. Get URL Stats
app.get('/api/stats/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ shortCode: req.params.code });
        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }
        res.json({
            clicks: url.clicks,
            createdAt: url.createdAt,
            lastClickedAt: url.lastClickedAt
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// 4. Redirect to Original URL
app.get('/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ shortCode: req.params.code });
        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        url.clicks++;
        url.lastClickedAt = new Date();
        await url.save();
        res.redirect(url.originalUrl);
    } catch (error) {
        console.error('Error in redirect:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
const QRCode = require('qrcode');

// Add this new endpoint for QR code generation
app.get('/api/qr/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ shortCode: req.params.code });
        if (!url) {
            return res.status(404).json({ error: 'URL not found' });
        }

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(`http://localhost:5001/${url.shortCode}`);
        res.json({ qrCode: qrCodeUrl });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Start server
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})