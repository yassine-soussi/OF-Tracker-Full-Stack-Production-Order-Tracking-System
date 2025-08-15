const pool = require('../../config/db');

// Get Gantt chart data for a specific poste with timing information
const getGanttDataByPoste = async (req, res) => {
  const { poste } = req.params;

  try {
    // 1. Get latest planning data (modifications first, then original)
    let planningRes = await pool.query(
      `SELECT data FROM planning_modifications_pdim
       WHERE poste = $1 AND deleted_at IS NULL
       ORDER BY version DESC, id DESC LIMIT 1`,
      [poste]
    );
    
    if (!planningRes.rows.length) {
      planningRes = await pool.query(
        `SELECT data FROM planning_pdim
         WHERE poste = $1 AND deleted_at IS NULL
         ORDER BY version DESC, importDate DESC LIMIT 1`,
        [poste]
      );
    }

    if (!planningRes.rows.length) {
      return res.json({
        tasks: [],
        machines: [],
        timeline_hours: 24
      });
    }

    const data = planningRes.rows[0].data;

    // 2. Get validation status with timestamps
    const [matiereRes, outilRes, productionRes] = await Promise.all([
      pool.query(
        `SELECT n_ordre, ordre, statut, date_validation, date_signalement 
         FROM statut_matiere_pdim 
         WHERE poste = $1`,
        [poste]
      ),
      pool.query(
        `SELECT n_ordre, ordre, statut, date_validation, date_signalement 
         FROM statut_outils_pdim 
         WHERE poste = $1`,
        [poste]
      ),
      pool.query(
        `SELECT n_ordre, ordre, statut_of, duree, date_validation, date_signalement 
         FROM production_statut_pdim 
         WHERE poste = $1 
         ORDER BY ordre ASC`,
        [poste]
      )
    ]);

    // 3. Create lookup maps with timing data
    const matiereMap = new Map();
    matiereRes.rows.forEach(row => {
      const key = `${row.n_ordre}_${row.ordre}`;
      matiereMap.set(key, {
        statut: row.statut,
        date_validation: row.date_validation,
        date_signalement: row.date_signalement
      });
    });

    const outilMap = new Map();
    outilRes.rows.forEach(row => {
      const key = `${row.n_ordre}_${row.ordre}`;
      outilMap.set(key, {
        statut: row.statut,
        date_validation: row.date_validation,
        date_signalement: row.date_signalement
      });
    });

    const productionMap = new Map();
    productionRes.rows.forEach(row => {
      const key = `${row.n_ordre}_${row.ordre}`;
      productionMap.set(key, {
        statut_of: row.statut_of,
        duree: row.duree,
        date_validation: row.date_validation,
        date_signalement: row.date_signalement
      });
    });

    // 4. Process planning data and create Gantt tasks
    const tasks = [];
    const machinesSet = new Set();

    if (Array.isArray(data)) {
      data.forEach(entry => {
        const cleaned = Object.fromEntries(Object.entries(entry).map(([k, v]) => [k.trim(), v]));
        const n_ordre = String(cleaned["N° ordre"] || cleaned["N° Ordre"] || cleaned.n_ordre || "");
        const ordre = cleaned["Ordre"] || "";
        const ressource = cleaned["Ressource"] || "";
        const duree_prevue = parseFloat(cleaned["Heures "] || cleaned["Heures"] || 0);

        if (!n_ordre || !ressource) return;

        const key = `${n_ordre}_${ordre}`;
        
        // Get validation status and timing
        const matiereInfo = matiereMap.get(key) || { statut: 'pending', date_validation: null };
        const outilInfo = outilMap.get(key) || { statut: 'pending', date_validation: null };
        const productionInfo = productionMap.get(key) || { statut_of: 'pending', date_validation: null };

        // Calculate start time (when both matiere and outil are validated)
        let date_debut = null;
        if (matiereInfo.statut === 'ready' && outilInfo.statut === 'ready') {
          // Start time is the later of the two validation dates
          const matiereDate = matiereInfo.date_validation;
          const outilDate = outilInfo.date_validation;
          
          if (matiereDate && outilDate) {
            date_debut = new Date(Math.max(new Date(matiereDate).getTime(), new Date(outilDate).getTime()));
          }
        }

        // Calculate end time and delays
        let date_fin = null;
        let en_retard = false;
        let retard_heures = 0;

        if (productionInfo.statut_of === 'ready' && productionInfo.date_validation && date_debut) {
          date_fin = new Date(productionInfo.date_validation);
          
          // Calculate actual duration in hours
          const duree_reelle = (date_fin.getTime() - date_debut.getTime()) / (1000 * 60 * 60);
          
          if (duree_reelle > duree_prevue) {
            en_retard = true;
            retard_heures = Math.round((duree_reelle - duree_prevue) * 100) / 100;
          }
        }

        // Add machine to set
        machinesSet.add(ressource);

        // Create task object
        const task = {
          id: `${n_ordre}_${ordre}_${ressource}`,
          n_ordre,
          ordre,
          ressource,
          duree_prevue,
          date_debut,
          date_fin,
          statut_matiere: matiereInfo.statut,
          statut_outil: outilInfo.statut,
          statut_of: productionInfo.statut_of,
          date_validation: productionInfo.date_validation,
          en_retard,
          retard_heures,
          // Additional fields for debugging/display
          matiere_validated_at: matiereInfo.date_validation,
          outil_validated_at: outilInfo.date_validation,
          production_validated_at: productionInfo.date_validation
        };

        tasks.push(task);
      });
    }

    // 5. Convert machines set to sorted array
    const machines = Array.from(machinesSet).sort();

    // 6. Calculate timeline hours (default 24, but could be dynamic based on data)
    let timeline_hours = 24;
    
    // Optional: Calculate dynamic timeline based on task durations
    if (tasks.length > 0) {
      const maxDuration = Math.max(...tasks.map(t => t.duree_prevue || 0));
      timeline_hours = Math.max(24, Math.ceil(maxDuration * 1.5)); // 50% buffer
    }

    res.json({
      tasks,
      machines,
      timeline_hours,
      poste,
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Erreur GET /gantt/:poste :", err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des données Gantt" });
  }
};

