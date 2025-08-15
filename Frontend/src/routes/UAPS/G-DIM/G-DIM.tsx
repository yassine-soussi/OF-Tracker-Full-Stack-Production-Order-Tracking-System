// pages/UAPS/G-DIM/G-DIM.tsx
import { createFileRoute } from '@tanstack/react-router';
import NavigationMenu from '@/components/G-DIM/NavigationMenugdim';
import { EditableTable } from '@/components/EditableTable';
import { RuptureTable, type RuptureData } from '@/components/RuptureTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import {
  usePlanningManager,
  exportToExcel
} from '@/components/recapplanning';

// Types G-DIM
type PosteKey = "poste" | "MC401" | "MC501" | "NHD-A" | "NM8-A" | "V2P01" | "V2P02" | "MIN01" | "MIN02" | "MIN03";
type ProductionRow = {
  poste: string;
  "MC401": string;
  "MC501": string;
  "NHD-A": string;
  "NM8-A": string;
  "V2P01": string;
  "V2P02": string;
  "MIN01": string;
  "MIN02": string;
  "MIN03": string;
};
const columns: { key: PosteKey; label: string }[] = [
  { key: "poste", label: "Poste de travail" },
  { key: "MC401", label: "MC401" },
  { key: "MC501", label: "MC501" },
  { key: "NHD-A", label: "NHD-A" },
  { key: "NM8-A", label: "NM8-A" },
  { key: "V2P01", label: "V2P01" },
  { key: "V2P02", label: "V2P02" },
  { key: "MIN01", label: "MIN01" },
  { key: "MIN02", label: "MIN02" },
  { key: "MIN03", label: "MIN03" },
];
const initialProductionData: ProductionRow[] = [
  { poste: "Heures engagés", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" },
  { poste: "TRS", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" },
  { poste: "nbre de Machines Planifiés", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" },
  { poste: "nbre de Machines en panne", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" },
  { poste: "couverture Matière / heures", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" },
  { poste: "Taux de couverture Matière", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" },
  { poste: "Total Retard de lancements", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" },
  { poste: "Total Retard de lancements planifié", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" },
  { poste: "Retard de lancements projeté", "MC401": "", "MC501": "", "NHD-A": "", "NM8-A": "", "V2P01": "", "V2P02": "", "MIN01": "", "MIN02": "", "MIN03": "" }
];
const initialRuptureData: RuptureData[] = [];
const newRuptureRow: RuptureData = {
  article: "", quantite: "", priorite: "1", criticite: "1", reception: "", commentaire: ""
};

function TablesComponent() {
  const {
    productionData, ruptureData, weekNumber, availableWeeks, loading,
    setWeekNumber, fetchPlanning, fetchLastPlanning, fetchAvailableWeeks, addWeekToAvailable, clearTableData,
    handleProdCellChange, handleRuptureChange, handleRuptureDateChange,
    handleRemoveRupture, handleAddRuptureRow, saveToBackend, isSaveDisabled
  } = usePlanningManager<ProductionRow, RuptureData>({
    initialProductionData,
    initialRuptureData,
    apiBase: 'gdim'
  });

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newWeekInput, setNewWeekInput] = useState('');

  // Charger le dernier planning et les semaines disponibles au montage
  useEffect(() => {
    fetchLastPlanning();
    fetchAvailableWeeks();
  }, []);

  // Handlers UI
  const handleWeekSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    
    if (selectedValue === 'new') {
      setIsCreatingNew(true);
      setNewWeekInput('');
      clearTableData();
      setWeekNumber('');
    } else if (selectedValue) {
      setIsCreatingNew(false);
      setWeekNumber(selectedValue);
      fetchPlanning(selectedValue);
    }
  };

  const handleNewWeekSubmit = () => {
    if (newWeekInput.trim()) {
      const newWeek = newWeekInput.trim();
      console.log('Creating new week:', newWeek); // Debug log
      
      // Add the new week to available weeks list first
      addWeekToAvailable(newWeek);
      
      // Then set the week number and clear data
      setWeekNumber(newWeek);
      clearTableData();
      
      // Reset the form state
      setIsCreatingNew(false);
      setNewWeekInput('');
    }
  };

  const handleNewWeekKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNewWeekSubmit();
    } else if (e.key === "Escape") {
      setIsCreatingNew(false);
      setNewWeekInput('');
    }
  };

  const handleCancelNewWeek = () => {
    setIsCreatingNew(false);
    setNewWeekInput('');
    // Reset select to current week or empty
    // The select will show the current weekNumber value
  };

  const handleExport = () => {
    exportToExcel({
      productionData,
      ruptureData,
      weekNumber,
      filePrefix: "Recap_G-DIM",
      prodMap: (row: ProductionRow) => ({
        "Poste de travail": row.poste,
        "MC401": row["MC401"] || "-",
        "MC501": row["MC501"] || "-",
        "NHD-A": row["NHD-A"] || "-",
        "NM8-A": row["NM8-A"] || "-",
        "V2P01": row["V2P01"] || "-",
        "V2P02": row["V2P02"] || "-",
        "MIN01": row["MIN01"] || "-",
        "MIN02": row["MIN02"] || "-",
        "MIN03": row["MIN03"] || "-",
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
          <label htmlFor="weekSelect" className="text-lg font-medium">N°.sem:</label>
          {isCreatingNew ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newWeekInput}
                onChange={(e) => setNewWeekInput(e.target.value)}
                onKeyDown={handleNewWeekKeyDown}
                className="w-32 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-400"
                placeholder="2025-S29"
                autoFocus
              />
              <Button
                onClick={handleNewWeekSubmit}
                size="sm"
                className="bg-green-600 text-white"
                disabled={!newWeekInput.trim()}
              >
                OK
              </Button>
              <Button
                onClick={handleCancelNewWeek}
                size="sm"
                variant="outline"
              >
                Annuler
              </Button>
            </div>
          ) : (
            <select
              id="weekSelect"
              value={weekNumber}
              onChange={handleWeekSelection}
              className="w-40 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-orange-400"
              disabled={loading}
            >
              <option value="">-- Sélectionner une semaine --</option>
              {availableWeeks.map(week => (
                <option key={week} value={week}>{week}</option>
              ))}
              <option value="new">+ Nouvelle semaine</option>
            </select>
          )}
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

export const Route = createFileRoute('/UAPS/G-DIM/G-DIM')({
  component: RouteComponent,
});
