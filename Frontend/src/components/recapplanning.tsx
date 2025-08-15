// components/shared/planningShared.tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from "sonner";

// Détecte si 2 objets/arrays sont égaux (pour saveDisabled)
export const isDataEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

// Hook pour gérer l’état de planning générique (production + rupture)
export function usePlanningManager<TProd, TRupture>({
  initialProductionData,
  initialRuptureData,
  apiBase,
  defaultWeek = ''
}: {
  initialProductionData: TProd[],
  initialRuptureData: TRupture[],
  apiBase: string,
  defaultWeek?: string
}) {
  const [productionData, setProductionData] = useState<TProd[]>(initialProductionData);
  const [ruptureData, setRuptureData] = useState<TRupture[]>(initialRuptureData);
  const [weekNumber, setWeekNumber] = useState<string>(defaultWeek);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [baseProductionData, setBaseProductionData] = useState<TProd[]>(initialProductionData);
  const [baseRuptureData, setBaseRuptureData] = useState<TRupture[]>(initialRuptureData);

  // Charger le dernier planning (GET /load)
  const fetchLastPlanning = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/${apiBase}/${apiBase}/load`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      if (!data.weekNumber) throw new Error("Pas de planning");
      setProductionData(data.production || initialProductionData);
      setRuptureData(data.ruptures || initialRuptureData);
      setBaseProductionData(data.production || initialProductionData);
      setBaseRuptureData(data.ruptures || initialRuptureData);
      setWeekNumber(data.weekNumber || '');
      toast.success("Dernier planning chargé !");
    } catch {
      toast.error("Aucun planning disponible");
      setProductionData(initialProductionData);
      setRuptureData(initialRuptureData);
      setBaseProductionData(initialProductionData);
      setBaseRuptureData(initialRuptureData);
      setWeekNumber('');
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les semaines disponibles
  const fetchAvailableWeeks = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/${apiBase}/${apiBase}/weeks`);
      if (res.ok) {
        const weeks = await res.json();
        setAvailableWeeks(weeks);
      }
    } catch (error) {
      console.error('Error fetching available weeks:', error);
    }
  };

  // Charger planning par semaine (GET /by-week)
  const fetchPlanning = async (val: string) => {
    if (!val.trim()) {
      await fetchLastPlanning();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/${apiBase}/${apiBase}/by-week/${val.trim()}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      
      // Check if we have meaningful data (not just empty structure)
      const hasActualData = data.production && data.production.length > 0 &&
        data.production.some((row: any) =>
          Object.values(row).some((value: any) => value && value.toString().trim() !== "")
        );
      
      if (hasActualData) {
        // Load existing data
        setProductionData(data.production);
        setRuptureData(data.ruptures || []);
        setBaseProductionData(data.production);
        setBaseRuptureData(data.ruptures || []);
        setWeekNumber(data.weekNumber || val.trim());
        toast.success(`Planning semaine ${val.trim()} chargé !`);
      } else {
        // No data found - initialize empty table for this week
        setProductionData(initialProductionData);
        setRuptureData(initialRuptureData);
        setBaseProductionData(initialProductionData);
        setBaseRuptureData(initialRuptureData);
        setWeekNumber(val.trim());
        toast.info(`Semaine ${val.trim()} - Nouveau planning initialisé`);
      }
    } catch {
      toast.error("Erreur lors du chargement de la semaine");
      // Initialize empty table for this week even on error
      setProductionData(initialProductionData);
      setRuptureData(initialRuptureData);
      setBaseProductionData(initialProductionData);
      setBaseRuptureData(initialRuptureData);
      setWeekNumber(val.trim());
    } finally {
      setLoading(false);
    }
  };

  // Modifier la cellule production
  const handleProdCellChange = (rowIdx: number, key: keyof TProd, value: string) => {
    setProductionData(prev => {
      const arr = [...prev];
      arr[rowIdx] = { ...arr[rowIdx], [key]: value };
      return arr;
    });
  };

  // Modifier la cellule rupture
  const handleRuptureChange = (rowIdx: number, key: keyof TRupture, value: string) => {
    setRuptureData(prev => {
      const arr = [...prev];
      arr[rowIdx] = { ...arr[rowIdx], [key]: value };
      return arr;
    });
  };

  // Modifier la date rupture
  const handleRuptureDateChange = (rowIdx: number, date?: Date) => {
    const formatted = date ? format(date, "dd/MM/yyyy", { locale: fr }) : "";
    setRuptureData(prev => {
      const arr = [...prev];
      arr[rowIdx] = { ...arr[rowIdx], reception: formatted };
      return arr;
    });
  };

  // Supprimer ligne rupture
  const handleRemoveRupture = (rowIdx: number) => {
    setRuptureData(prev => prev.filter((_, idx) => idx !== rowIdx));
  };

  // Ajouter ligne rupture
  const handleAddRuptureRow = (newRuptureRow: TRupture) => {
    setRuptureData(prev => [...prev, { ...newRuptureRow }]);
  };

  // Sauvegarder
  const saveToBackend = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:5000/api/${apiBase}/${apiBase}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ production: productionData, ruptures: ruptureData, weekNumber }),
      });
      setBaseProductionData(productionData);
      setBaseRuptureData(ruptureData);
      toast.success("Données sauvegardées !");
    } catch {
      toast.error("Erreur de sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  // Clear table data when week number changes
  const clearTableData = () => {
    setProductionData(initialProductionData);
    setRuptureData(initialRuptureData);
    setBaseProductionData(initialProductionData);
    setBaseRuptureData(initialRuptureData);
  };

  // Add week to available weeks (for new week creation)
  const addWeekToAvailable = (newWeek: string) => {
    if (!availableWeeks.includes(newWeek)) {
      // Add new week at the beginning (most recent)
      const updatedWeeks = [newWeek, ...availableWeeks];
      setAvailableWeeks(updatedWeeks);
      console.log('Added new week to available weeks:', newWeek, updatedWeeks); // Debug log
    }
  };

  return {
    productionData, setProductionData,
    ruptureData, setRuptureData,
    weekNumber, setWeekNumber,
    availableWeeks, setAvailableWeeks,
    loading,
    fetchLastPlanning,
    fetchPlanning,
    fetchAvailableWeeks,
    addWeekToAvailable,
    clearTableData,
    handleProdCellChange,
    handleRuptureChange,
    handleRuptureDateChange,
    handleRemoveRupture,
    handleAddRuptureRow,
    saveToBackend,
    isSaveDisabled:
      loading ||
      (isDataEqual(productionData, baseProductionData) &&
        isDataEqual(ruptureData, baseRuptureData))
  };
}

// Fonction export Excel (production + rupture)
export function exportToExcel({
  productionData,
  ruptureData,
  prodMap,
  ruptureMap,
  weekNumber,
  filePrefix
}: {
  productionData: any[],
  ruptureData: any[],
  prodMap: (row: any) => any,         // pour adapter les labels colonnes prod
  ruptureMap: (row: any) => any,      // pour adapter les labels colonnes rupture
  weekNumber: string,
  filePrefix?: string
}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(productionData.map(prodMap)),
    "Recap Planning"
  );
  if (ruptureData.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(ruptureData.map(ruptureMap)),
      "Ruptures"
    );
  }
  const fileName = `${filePrefix || 'Recap'}-${weekNumber}.xlsx`;
  XLSX.writeFile(wb, fileName);
  toast.success(`Exporté : ${fileName}`);
}
