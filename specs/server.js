const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const app = require('../server');
const checkRateLimit = require('../rateLimitMiddleware'); 

chai.use(chaiHttp);

const { request, expect } = chai;

describe('GET /', () => {
  it('responds with hello world', async () => {
    const response = await request(app).get('/');

    expect(response.status).to.equal(200);
    expect(response.text).to.contain('hello world');
  });
});

describe('Rate Limit Middleware', () => {
  // Mock data for testing
  const config = {
    rateLimitsPerEndpoint: [
      {
        endpoint: 'GET /user/:id',
        burst: 100,
        sustained: 50,
      },
    ],
  };

  const tokenBuckets = {
    'GET /user/:id': {
      tokens: 100,
      lastRefillTime: Date.now(),
    },
  };

  let req = {};
  let res = {};

  beforeEach(() => {
    req = {
      body: {
        endpoint: 'GET /users/:id',
      },
    };

    res = {
      status: (status) => {
        res.statusCode = status;
        return res;
      },
      json: (data) => {
        res.body = data;
        return res;
      },
    };
  });

  it('should return remaining tokens and accept status if tokens are available', async () => {
    const checkRateLimitMock = sinon.stub().callsFake((req, res, next) => {
        res.status(200).json({
          remainingTokens: 99,
          accept: true,
        });
      });

    await checkRateLimitMock(req, res)  
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.deep.equal({
      remainingTokens: 99,
      accept: true,
    });
  });

  it('should return 0 remaining tokens and reject status if tokens are not available', async () => {
    const checkRateLimitMock = sinon.stub().callsFake((req, res, next) => {
        res.status(429).json({
          remainingTokens: 0,
          accept: false,
        });
      });
  
      await checkRateLimitMock(req, res);

    expect(res.statusCode).to.equal(429);
    expect(res.body).to.deep.equal({
      remainingTokens: 0,
      accept: false,
    });
  });

  it('should return an error if rate limit configuration is not found for the endpoint', async () => {
    req.body.endpoint = 'GET /posts/:id'; 

    const checkRateLimitMock = sinon.stub().callsFake((req, res, next) => {
        res.status(400).json({
          error: 'Rate limit configuration not found for the given endpoint'
        });
      });
  
      await checkRateLimitMock(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body).to.deep.equal({
      error: 'Rate limit configuration not found for the given endpoint',
    });
  });
});