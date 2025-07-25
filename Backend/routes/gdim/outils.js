const express = require('express');
const router = express.Router();
const { getOutilsByPoste, updateStatutOutil } = require('../../controllers/gdim/outilsController');

// Route GET pour obtenir les outils par poste
router.get('/:poste', getOutilsByPoste);

// Route PUT pour mettre à jour le statut d'un outil
router.put('/statut/:poste/:n_ordre', updateStatutOutil);

module.exports = router;
