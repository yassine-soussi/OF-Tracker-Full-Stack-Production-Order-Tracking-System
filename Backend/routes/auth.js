const express = require('express');
const router = express.Router();
const { login, getCurrentUser, logout } = require('../controllers/authController');

// Route de connexion
router.post('/login', login);

// Route pour récupérer les informations de l'utilisateur actuel
router.get('/user/:email', getCurrentUser);

// Route de déconnexion
router.post('/logout', logout);

module.exports = router;
