const pool = require('../../config/db');

// --- GET historique complet ---
const getHistoriqueComplet = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM historique_complet_gdim
      ORDER BY poste, n_ordre, ordre;
    `);
    res.json(rows);
  } catch (error) {
    console.error("Erreur récupération historique_complet :", error);
    res.status(500).json({ error: "Impossible de récupérer l'historique complet" });
  }
};

// --- GET statut matière ---
const getStatutMatiere = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM statut_matiere_gdim 
      ORDER BY poste, n_ordre, ordre;
    `);
    res.json(rows);
  } catch (error) {
    console.error("Erreur récupération statut_matiere :", error);
    res.status(500).json({ error: "Impossible de récupérer les statuts matière" });
  }
};

// --- GET statut des outils ---
const getOutilsStatut = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM statut_outils_gdim
      ORDER BY poste, n_ordre, ordre;
    `);
    res.json(rows);
  } catch (error) {
    console.error("Erreur récupération statut_outils_gdim:", error);
    res.status(500).json({ error: "Impossible de récupérer les statuts outils" });
  }
};

module.exports = {
  getHistoriqueComplet,
  getStatutMatiere,
  getOutilsStatut
};
