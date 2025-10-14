const express = require('express');
const cors = require('cors');
const axios = require('axios');
const CircuitBreaker = require('opossum');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware
app.use(cors());
app.use(express.json());

// Service URLs
const USERS_SERVICE_URL = 'http://service_users:8000';
const ORDERS_SERVICE_URL = 'http://service_orders:8000';

// Circuit Breaker config
const circuitOptions = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 3000,
};

// Circuit breakers
const usersCircuit = new CircuitBreaker(async (url, options = {}) => {
    const response = await axios({
        url,
        ...options,
        validateStatus: status => (status >= 200 && status < 300) || status === 404
    });
    return response.data;
}, circuitOptions);

const ordersCircuit = new CircuitBreaker(async (url, options = {}) => {
    const response = await axios({
        url,
        ...options,
        validateStatus: status => (status >= 200 && status < 300) || status === 404
    });
    return response.data;
}, circuitOptions);

usersCircuit.fallback(() => ({ error: 'Users service temporarily unavailable' }));
ordersCircuit.fallback(() => ({ error: 'Orders service temporarily unavailable' }));

// ==================================================================
// 🔑 JWT AUTH MIDDLEWARE
// ==================================================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user; // user.id, user.email и т.д.
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ==================================================================
// 🧍 USERS ROUTES
// ==================================================================

// Регистрация
app.post('/users/register', async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/register`, {
            method: 'POST',
            data: req.body
        });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Логин (вернёт токен)
app.post('/users/login', async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/login`, {
            method: 'POST',
            data: req.body
        });

        if (user && user.id) {
            // Генерируем JWT
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить всех пользователей (только для авторизованных)
app.get('/users', authenticateToken, async (req, res) => {
    try {
        const users = await usersCircuit.fire(`${USERS_SERVICE_URL}/users`);
        res.json(users);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить одного пользователя
app.get('/users/:userId', authenticateToken, async (req, res) => {
    try {
        const user = await usersCircuit.fire(`${USERS_SERVICE_URL}/users/${req.params.userId}`);
        if (user.error === 'User not found') return res.status(404).json(user);
        res.json(user);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================================================================
// 📦 ORDERS ROUTES (защищены авторизацией)
// ==================================================================

app.get('/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders`);
        res.json(orders);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/orders', authenticateToken, async (req, res) => {
    try {
        // Автоматически добавим userId из токена
        const orderData = { ...req.body, userId: req.user.id };
        const order = await ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders`, {
            method: 'POST',
            data: orderData
        });
        res.status(201).json(order);
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================================================================
// 🔄 Aggregation Example (user + orders)
// ==================================================================

app.get('/users/:userId/details', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.userId;

        const [user, orders] = await Promise.all([
            usersCircuit.fire(`${USERS_SERVICE_URL}/users/${userId}`),
            ordersCircuit.fire(`${ORDERS_SERVICE_URL}/orders`)
        ]);

        if (user.error === 'User not found') return res.status(404).json(user);

        const userOrders = Array.isArray(orders)
            ? orders.filter(o => o.userId == userId)
            : [];

        res.json({ user, orders: userOrders });
    } catch {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================================================================
// 🩺 Health Check
// ==================================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'API Gateway is running',
        circuits: {
            users: usersCircuit.status,
            orders: ordersCircuit.status
        }
    });
});

// ==================================================================
app.listen(PORT, () => {
    console.log(`✅ API Gateway running on port ${PORT}`);
});
