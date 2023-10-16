
const config = require('./config.json');

// Store the rate limit state for each endpoint
const tokenBuckets = {};

// Function to refill tokens for an endpoint
const refillTokens = (endpointConfig) => {
    const { endpoint, burst, sustained } = endpointConfig;
    const { tokens, lastRefillTime } = tokenBuckets[endpoint];
    const currentTime = Date.now();
    const timeElapsed = currentTime - lastRefillTime;
    const tokensToAdd = Math.floor((timeElapsed / 60000) * sustained);
    tokenBuckets[endpoint].tokens = Math.min(burst, tokens + tokensToAdd);
    // Update the lastRefillTime only if tokens were added
    if (tokensToAdd > 0) {
        tokenBuckets[endpoint].lastRefillTime = currentTime;
    }
};

const checkRateLimit = async (req, res) => {
    const endpoint = req.body.endpoint;
    const endpointConfig = config.rateLimitsPerEndpoint.find(endpointTemplate => endpointTemplate.endpoint === endpoint);
    // if endpoint is not configured for rate limiting, then return bad request code
    if (!endpointConfig) {
        return res.status(400).json({ error: 'Rate limit configuration not found for the given endpoint' });
    }
    // Check if rate limit state exists for endpoint, if not initialize it
    if (!tokenBuckets[endpoint]) {
        tokenBuckets[endpoint] = {
            tokens: endpointConfig.burst,
            lastRefillTime: Date.now()
        };
    }
    refillTokens(endpointConfig);
    try {
        if (tokenBuckets[endpoint].tokens > 0) {
            tokenBuckets[endpoint].tokens--;

            return res.status(200).json({
                remainingTokens: tokenBuckets[endpoint].tokens,
                accept: true
            });
        }
        return res.status(429).json({
            remainingTokens: 0,
            accept: false
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = checkRateLimit;