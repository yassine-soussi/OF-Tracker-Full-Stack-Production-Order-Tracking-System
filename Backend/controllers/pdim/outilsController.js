const pool = require('../../config/db');

// --- GET outils par poste ---
const getOutilsByPoste = async (req, res) => {
  const { poste } = req.params;

  try {
    const planningRes = await pool.query(
      `SELECT data FROM planning_pdim WHERE poste = $1 ORDER BY importdate DESC LIMIT 1`,
      [poste]
    );
    if (!planningRes.rows.length) return res.json({ outils: [] });
    const data = planningRes.rows[0].data;

    const statutRes = await pool.query(
      `SELECT n_ordre, ordre, statut FROM statut_outils_pdim WHERE poste = $1`,
      [poste]
    );
    const statutMap = {};
    for (const row of statutRes.rows) {
      statutMap[row.n_ordre] = {
        ordre: row.ordre || null,
        statut: row.statut || "pending",
      };
    }

    const outils = Array.isArray(data)
      ? data
          .filter(entry => entry["N° ordre"])
          .map(entry => {
            const cleaned = Object.fromEntries(
              Object.entries(entry).map(([k, v]) => [k.trim(), v])
            );

            const n_ordre = String(cleaned["N° ordre"]);
            const besoin_planning =
              cleaned["Infos mors profilé / outillage"] ||
              cleaned["Infos mors profilé / outillage "] ||
              null;
            const ordre_planning =
              cleaned["Ordre"] ||
              cleaned["Ordre "] ||
              null;
            const commentaires_planif = cleaned["Commentaires Planif"] || null;

            const statutEntry = statutMap[n_ordre] || {};

            return {
              n_ordre,
              ordre: statutEntry.ordre || ordre_planning || "",
              besoin_planning,
              statut: statutEntry.statut || "pending",
              article: cleaned["Article"] || "",
              article_description: cleaned["Article Description"] || "",
              commentaires_planif // Ajout du champ Commentaires Planif
            };
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

    // ➤ 1. Upsert dans statut_outils_pdim
    if (statut === 'ready') {
      await client.query(`
        INSERT INTO statut_outils_pdim 
          (poste, n_ordre, ordre, statut, date_validation, date_signalement, cause, detaille)
        VALUES 
          ($1, $2, $3, $4, now(), NULL, '-', '-')
        ON CONFLICT (poste, n_ordre, ordre)
        DO UPDATE SET 
          statut = EXCLUDED.statut,
          date_validation = now()
      `, [poste, n_ordre, ordre, statut]);
    }

    if (statut === 'missing') {
      await client.query(`
        INSERT INTO statut_outils_pdim 
          (poste, n_ordre, ordre, statut, date_validation, date_signalement, cause, detaille)
        VALUES 
          ($1, $2, $3, $4, NULL, now(), $5, $6)
        ON CONFLICT (poste, n_ordre, ordre)
        DO UPDATE SET 
          statut = EXCLUDED.statut,
          date_validation = NULL,
          date_signalement = now(),
          cause = EXCLUDED.cause,
          detaille = EXCLUDED.detaille
      `, [
        poste,
        n_ordre,
        ordre,
        statut,
        notification?.cause ?? '-',
        notification?.details ?? '-'
      ]);

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
