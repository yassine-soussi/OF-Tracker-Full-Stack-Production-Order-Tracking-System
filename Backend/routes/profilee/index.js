const express = require('express');
const router = express.Router();
const verifyToken = require('../../middlewares/verifyToken');

// Import des sous-routeurs
const historiqueRoutes = require('./historiques');
const matiereRoutes = require('./matiere');
const notificationRoutes = require('./notifications');
const outilRoutes = require('./outils');
const planningRoutes = require('./planning');
const productionRoutes = require('./production');
const profileeRoutes = require('./profilee');  // <-- c’est ici le sous-routeur profilee.js

// Apply verifyToken middleware to all profilee routes
router.use(verifyToken);

// Utilisation des sous-routeurs
router.use('/historiques', historiqueRoutes);
router.use('/matiere', matiereRoutes);
router.use('/notifications', notificationRoutes);
router.use('/outils', outilRoutes);
router.use('/planning', planningRoutes);
router.use('/production', productionRoutes);
router.use('/profilee', profileeRoutes);

module.exports = router;
