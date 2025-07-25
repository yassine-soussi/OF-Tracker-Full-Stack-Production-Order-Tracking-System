// components/FileUploadExcel.tsx
import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedPoste: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

export function FileUploadExcel({ onUpload, selectedPoste, inputRef }: Props) {
  return (
    <div className="border rounded-lg p-6 mb-8 shadow-lg bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">
        Importer les données pour <b>{selectedPoste}</b>
      </h2>
      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-[#ef8f0e] hover:bg-[#ef8f0e]/10 transition-colors">
        <Upload className="h-12 w-12 text-[#ef8f0e]" />
        <p className="text-lg mt-4">Cliquez pour sélectionner un fichier Excel</p>
        <input
          type="file"
          className="hidden"
          accept=".xlsx,.xls"
          onChange={onUpload}
          ref={inputRef}
        />
        <Button
          variant="outline"
          className="mt-4"
          onClick={e => {
            e.preventDefault();
            inputRef.current?.click();
          }}
        >
          Sélectionner un fichier
        </Button>
      </label>
    </div>
  );
}
