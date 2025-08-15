const pool = require('../../config/db');

// --- GET matière par poste ---
const getMatieresByPoste = async (req, res) => {
  const { poste } = req.params;

  try {
    // 1. Récupérer le dernier planning (modifications d'abord, puis original)
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

    if (!planningRes.rows.length) return res.json({ matieres: [] });

    const data = planningRes.rows[0].data;

    // 2. Récupérer les statuts des matières existants
    const statutRes = await pool.query(
      `SELECT n_ordre, ordre, statut, besoin_machine, date_validation, temps_de_validation FROM statut_matiere_pdim WHERE poste = $1`,
      [poste]
    );

    const statutMap = {};
    for (const row of statutRes.rows) {
      statutMap[row.n_ordre] = {
        ordre: row.ordre || null,
        statut: row.statut,
        besoin_machine: row.besoin_machine,
        date_validation: row.date_validation || null,
        temps_de_validation: row.temps_de_validation || null,
      };
    }

    // 3. Construction de la liste des matières
    // First, get matières from planning data
    let matieres = Array.isArray(data)
      ? data
          .filter((entry) => entry["N° ordre"] || entry["N° Ordre"] || entry.n_ordre)
          .map((entry) => {
            const cleaned = Object.fromEntries(
              Object.entries(entry).map(([k, v]) => [k.trim(), v])
            );

            const n_ordre = String(cleaned["N° ordre"] || cleaned["N° Ordre"] || cleaned.n_ordre || "");
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
              date_validation: statutEntry.date_validation || null,
              temps_de_validation: statutEntry.temps_de_validation || null
            };
          })
      : [];

    // Then add matières that exist only in status data (validated but not in current planning)
    const planningNOrdres = new Set(matieres.map(m => m.n_ordre));
    Object.keys(statutMap).forEach(n_ordre => {
      if (!planningNOrdres.has(n_ordre)) {
        const statutEntry = statutMap[n_ordre];
        matieres.push({
          n_ordre,
          ordre: statutEntry.ordre || null,
          besoin_machine: statutEntry.besoin_machine || null,
          statut: statutEntry.statut || "pending",
          article: null,
          article_description: null,
          commentaires_planif: null,
          date_validation: statutEntry.date_validation || null,
          temps_de_validation: statutEntry.temps_de_validation || null
        });
      }
    });

    console.log('Total matieres found:', matieres.length);
    console.log('Matieres with date_validation:', matieres.filter(m => m.date_validation).map(m => ({
      n_ordre: m.n_ordre,
      statut: m.statut,
      date_validation: m.date_validation
    })));
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

    // ➤ 1. Check then insert/update in statut_matiere_pdim
    if (statut === 'ready' || statut === 'pending') {
      // Check if record exists
      const existingResult = await client.query(
        `SELECT id FROM statut_matiere_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
        [poste, n_ordre, ordre]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        console.log(`Updating matière ${n_ordre} with date_validation = NOW() and temps_de_validation = NOW()`);
        await client.query(
          `UPDATE statut_matiere_pdim
           SET statut = $4, besoin_machine = $5, date_validation = NOW(), temps_de_validation = NOW()
           WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
          [poste, n_ordre, ordre, statut, besoin_machine || null]
        );
      } else {
        // Insert new record
        console.log(`Inserting new matière ${n_ordre} with date_validation = NOW() and temps_de_validation = NOW()`);
        await client.query(
          `INSERT INTO statut_matiere_pdim
            (poste, n_ordre, ordre, statut, besoin_machine, date_validation, temps_de_validation)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [poste, n_ordre, ordre, statut, besoin_machine || null]
        );
      }
    } else if (statut === 'missing') {
      // MISSING : MAJ date_signalement, cause, detaille
      if (!notification || !notification.cause) {
        return res.status(400).json({ error: "Cause manquante pour le signalement" });
      }
      const cause = notification.cause;
      const detaille = notification.details || '-';

      // Check if record exists
      const existingResult = await client.query(
        `SELECT id FROM statut_matiere_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
        [poste, n_ordre, ordre]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        await client.query(
          `UPDATE statut_matiere_pdim
           SET statut = $4, besoin_machine = $5, date_validation = NULL, temps_de_validation = NULL,
               date_signalement = NOW(), cause = $6, detaille = $7
           WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
          [poste, n_ordre, ordre, statut, besoin_machine || null, cause, detaille]
        );
      } else {
        // Insert new record
        await client.query(
          `INSERT INTO statut_matiere_pdim
            (poste, n_ordre, ordre, statut, besoin_machine, date_validation, temps_de_validation, date_signalement, cause, detaille)
           VALUES ($1, $2, $3, $4, $5, NULL, NULL, NOW(), $6, $7)`,
          [poste, n_ordre, ordre, statut, besoin_machine || null, cause, detaille]
        );
      }

      // ➤ 2. Insertion dans notifications_pdim
      await client.query(`
        INSERT INTO notifications_pdim
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