// Get summary statistics for Gantt chart
const getGanttStats = async (req, res) => {
  const { poste } = req.params;

  try {
    const statsQuery = `
      WITH task_stats AS (
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN sm.statut = 'ready' AND so.statut = 'ready' THEN 1 ELSE 0 END) as visible_tasks,
          SUM(CASE WHEN ps.statut_of = 'ready' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN ps.statut_of = 'missing' OR sm.statut = 'missing' OR so.statut = 'missing' THEN 1 ELSE 0 END) as problem_tasks,
          AVG(CASE WHEN ps.duree IS NOT NULL THEN ps.duree ELSE NULL END) as avg_duration
        FROM planning_pdim p
        LEFT JOIN statut_matiere_pdim sm ON p.poste = sm.poste
        LEFT JOIN statut_outils_pdim so ON p.poste = so.poste  
        LEFT JOIN production_statut_pdim ps ON p.poste = ps.poste
        WHERE p.poste = $1 AND p.deleted_at IS NULL
      )
      SELECT * FROM task_stats;
    `;

    const result = await pool.query(statsQuery, [poste]);
    const stats = result.rows[0] || {
      total_tasks: 0,
      visible_tasks: 0,
      completed_tasks: 0,
      problem_tasks: 0,
      avg_duration: 0
    };

    res.json({
      poste,
      stats: {
        total_tasks: parseInt(stats.total_tasks) || 0,
        visible_tasks: parseInt(stats.visible_tasks) || 0,
        completed_tasks: parseInt(stats.completed_tasks) || 0,
        problem_tasks: parseInt(stats.problem_tasks) || 0,
        avg_duration: parseFloat(stats.avg_duration) || 0,
        completion_rate: stats.total_tasks > 0 ? (stats.completed_tasks / stats.total_tasks * 100).toFixed(1) : 0
      },
      generated_at: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Erreur GET /gantt/stats/:poste :", err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des statistiques" });
  }
};

module.exports = { 
  getGanttDataByPoste, 
  getGanttStats 
};