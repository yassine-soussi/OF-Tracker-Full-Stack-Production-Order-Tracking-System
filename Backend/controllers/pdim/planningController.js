const pool = require('../../config/db');

// POST: Créer ou mettre à jour un planning
const createOrUpdatePlanning = async (req, res) => {
  const { poste, fileName, data } = req.body;
  if (!poste || !fileName || !data) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO planning_pdim (poste, fileName, data, importDate, version)
       VALUES ($1, $2, $3, NOW(), 1)
       ON CONFLICT (poste)
       DO UPDATE SET fileName = $2, data = $3, importDate = NOW(), version = planning_pdim.version + 1
       RETURNING version`,
      [poste, fileName, JSON.stringify(data)]
    );

    const version = result.rows[0].version;
    res.json({ success: true, message: 'Planning enregistré avec succès', version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde du planning" });
  }
};

// GET: Charger le planning d’un poste
const getPlanning = async (req, res) => {
  const { poste } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT fileName, data, version FROM planning_pdim WHERE poste = $1`,
      [poste]
    );

    if (rows.length > 0) {
      res.json({
        fileName: rows[0].fileName,
        data: rows[0].data,
        version: rows[0].version,
      });
    } else {
      res.status(404).json({ message: "Aucun planning_PDIM trouvé pour ce poste" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE: Supprimer le planning d’un poste
const deletePlanning = async (req, res) => {
  const { poste } = req.params;
  try {
    await pool.query(`DELETE FROM planning_pdim WHERE poste = $1`, [poste]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression du planning_PDIM" });
  }
};

// PUT: Mise à jour intelligente (UPDATE ou INSERT si inexistant)
const updatePlanning = async (req, res) => {
  const { poste } = req.params;
  const { fileName, data } = req.body;

  if (!fileName || !data) {
    return res.status(400).json({ error: "Champs manquants pour la mise à jour" });
  }

  try {
    const existing = await pool.query(`SELECT version FROM planning_pdim WHERE poste = $1`, [poste]);

    let version;
    if (existing.rowCount > 0) {
      version = existing.rows[0].version + 1;

      await pool.query(
        `UPDATE planning_pdim
         SET fileName = $1,
             data = $2,
             importDate = NOW(),
             version = $3
         WHERE poste = $4`,
        [fileName, JSON.stringify(data), version, poste]
      );
    } else {
      version = 1;

      await pool.query(
        `INSERT INTO planning_pdim (poste, fileName, data, importDate, version)
         VALUES ($1, $2, $3, NOW(), $4)`,
        [poste, fileName, JSON.stringify(data), version]
      );
    }
    res.json({ success: true, message: `Planning_PDIM enregistré pour ${poste}`, version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde du planning_PDIM" });
  }
};

module.exports = { createOrUpdatePlanning, getPlanning, deletePlanning, updatePlanning };
