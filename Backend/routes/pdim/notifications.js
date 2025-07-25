const express = require('express');
const router = express.Router();
const { getNotifications } = require('../../controllers/pdim/notificationsController');

// Récupérer toutes les notifications des dernières 24 heures
router.get('/all', getNotifications);



module.exports = router;
