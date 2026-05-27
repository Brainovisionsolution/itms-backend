const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// =========================
// CORS CONFIGURATION
// =========================

app.use(cors({
  origin: 'https://itms.brainovision.in',
  credentials: true
}));

// =========================
// MIDDLEWARE
// =========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================
// STATIC FILES
// =========================

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =========================
// DEBUG LOGS
// =========================

console.log('Loading Routes...');

// =========================
// ROUTES
// =========================

try {
  app.use('/api/auth', require('./routes/authRoutes'));
  console.log('Auth Routes Loaded');
} catch (err) {
  console.error('Auth Routes Error:', err);
}

try {
  app.use('/api/admin', require('./routes/adminRoutes'));
  console.log('Admin Routes Loaded');
} catch (err) {
  console.error('Admin Routes Error:', err);
}

try {
  app.use('/api/student', require('./routes/studentRoutes'));
  console.log('Student Routes Loaded');
} catch (err) {
  console.error('Student Routes Error:', err);
}

try {
  app.use('/api/trainer', require('./routes/trainerRoutes'));
  console.log('Trainer Routes Loaded');
} catch (err) {
  console.error('Trainer Routes Error:', err);
}

// =========================
// ROOT ROUTE
// =========================

app.get('/', (req, res) => {
  res.send('Internship & Task Management System API');
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});