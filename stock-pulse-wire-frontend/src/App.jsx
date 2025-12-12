import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:4000/api/news'
const TICKERS = ['AAPL', 'MSFT', 'AMZN', 'GOOG', 'TSLA','NVDA']
const STORAGE_KEY = 'lastSelectedTicker'

function App() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTicker, setSelectedTicker] = useState('')
  const [stockPrice, setStockPrice] = useState(null)

  // Load last selected ticker from localStorage on mount
  useEffect(() => {
    const lastTicker = localStorage.getItem(STORAGE_KEY)
    if (lastTicker && TICKERS.includes(lastTicker)) {
      setSelectedTicker(lastTicker)
    }
  }, [])

  // Fetch news when component mounts or ticker changes
  useEffect(() => {
    fetchNews()
  }, [selectedTicker])

  const fetchNews = async () => {
    setLoading(true)
    setError(null)
    setStockPrice(null)
    
    try {
      const url = selectedTicker 
        ? `${API_BASE_URL}/${selectedTicker}`
        : API_BASE_URL
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Handle different response structures
      if (selectedTicker && data.symbol) {
        // Symbol-specific response: { symbol, price, news }
        setStockPrice(data.price)
        setArticles(Array.isArray(data.news) ? data.news : [])
      } else {
        // General news response: array of articles
        setArticles(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      setError(err.message)
      setArticles([])
      setStockPrice(null)
    } finally {
      setLoading(false)
    }
  }

  const handleTickerChange = (e) => {
    const ticker = e.target.value
    setSelectedTicker(ticker)
    
    // Save to localStorage
    if (ticker) {
      localStorage.setItem(STORAGE_KEY, ticker)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Stock Pulse Wire</h1>
        <div className="ticker-selector">
          <label htmlFor="ticker-select">Select Ticker:</label>
          <select 
            id="ticker-select"
            value={selectedTicker} 
            onChange={handleTickerChange}
            className="ticker-dropdown"
          >
            <option value="">General News</option>
            {TICKERS.map(ticker => (
              <option key={ticker} value={ticker}>{ticker}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="main-content">
        {loading && (
          <div className="loading">Loading news...</div>
        )}

        {error && (
          <div className="error">
            <p>Error: {error}</p>
            <button onClick={fetchNews} className="retry-button">Retry</button>
          </div>
        )}

        {!loading && !error && selectedTicker && stockPrice !== null && stockPrice !== undefined && (
          <div className="stock-header">
            <h2 className="stock-symbol-price">
              {selectedTicker} — ${typeof stockPrice === 'number' ? stockPrice.toFixed(2) : stockPrice}
            </h2>
            <div className="divider"></div>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="no-articles">No articles found.</div>
        )}

        {!loading && !error && articles.length > 0 && (
          <div className="articles-list">
            {articles.map((article, index) => (
              <article key={article.id || index} className="article-card">
                <h2 className="article-headline">{article.headline || article.title || 'No headline'}</h2>
                <div className="article-meta">
                  <span className="article-source">{article.source || 'Unknown source'}</span>
                  <span className="article-date">{formatDate(article.datetime)}</span>
                </div>
                {article.url && (
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="read-more-link"
                  >
                    Read more
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
