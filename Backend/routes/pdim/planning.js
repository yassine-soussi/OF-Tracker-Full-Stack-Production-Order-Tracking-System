const express = require('express');
const router = express.Router();
const {
  createOrUpdatePlanning,
  getPlanning,
  deletePlanning,
  updatePlanning,
} = require('../../controllers/pdim/planningController');

// POST: Créer ou mettre à jour un planning
router.post('/', createOrUpdatePlanning);

// GET: Charger le planning d’un poste
router.get('/:poste', getPlanning);

// DELETE: Supprimer le planning d’un poste
router.delete('/:poste', deletePlanning);

// PUT: Mise à jour du planning d’un poste (UPDATE ou INSERT si inexistant)
router.put('/:poste', updatePlanning);

module.exports = router;
