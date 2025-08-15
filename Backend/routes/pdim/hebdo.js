const express = require('express');
const router = express.Router();

const { getHebdoPdim, viderHebdo, getEngagementsForWeek } = require('../../controllers/pdim/hebdoController');

// Route pour récupérer les données hebdomadaires (avec offset)
router.get('/hebdo', getHebdoPdim);

// Route pour récupérer les engagements depuis P-DIM pour une semaine donnée
router.get('/engagements', getEngagementsForWeek);

// Route pour vider la base hebdo (optionnel, pour admin/test)
router.delete('/hebdo/vider', viderHebdo);

module.exports = router;
