const express = require('express');
const cors = require('cors');
const app = express();





app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const pdimRoutes = require('./routes/pdim/index');
const gdimRoutes = require('./routes/gdim/index');
const profileeRoutes = require('./routes/profilee/index');

app.use('/api/auth', authRoutes);
app.use('/api/pdim', pdimRoutes);
app.use('/api/gdim', gdimRoutes);
app.use('/api/profilee', profileeRoutes);

module.exports = app;
