// routes/P-DIM/historique.tsx

import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import NavigationMenu from '@/components/P-DIM/NavigationMenupdim';
import {
  HISTORIQUE_COLUMNS,
  MATIERE_COLUMNS,
  OUTIL_COLUMNS,
  TableWithBadges,
  useFetchData,
  filterData,
  exportToExcel
} from '@/components/HistoriqueShared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/UAPS/P-DIM/historique')({
  component: HistoriquePage,
});

function HistoriquePage() {
  const [search, setSearch] = useState('');
  const [posteFilter, setPosteFilter] = useState('');
  const [matiereSearch, setMatiereSearch] = useState('');
  const [outilSearch, setOutilSearch] = useState('');

  const [data] = useFetchData<any>('http://localhost:5000/api/pdim/historiques/historique_complet');
  const [matiereData] = useFetchData<any>('http://localhost:5000/api/pdim/historiques/statut_matiere');
  const [outilData] = useFetchData<any>('http://localhost:5000/api/pdim/historiques/outils_statut');

  const postes = useMemo(() => Array.from(new Set(data.map(d => d.poste))).sort(), [data]);

  const filteredData = useMemo(() => filterData(data, search, posteFilter), [data, search, posteFilter]);
  const filteredMatiere = useMemo(() => filterData(matiereData, matiereSearch), [matiereData, matiereSearch]);
  const filteredOutil = useMemo(() => filterData(outilData, outilSearch), [outilData, outilSearch]);

  return (
    
<div className="flex flex-col min-h-screen bg-white">
  <NavigationMenu />
  
  {/* Réduit l'espacement entre NavigationMenu et les sections */} 
  
  <div className="flex-1 px-15 pt-10 pb-0"> 
    <Section
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

    <div className="h-7" /> {/* Ajoute espace vertical entre sections */}

    <Section
      title="Matière"
      columns={MATIERE_COLUMNS}
      data={filteredMatiere}
      search={matiereSearch}
      setSearch={setMatiereSearch}
    />

    <div className="h-7" /> {/* Même espacement */}

    <Section
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

function Section({
  title,
  columns,
  data,
  search,
  setSearch,
  selectLabel,
  selectValue,
  setSelectValue,
  selectOptions,
  onExport
}: {
  title: string;
  columns: any[];
  data: any[];
  search: string;
  setSearch: (v: string) => void;
  selectLabel?: string;
  selectValue?: string;
  setSelectValue?: (v: string) => void;
  selectOptions?: string[];
  onExport?: () => void;
}) {
  const hasSearched = search.trim() !== '' || (selectValue && selectValue.trim() !== '');

  return (
    <Card className="shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold mb-2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              title === 'Historique'
                ? 'Recherche N° ordre ou ordre...'
                : 'Filtrer par N° Ordre ou Ordre...'
            }
            className="border px-4 py-2 rounded w-64"
          />
          {selectOptions && setSelectValue && (
            <select
              value={selectValue}
              onChange={e => setSelectValue(e.target.value)}
              className="border px-4 py-2 rounded w-56"
            >
              <option value=""> {selectLabel} </option>
              {selectOptions.map(o => <option key={o}>{o}</option>)}
            </select>
          )}
          {onExport && (
            <Button
              className="bg-[#ef8f0e] text-white"
              onClick={onExport}
            >
              Exporter Excel
            </Button>
          )}
        </div>

        {hasSearched ? (
          <div className="overflow-auto border rounded">
            <TableWithBadges columns={columns} data={data} />
            <div className="p-2 text-sm text-gray-600">
              {data.length} lignes affichées
            </div>
          </div>
        ) : (
          <div className="text-sm text-orange-600 px-2"></div>
        )}
      </CardContent>
    </Card>
  );
}