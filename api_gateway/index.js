const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());

const USERS_SERVICE_URL = 'http://service_users:8000';

// JWT Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Registration
app.post('/users/register', async (req, res) => {
    try {
        const user = await axios.post(`${USERS_SERVICE_URL}/users/register`, req.body);
        res.status(201).json(user.data);
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Login
app.post('/users/login', async (req, res) => {
    try {
        const user = await axios.post(`${USERS_SERVICE_URL}/users/login`, req.body);
        if (user.data && user.data.id) {
            const token = jwt.sign(
                { id: user.data.id, email: user.data.email },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Protected route example
app.get('/users/me', authenticateToken, async (req, res) => {
    res.json({ message: 'Access granted', user: req.user });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway is running' });
});

app.listen(PORT, () => {
    console.log(`✅ API Gateway is running on port ${PORT}`);
});
