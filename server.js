const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/trainer', require('./routes/trainerRoutes'));

app.get('/', (req, res) => {
  res.send('Internship & Task Management System API');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
