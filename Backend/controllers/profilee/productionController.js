const pool = require('../../config/db');

// --- GET production OF par poste avec statuts dynamiques + ressource + durée ---
const getProductionByPoste = async (req, res) => {
  const { poste } = req.params;

  try {
    // 1. Récupérer le dernier planning
    const planningRes = await pool.query(
      `SELECT data FROM planning_profilee WHERE poste = $1 ORDER BY importDate DESC LIMIT 1`,
      [poste]
    );

    if (!planningRes.rows.length) return res.json([]);

    const data = planningRes.rows[0].data;

    // 2. Récupérer les statuts des matières, outils et production existants
    const [matiereRes, outilRes, ofRes] = await Promise.all([
      pool.query(`SELECT n_ordre, statut FROM statut_matiere_profilee WHERE poste = $1`, [poste]),
      pool.query(`SELECT n_ordre, statut FROM statut_outils_profilee WHERE poste = $1`, [poste]),
      pool.query(`SELECT n_ordre, statut_of, duree, ordre FROM production_statut_profilee WHERE poste = $1 ORDER BY ordre ASC`, [poste]),
    ]);

    const matiereMap = Object.fromEntries(matiereRes.rows.map(row => [row.n_ordre, row.statut]));
    const outilMap = Object.fromEntries(outilRes.rows.map(row => [row.n_ordre, row.statut]));
    const ofMap = Object.fromEntries(ofRes.rows.map(row => [row.n_ordre, { statut_of: row.statut_of, duree: row.duree, ordre: row.ordre }]));

    // 3. Construction de la liste des OF
    const ofs = Array.isArray(data)
      ? data.filter(entry => entry["N° ordre"]).map(entry => {
          const cleaned = Object.fromEntries(Object.entries(entry).map(([k, v]) => [k.trim(), v]));
          const n_ordre = String(cleaned["N° ordre"]);
          const commentaires_planif = cleaned["Commentaires Planif"] || null;

          return {
            n_ordre,
            ordre: cleaned["Ordre"] || "",
            ressource: cleaned["Ressource"] || "",
            duree: ofMap[n_ordre]?.duree || cleaned["Heures"] || "",
            statut_matiere: matiereMap[n_ordre] || 'pending',
            statut_outil: outilMap[n_ordre] || 'pending',
            statut_of: ofMap[n_ordre]?.statut_of || 'pending',
            commentaires_planif // Ajout du champ Commentaires Planif
          };
        })
      : [];

    res.json(ofs);
  } catch (err) {
    console.error("❌ Erreur GET /production/of/:poste :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// --- PUT mise à jour statut_of + durée + notification ---
const updateStatutOf = async (req, res) => {
  const { poste, n_ordre } = req.params;
  const { statut_of, duree, notification, ordre } = req.body || {};

  if (!statut_of || !['pending', 'ready', 'missing'].includes(statut_of)) {
    return res.status(400).json({ error: 'Statut OF invalide ou manquant' });
  }

  if (!ordre) {
    return res.status(400).json({ error: 'Ordre manquant' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Vérifier statut courant
    let currentStatut = 'pending';
    const currentRes = await client.query(
      `SELECT statut_of FROM production_statut_profilee WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
      [poste, n_ordre, ordre]
    );
    if (currentRes.rows.length) {
      currentStatut = currentRes.rows[0].statut_of;
    }

    // 2. Règle métier : ready = verrouillé
    if (currentStatut === 'ready') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Impossible : OF déjà validé. Action interdite.' });
    }

    // 3. Upsert selon statut demandé
    if (statut_of === 'ready') {
      await client.query(`
        INSERT INTO production_statut_profilee 
          (poste, n_ordre, statut_of, duree, ordre, date_validation, cause, detaille, date_signalement)
        VALUES 
          ($1, $2, $3, $4, $5, now(), '-', '-', NULL)
        ON CONFLICT (poste, n_ordre, ordre)
        DO UPDATE SET 
          statut_of = EXCLUDED.statut_of,
          duree = EXCLUDED.duree,
          ordre = EXCLUDED.ordre,
          date_validation = now()
      `, [poste, n_ordre, statut_of, duree || null, ordre]);
    }

    if (statut_of === 'missing' && notification && notification.cause) {
      await client.query(`
        INSERT INTO production_statut_profilee 
          (poste, n_ordre, statut_of, duree, ordre, date_validation, cause, detaille, date_signalement)
        VALUES 
          ($1, $2, $3, $4, $5, NULL, $6, $7, now())
        ON CONFLICT (poste, n_ordre, ordre)
        DO UPDATE SET 
          statut_of = EXCLUDED.statut_of,
          duree = EXCLUDED.duree,
          ordre = EXCLUDED.ordre,
          date_validation = NULL,
          date_signalement = now(),
          cause = EXCLUDED.cause,
          detaille = EXCLUDED.detaille
      `, [
        poste,
        n_ordre,
        statut_of,
        duree || null,
        ordre,
        notification.cause || '-',
        notification.details || '-'
      ]);

      // Insertion notification
      await client.query(`
        INSERT INTO notifications_profilee
          (poste, n_ordre, tool_name, cause, details, type_probleme)
        VALUES
          ($1, $2, $3, $4, $5, 'of')
      `, [
        poste,
        n_ordre,
        notification?.toolName ?? '',
        notification?.cause ?? '-',
        notification?.details ?? ''
      ]);
    }

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Statut OF et ordre mis à jour avec succès' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Erreur PUT /production/statut :", err);
    return res.status(500).json({ error: `Erreur serveur: ${err.message}` });
  } finally {
    client.release();
  }
};

module.exports = { getProductionByPoste, updateStatutOf };
