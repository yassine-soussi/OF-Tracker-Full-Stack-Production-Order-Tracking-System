
const express = require('express');
const router = express.Router();
const { getNotifications, deleteNotification, createNotification } = require('../../controllers/pdim/notificationsController');

// Récupérer toutes les notifications des dernières 24 heures
router.get('/all', getNotifications);

// Supprimer une notification
router.delete('/:id', deleteNotification);

// Créer une notification
router.post('/', createNotification);

module.exports = router;
