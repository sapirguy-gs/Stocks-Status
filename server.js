const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Enable CORS for React app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// In-memory cache
const cache = {
  general: {
    data: null,
    timestamp: null
  },
  symbols: {} // Structure: { SYMBOL: { news: {...}, price: {...} } }
};

const CACHE_TTL = 60 * 1000; // 60 seconds in milliseconds

// Helper function to check if cache is valid
function isCacheValid(cacheEntry) {
  if (!cacheEntry || !cacheEntry.timestamp) {
    return false;
  }
  return Date.now() - cacheEntry.timestamp < CACHE_TTL;
}

// Helper function to fetch news from Finnhub
async function fetchNewsFromFinnhub(symbol = null) {
  const url = symbol
    ? `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${getDateDaysAgo(7)}&to=${getCurrentDate()}`
    : `https://finnhub.io/api/v1/news?category=general`;

  const response = await fetch(`${url}&token=${FINNHUB_API_KEY}`);

  if (!response.ok) {
    if (response.status === 429) {
      const error = new Error('Rate limit exceeded. Please try again later.');
      error.status = 429;
      throw error;
    }
    const error = new Error(`Finnhub API error: ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data;
}

// Helper function to fetch stock price from Finnhub
async function fetchPriceFromFinnhub(symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 429) {
      const error = new Error('Rate limit exceeded. Please try again later.');
      error.status = 429;
      throw error;
    }
    const error = new Error(`Finnhub API error: ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data;
}

// Helper function to get current date in YYYY-MM-DD format
function getCurrentDate() {
  const date = new Date();
  return date.toISOString().split('T')[0];
}

// Helper function to get date N days ago in YYYY-MM-DD format
function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// GET /api/news - General stock market news
app.get('/api/news', async (req, res) => {
  try {
    // Check cache
    if (isCacheValid(cache.general)) {
      return res.json(cache.general.data);
    }

    // Validate API key
    if (!FINNHUB_API_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'FINNHUB_API_KEY environment variable is not set'
      });
    }

    // Fetch from API
    const news = await fetchNewsFromFinnhub();

    // Update cache
    cache.general = {
      data: news,
      timestamp: Date.now()
    };

    res.json(news);
  } catch (error) {
    console.error('Error fetching general news:', error);
    
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }

    const statusCode = error.status || 500;
    res.status(statusCode).json({
      error: 'Failed to fetch news',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// GET /api/news/:symbol - News and price for specific ticker symbol
app.get('/api/news/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    // Initialize cache entry if it doesn't exist
    if (!cache.symbols[symbol]) {
      cache.symbols[symbol] = {
        news: { data: null, timestamp: null },
        price: { data: null, timestamp: null }
      };
    }

    let news, price;
    let source = 'cache';
    const symbolCache = cache.symbols[symbol];

    // Validate API key
    if (!FINNHUB_API_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'FINNHUB_API_KEY environment variable is not set'
      });
    }

    // Fetch news (from cache or API)
    if (isCacheValid(symbolCache.news)) {
      news = symbolCache.news.data;
    } else {
      news = await fetchNewsFromFinnhub(symbol);
      symbolCache.news = {
        data: news,
        timestamp: Date.now()
      };
      source = 'api';
    }

    // Fetch price (from cache or API)
    if (isCacheValid(symbolCache.price)) {
      price = symbolCache.price.data;
    } else {
      const priceData = await fetchPriceFromFinnhub(symbol);
      price = priceData.c || null; // 'c' is the current price in Finnhub's quote response
      symbolCache.price = {
        data: price,
        timestamp: Date.now()
      };
      source = 'api';
    }

    // Return combined response
    const response = {
      symbol: symbol,
      price: price,
      news: Array.isArray(news) ? news : [],
      source: source
    };

    res.json(response);
  } catch (error) {
    console.error(`Error fetching news/price for ${req.params.symbol}:`, error);
    
    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }

    const statusCode = error.status || 500;
    res.status(statusCode).json({
      error: 'Failed to fetch news/price',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (!FINNHUB_API_KEY) {
    console.warn('WARNING: FINNHUB_API_KEY environment variable is not set');
  }
});

