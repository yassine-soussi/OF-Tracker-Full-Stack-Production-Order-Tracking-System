// pages/UAPS/P-DIM/P-DIM.tsx
import { createFileRoute } from '@tanstack/react-router';
import NavigationMenu from '@/components/P-DIM/NavigationMenupdim';
import { EditableTable } from '@/components/EditableTable';
import { RuptureTable, type RuptureData } from '@/components/RuptureTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import {
  usePlanningManager,
  exportToExcel
} from '@/components/recapplanning';

// Types spécifiques à P-DIM
type PosteKey = "poste" | "MAM-A" | "DA3-A" | "A61NX" | "NH4-A" | "NM5-A";
type ProductionRow = {
  poste: string;
  "MAM-A": string; "DA3-A": string; "A61NX": string; "NH4-A": string; "NM5-A": string;
};
const columns: { key: PosteKey; label: string }[] = [
  { key: "poste", label: "Poste de travail" },
  { key: "MAM-A", label: "MAM-A" },
  { key: "DA3-A", label: "DA3-A" },
  { key: "A61NX", label: "A61NX" },
  { key: "NH4-A", label: "NH4-A" },
  { key: "NM5-A", label: "NM5-A" },
];
const initialProductionData: ProductionRow[] = [
  { poste: "Heures engagés", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "TRS", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "nbre de Machines Planifiés", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "nbre de Machines en panne", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "couverture Matière / heures", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "Taux de couverture Matière", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "Total Retard de lancements", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "Total Retard de lancements planifié", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "Retard de lancements projeté", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" }
];
const initialRuptureData: RuptureData[] = [];
const newRuptureRow: RuptureData = {
  article: "", quantite: "", priorite: "1", criticite: "1", reception: "", commentaire: ""
};

function TablesComponent() {
  const {
    productionData, ruptureData, weekNumber, loading,
    setWeekNumber, fetchPlanning, fetchLastPlanning,
    handleProdCellChange, handleRuptureChange, handleRuptureDateChange,
    handleRemoveRupture, handleAddRuptureRow, saveToBackend, isSaveDisabled
  } = usePlanningManager<ProductionRow, RuptureData>({
    initialProductionData,
    initialRuptureData,
    apiBase: 'pdim'
  });

  // Charger le dernier planning au montage
  useEffect(() => { fetchLastPlanning(); }, []);

  // Handlers UI
  const handleWeekNumberChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setWeekNumber(e.target.value);

  const handleWeekNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") fetchPlanning(e.currentTarget.value);
  };

  const handleExport = () => {
    exportToExcel({
      productionData,
      ruptureData,
      weekNumber,
      filePrefix: "Recap_P-DIM",
      prodMap: (row: ProductionRow) => ({
        "Poste de travail": row.poste,
        "MAM-A": row["MAM-A"] || "-",
        "DA3-A": row["DA3-A"] || "-",
        "A61NX": row["A61NX"] || "-",
        "NH4-A": row["NH4-A"] || "-",
        "NM5-A": row["NM5-A"] || "-",
      }),
      ruptureMap: (r: RuptureData) => ({
        Article: r.article, Quantité: r.quantite, Priorité: r.priorite, Criticité: r.criticite, "Date Réception": r.reception, Commentaire: r.commentaire
      }),
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="weekNumber" className="text-lg font-medium">N°.sem:</label>
          <input
            id="weekNumber"
            type="text"
            value={weekNumber}
            onChange={handleWeekNumberChange}
            onKeyDown={handleWeekNumberKeyDown}
            className="w-28 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-400"
            placeholder="2025-S29"
            disabled={loading}
          />
        </div>
        <div className="flex space-x-3">
          <Button onClick={saveToBackend} disabled={isSaveDisabled} className="bg-blue-600 text-white">
            {loading ? "Chargement..." : "Sauvegarder"}
          </Button>
          <Button onClick={handleExport} className="bg-orange-500 text-white">
            Exporter Excel
          </Button>
        </div>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-[25px] font-[Lobster] text-orange-500 font-bold">
            Recap Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EditableTable
            data={productionData}
            columns={columns}
            onCellChange={handleProdCellChange}
          />
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-[25px] font-[Lobster] text-orange-500 font-bold">
            Matières en rupture à réceptionner
          </CardTitle>
          <Button onClick={() => handleAddRuptureRow(newRuptureRow)} className="bg-green-600 text-white" size="sm">
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent>
          <RuptureTable
            data={ruptureData}
            onChange={handleRuptureChange}
            onDateChange={handleRuptureDateChange}
            onRemove={handleRemoveRupture}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RouteComponent() {
  return (
    <div className="p-0">
      <NavigationMenu />
      <main className="p-6 text-gray-700 max-w-[1400px] mx-auto">
        <TablesComponent />
      </main>
    </div>
  );
}

export const Route = createFileRoute('/UAPS/P-DIM/P-DIM')({
  component: RouteComponent,
});