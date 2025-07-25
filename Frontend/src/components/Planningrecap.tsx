import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function usePlanningManager<T extends { [key: string]: string }>(
  apiBase: string,
  initialProductionData: T[],
  initialRuptureData: any[],
  exportFileNamePrefix: string
) {
  const [productionData, setProductionData] = useState<T[]>(initialProductionData);
  const [ruptureData, setRuptureData] = useState<any[]>(initialRuptureData);
  const [weekNumber, setWeekNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [baseProductionData, setBaseProductionData] = useState<T[]>(initialProductionData);
  const [baseRuptureData, setBaseRuptureData] = useState<any[]>(initialRuptureData);

  const isDataEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

  const fetchLastPlanning = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/${apiBase}/${apiBase}/load`);
      const data = await res.json();
      if (!data.weekNumber) throw new Error();
      setProductionData(data.production || initialProductionData);
      setRuptureData(data.ruptures || initialRuptureData);
      setBaseProductionData(data.production || initialProductionData);
      setBaseRuptureData(data.ruptures || initialRuptureData);
      setWeekNumber(data.weekNumber || "");
      toast.success("Dernier planning chargé !");
    } catch {
      toast.error("Aucun planning disponible");
      setProductionData(initialProductionData);
      setRuptureData(initialRuptureData);
      setBaseProductionData(initialProductionData);
      setBaseRuptureData(initialRuptureData);
      setWeekNumber("");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanning = async (val: string) => {
    if (!val.trim()) return fetchLastPlanning();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/${apiBase}/${apiBase}/by-week/${val}`);
      const data = await res.json();
      const first = data[0];
      setProductionData(first.production || initialProductionData);
      setRuptureData(first.ruptures || []);
      setBaseProductionData(first.production || initialProductionData);
      setBaseRuptureData(first.ruptures || []);
      setWeekNumber(first.week_number || val);
      toast.success(`Planning semaine ${val} chargé !`);
    } catch {
      toast.error("Aucun planning trouvé pour cette semaine");
      await fetchLastPlanning();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastPlanning();
    // eslint-disable-next-line
  }, []);

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

  const exportToExcel = (columns: { key: keyof T; label: string }[]) => {
    const wb = XLSX.utils.book_new();
    const prodSheet = productionData.map(row => {
      const result: Record<string, string> = {};
      columns.forEach(col => {
        result[col.label] = row[col.key] || "-";
      });
      return result;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodSheet), "Recap Planning");

    if (ruptureData.length > 0) {
      const ruptureSheet = ruptureData.map((r: any) => ({
        Article: r.article,
        Quantité: r.quantite,
        Priorité: r.priorite,
        Criticité: r.criticite,
        "Date Réception": r.reception,
        Commentaire: r.commentaire,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ruptureSheet), "Ruptures");
    }

    const fileName = `${exportFileNamePrefix}-${weekNumber}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Exporté : ${fileName}`);
  };

  return {
    productionData,
    setProductionData,
    ruptureData,
    setRuptureData,
    weekNumber,
    setWeekNumber,
    loading,
    isDataEqual,
    baseProductionData,
    baseRuptureData,
    fetchPlanning,
    saveToBackend,
    exportToExcel,
  };
}
