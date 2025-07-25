const express = require('express');
const router = express.Router();
const { 
  getHistoriqueComplet, 
  getStatutMatiere, 
  getOutilsStatut 
} = require('../../controllers/gdim/historiquesController');

// Route GET pour l'historique complet
router.get('/historique_complet', getHistoriqueComplet);

// Route GET pour les statuts matière
router.get('/statut_matiere', getStatutMatiere);

// Route GET pour les statuts des outils
router.get('/outils_statut', getOutilsStatut);

module.exports = router;
