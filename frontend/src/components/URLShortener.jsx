import React, { useState } from 'react';
import axios from 'axios';
import { Link, ArrowRight, Copy, CheckCircle, QrCode, History, X, TrendingUp } from 'lucide-react';

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!originalUrl) {
            setError('Please enter a URL');
            return;
        }

        try {
            setIsLoading(true);
            const response = await axios.post('http://localhost:5001/api/shorten', {
                url: originalUrl
            });
            setShortenedUrl(response.data.shortCode);
            fetchUrlHistory();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to shorten URL');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shortenedUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            setError('Failed to copy to clipboard');
        }
    };

    const handleUrlClick = () => {
        window.open(`http://localhost:5001/${shortenedUrl}`, '_blank');
    };

    const fetchUrlHistory = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/history');
            setUrlHistory(response.data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };

    const generateQRCode = async () => {
        try {
            const response = await axios.get(`http://localhost:5001/api/qr/${shortenedUrl}`);
            setQrCode(response.data.qrCode);
            setShowQR(true);
        } catch (err) {
            setError('Failed to generate QR code');
        }
    };

    const fetchUrlStats = async (code) => {
        try {
            const response = await axios.get(`http://localhost:5001/api/stats/${code}`);
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    return (
        <div className="min-h-screen p-4 flex items-center justify-center">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
                        <Link className="text-blue-600" size={32} />
                        URL Shortener
                    </h1>
                    <p className="text-gray-600 mt-2">Make your long URLs short and trackable</p>
                </div>

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <input
                            type="url"
                            placeholder="Enter your long URL here..."
                            value={originalUrl}
                            onChange={(e) => setOriginalUrl(e.target.value)}
                            className="w-full px-5 py-4 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                        />
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                            ) : (
                                <ArrowRight size={24} />
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2">
                            <X size={18} />
                            {error}
                        </div>
                    )}

                    {/* History Toggle */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setShowHistory(!showHistory);
                                if (!showHistory) fetchUrlHistory();
                            }}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                        >
                            <History size={18} />
                            History
                        </button>
                    </div>

                    {/* Shortened URL Display */}
                    {shortenedUrl && (
                        <div className="mt-6 space-y-4">
                            <div className="p-6 bg-blue-50 rounded-xl relative">
                                <button
                                    onClick={handleUrlClick}
                                    className="font-mono text-blue-800 text-lg break-all pr-24 hover:text-blue-600 text-left w-full cursor-pointer"
                                >
                                    {shortenedUrl}
                                </button>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={generateQRCode}
                                        className="p-2 hover:bg-blue-100 rounded-lg"
                                    >
                                        <QrCode className="h-5 w-5 text-blue-600" />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-2 hover:bg-blue-100 rounded-lg"
                                        onClick={handleCopy}
                                    >
                                        {copied ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <Copy className="h-5 w-5 text-blue-600" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fetchUrlStats(shortenedUrl)}
                                        className="p-2 hover:bg-blue-100 rounded-lg"
                                    >
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Statistics Display */}
                            {stats && (
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="font-semibold mb-2">Statistics</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-white rounded-lg">
                                            <p className="text-sm text-gray-600">Total Clicks</p>
                                            <p className="text-2xl font-bold text-blue-600">{stats.clicks}</p>
                                        </div>
                                        <div className="p-3 bg-white rounded-lg">
                                            <p className="text-sm text-gray-600">Created</p>
                                            <p className="text-sm font-medium">{new Date(stats.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Panel */}
                    {showHistory && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                            <h3 className="font-semibold mb-4">Recent URLs</h3>
                            <div className="space-y-3">
                                {urlHistory.map((url) => (
                                    <div key={url.shortCode} className="p-3 bg-white rounded-lg hover:shadow-md transition-shadow duration-200">
                                        <p className="font-mono text-sm text-blue-600">{url.shortCode}</p>
                                        <p className="text-sm text-gray-600 truncate">{url.originalUrl}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs text-gray-500">
                                                {new Date(url.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs font-medium text-blue-600">
                                                {url.clicks} clicks
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* QR Code Modal */}
                    {showQR && qrCode && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                                <div className="flex justify-center">
                                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                                </div>
                                <button
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = qrCode;
                                        link.download = 'qrcode.png';
                                        link.click();
                                    }}
                                    className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
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