const pool = require('../../config/db');

// Récupérer toutes les notifications des dernières 24 heures
const getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM notifications_gdim
      WHERE date >= NOW() - INTERVAL '24 hours'
      ORDER BY date DESC
    `);

    console.log(`🔎 notifications_gdim < 24h : ${rows.length} trouvées`);
    res.json(rows);
  } catch (err) {
    console.error("Erreur récupération notifications_gdim :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Marquer une notification comme lue

module.exports = { getNotifications };
