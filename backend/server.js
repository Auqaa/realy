const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { getDb } = require('./storage/fileDb');

dotenv.config({ path: path.join(__dirname, '.env') });

// Инициализируем локальную file-based БД (без MongoDB).
getDb();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/points', require('./routes/points'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api', require('./routes/navigation'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
