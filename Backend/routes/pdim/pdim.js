const express = require('express');
const router = express.Router();
const {
  saveRecapPlanning,
  loadRecapPlanning,
  getAllRecapPlannings,
  getRecapPlanningByWeek,
  getAvailableWeeks
} = require('../../controllers/pdim/pdimController');

// Sauvegarder un recap planning
router.post('/save', saveRecapPlanning);

// Charger le recap planning de la dernière semaine
router.get('/load', loadRecapPlanning);

// Récupérer tous les recap plannings
router.get('/all', getAllRecapPlannings);

// Récupérer le recap planning d'une semaine spécifique
router.get('/by-week/:weekNumber', getRecapPlanningByWeek);

// Récupérer les numéros de semaines disponibles
router.get('/weeks', getAvailableWeeks);

module.exports = router;
