// index.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware
app.use(cors());
app.use(express.json());

// Users service URL
const USERS_SERVICE_URL = 'http://service_users:8000';

// ==============================
// 🔑 JWT AUTH MIDDLEWARE
// ==============================
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

// ==============================
// 🧍 USERS ROUTES
// ==============================

// Регистрация
app.post('/users/register', async (req, res) => {
    try {
        const user = await axios.post(`${USERS_SERVICE_URL}/users/register`, req.body);
        res.status(201).json(user.data);
    } catch (error) {
        if (error.response) {
            // Возвращаем контролируемую ошибку от сервиса users
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Логин (вернёт JWT)
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

// Пример защищённого маршрута (проверка токена)
app.get('/users/me', authenticateToken, async (req, res) => {
    res.json({ message: 'Access granted', user: req.user });
});

// ==============================
// 🩺 Health check
// ==============================
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway is running' });
});

// ==============================
app.listen(PORT, () => {
    console.log(`✅ API Gateway running on port ${PORT}`);
});
