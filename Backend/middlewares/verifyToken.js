const jwt = require('jsonwebtoken');
const SECRET = process.env.SECRET;

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { id, nom, role }
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token invalide' });
  }
};
