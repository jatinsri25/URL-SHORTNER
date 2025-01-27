import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, ArrowRight, Copy, CheckCircle, QrCode, History, X, TrendingUp, Plus, Minus } from 'lucide-react';

const URLShortener = () => {
    const [originalUrl, setOriginalUrl] = useState('');
    const [shortenedUrl, setShortenedUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [urlHistory, setUrlHistory] = useState([]);
    const [showQR, setShowQR] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [stats, setStats] = useState(null);
    const [customAlias, setCustomAlias] = useState('');
    const [showUTMFields, setShowUTMFields] = useState(false);
    const [utmParams, setUtmParams] = useState({
        source: '',
        medium: '',
        campaign: '',
        term: '',
        content: ''
    });

    const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5001';

    const fetchUrlHistory = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/history`);
            setUrlHistory(response.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const constructFinalUrl = (url) => {
        try {
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.search);

            Object.entries(utmParams).forEach(([key, value]) => {
                if (value) params.set(`utm_${key}`, value);
            });

            urlObj.search = params.toString();
            return urlObj.toString();
        } catch (error) {
            const params = [];
            Object.entries(utmParams).forEach(([key, value]) => {
                if (value) params.push(`utm_${key}=${encodeURIComponent(value)}`);
            });

            return params.length > 0
                ? `${url}${url.includes('?') ? '&' : '?'}${params.join('&')}`
                : url;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!originalUrl) {
            setError('Please enter a URL');
            return;
        }

        try {
            setIsLoading(true);
            const finalUrl = constructFinalUrl(originalUrl);

            const response = await axios.post(`${BASE_URL}/api/shorten`, {
                url: finalUrl,
                customAlias: customAlias || undefined
            });

            setShortenedUrl(response.data.shortUrl);
            fetchUrlHistory();
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to shorten URL';
            setError(errorMessage.includes('already in use')
                ? 'Custom alias is already taken. Please try another one.'
                : errorMessage
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Updated handleUrlClick to use the full short URL
    const handleUrlClick = () => {
        window.open(shortenedUrl, '_blank');
    };

    // Updated QR code generation
    const generateQRCode = async () => {
        try {
            const code = shortenedUrl.split('/').pop();
            const response = await axios.get(`${BASE_URL}/api/qr/${code}`);
            setQrCode(response.data.qrCode);
            setShowQR(true);
        } catch (err) {
            setError('Failed to generate QR code');
        }
    };

    // Updated stats fetching
    const fetchUrlStats = async () => {
        try {
            const code = shortenedUrl.split('/').pop();
            const response = await axios.get(`${BASE_URL}/api/stats/${code}`);
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    return (
        <div className="min-h-screen p-4 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                        <Link className="text-indigo-600" size={32} />
                        <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                            Advanced URL Shortener
                        </span>
                    </h1>
                    <p className="text-gray-600 mt-2">Shorten, track, and analyze your URLs</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        {/* URL Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Original URL
                            </label>
                            <input
                                type="url"
                                placeholder="https://example.com/long-url"
                                value={originalUrl}
                                onChange={(e) => setOriginalUrl(e.target.value)}
                                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                                required
                            />
                        </div>

                        {/* Custom Alias */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Custom Alias (optional)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="my-custom-link"
                                    value={customAlias}
                                    onChange={(e) => setCustomAlias(e.target.value)}
                                    className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                                    pattern="[\w-]{3,20}"
                                    title="3-20 characters (letters, numbers, underscores, hyphens)"
                                />
                            </div>
                        </div>

                        {/* UTM Parameters */}
                        <div className="border-t border-b border-gray-200 py-4">
                            <button
                                type="button"
                                onClick={() => setShowUTMFields(!showUTMFields)}
                                className="w-full flex justify-between items-center text-indigo-600 hover:text-indigo-800"
                            >
                                <span>UTM Parameters {showUTMFields ? '(optional)' : ''}</span>
                                {showUTMFields ? <Minus size={20} /> : <Plus size={20} />}
                            </button>

                            {showUTMFields && (
                                <div className="mt-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="UTM Source (e.g., newsletter)"
                                                value={utmParams.source}
                                                onChange={(e) => setUtmParams(p => ({ ...p, source: e.target.value }))}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="UTM Medium (e.g., email)"
                                                value={utmParams.medium}
                                                onChange={(e) => setUtmParams(p => ({ ...p, medium: e.target.value }))}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Campaign"
                                                value={utmParams.campaign}
                                                onChange={(e) => setUtmParams(p => ({ ...p, campaign: e.target.value }))}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Term"
                                                value={utmParams.term}
                                                onChange={(e) => setUtmParams(p => ({ ...p, term: e.target.value }))}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Content"
                                                value={utmParams.content}
                                                onChange={(e) => setUtmParams(p => ({ ...p, content: e.target.value }))}
                                                className="w-full px-4 py-3 border rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 text-white py-4 rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50 transition-all duration-200"
                    >
                        {isLoading ? 'Shortening...' : 'Shorten URL'}
                    </button>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2">
                            <X size={18} />
                            {error}
                        </div>
                    )}

                    {/* History Toggle */}
                    <div className="flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => {
                                setShowHistory(!showHistory);
                                fetchUrlHistory();
                            }}
                            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
                        >
                            <History size={18} />
                            {showHistory ? 'Hide History' : 'Show History'}
                        </button>
                    </div>

                    {/* Shortened URL Section */}
                    {shortenedUrl && (
                        <div className="mt-6 space-y-4">
                            <div className="p-6 bg-indigo-50 rounded-xl relative">
                                <button
                                    onClick={handleUrlClick}
                                    className="text-indigo-800 text-lg break-all pr-24 hover:text-indigo-600 text-left w-full"
                                >
                                    {shortenedUrl}
                                </button>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={generateQRCode}
                                        className="p-2 hover:bg-indigo-100 rounded-lg"
                                    >
                                        <QrCode className="h-5 w-5 text-indigo-600" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(shortenedUrl);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="p-2 hover:bg-indigo-100 rounded-lg"
                                    >
                                        {copied ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <Copy className="h-5 w-5 text-indigo-600" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={fetchUrlStats}
                                        className="p-2 hover:bg-indigo-100 rounded-lg"
                                    >
                                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Statistics */}
                            {stats && (
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="font-semibold mb-4">Analytics</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 bg-white rounded-lg">
                                            <p className="text-sm text-gray-600">Total Clicks</p>
                                            <p className="text-2xl font-bold text-indigo-600">{stats.clicks}</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-lg">
                                            <p className="text-sm text-gray-600">Created</p>
                                            <p className="text-sm font-medium">
                                                {new Date(stats.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="p-4 bg-white rounded-lg">
                                            <p className="text-sm text-gray-600">Last Click</p>
                                            <p className="text-sm font-medium">
                                                {stats.lastClickedAt
                                                    ? new Date(stats.lastClickedAt).toLocaleDateString()
                                                    : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Social Sharing */}
                            <div className="flex gap-3 mt-6">
                                <a
                                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shortenedUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Share on Twitter
                                </a>
                                <a
                                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortenedUrl)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-center px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                                >
                                    Share on Facebook
                                </a>
                            </div>
                        </div>
                    )}

                    {/* History Section */}
                    {showHistory && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold mb-4">Recent URLs</h3>
                            <div className="space-y-3">
                                {urlHistory.map((url) => (
                                    <div key={url.shortCode} className="p-3 bg-white rounded-lg hover:shadow-md">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-indigo-600 font-medium">{url.shortUrl}</p>
                                                <p className="text-sm text-gray-600 truncate">{url.originalUrl}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">
                                                    {new Date(url.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="text-xs font-medium text-indigo-600">
                                                    {url.clicks} clicks
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* QR Code Modal */}
                    {showQR && qrCode && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">QR Code</h3>
                                    <button
                                        onClick={() => setShowQR(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <img src={qrCode} alt="QR Code" className="w-full" />
                                <button
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = qrCode;
                                        link.download = 'qrcode.png';
                                        link.click();
                                    }}
                                    className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Download QR Code
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default URLShortener;