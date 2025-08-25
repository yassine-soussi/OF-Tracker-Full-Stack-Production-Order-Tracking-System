// pages/UAPS/P-DIM/P-DIM.tsx
import { createFileRoute } from '@tanstack/react-router';
import NavigationMenu from '@/components/P-DIM/NavigationMenupdim';
import { EditableTable } from '@/components/EditableTable';
import { RuptureTable, type RuptureData } from '@/components/RuptureTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
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
  { poste: "Nbre de Machines Planifiés", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "Nbre de Machines en panne", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
  { poste: "Couverture Matière / heures", "MAM-A": "", "DA3-A": "", "A61NX": "", "NH4-A": "", "NM5-A": "" },
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
    productionData, ruptureData, weekNumber, availableWeeks, loading,
    setWeekNumber, fetchPlanning, fetchLastPlanning, fetchAvailableWeeks, addWeekToAvailable, clearTableData,
    handleProdCellChange, handleRuptureChange, handleRuptureDateChange,
    handleRemoveRupture, handleAddRuptureRow, saveToBackend, isSaveDisabled
  } = usePlanningManager<ProductionRow, RuptureData>({
    initialProductionData,
    initialRuptureData,
    apiBase: 'pdim'
  });

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newWeekInput, setNewWeekInput] = useState('');
  const [weekFormatError, setWeekFormatError] = useState('');

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

  // Validation function for week format
  const validateWeekFormat = (week: string): boolean => {
    // Format should be YYYY-W##, where YYYY is year and ## is week number (1-53)
    const weekRegex = /^\d{4}-W([1-9]|[1-4][0-9]|5[0-3])$/;
    return weekRegex.test(week);
  };

  const handleNewWeekSubmit = () => {
    const trimmedWeek = newWeekInput.trim();

    if (!trimmedWeek) {
      setWeekFormatError('Le numéro de semaine est requis');
      return;
    }

    if (!validateWeekFormat(trimmedWeek)) {
      setWeekFormatError('Format invalide. Utilisez le format YYYY-W## (ex: 2025-W32)');
      return;
    }

    console.log('Creating new week:', trimmedWeek); // Debug log

    // Clear any previous error
    setWeekFormatError('');

    // Add the new week to available weeks list first
    addWeekToAvailable(trimmedWeek);

    // Then set the week number and clear data
    setWeekNumber(trimmedWeek);
    clearTableData();

    // Reset the form state
    setIsCreatingNew(false);
    setNewWeekInput('');
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
    setWeekFormatError('');
  };

  // Handle input change with real-time validation feedback
  const handleWeekInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewWeekInput(value);

    if (weekFormatError) setWeekFormatError('');
  };

  // Check if the current input is valid for enabling/disabling OK button
  const isWeekFormatValid = newWeekInput.trim() && validateWeekFormat(newWeekInput.trim());

  // ---- READ-ONLY + STYLING FOR FIRST COLUMN ("poste") ----
  // Guard to block edits in first column
  const handleProdCellChangeGuard = (
    rowIndex: number,
    key: PosteKey,
    value: string
  ) => {
    if (key === 'poste') return; // block edits to first column
    handleProdCellChange(rowIndex, key, value);
  };
  // --------------------------------------------------------

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
      {/* simple global CSS to style the first column like a header (bold, no input borders) */}
      <style>{`
        /* Scope to the Recap Planning table only */
        .recap-planning table td:first-child,
        .recap-planning table th:first-child {
          font-weight: 700; /* bold */
        }
        /* Remove the "frame" on inputs in the first column (if EditableTable renders inputs there) */
        .recap-planning table td:first-child input,
        .recap-planning table td:first-child textarea {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          outline: none !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          pointer-events: none; /* also prevents focusing/editing */
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="weekSelect" className="text-lg font-medium">N°.sem:</label>
          {isCreatingNew ? (
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newWeekInput}
                  onChange={handleWeekInputChange}
                  onKeyDown={handleNewWeekKeyDown}
                  className={`w-36 border rounded px-2 py-1 focus:ring-2 focus:ring-orange-400 ${
                    weekFormatError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="2025-W32"
                  autoFocus
                />
                <Button
                  onClick={handleNewWeekSubmit}
                  size="sm"
                  className="bg-green-600 text-white"
                  disabled={!isWeekFormatValid}
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
              {weekFormatError && (
                <p className="text-red-500 text-sm ml-0">{weekFormatError}</p>
              )}
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
          <CardTitle className="text-[25px] font-['Raleway'] text-[#ef8f0e] ]">
            Recap Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="recap-planning">
            <EditableTable
              data={productionData}
              columns={columns}
              // keep column 1 read-only
              onCellChange={handleProdCellChangeGuard}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="text-[25px] font-['Raleway'] text-orange-500 font-bold">
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
