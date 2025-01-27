const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const QRCode = require('qrcode');
const validUrl = require('valid-url');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/url-shortener')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// URL Schema
const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true,
        validate: {
            validator: (v) => validUrl.isWebUri(v),
            message: 'Invalid URL format'
        }
    },
    shortCode: {
        type: String,
        required: true,
        unique: true,
        match: [/^[\w-]{3,20}$/, 'Short code must be 3-20 characters (letters, numbers, underscores, hyphens)']
    },
    createdAt: { type: Date, default: Date.now },
    clicks: { type: Number, default: 0 },
    lastClickedAt: Date,
    meta: {
        ipAddress: String,
        userAgent: String
    }
});

const Url = mongoose.model('Url', urlSchema);

// Helper Functions
const generateShortCode = (length = 6) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
    return Array.from({ length }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

// API Endpoints

// Shorten URL
app.post('/api/shorten', async (req, res) => {
    try {
        const { url, customAlias } = req.body;

        if (!url) return res.status(400).json({ error: 'URL is required' });
        if (!validUrl.isWebUri(url)) return res.status(400).json({ error: 'Invalid URL format' });

        let shortCode;
        if (customAlias) {
            if (!/^[\w-]{3,20}$/.test(customAlias)) {
                return res.status(400).json({
                    error: 'Custom alias must be 3-20 characters (letters, numbers, underscores, hyphens)'
                });
            }
            shortCode = customAlias;

            const exists = await Url.exists({ shortCode });
            if (exists) return res.status(409).json({ error: 'Custom alias already in use' });
        } else {
            let isUnique = false;
            while (!isUnique) {
                shortCode = generateShortCode();
                const exists = await Url.exists({ shortCode });
                isUnique = !exists;
            }
        }

        const newUrl = new Url({
            originalUrl: url,
            shortCode,
            meta: {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            }
        });

        await newUrl.save();
        res.json({
            shortCode,
            shortUrl: `${process.env.BASE_URL || 'http://localhost:5001'}/${shortCode}`,
            originalUrl: url
        });

    } catch (error) {
        console.error('Shorten URL error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get URL History
app.get('/api/history', async (req, res) => {
    try {
        const urls = await Url.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.json(urls.map(url => ({
            shortCode: url.shortCode,
            originalUrl: url.originalUrl,
            clicks: url.clicks,
            createdAt: url.createdAt,
            shortUrl: `${process.env.BASE_URL || 'http://localhost:5001'}/${url.shortCode}`
        })));
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get URL Stats
app.get('/api/stats/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ shortCode: req.params.code });
        if (!url) return res.status(404).json({ error: 'URL not found' });

        res.json({
            shortCode: url.shortCode,
            originalUrl: url.originalUrl,
            clicks: url.clicks,
            createdAt: url.createdAt,
            lastClickedAt: url.lastClickedAt,
            shortUrl: `${process.env.BASE_URL || 'http://localhost:5001'}/${url.shortCode}`,
            qrCode: `${process.env.BASE_URL || 'http://localhost:5001'}/api/qr/${url.shortCode}`
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Redirect to Original URL
app.get('/:code', async (req, res) => {
    try {
        const url = await Url.findOneAndUpdate(
            { shortCode: req.params.code },
            {
                $inc: { clicks: 1 },
                $set: { lastClickedAt: new Date() }
            },
            { new: true }
        );

        if (!url) return res.status(404).json({ error: 'URL not found' });
        res.redirect(url.originalUrl);
    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate QR Code
app.get('/api/qr/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ shortCode: req.params.code });
        if (!url) return res.status(404).json({ error: 'URL not found' });

        const qrCode = await QRCode.toDataURL(
            `${process.env.BASE_URL || 'http://localhost:5001'}/${url.shortCode}`,
            { width: 400, margin: 2 }
        );

        res.json({ qrCode });
    } catch (error) {
        console.error('QR Code error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});