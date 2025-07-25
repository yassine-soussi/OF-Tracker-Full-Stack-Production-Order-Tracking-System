// components/ResourceButtons.tsx
import { Button } from "@/components/ui/button";

export function ResourceButtons({
  resources,
  selected,
  onSelect,
  onClear,
}: {
  resources: string[];
  selected: string | null;
  onSelect: (r: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-4">
      
      <div className="flex flex-wrap gap-2">
        {resources.map((resource) => (
          <Button
            key={resource}
            className={`
              rounded-lg border border-gray-200 font-semibold shadow-sm
              px-5 py-2 text-base transition-all
              ${selected === resource
                ? "bg-[#ef8f0e] text-white hover:bg-[#e0810d]"
                : "bg-white text-black hover:border-[#ef8f0e] hover:text-[#ef8f0e] hover:bg-[#fff6e5]"}
            `}
            onClick={() => onSelect(resource)}
          >
            {resource}
          </Button>
        ))}
        {selected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-red-500 rounded-full px-4 py-1"
          >
            Effacer filtre
          </Button>
        )}
      </div>
    </div>
  );
}
