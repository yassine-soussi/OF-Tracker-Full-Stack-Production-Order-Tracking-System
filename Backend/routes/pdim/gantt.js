const express = require('express');
const router = express.Router();
const { getGanttDataByPoste, getGanttStats } = require('../../controllers/pdim/ganttController');

// GET /api/pdim/gantt/stats/:poste - Get Gantt statistics for a specific poste (must come first)
router.get('/stats/:poste', getGanttStats);

// GET /api/pdim/gantt/:poste - Get Gantt chart data for a specific poste
router.get('/:poste', getGanttDataByPoste);

module.exports = router;