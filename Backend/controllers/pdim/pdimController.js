const pool = require('../../config/db');

// --- POST : Sauvegarder un recap planning par semaine (écrase si existe) ---
const saveRecapPlanning = async (req, res) => {
  const { production, ruptures, weekNumber } = req.body;
  try {
    await pool.query(
      `INSERT INTO recap_planning_pdim (week_number, production, ruptures, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (week_number)
        DO UPDATE SET production = $2, ruptures = $3, created_at = NOW()`,
      [weekNumber, JSON.stringify(production), JSON.stringify(ruptures)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur d'enregistrement dans la base" });
  }
};

// --- GET : Charger le recap planning de la dernière semaine ---
const loadRecapPlanning = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT production, ruptures, week_number
        FROM recap_planning_pdim
        ORDER BY created_at DESC
        LIMIT 1`
    );
    if (rows.length > 0) {
      res.json({
        production: rows[0].production,
        ruptures: rows[0].ruptures,
        weekNumber: rows[0].week_number,
      });
    } else {
      res.json({
        production: [],
        ruptures: [],
        weekNumber: ""
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Erreur de lecture base" });
  }
};

// --- GET : Récupérer tous les recap plannings ---
const getAllRecapPlannings = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT week_number, production, ruptures 
        FROM recap_planning_pdim 
        ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des plannings" });
  }
};

// --- GET : Récupérer le planning d'une semaine précise ---
const getRecapPlanningByWeek = async (req, res) => {
  const { weekNumber } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT week_number, production, ruptures 
        FROM recap_planning_pdim 
        WHERE week_number = $1 
        ORDER BY created_at DESC`,
      [weekNumber]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des plannings" });
  }
};

module.exports = {
  saveRecapPlanning,
  loadRecapPlanning,
  getAllRecapPlannings,
  getRecapPlanningByWeek
};
