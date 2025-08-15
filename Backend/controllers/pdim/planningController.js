const pool = require('../../config/db');

// POST: Créer un nouveau planning (toujours créer une nouvelle ligne)
const createOrUpdatePlanning = async (req, res) => {
  const { poste, fileName, data } = req.body;
  if (!poste || !fileName || !data) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  try {
    // Get the highest version for this poste to increment
    const maxVersionResult = await pool.query(
      `SELECT COALESCE(MAX(version), 0) as max_version FROM planning_pdim WHERE poste = $1`,
      [poste]
    );

    const version = maxVersionResult.rows[0].max_version + 1;

    // Always INSERT a new row - never update existing ones
    await pool.query(
      `INSERT INTO planning_pdim (poste, fileName, data, importDate, version)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [poste, fileName, JSON.stringify(data), version]
    );

    res.json({ success: true, message: 'Planning enregistré avec succès', version });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde du planning" });
  }
};

// GET: Charger le planning d'un poste (latest non-deleted version only)
const getPlanning = async (req, res) => {
  const { poste } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT fileName, data, version FROM planning_pdim
       WHERE poste = $1 AND deleted_at IS NULL
       ORDER BY version DESC, importDate DESC
       LIMIT 1`,
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

// DELETE: Soft delete latest planning version for poste (and cascade to modifications)
const deletePlanning = async (req, res) => {
  const { poste } = req.params;
  try {
    // Soft delete only the latest version of planning for this poste
    const result = await pool.query(
      `UPDATE planning_pdim
       SET deleted_at = NOW()
       WHERE id = (
         SELECT id FROM planning_pdim
         WHERE poste = $1 AND deleted_at IS NULL
         ORDER BY version DESC, importDate DESC
         LIMIT 1
       )`,
      [poste]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Planning non trouvé ou déjà supprimé" });
    }

    // Cascade soft delete to modifications for this poste
    await pool.query(
      `UPDATE planning_modifications_pdim SET deleted_at = NOW() WHERE poste = $1 AND deleted_at IS NULL`,
      [poste]
    );

    res.json({ success: true, message: "Planning marqué comme supprimé (historique conservé)" });
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
    // Get latest version for this poste
    const existing = await pool.query(
      `SELECT version FROM planning_pdim
       WHERE poste = $1 AND deleted_at IS NULL
       ORDER BY version DESC, importDate DESC
       LIMIT 1`,
      [poste]
    );

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

// GET: Get planning for editing (modifications if available, otherwise original)
const getPlanningForEditing = async (req, res) => {
  const { poste } = req.params;
  try {
    // First, try to get latest modification (excluding soft deleted)
    const modificationResult = await pool.query(
      `SELECT filename, data, version, original_version FROM planning_modifications_pdim
       WHERE poste = $1 AND deleted_at IS NULL
       ORDER BY version DESC, modified_date DESC
       LIMIT 1`,
      [poste]
    );

    if (modificationResult.rows.length > 0) {
      // Return modification data
      res.json({
        fileName: modificationResult.rows[0].filename,
        data: modificationResult.rows[0].data,
        version: modificationResult.rows[0].version,
        isModified: true,
        originalVersion: modificationResult.rows[0].original_version,
      });
    } else {
      // Try to get latest original data (excluding soft deleted)
      const originalResult = await pool.query(
        `SELECT filename, data, version FROM planning_pdim
         WHERE poste = $1 AND deleted_at IS NULL
         ORDER BY version DESC, importDate DESC
         LIMIT 1`,
        [poste]
      );

      if (originalResult.rows.length > 0) {
        res.json({
          fileName: originalResult.rows[0].filename,
          data: originalResult.rows[0].data,
          version: originalResult.rows[0].version,
          isModified: false,
          originalVersion: originalResult.rows[0].version,
        });
      } else {
        res.status(404).json({ message: "Aucun planning trouvé pour ce poste" });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT: Save planning modification (separate from original)
const saveModification = async (req, res) => {
  const { poste } = req.params;
  const { fileName, data } = req.body;

  if (!fileName || !data) {
    return res.status(400).json({ error: "Champs manquants pour la modification" });
  }

  try {
    // Get latest original version to track what this modification is based on
    const originalResult = await pool.query(
      `SELECT version FROM planning_pdim
       WHERE poste = $1 AND deleted_at IS NULL
       ORDER BY version DESC, importDate DESC
       LIMIT 1`,
      [poste]
    );

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: "Aucun planning original trouvé pour ce poste" });
    }

    const originalVersion = originalResult.rows[0].version;

    // Get the highest version for this poste to increment (like import page)
    const maxVersionResult = await pool.query(
      `SELECT COALESCE(MAX(version), 0) as max_version FROM planning_modifications_pdim WHERE poste = $1`,
      [poste]
    );

    const version = maxVersionResult.rows[0].max_version + 1;

    // Always INSERT a new row - never update existing ones (like import page)
    await pool.query(
      `INSERT INTO planning_modifications_pdim (poste, filename, data, version, original_version, modified_date)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [poste, fileName, JSON.stringify(data), version, originalVersion]
    );

    res.json({
      success: true,
      message: `Modification enregistrée pour ${poste}`,
      version,
      isModified: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde de la modification" });
  }
};

// DELETE: Soft delete planning modification (revert to original)
const deleteModification = async (req, res) => {
  const { poste } = req.params;
  try {
    // Soft delete only the latest version of modification for this poste
    const result = await pool.query(
      `UPDATE planning_modifications_pdim
       SET deleted_at = NOW()
       WHERE id = (
         SELECT id FROM planning_modifications_pdim
         WHERE poste = $1 AND deleted_at IS NULL
         ORDER BY version DESC, modified_date DESC
         LIMIT 1
       )`,
      [poste]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Aucune modification trouvée pour ce poste" });
    }

    res.json({ success: true, message: "Modification supprimée, retour à la version originale" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression de la modification" });
  }
};

module.exports = {
  createOrUpdatePlanning,
  getPlanning,
  deletePlanning,
  updatePlanning,
  getPlanningForEditing,
  saveModification,
  deleteModification
};
