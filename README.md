# Stock Status Server

A simple Node.js + Express server that fetches stock market news from the Finnhub API.

## Features

- **GET /api/news** - Returns the latest general stock market news
- **GET /api/news/:symbol** - Returns news for a specific ticker symbol (e.g., `/api/news/AAPL`)
- In-memory caching (60 seconds) to reduce API calls and avoid rate limits
- Proper error handling with appropriate HTTP status codes
- Rate limit handling (429 errors from Finnhub are properly mapped)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variable:**
   ```bash
   export FINNHUB_API_KEY=your_api_key_here
   ```
   
   Or create a `.env` file (you'll need to install `dotenv` package if you want to use this method).

3. **Get a Finnhub API key:**
   - Sign up at [https://finnhub.io](https://finnhub.io)
   - Get your free API key from the dashboard

4. **Run the server:**
   ```bash
   npm start
   ```
   
   The server will start on port 3000 by default (or the port specified in the `PORT` environment variable).

## API Endpoints

### GET /api/news
Returns the latest general stock market news.

**Example:**
```bash
curl http://localhost:3000/api/news
```

### GET /api/news/:symbol
Returns news for a specific ticker symbol.

**Example:**
```bash
curl http://localhost:3000/api/news/AAPL
curl http://localhost:3000/api/news/TSLA
```

### GET /health
Health check endpoint.

**Example:**
```bash
curl http://localhost:3000/health
```

## Error Handling

The server handles errors gracefully:

- **429 Rate Limit Exceeded**: Returns a 429 status with a helpful JSON error message
- **500 Server Errors**: Returns appropriate error messages for configuration or API issues
- **Other HTTP Errors**: Maps Finnhub API errors to appropriate HTTP status codes

## Caching

The server implements in-memory caching with a 60-second TTL:
- General news is cached separately from symbol-specific news
- Cache is automatically invalidated after 60 seconds
- This helps reduce API calls and avoid rate limits

## Dependencies

- `express` - Web framework
- `node-fetch` - HTTP client for making API requests

