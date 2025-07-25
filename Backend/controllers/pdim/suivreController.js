const pool = require('../../config/db');

// Met à jour (ou insère) un planning pour un poste
const updatePlanningByPoste = async (req, res) => {
  const { poste } = req.params;
  const { filename, data, version } = req.body;

  if (!poste || !filename || !Array.isArray(data)) {
    return res.status(400).json({ error: 'Champs manquants (poste, filename, data).' });
  }

  try {
    // Supprime l'ancien si existe (par clé unique poste)
    await pool.query('DELETE FROM suivre_of_pdim WHERE poste = $1', [poste]);

    // Ajoute la nouvelle version
    await pool.query(
      `INSERT INTO suivre_of_pdim (poste, filename, data, version)
       VALUES ($1, $2, $3, $4)`,
      [poste, filename, JSON.stringify(data), version ?? 1]
    );

    res.status(200).json({ message: `Planning sauvegardé pour ${poste}.` });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
  }
};

// Récupérer le planning d’un poste
const getPlanningByPoste = async (req, res) => {
  const { poste } = req.params;
  if (!poste) return res.status(400).json({ error: 'Paramètre poste manquant.' });

  try {
    const result = await pool.query(
      `SELECT filename, data, version, importdate
         FROM suivre_of_pdim WHERE poste = $1`, [poste]);
    if (result.rows.length) {
      const row = result.rows[0];
      // Ici : data peut être string ou objet
      let parsedData = [];
      if (Array.isArray(row.data)) {
        parsedData = row.data;
      } else if (typeof row.data === 'string') {
        try {
          parsedData = JSON.parse(row.data);
        } catch {
          parsedData = [];
        }
      }
      res.status(200).json({ ...row, data: parsedData });
    } else {
      res.status(200).json({ data: [] });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération.' });
  }
};


// Supprimer un planning par poste
const deletePlanningByPoste = async (req, res) => {
  const { poste } = req.body;
  if (!poste) return res.status(400).json({ error: 'Champ poste manquant.' });
  try {
    await pool.query('DELETE FROM suivre_of_pdim WHERE poste = $1', [poste]);
    res.status(200).json({ message: `Planning supprimé pour ${poste}.` });
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur suppression.' });
  }
};

module.exports = { updatePlanningByPoste, getPlanningByPoste, deletePlanningByPoste };
