const express = require('express');
const router = express.Router();
const { getDashboardData, saveSummary } = require('../../controllers/pdim/journalierController');

router.get('/', getDashboardData);
router.post('/saveSummary', saveSummary);  
module.exports = router;

