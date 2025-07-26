// routes/PROFILEE/historique.tsx
import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import NavigationMenu from '@/components/PROFILEE/NavigationMenuprofilee';
import {
  useFetchData,
  filterData,
  exportToExcel,
  HISTORIQUE_COLUMNS,
  MATIERE_COLUMNS,
  OUTIL_COLUMNS,
  HistoriqueSection
} from '@/components//HistoriqueShared';

export const Route = createFileRoute('/UAPS/PROFILEE/historique')({
  component: HistoriquePage,
});

function HistoriquePage() {
  const [search, setSearch] = useState('');
  const [posteFilter, setPosteFilter] = useState('');
  const [matiereSearch, setMatiereSearch] = useState('');
  const [outilSearch, setOutilSearch] = useState('');

  const [data] = useFetchData<any>('http://localhost:5000/api/profilee/historiques/historique_complet');
  const [matiereData] = useFetchData<any>('http://localhost:5000/api/profilee/historiques/statut_matiere');
  const [outilData] = useFetchData<any>('http://localhost:5000/api/profilee/historiques/outils_statut');

  const postes = useMemo(() => Array.from(new Set(data.map(d => d.poste))).sort(), [data]);
  const filteredData = useMemo(() => filterData(data, search, posteFilter), [data, search, posteFilter]);
  const filteredMatiere = useMemo(() => filterData(matiereData, matiereSearch), [matiereData, matiereSearch]);
  const filteredOutil = useMemo(() => filterData(outilData, outilSearch), [outilData, outilSearch]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <NavigationMenu />
      <div className="flex-1 px-15 pt-10 pb-0">
        <HistoriqueSection
          title="OF"
          columns={HISTORIQUE_COLUMNS}
          data={filteredData}
          search={search}
          setSearch={setSearch}
          selectLabel="Postes"
          selectValue={posteFilter}
          setSelectValue={setPosteFilter}
          selectOptions={postes}
          onExport={() => exportToExcel(filteredData, 'historique_complet')}
        />

        <div className="h-7" />

        <HistoriqueSection
          title="Matière"
          columns={MATIERE_COLUMNS}
          data={filteredMatiere}
          search={matiereSearch}
          setSearch={setMatiereSearch}
        />

        <div className="h-7" />

        <HistoriqueSection
          title="Outil"
          columns={OUTIL_COLUMNS}
          data={filteredOutil}
          search={outilSearch}
          setSearch={setOutilSearch}
        />
      </div>
    </div>
  );
}
