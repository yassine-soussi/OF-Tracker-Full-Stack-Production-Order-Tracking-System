import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import NavigationMenu from "@/components/P-DIM/NavigationMenupdim";
import { PosteSelection } from "@/components/P-DIM/PosteSelectionpdim";
import SimpleTimeBasedGantt from "@/components/SimpleTimeBasedGantt";

type OFSummary = {
  poste: string;
  of_clotures: number;
  of_en_cours: number;
  heures_rendues: number;
};

type OFClosedToday = {
  n_ordre: string;
  date_started: string;
  date_closed: string;
  date_signaled?: string;
  cause?: string;
};

type OF = {
  id: string;
  ordre: string;
  n_ordre: string;
  ressource: string;
  duree: string;
  statut_matiere: 'pending' | 'ready' | 'missing';
  statut_outil: 'pending' | 'ready' | 'missing';
  statut_of: 'pending' | 'ready' | 'started' | 'missing' | 'closed';
  auto_statut_of?: 'pending' | 'ready' | 'started' | 'missing' | 'closed';
  date_lancement?: string;
};

const POSTES = ["MAM-A", "DA3-A", "A61NX", "NH4-A", "NM5-A"];

// Formate toujours une date en YYYY-MM-DD (fr-CA)
function formatDate(date: string | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date; // fallback : retourne la chaine brute si mauvaise date
  return d.toLocaleDateString("fr-CA");
}

