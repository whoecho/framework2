const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// In-memory DB
let fakeUsersDb = {};
let currentId = 1;

// Registration
app.post('/users/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    const existingUser = Object.values(fakeUsersDb).find(u => u.email === email);
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: currentId++, email, password: hashedPassword, name };
    fakeUsersDb[newUser.id] = newUser;

    res.status(201).json({ id: newUser.id, email: newUser.email, name: newUser.name });
});

// Login
app.post('/users/login', async (req, res) => {
    const { email, password } = req.body;
    const user = Object.values(fakeUsersDb).find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ id: user.id, email: user.email, name: user.name });
});

// Health & status
app.get('/users/health', (req, res) => {
    res.json({ status: 'OK', service: 'Users Service', timestamp: new Date().toISOString() });
});

app.get('/users/status', (req, res) => {
    res.json({ status: 'Users service is running' });
});

// CRUD (optional)
app.get('/users', (req, res) => res.json(Object.values(fakeUsersDb)));
app.get('/users/:userId', (req, res) => {
    const user = fakeUsersDb[parseInt(req.params.userId)];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, email: user.email, name: user.name });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Users service running on port ${PORT}`);
});
