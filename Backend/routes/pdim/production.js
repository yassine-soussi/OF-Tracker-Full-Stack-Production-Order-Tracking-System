const express = require('express');
const router = express.Router();

const { getProductionByPoste, updateStatutOf  } = require('../../controllers/pdim/productionController'); 


// Route GET pour obtenir les productions par poste
router.get('/:poste', getProductionByPoste);

// Route PUT pour mettre à jour le statut et la durée d'un ordre de production
router.put('/statut/:poste/:n_ordre', updateStatutOf);





module.exports = router;
