import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import NavigationMenupdim from "@/components/P-DIM/NavigationMenupdim";

// Type d’une ligne de pivot (par poste)
type PivotRow = {
  poste: string;
  [date: string]: number | string; // date = YYYY-MM-DD, valeur (nombre d'heures) ou ""
};

// Fonction pour obtenir le numéro de semaine ISO (lundi = premier jour de semaine)
function getWeekNumber(dateString: string) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    (
      ((date.getTime() - yearStart.getTime()) / 86400000) + 1
    ) / 7
  );
  return weekNo;
}
// Export Excel du tableau
function exportTableToExcel(
  dates: string[],
  data: PivotRow[],
  engagements: { [poste: string]: number }
) {
  const headers = [
    "Poste",
    ...dates,
    "Engagement de prod",
    "Taux d'avancement",
  ];
  const rows = data.map((row) => {
    const engagement = engagements[row.poste] ?? "";
    const total = dates.reduce(
      (sum, date) =>
        sum + (typeof row[date] === "number" ? Number(row[date]) : 0),
      0
    );
    const taux =
      engagement && Number(engagement) > 0
        ? `${Math.round((total / Number(engagement)) * 1000) / 10} %`
        : "-";
    return [
      row.poste,
      ...dates.map((date) =>
        row[date] === "" || row[date] === 0 ? "-" : row[date]
      ),
      engagement,
      taux,
    ];
  });

  // === Calculer la ligne TOTAL ===
  const totalByDate = dates.map(date =>
    data.reduce((sum, row) => sum + (typeof row[date] === "number" ? Number(row[date]) : 0), 0)
  );
  const totalEngagement = Object.values(engagements).reduce(
    (sum, val) => sum + (typeof val === "number" && !isNaN(val) ? Number(val) : 0),
    0
  );
  const totalHeuresRendues = totalByDate.reduce((a, b) => a + b, 0);
  const tauxTotal =
    totalEngagement > 0
      ? `${Math.round((totalHeuresRendues / totalEngagement) * 1000) / 10} %`
      : "-";
  const totalRow = [
    "Total",
    ...totalByDate,
    totalEngagement === 0 ? "-" : totalEngagement,
    tauxTotal,
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapport hebdo");
  XLSX.writeFile(wb, "Rapport hebdo -pdim.xlsx");
}

// Vider la base hebdo


// Table d’affichage
function HebdoTable({
  dates,
  data,
  engagements,
}: {
  dates: string[];
  data: PivotRow[];
  engagements: { [poste: string]: number };
}) {
  // === LIGNE TOTALE ===
  const totalByDate = dates.map(date =>
    data.reduce((sum, row) => sum + (typeof row[date] === "number" ? Number(row[date]) : 0), 0)
  );
  const totalEngagement = Object.values(engagements).reduce(
    (sum, val) => sum + (typeof val === "number" && !isNaN(val) ? Number(val) : 0),
    0
  );
  const totalHeuresRendues = totalByDate.reduce((a, b) => a + b, 0);
  const tauxTotal =
    totalEngagement > 0
      ? `${Math.round((totalHeuresRendues / totalEngagement) * 1000) / 10} %`
      : "-";

  return (
   <div className="overflow-x-auto flex justify-center mt-6">
 <table className="min-w-full border border-gray-200 rounded-3xl shadow-xl overflow-hidden bg-white">
    <thead className="bg-gray-100 text-gray-900 rounded-t-lg border-b border-gray-200">
  <tr>
    <th className="px-4 py-3 text-left text-sm font-bold rounded-tl-lg">
      Poste
    </th>
    {dates.map((date, idx) => (
      <th
        key={date}
        className={`px-4 py-3 text-center text-sm font-bold border-b border-gray-200 ${
          idx === dates.length - 1 ? "rounded-tr-lg" : ""
        }`}
      >
        <div className="uppercase font-bold text-xs">
          {new Date(date).toLocaleDateString("fr-FR", { weekday: "long" })}
        </div>
        <div className="text-xs text-gray-500 font-normal">
          {new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}
        </div>
      </th>
    ))}
    <th className="bg-gray-100 px-4 py-3 text-center text-sm font-bold border-b border-gray-200">
      Engagement de prod
    </th>
    <th className="bg-gray-100 px-4 py-3 text-center text-sm font-bold border-b border-gray-200 rounded-tr-lg">
      Taux d'avancement
    </th>
  </tr>
</thead>

    <tbody>
      {data.map((row) => {
        const engagement = engagements[row.poste] ?? "";
        const total = dates.reduce(
          (sum, date) => sum + (typeof row[date] === "number" ? Number(row[date]) : 0),
          0
        );
        const taux =
          engagement && Number(engagement) > 0
            ? `${Math.round((total / Number(engagement)) * 1000) / 10} %`
            : "-";
        return (
          <tr key={row.poste} className="hover:bg-orange-50 transition">
            <th className="px-4 py-4 text-left text-gray-800 border-b font-medium bg-gray-50">
              {row.poste}
            </th>
            {dates.map((date, i) => (
              <td
                key={i}
                className="px-2 py-4 text-center border-b text-base "
              >
                {row[date] === "" || row[date] === 0 ? "-" : row[date]}
              </td>
            ))}
            <td className="font-semibold px-2 py-4 text-center border-b">
              {engagement || "-"}
            </td>
            <td className="font-semibold px-2 py-4 text-center border-b">
              {taux}
            </td>
          </tr>
        );
      })}

    </tbody>
  </table>
</div>

  );
}

function RouteComponent() {
  const [dates, setDates] = useState<string[]>([]);
  const [data, setData] = useState<PivotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState<{ [poste: string]: number }>({});
  const [weekOffset, setWeekOffset] = useState(0);
  const isCurrentWeek = weekOffset === 0;



  useEffect(() => {
    setLoading(true);
    
    // Fetch both hebdo data and engagements
    Promise.all([
      fetch(`http://localhost:5000/api/pdim/hebdo/hebdo?offset=${weekOffset}`).then((res) => res.json()),
      fetch(`http://localhost:5000/api/pdim/hebdo/engagements?offset=${weekOffset}`).then((res) => res.json())
    ])
    .then(([hebdoJson, engagementsJson]) => {
      setDates(hebdoJson.dates || []);
      setData(hebdoJson.data || []);
      
      // Auto-populate engagements from P-DIM data
      if (engagementsJson.engagements) {
        setEngagements(engagementsJson.engagements);
      } else {
        // Reset engagements if no data found
        setEngagements({});
      }
    })
    .catch(() => {
      setDates([]);
      setData([]);
      setEngagements({});
    })
    .finally(() => setLoading(false));
  }, [weekOffset]);


  return (
    <div className="min-h-screen flex flex-col bg-white">
      <NavigationMenupdim />
      <main className="p-8">
        <h2 
    className="text-2xl font-bold font-['Raleway'] mb-6 text-center tracking-wide bg-gradient-to-r from-[#ffa726] to-[#cc6600] bg-clip-text text-transparent">          Heures rendues et taux d'avencement
        </h2>
         {/* === NAVIGATION ENTRE LES SEMAINES ICI === */}
  <div className="flex gap-4 mb-6 justify-center">
    <button
      className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg font-semibold"
      onClick={() => setWeekOffset(weekOffset - 1)}
    >
      ← Semaine précédente
    </button>
   <span className="text-lg font-semibold px-4 py-1 rounded-xl  text-black-700 shadow-sm">

  {dates.length > 0 && (
    <>
      <span className="mr-2 text-gray-600 font-bold text-base">
        Semaine&nbsp;{getWeekNumber(dates[0])} : 
      </span>
       du&nbsp;
      <span className="font-semibold">
        {new Date(dates[0]).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
      </span>
      &nbsp;au&nbsp;
      <span className="font-semibold">
        {new Date(dates[dates.length - 1]).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
      </span>
    </>
  )}
</span>

   <button
  className={`px-4 py-2 rounded-lg font-semibold transition 
    ${isCurrentWeek ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-200 hover:bg-gray-300"}`}
  onClick={() => {
    if (!isCurrentWeek) setWeekOffset(weekOffset + 1);
  }}
  disabled={isCurrentWeek}
>
  Semaine suivante →
</button>

  </div>
        {/* === BOUTONS D'ACTIONS === */}
        <div className="flex gap-4 mb-6 justify-end">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            onClick={() => exportTableToExcel(dates, data, engagements)}
          >
            Exporter en Excel
          </button>
  
        </div>
        {loading ? (
          <div className="text-center">Chargement...</div>
        ) : (
          <HebdoTable
            dates={dates}
            data={data}
            engagements={engagements}
          />
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute("/UAPS/P-DIM/hebdomadaire")({
  component: RouteComponent,
});

export default RouteComponent;