function PDIMSummaryTable({ summary }: { summary: OFSummary[] }) {
  return (
    <div className="flex-1 min-w-[320px] mt-8">
      <h3 className="mb-4 text-xl font-semibold text-gray-900">Résumé des OF P-DIM - Aujourd'hui</h3>
      <table className="min-w-full border border-gray-200 rounded-3xl shadow-xl overflow-hidden bg-white">
        <thead>
          <tr>
            <th className="px-4 py-3 w-40 text-left text-sm font-bold text-gray-900 bg-gray-100 rounded-tl-lg">
              Poste de Charge du P-DIM
            </th>
            <th className="px-4 py-3 w-24 text-right text-sm font-bold text-gray-900 bg-gray-100">
              Nombre OF clôturés
            </th>
            <th className="px-4 py-3 w-24 text-right text-sm font-bold text-gray-900 bg-gray-100">
              Nombre OF en cours
            </th>
            <th className="px-4 py-3 w-32 text-right text-sm font-bold text-gray-900 bg-gray-100 rounded-tr-lg">
              Somme des Heures rendues
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-6 text-gray-500">Aucune donnée disponible</td>
            </tr>
          ) : (
            summary.map((row, idx) => (
              <tr
                key={row.poste}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-4 py-3 w-40 whitespace-nowrap text-gray-900">{row.poste}</td>
                <td className="px-4 py-3 w-24 whitespace-nowrap text-right text-gray-900">{row.of_clotures}</td>
                <td className="px-4 py-3 w-24 whitespace-nowrap text-right text-gray-900">{row.of_en_cours}</td>
                <td className="px-4 py-3 w-32 whitespace-nowrap text-right text-gray-900">{Number(row.heures_rendues).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function OFClosedTodayTable({ ofsClosed }: { ofsClosed: OFClosedToday[] }) {
  return (
    <div className="flex-1 min-w-[320px] mt-8">
      <h3 className="mb-4 text-xl font-semibold text-gray-900">OF clôturés aujourd'hui (lancés hier ou avant)</h3>
      <table className="min-w-full border border-gray-200 rounded-3xl shadow-xl overflow-hidden bg-white">
        <thead>
          <tr>
            <th className="px-4 py-3 w-32 text-left text-sm font-bold text-gray-900 bg-gray-100 rounded-tl-lg">
              N° Ordre
            </th>
            <th className="px-4 py-3 w-32 text-center text-sm font-bold text-gray-900 bg-gray-100">
              Date Lancé
            </th>
            <th className="px-4 py-3 w-32 text-center text-sm font-bold text-gray-900 bg-gray-100">
              Date Clôturé
            </th>
            <th className="px-4 py-3 w-32 text-center text-sm font-bold text-gray-900 bg-gray-100">
              Date Signalé
            </th>
            <th className="px-4 py-3 w-40 text-left text-sm font-bold text-gray-900 bg-gray-100 rounded-tr-lg">
              Cause
            </th>
          </tr>
        </thead>
        <tbody>
          {ofsClosed.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-6 text-gray-400">Aucun OF clôturé aujourd'hui avec lancement antérieur</td>
            </tr>
          ) : (
            ofsClosed.map((row, idx) => (
              <tr
                key={row.n_ordre}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-4 py-3 w-32 whitespace-nowrap text-gray-900">{row.n_ordre}</td>
                <td className="px-4 py-3 w-32 whitespace-nowrap text-center text-gray-900">{formatDate(row.date_started)}</td>
                <td className="px-4 py-3 w-32 whitespace-nowrap text-center text-gray-900">{formatDate(row.date_closed)}</td>
                <td className="px-4 py-3 w-32 whitespace-nowrap text-center text-gray-900">{row.date_signaled ? formatDate(row.date_signaled) : "-"}</td>
                <td className="px-4 py-3 w-40 whitespace-nowrap text-gray-900">{row.cause || "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export const Route = createFileRoute('/UAPS/P-DIM/suivre')({
  component: SuivrePlanning,
});

function SuivrePlanning() {
  const [poste, setPoste] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboardDate, setDashboardDate] = useState<string | null>(null);
  const [ofSummary, setOfSummary] = useState<OFSummary[]>([]);
  const [ofClosedToday, setOfClosedToday] = useState<OFClosedToday[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(new Date().toLocaleDateString("fr-CA"));
  const [productionData, setProductionData] = useState<{ [poste: string]: OF[] }>({});

  // Fonction pour charger les données des tables
  const loadData = async () => {
    try {
      // Fetch data from journalier API (unchanged)
      const journalierResponse = await fetch("http://localhost:5000/api/pdim/journalier");
      const journalierData = await journalierResponse.json();
      
      setDashboardDate(journalierData.date_analysee || null);
      setOfClosedToday(journalierData.of_closed_today || []);
      
      // Fetch production data for all postes
      const productionDataPromises = POSTES.map(async (poste) => {
        try {
          // Fetch status data from production endpoint
          const statusResponse = await fetch(`http://localhost:5000/api/pdim/production/${poste}`);
          const statusData = await statusResponse.json();
          
          // Process status data to match OF type
          const processedData = Array.isArray(statusData) ? statusData.map((item: any) => ({
            id: `${poste}-${item.n_ordre}`,
            ordre: item.ordre || "",
            n_ordre: item.n_ordre || "",
            ressource: item.ressource || "",
            duree: item.duree || "",
            statut_matiere: item.statut_matiere || 'pending',
            statut_outil: item.statut_outil || 'pending',
            statut_of: item.statut_of || 'pending',
            auto_statut_of: item.auto_statut_of,
            date_lancement: item.date_lancement || null,
          })) : [];
          
          return { poste, data: processedData };
        } catch (error) {
          console.error(`Error fetching production data for poste ${poste}:`, error);
          return { poste, data: [] };
        }
      });
      
      const productionResults = await Promise.all(productionDataPromises);
      const productionDataMap: { [poste: string]: OF[] } = {};
      productionResults.forEach(({ poste, data }) => {
        productionDataMap[poste] = data;
      });
      setProductionData(productionDataMap);
      
      // Update ofSummary with new "Nombre OF en cours" data
      const updatedOfSummary = (journalierData.of_summary || []).map((summary: OFSummary) => {
        const posteData = productionDataMap[summary.poste] || [];
        // Count OF with status 'started' (either statut_of or auto_statut_of)
        const ofEnCours = posteData.filter(of => 
          (of.auto_statut_of === 'started' || of.statut_of === 'started')
        ).length;
        
        return {
          ...summary,
          of_en_cours: ofEnCours,
        };
      });
      
      setOfSummary(updatedOfSummary);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue lors du chargement des données");
      setOfSummary([]);
      setOfClosedToday([]);
      setProductionData({});
    }
  };

  useEffect(() => {
    // Charger les données dès que la page s'affiche
    loadData();

    // Actualiser les données toutes les 30 secondes
    const dataInterval = setInterval(loadData, 30000);

    // Mettre à jour la date courante toutes les minutes
    const dateInterval = setInterval(() => {
      const newDate = new Date().toLocaleDateString("fr-CA");
      setCurrentDate(newDate);
    }, 60000);

    // Nettoyer les intervals lors du démontage du composant
    return () => {
      clearInterval(dataInterval);
      clearInterval(dateInterval);
    };
  }, []);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Export résumé OF P-DIM
    if (ofSummary.length > 0) {
      const summaryRows = ofSummary.map((row) => ({
        "Poste de Charge du P-DIM": row.poste,
        "Nombre OF clôturés": row.of_clotures,
        "Nombre OF en cours": row.of_en_cours,
        "Somme des Heures rendues": Number(row.heures_rendues).toFixed(2),
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé OF P-DIM");
    }

    // Export OF clôturés aujourd'hui
    if (ofClosedToday.length > 0) {
      const closedTodayRows = ofClosedToday.map((row) => ({
        "N° Ordre": row.n_ordre,
        "Date Lancé": formatDate(row.date_started),
        "Date Clôturé": formatDate(row.date_closed),
        "Date Signalé": row.date_signaled ? formatDate(row.date_signaled) : "",
        "Cause": row.cause || "",
      }));
      const wsClosedToday = XLSX.utils.json_to_sheet(closedTodayRows);
      XLSX.utils.book_append_sheet(wb, wsClosedToday, "OF clôturés aujourd'hui");
    }

    XLSX.writeFile(wb, `rapport_summary_${dashboardDate || 'today'}.xlsx`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <NavigationMenu />
      
      <main className="flex-grow p-15 max-w-8xl ml-4">
      <p className="text-2xl font-bold font-['Raleway'] mb-6 text-center tracking-wide bg-gradient-to-r from-[#ffa726] to-[#cc6600] bg-clip-text text-transparent">          Suivi P-DIM : {formatDate(currentDate)}
        </p>

        {error && <p className="text-red-600 mb-6">{error}</p>}

        {/* 1. Résumé OF P-DIM */}
        <PDIMSummaryTable summary={ofSummary} />

        {/* 2. OF clôturés aujourd'hui */}
        <OFClosedTodayTable ofsClosed={ofClosedToday} />

        {/* 3. Bouton d'export */}
        <div className="flex justify-center mt-8">
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition shadow-lg"
          >
             Exporter les tables vers Excel
          </button>
        </div>

        {/* 4. Section Gantt */}
        <div className="mt-12">
          <h1 className="text-2xl font-bold mb-6 text-black">Suivre un planning - Vue Gantt</h1>
          <PosteSelection selectedPoste={poste} onSelect={setPoste} />

          {poste && (
            <div className="mt-6">
              <SimpleTimeBasedGantt poste={poste} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
