const express = require('express');
const router = express.Router();
const { getMatieresByPoste, updateStatutMatiere } = require('../../controllers/pdim/matiereController');

// Récupérer les matières par poste
router.get('/matiere/of/:poste', getMatieresByPoste);


// Mettre à jour le statut d'une matière
router.put('/statut_matiere/:poste/:n_ordre', updateStatutMatiere);

module.exports = router;
