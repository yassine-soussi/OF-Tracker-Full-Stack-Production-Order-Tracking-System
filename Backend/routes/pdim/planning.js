const express = require('express');
const router = express.Router();
const {
  createOrUpdatePlanning,
  getPlanning,
  deletePlanning,
  updatePlanning,
  getPlanningForEditing,
  saveModification,
  deleteModification,
} = require('../../controllers/pdim/planningController');

// POST: Créer ou mettre à jour un planning (import)
router.post('/', createOrUpdatePlanning);

// GET: Charger le planning d'un poste (original data only - for import page)
router.get('/:poste', getPlanning);

// GET: Charger le planning pour modification (modifications if available, otherwise original)
router.get('/:poste/edit', getPlanningForEditing);

// PUT: Sauvegarder une modification (separate from original)
router.put('/:poste/modify', saveModification);

// DELETE: Supprimer le planning d'un poste (original)
router.delete('/:poste', deletePlanning);

// DELETE: Supprimer la modification d'un poste (revert to original)
router.delete('/:poste/modify', deleteModification);

// PUT: Mise à jour du planning d'un poste (UPDATE ou INSERT si inexistant) - legacy endpoint
router.put('/:poste', updatePlanning);

module.exports = router;
