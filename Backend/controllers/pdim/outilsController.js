const pool = require('../../config/db');

// --- GET outils par poste ---
const getOutilsByPoste = async (req, res) => {
  const { poste } = req.params;

  try {
    // First try to get latest non-deleted modification
    let planningRes = await pool.query(
      `SELECT data FROM planning_modifications_pdim
       WHERE poste = $1 AND deleted_at IS NULL
       ORDER BY version DESC, id DESC LIMIT 1`,
      [poste]
    );
    
    // If no modifications, get latest non-deleted original
    if (!planningRes.rows.length) {
      planningRes = await pool.query(
        `SELECT data FROM planning_pdim
         WHERE poste = $1 AND deleted_at IS NULL
         ORDER BY version DESC, importDate DESC LIMIT 1`,
        [poste]
      );
    }
    
    if (!planningRes.rows.length) return res.json({ outils: [] });
    const data = planningRes.rows[0].data;

    const statutRes = await pool.query(
      `SELECT n_ordre, ordre, statut, date_validation FROM statut_outils_pdim WHERE poste = $1`,
      [poste]
    );
    
    const statutMap = {};
    for (const row of statutRes.rows) {
      // Use n_ordre as primary key for simplicity
      statutMap[row.n_ordre] = {
        ordre: row.ordre || null,
        statut: row.statut || "pending",
        date_validation: row.date_validation || null,
      };
    }

    const outils = Array.isArray(data)
      ? data
          .filter(entry => entry["N° ordre"] || entry["N° ordre"] || entry.n_ordre)
          .map(entry => {
            const cleaned = Object.fromEntries(
              Object.entries(entry).map(([k, v]) => [k.trim(), v])
            );

            const n_ordre = String(cleaned["N° ordre"] || cleaned["N° Ordre"] || cleaned.n_ordre || "");
            const besoin_planning =
              cleaned["Infos mors profilé / outillage"] ||
              cleaned["Infos mors profilé / outillage "] ||
              cleaned["Info outillage / ordo / moyen"] ||
              null;
            const ordre_planning =
              cleaned["Ordre"] ||
              cleaned["Ordre "] ||
              null;
            const commentaires_planif = cleaned["Commentaires Planif"] || null;

            // Simple matching by n_ordre
            const statutEntry = statutMap[n_ordre] || {};

            const result = {
              n_ordre,
              ordre: statutEntry.ordre || ordre_planning || "",
              besoin_planning,
              statut: statutEntry.statut || "pending",
              article: cleaned["Article"] || "",
              article_description: cleaned["Article Description"] || "",
              commentaires_planif: commentaires_planif || null
            };
            
            // Explicitly set date_validation to ensure it's always included
            result.date_validation = statutEntry.date_validation ? statutEntry.date_validation : null;
            
            return result;
          })
      : [];

    res.json({ outils });
  } catch (err) {
    console.error("❌ Erreur GET /api/outils/:poste :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// --- PUT : mise à jour statut outil et notification ---
const updateStatutOutil = async (req, res) => {
  const { poste, n_ordre } = req.params;
  const { statut, ordre, notification } = req.body;

  if (!ordre) {
    return res.status(400).json({ error: "ordre est requis" });
  }

  const client = await pool.connect();  // Utilisation de pool.connect() pour obtenir une connexion client

  try {
    await client.query('BEGIN');

    // ➤ 1. Check then insert/update in statut_outils_pdim
    if (statut === 'ready') {
      // Check if record exists
      const existingResult = await client.query(
        `SELECT id FROM statut_outils_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
        [poste, n_ordre, ordre]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        await client.query(
          `UPDATE statut_outils_pdim
           SET statut = $4, date_validation = now()
           WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
          [poste, n_ordre, ordre, statut]
        );
      } else {
        // Insert new record
        await client.query(
          `INSERT INTO statut_outils_pdim
            (poste, n_ordre, ordre, statut, date_validation, date_signalement, cause, detaille)
           VALUES ($1, $2, $3, $4, now(), NULL, '-', '-')`,
          [poste, n_ordre, ordre, statut]
        );
      }
    }

    if (statut === 'missing') {
      // Check if record exists
      const existingResult = await client.query(
        `SELECT id FROM statut_outils_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
        [poste, n_ordre, ordre]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        await client.query(
          `UPDATE statut_outils_pdim
           SET statut = $4, date_validation = NULL, date_signalement = now(), cause = $5, detaille = $6
           WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
          [poste, n_ordre, ordre, statut, notification?.cause ?? '-', notification?.details ?? '-']
        );
      } else {
        // Insert new record
        await client.query(
          `INSERT INTO statut_outils_pdim
            (poste, n_ordre, ordre, statut, date_validation, date_signalement, cause, detaille)
           VALUES ($1, $2, $3, $4, NULL, now(), $5, $6)`,
          [poste, n_ordre, ordre, statut, notification?.cause ?? '-', notification?.details ?? '-']
        );
      }

      // ➤ 2. Insertion dans notifications_pdim
      await client.query(`
        INSERT INTO notifications_pdim
          (poste, n_ordre, tool_name, cause, details, type_probleme)
        VALUES
          ($1, $2, $3, $4, $5, 'outils')
      `, [
        poste,
        n_ordre,
        notification?.toolName ?? '',
        notification?.cause ?? '-',
        notification?.details ?? ''
      ]);
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erreur PUT /statut :", error);
    return res.status(500).json({ error: error.message });
  } finally {
    client.release(); // Libération de la connexion client après l'utilisation
  }
};

module.exports = { getOutilsByPoste, updateStatutOutil };
