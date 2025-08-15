const pool = require('../../config/db');

// --- GET production OF par poste avec statuts dynamiques + ressource + durée ---
const getProductionByPoste = async (req, res) => {
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

    if (!planningRes.rows.length) return res.json([]);

    const data = planningRes.rows[0].data;

    // 2. Récupérer les statuts des matières, outils et production existants (plus récents seulement)
    const [matiereRes, outilRes, ofRes] = await Promise.all([
      pool.query(`
        SELECT DISTINCT ON (n_ordre, ordre) n_ordre, statut, ordre, date_validation
        FROM statut_matiere_pdim
        WHERE poste = $1
        ORDER BY n_ordre, ordre, id DESC`, [poste]),
      pool.query(`
        SELECT DISTINCT ON (n_ordre, ordre) n_ordre, statut, ordre, date_validation
        FROM statut_outils_pdim
        WHERE poste = $1
        ORDER BY n_ordre, ordre, id DESC`, [poste]),
      pool.query(`SELECT n_ordre, statut_of, duree, ordre, date_validation, date_lancement FROM production_statut_pdim WHERE poste = $1 ORDER BY ordre ASC`, [poste]),
    ]);

    const matiereMap = Object.fromEntries(matiereRes.rows.map(row => [`${row.n_ordre}_${row.ordre}`, { statut: row.statut, date_validation: row.date_validation }]));
    const outilMap = Object.fromEntries(outilRes.rows.map(row => [`${row.n_ordre}_${row.ordre}`, { statut: row.statut, date_validation: row.date_validation }]));
    const ofMap = Object.fromEntries(ofRes.rows.map(row => [row.n_ordre, { statut_of: row.statut_of, duree: row.duree, ordre: row.ordre, date_validation: row.date_validation, date_lancement: row.date_lancement }]));

    // 3. Construction de la liste des OF
    const ofs = Array.isArray(data)
      ? data.filter(entry => entry["N° ordre"] || entry["N° Ordre"] || entry.n_ordre).map(entry => {
          const cleaned = Object.fromEntries(Object.entries(entry).map(([k, v]) => [k.trim(), v]));
          const n_ordre = String(cleaned["N° ordre"] || cleaned["N° Ordre"] || cleaned.n_ordre || "");
          const ordre = cleaned["Ordre"] || "";
          const commentaires_planif = cleaned["Commentaires Planif"] || null;
          const Qté_restante = cleaned["Qté restante"] || null;
          
          // Clé composée pour les statuts matière et outil
          const statusKey = `${n_ordre}_${ordre}`;
          const matiereInfo = matiereMap[statusKey] || { statut: 'pending', date_validation: null };
          const outilInfo = outilMap[statusKey] || { statut: 'pending', date_validation: null };

          return {
            n_ordre,
            ordre,
            ressource: cleaned["Ressource"] || "",
            duree: ofMap[n_ordre]?.duree || cleaned["Heures "] || cleaned["Heures"] || "",
            statut_matiere: matiereInfo.statut,
            statut_outil: outilInfo.statut,
            statut_of: ofMap[n_ordre]?.statut_of || 'pending',
            date_validation: ofMap[n_ordre]?.date_validation || null,
            date_lancement: ofMap[n_ordre]?.date_lancement || null,
            matiere_date_validation: matiereInfo.date_validation,
            outil_date_validation: outilInfo.date_validation,
            commentaires_planif,
            Qté_restante
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

  if (!statut_of || !['pending', 'ready', 'started', 'missing', 'closed'].includes(statut_of)) {
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
      `SELECT statut_of FROM production_statut_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
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

    // 3. Vérifier que matière et outillage sont validés avant de valider production
    if (statut_of === 'ready') {
      const [matiereRes, outilRes] = await Promise.all([
        client.query(`SELECT statut FROM statut_matiere_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3 ORDER BY id DESC LIMIT 1`, [poste, n_ordre, ordre]),
        client.query(`SELECT statut FROM statut_outils_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3 ORDER BY id DESC LIMIT 1`, [poste, n_ordre, ordre])
      ]);

      const matiereStatus = matiereRes.rows.length > 0 ? matiereRes.rows[0].statut : 'pending';
      const outilStatus = outilRes.rows.length > 0 ? outilRes.rows[0].statut : 'pending';

      if (matiereStatus !== 'ready' || outilStatus !== 'ready') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Impossible de valider la production : la matière et les outils doivent être validés en premier.',
          details: {
            matiere_status: matiereStatus,
            outil_status: outilStatus
          }
        });
      }
    }

    // 4. Check then insert/update selon statut demandé
    if (statut_of === 'ready') {
      // Check if record exists
      const existingResult = await client.query(
        `SELECT id FROM production_statut_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
        [poste, n_ordre, ordre]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        await client.query(
          `UPDATE production_statut_pdim
           SET statut_of = $4, duree = $5, date_validation = now(),
               cause = '-', detaille = '-', date_signalement = NULL
           WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
          [poste, n_ordre, ordre, statut_of, duree || null]
        );
      } else {
        // Insert new record
        await client.query(
          `INSERT INTO production_statut_pdim
            (poste, n_ordre, statut_of, duree, ordre, date_validation, cause, detaille, date_signalement)
           VALUES ($1, $2, $3, $4, $5, now(), '-', '-', NULL)`,
          [poste, n_ordre, statut_of, duree || null, ordre]
        );
      }
    }

    if (statut_of === 'missing' && notification && notification.cause) {
      // Check if record exists
      const existingResult = await client.query(
        `SELECT id FROM production_statut_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
        [poste, n_ordre, ordre]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        await client.query(
          `UPDATE production_statut_pdim
           SET statut_of = $4, duree = $5, date_validation = NULL,
               date_signalement = now(), cause = $6, detaille = $7
           WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
          [poste, n_ordre, ordre, statut_of, duree || null, notification.cause || '-', notification.details || '-']
        );
      } else {
        // Insert new record
        await client.query(
          `INSERT INTO production_statut_pdim
            (poste, n_ordre, statut_of, duree, ordre, date_validation, cause, detaille, date_signalement)
           VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, now())`,
          [poste, n_ordre, statut_of, duree || null, ordre, notification.cause || '-', notification.details || '-']
        );
      }

      // Insertion notification
      await client.query(`
        INSERT INTO notifications_pdim
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

    // 5. Gestion du statut 'closed' - clôture de l'OF
    if (statut_of === 'closed') {
      // Vérifier que matière et outillage sont validés avant de clôturer (prendre le plus récent)
      const [matiereRes, outilRes] = await Promise.all([
        client.query(`SELECT statut FROM statut_matiere_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3 ORDER BY id DESC LIMIT 1`, [poste, n_ordre, ordre]),
        client.query(`SELECT statut FROM statut_outils_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3 ORDER BY id DESC LIMIT 1`, [poste, n_ordre, ordre])
      ]);

      const matiereStatus = matiereRes.rows.length > 0 ? matiereRes.rows[0].statut : 'pending';
      const outilStatus = outilRes.rows.length > 0 ? outilRes.rows[0].statut : 'pending';

      if (matiereStatus !== 'ready' || outilStatus !== 'ready') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Impossible de clôturer l\'OF : la matière et les outils doivent être validés en premier.',
          details: {
            matiere_status: matiereStatus,
            outil_status: outilStatus
          }
        });
      }

      // Check if record exists
      const existingResult = await client.query(
        `SELECT id FROM production_statut_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
        [poste, n_ordre, ordre]
      );
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        await client.query(
          `UPDATE production_statut_pdim
           SET statut_of = $4, duree = $5, date_validation = now(),
               cause = '-', detaille = '-', date_signalement = NULL
           WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
          [poste, n_ordre, ordre, statut_of, duree || null]
        );
      } else {
        // Insert new record
        await client.query(
          `INSERT INTO production_statut_pdim
            (poste, n_ordre, statut_of, duree, ordre, date_validation, cause, detaille, date_signalement)
           VALUES ($1, $2, $3, $4, $5, now(), '-', '-', NULL)`,
          [poste, n_ordre, statut_of, duree || null, ordre]
        );
      }
    }

    // 6. Gestion du statut 'started' - début de l'OF avec date_lancement calculé
    if (statut_of === 'started') {
      // Check if record exists
      const existingResult = await client.query(
        `SELECT id, date_lancement FROM production_statut_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
        [poste, n_ordre, ordre]
      );
      
      let calculatedDateLancement = null;
      
      // Only calculate date_lancement if it doesn't already exist
      if (existingResult.rows.length === 0 || !existingResult.rows[0].date_lancement) {
        // Get matiere and outil validation dates
        const [matiereRes, outilRes] = await Promise.all([
          client.query(`SELECT date_validation FROM statut_matiere_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3 AND statut = 'ready' ORDER BY id DESC LIMIT 1`, [poste, n_ordre, ordre]),
          client.query(`SELECT date_validation FROM statut_outils_pdim WHERE poste = $1 AND n_ordre = $2 AND ordre = $3 AND statut = 'ready' ORDER BY id DESC LIMIT 1`, [poste, n_ordre, ordre])
        ]);

        const matiereValidationDate = matiereRes.rows.length > 0 ? matiereRes.rows[0].date_validation : null;
        const outilValidationDate = outilRes.rows.length > 0 ? outilRes.rows[0].date_validation : null;

        // Get all OFs for this poste with the same resource, ordered by ordre
        const resourceOfsRes = await client.query(`
          SELECT p.n_ordre, p.ordre, p.date_validation, pl.data
          FROM production_statut_pdim p
          JOIN (
            SELECT data FROM planning_modifications_pdim
            WHERE poste = $1 AND deleted_at IS NULL
            ORDER BY version DESC, id DESC LIMIT 1
          ) pl ON true
          WHERE p.poste = $1 AND p.statut_of = 'closed'
          ORDER BY p.ordre ASC
        `, [poste]);

        // Find the resource for current OF from planning data
        let currentResource = null;
        if (resourceOfsRes.rows.length > 0 && resourceOfsRes.rows[0].data) {
          const planningData = resourceOfsRes.rows[0].data;
          const currentOF = Array.isArray(planningData) ? planningData.find(item => {
            const itemNOrdre = String(item.n_ordre || item.N_ordre || item.n_Ordre || item['N° ordre'] || item['N° Ordre'] || item['n° ordre'] || "");
            const itemOrdre = String(item.ordre || item.Ordre || item.ORDER || item['Ordre '] || "");
            return itemNOrdre === n_ordre && itemOrdre === ordre;
          }) : null;
          
          if (currentOF) {
            currentResource = currentOF.ressource || currentOF.Ressource || currentOF.RESSOURCE || "";
          }
        }

        // Find previous OF with same resource
        let previousOFValidationDate = null;
        if (currentResource) {
          const previousOFRes = await client.query(`
            SELECT p.date_validation
            FROM production_statut_pdim p
            JOIN (
              SELECT data FROM planning_modifications_pdim
              WHERE poste = $1 AND deleted_at IS NULL
              ORDER BY version DESC, id DESC LIMIT 1
            ) pl ON true
            WHERE p.poste = $1 AND p.statut_of = 'closed' AND p.ordre < $2
            ORDER BY p.ordre DESC LIMIT 1
          `, [poste, ordre]);

          if (previousOFRes.rows.length > 0) {
            // Verify this previous OF has the same resource
            const planningData = previousOFRes.rows[0].data;
            // For simplicity, we'll assume the previous OF has the same resource based on ordre ordering
            previousOFValidationDate = previousOFRes.rows[0].date_validation;
          }
        }

        // Calculate date_lancement based on business rules
        const validDates = [matiereValidationDate, outilValidationDate, previousOFValidationDate].filter(date => date !== null);
        
        if (validDates.length > 0) {
          // Find the maximum date
          const maxDate = new Date(Math.max(...validDates.map(date => new Date(date).getTime())));
          
          // For all OFs: use max date directly (no delay)
          calculatedDateLancement = maxDate;
        } else {
          // Fallback to current time if no validation dates found
          calculatedDateLancement = new Date();
        }
      }
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        await client.query(
          `UPDATE production_statut_pdim
           SET statut_of = $4, duree = $5,
               date_lancement = COALESCE(date_lancement, $6),
               cause = '-', detaille = '-', date_signalement = NULL
           WHERE poste = $1 AND n_ordre = $2 AND ordre = $3`,
          [poste, n_ordre, ordre, statut_of, duree || null, calculatedDateLancement]
        );
      } else {
        // Insert new record
        await client.query(
          `INSERT INTO production_statut_pdim
            (poste, n_ordre, statut_of, duree, ordre, date_lancement, cause, detaille, date_signalement)
           VALUES ($1, $2, $3, $4, $5, $6, '-', '-', NULL)`,
          [poste, n_ordre, statut_of, duree || null, ordre, calculatedDateLancement || new Date()]
        );
      }
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
