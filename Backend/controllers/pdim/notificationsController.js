const pool = require('../../config/db');

// Récupérer toutes les notifications des dernières 24 heures
const getNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM notifications_pdim
      WHERE date >= NOW() - INTERVAL '24 hours'
      ORDER BY date DESC
    `);

    console.log(`🔎 notifications_PDIM < 24h : ${rows.length} trouvées`);
    res.json(rows);
  } catch (err) {
    console.error("Erreur récupération notifications_PDIM :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Supprimer une notification
const deleteNotification = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM notifications_pdim WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Notification non trouvée" });
    }

    res.json({ success: true, message: "Notification supprimée avec succès" });
  } catch (err) {
    console.error("Erreur suppression notification_PDIM :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Créer une notification
const createNotification = async (req, res) => {
  const { poste, n_ordre, tool_name, cause, details, date, type_probleme } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notifications_pdim (poste, n_ordre, tool_name, cause, details, date, type_probleme)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [poste, n_ordre, tool_name, cause, details, date, type_probleme]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur création notification_PDIM :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = { getNotifications, deleteNotification, createNotification };
