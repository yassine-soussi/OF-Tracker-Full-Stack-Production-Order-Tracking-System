// components/PosteSelection.tsx
import { Button } from "@/components/ui/button";

type Poste = string;
const POSTES: Poste[] = ["MC401", "MC501", "NHD-A", "NM8-A", "V2P01" , "V2P02" , "MIN01" ,"MIN02" , "MIN03" ];

export function PosteSelection({
  selectedPoste,
  onSelect,
}: {
  selectedPoste: Poste | null;
  onSelect: (poste: Poste) => void;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex flex-wrap items-center gap-3">
        Sélectionner le poste de charge
        {selectedPoste && (
          <span className="text-sm bg-gray-100 text-black border border-gray-300 rounded-full px-3 py-1 font-medium shadow-sm">
            Poste sélectionné : <b>{selectedPoste}</b>
          </span>
        )}
      </h2>
      <div className="flex gap-4 flex-wrap">
        {POSTES.map((p) => (
          <Button
            key={p}
            className={`
              rounded-lg border border-gray-200 font-semibold shadow-sm
              px-6 py-3 text-base transition-all
              ${selectedPoste === p
                ? "bg-[#ef8f0e] text-white hover:bg-[#e0810d]"
                : "bg-white text-black hover:border-[#ef8f0e] hover:text-[#ef8f0e] hover:bg-[#fff6e5]"}
            `}
            onClick={() => onSelect(p)}
          >
            {p}
          </Button>
        ))}
      </div>
    </div>
  );
}
