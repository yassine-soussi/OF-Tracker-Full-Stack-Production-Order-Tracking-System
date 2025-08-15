const pool = require('../../config/db');

// Liste fixe des postes à afficher
const POSTES_AUTORISES = ["A61NX", "DA3-A", "MAM-A", "NH4-A", "NM5-A"];

// Fonction pour générer les dates de la semaine de lundi à dimanche (offset = 0 pour la semaine courante)
function getCurrentWeekDates(offset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=dim, 1=lun, ..., 6=sam

  // Trouver le lundi de la semaine courante
  const diff = (dayOfWeek + 6) % 7; // (0+6)%7=6 (dimanche), (1+6)%7=0 (lundi)
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);

  // Appliquer l'offset de semaine
  monday.setDate(monday.getDate() + offset * 7);

  // Générer les 7 jours de la semaine (lundi → dimanche)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString('fr-CA'); // "YYYY-MM-DD"
  });
}

// Endpoint principal : GET /api/pdim/hebdo/hebdo?offset=0 (ou -1, etc.)
const getHebdoPdim = async (req, res) => {
  try {
    const offset = Number(req.query.offset || 0);

    // Bloquer la navigation vers le futur (offset > 0)
    if (offset > 0) {
      return res.status(400).json({ error: "Navigation vers le futur interdite." });
    }

    const dates = getCurrentWeekDates(offset);
    const postes = POSTES_AUTORISES;

    // Récupérer les données pour ces dates & postes
    const dataResult = await pool.query(
      `SELECT date_analysee, poste, total_heures_rendues
       FROM hebdo_pdim_poste
       WHERE date_analysee = ANY($1) AND poste = ANY($2)
       ORDER BY poste, date_analysee`,
      [dates, postes]
    );

    // Construire le pivot
    const dataPivot = postes.map(poste => {
      const row = { poste };
      dates.forEach(date => {
        const found = dataResult.rows.find(
          r =>
            r.poste === poste &&
            (
              r.date_analysee instanceof Date
                ? r.date_analysee.toLocaleDateString('fr-CA') === date
                : r.date_analysee === date
            )
        );
        row[date] = found ? Number(found.total_heures_rendues) : "";
      });
      return row;
    });

    res.json({ dates, postes, data: dataPivot });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Fonction pour convertir les dates de semaine en format YYYY-W##
function getWeekNumberFromDates(dates) {
  if (!dates || dates.length === 0) return null;
  
  const firstDate = new Date(dates[0]);
  const year = firstDate.getFullYear();
  
  // Calculate ISO week number
  const date = new Date(firstDate);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return `${year}-W${weekNo.toString().padStart(2, '0')}`;
}

// Endpoint pour récupérer les engagements depuis P-DIM pour une semaine donnée
const getEngagementsForWeek = async (req, res) => {
  try {
    const offset = Number(req.query.offset || 0);
    const dates = getCurrentWeekDates(offset);
    const weekNumber = getWeekNumberFromDates(dates);
    
    if (!weekNumber) {
      return res.json({ engagements: {} });
    }
    
    // Récupérer les données de P-DIM pour cette semaine
    const planningResult = await pool.query(
      `SELECT production FROM recap_planning_pdim WHERE week_number = $1 ORDER BY created_at DESC LIMIT 1`,
      [weekNumber]
    );
    
    const engagements = {};
    
    if (planningResult.rows.length > 0) {
      const production = planningResult.rows[0].production;
      
      // Chercher la ligne "Heures engagés" dans les données de production
      const heuresEngagesRow = production.find(row => row.poste === "Heures engagés");
      
      if (heuresEngagesRow) {
        // Extraire les valeurs pour chaque poste
        const postes = ["MAM-A", "DA3-A", "A61NX", "NH4-A", "NM5-A"];
        postes.forEach(poste => {
          const value = heuresEngagesRow[poste];
          if (value && !isNaN(Number(value))) {
            engagements[poste] = Number(value);
          }
        });
      }
    }
    
    res.json({ engagements, weekNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des engagements" });
  }
};

// Endpoint pour vider la base (admin uniquement, utile pour tests/dépannage)
const viderHebdo = async (_req, res) => {
  try {
    await pool.query("DELETE FROM hebdo_pdim_poste");
    res.json({ message: "Base hebdo vidée" });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors du vidage" });
  }
};

module.exports = { getHebdoPdim, viderHebdo, getEngagementsForWeek };
