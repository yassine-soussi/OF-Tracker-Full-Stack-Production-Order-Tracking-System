const express = require('express');
const router = express.Router();

// Importer le controller — adapte le chemin selon ta structure
const controller = require('../../controllers/pdim/suivreController');


router.put('/:poste', controller.updatePlanningByPoste);
router.get('/:poste', controller.getPlanningByPoste);
router.delete('/delete', controller.deletePlanningByPoste);


module.exports = router;
