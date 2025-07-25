const pool = require('../../config/db');

// --- GET matière par poste ---
const getMatieresByPoste = async (req, res) => {
  const { poste } = req.params;

  try {
    // 1. Récupérer le dernier planning
    const planningRes = await pool.query(
      `SELECT data FROM planning_gdim WHERE poste = $1 ORDER BY importDate DESC LIMIT 1`,
      [poste]
    );

    if (!planningRes.rows.length) return res.json({ matieres: [] });

    const data = planningRes.rows[0].data;

    // 2. Récupérer les statuts des matières existants
    const statutRes = await pool.query(
      `SELECT n_ordre, ordre, statut, besoin_machine FROM statut_matiere_gdim WHERE poste = $1`,
      [poste]
    );

    const statutMap = {};
    for (const row of statutRes.rows) {
      statutMap[row.n_ordre] = {
        ordre: row.ordre || null,
        statut: row.statut,
        besoin_machine: row.besoin_machine,
      };
    }

    // 3. Construction de la liste des matières
    const matieres = Array.isArray(data)
      ? data
          .filter((entry) => entry["N° ordre"])
          .map((entry) => {
            const cleaned = Object.fromEntries(
              Object.entries(entry).map(([k, v]) => [k.trim(), v])
            );

            const n_ordre = String(cleaned["N° ordre"]);
            const besoin_planning = cleaned["Besoin machine"] || cleaned["Besoin machine "] || null;
            const ordre_planning = cleaned["Ordre"] || cleaned["Ordre "] || null;

            const article = cleaned["Article"] || cleaned["article"] || null;
            const article_description =
              cleaned["Description"] ||
              cleaned["description"] ||
              cleaned["Description article"] ||
              cleaned["Article Description"] ||
              null;
            const commentaires_planif = cleaned["Commentaires Planif"] || null;

            const statutEntry = statutMap[n_ordre] || {};

            return {
              n_ordre,
              ordre: statutEntry.ordre || ordre_planning || null,
              besoin_machine: statutEntry.besoin_machine || besoin_planning,
              statut: statutEntry.statut || "pending",
              article,
              article_description,
              commentaires_planif,
            };
          })
      : [];

    res.json({ matieres });
  } catch (err) {
    console.error("Erreur GET /matiere/of/:poste :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// --- PUT statut matière + notification + problèmes ---
const updateStatutMatiere = async (req, res) => {
  const { poste, n_ordre } = req.params;
  const { statut, besoin_machine, notification, ordre } = req.body || {};

  if (!statut || !['pending', 'ready', 'missing'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide ou manquant' });
  }

  if (!ordre) {
    return res.status(400).json({ error: "Champ 'ordre' manquant" });
  }

  const client = await pool.connect();  // Utilisation de la connexion pool

  try {
    await client.query('BEGIN');  // Début de la transaction

    // ➤ 1. Upsert dans statut_matiere_gdim
    if (statut === 'ready' || statut === 'pending') {
      await client.query(
        `INSERT INTO statut_matiere_gdim 
          (poste, n_ordre, ordre, statut, besoin_machine, date_validation)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (poste, n_ordre, ordre)
         DO UPDATE SET 
           statut = EXCLUDED.statut,
           besoin_machine = EXCLUDED.besoin_machine,
           date_validation = NOW();`,
        [poste, n_ordre, ordre, statut, besoin_machine || null]
      );
    } else if (statut === 'missing') {
      // MISSING : MAJ date_signalement, cause, detaille
      if (!notification || !notification.cause) {
        return res.status(400).json({ error: "Cause manquante pour le signalement" });
      }
      const cause = notification.cause;
      const detaille = notification.details || '-';

      await client.query(
        `INSERT INTO statut_matiere_gdim 
          (poste, n_ordre, ordre, statut, besoin_machine, date_validation, date_signalement, cause, detaille)
         VALUES ($1, $2, $3, $4, $5, NULL, NOW(), $6, $7)
         ON CONFLICT (poste, n_ordre, ordre)
         DO UPDATE SET 
           statut = EXCLUDED.statut,
           besoin_machine = EXCLUDED.besoin_machine,
           date_validation = NULL,
           date_signalement = NOW(),
           cause = EXCLUDED.cause,
           detaille = EXCLUDED.detaille;`,
        [poste, n_ordre, ordre, statut, besoin_machine || null, cause, detaille]
      );

      // ➤ 2. Insertion dans notifications_gdim
      await client.query(`
        INSERT INTO notifications_gdim
          (poste, n_ordre, tool_name, cause, details, type_probleme)
        VALUES
          ($1, $2, $3, $4, $5, 'matiere')`,
        [
          poste,
          n_ordre,
          notification?.toolName ?? '',
          notification?.cause ?? '-',
          notification?.details ?? ''
        ]
      );
    }

    await client.query('COMMIT');  // Validation de la transaction
    res.status(200).json({ message: 'Statut mis à jour avec succès' });

  } catch (err) {
    await client.query('ROLLBACK');  // Annulation de la transaction en cas d'erreur
    console.error('Erreur PUT /statut_matiere:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();  // Libération de la connexion client
  }
};

module.exports = { getMatieresByPoste, updateStatutMatiere };
