const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const login = async (req, res) => {
  const { nom, email, password } = req.body;
  console.log('Login attempt:', { nom, email, password: '***' });

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ou mot de passe manquant' });
  }

  if (!nom) {
    return res.status(400).json({ error: 'Nom requis' });
  }

  try {
    // Authenticate using email/password from users table
    console.log('Searching for user with email:', email);
    const userResult = await pool.query(
      'SELECT email, password, redirect, permissions, role FROM users WHERE email = $1',
      [email]
    );

    console.log('User search result:', userResult.rows.length, 'rows found');

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = userResult.rows[0];

    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Authentication successful - now create/update login session with custom name
    const sessionId = uuidv4();
    
    console.log('Creating login session with custom name:', nom);
    
    // First, deactivate any existing active sessions for this email
    console.log('Deactivating existing sessions for email:', email);
    const updateResult = await pool.query(
      'UPDATE login_sessions SET is_active = false WHERE email = $1 AND is_active = true',
      [email]
    );
    console.log('Deactivation result:', updateResult.rowCount, 'rows updated');

    // Create new login session with custom name
    console.log('About to insert login session:', { nom, email, sessionId });
    const sessionResult = await pool.query(
      'INSERT INTO login_sessions (custom_name, email, session_id, is_active) VALUES ($1, $2, $3, $4) RETURNING id, custom_name, email, login_time',
      [nom, email, sessionId, true]
    );
    console.log('Insert query executed, result:', sessionResult);

    const session = sessionResult.rows[0];
    console.log('Login session created:', session);

    return res.status(200).json({
      message: 'Connexion réussie',
      nom: session.custom_name, // Use custom name from login session
      email: session.email,
      redirect: user.redirect,
      permissions: JSON.parse(user.permissions || '["*"]'),
      sessionId: sessionId
    });

  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Function to get current user session by email
const getCurrentUser = async (req, res) => {
  const { email } = req.params;

  try {
    const sessionResult = await pool.query(
      'SELECT custom_name, email, login_time FROM login_sessions WHERE email = $1 AND is_active = true ORDER BY login_time DESC LIMIT 1',
      [email]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }

    const session = sessionResult.rows[0];
    
    // Also get user permissions from users table
    const userResult = await pool.query(
      'SELECT redirect, permissions, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResult.rows[0];

    return res.status(200).json({
      nom: session.custom_name,
      email: session.email,
      redirect: user.redirect,
      permissions: JSON.parse(user.permissions || '["*"]'),
      loginTime: session.login_time
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Function to logout (deactivate session)
const logout = async (req, res) => {
  const { email } = req.body;

  try {
    await pool.query(
      'UPDATE login_sessions SET is_active = false WHERE email = $1 AND is_active = true',
      [email]
    );

    return res.status(200).json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { login, getCurrentUser, logout };
