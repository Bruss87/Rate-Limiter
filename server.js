const express = require('express');
const checkRateLimit = require('./rateLimitMiddleware');
const bodyParser = require('body-parser');
const app = express();
app.use(express.json());
// Middleware to parse JSON request bodies
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('hello world\n');
});

app.post('/', (req, res) => {
  res.status(200).send(`hello ${req.body.name}\n`);
});

app.post('/take', checkRateLimit);

module.exports = app;