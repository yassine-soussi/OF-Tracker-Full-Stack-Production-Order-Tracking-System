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
      if (!data || data.length === 0) throw new Error("Not found");
      const first = data[0];
      setProductionData(first.production || initialProductionData);
      setRuptureData(first.ruptures || []);
      setBaseProductionData(first.production || initialProductionData);
      setBaseRuptureData(first.ruptures || []);
      setWeekNumber(first.week_number || val.trim());
      toast.success(`Planning semaine ${val.trim()} chargé !`);
    } catch {
      toast.error("Aucun planning trouvé pour cette semaine");
      await fetchLastPlanning();
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

  return {
    productionData, setProductionData,
    ruptureData, setRuptureData,
    weekNumber, setWeekNumber,
    loading,
    fetchLastPlanning,
    fetchPlanning,
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
