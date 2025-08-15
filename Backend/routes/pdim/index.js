// backend/pdim/index.js
const express = require('express');
const router = express.Router();

// Importation des différentes routes de pdim
const historiqueRoutes = require('./historiques');
const matiereRoutes = require('./matiere');
const notificationRoutes = require('./notifications');
const outilRoutes = require('./outils');
const planningRoutes = require('./planning');
const productionRoutes = require('./production');
const pdimRoutes = require('./pdim');
const suivreRoutes = require('./suivre');
const dashboardRoutes = require('./journalier');
const ganttRoutes = require('./gantt');
const getHebdoPdim = require('./hebdo')



// Regroupement des routes sous les préfixes correspondants
router.use('/historiques', historiqueRoutes);  // Routes pour historiques
router.use('/matiere', matiereRoutes);          // Routes pour matière
router.use('/notifications', notificationRoutes);  // Routes pour notifications
router.use('/outils', outilRoutes);             // Routes pour outils
router.use('/planning', planningRoutes);       // Routes pour planning
router.use('/production', productionRoutes);   // Routes pour production
 router.use('/pdim', pdimRoutes);
 router.use('/suivre' , suivreRoutes);
 router.use('/journalier', dashboardRoutes); // <-- ajouter ici
 router.use('/gantt', ganttRoutes);         // Routes pour Gantt chart
 router.use('/hebdo', getHebdoPdim); 

module.exports = router;  // Exporter toutes les routes combinées pour être utilisées dans app.js
