// backend/app.js
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware global
app.use(cors());  // Permet les requêtes cross-origin
app.use(express.json({ limit: '10mb' }));  // Accepte jusqu'à 10 Mo de JSON
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Accepte jusqu'à 10 Mo en urlencoded

// Importation des routes depuis pdim
const pdimRoutes = require('./routes/pdim/index');
const gdimRoutes = require('./routes/gdim/index'); 
const PROFILEERoutes = require('./routes/profilee/index'); 

// Utilisation des routes sous le préfixe /api/pdim
app.use('/api/pdim', pdimRoutes);  
app.use('/api/gdim', gdimRoutes); 
app.use('/api/profilee', PROFILEERoutes); 

module.exports = app;  // Exporter l'app pour l'exécution dans index.js
