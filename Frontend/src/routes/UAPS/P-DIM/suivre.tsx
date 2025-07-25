import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import NavigationMenu from "@/components/P-DIM/NavigationMenupdim";
import { PosteSelection } from "@/components/P-DIM/PosteSelectionpdim";
import { PlanningGanttManager } from "@/components/GanttShared";


export const Route = createFileRoute('/UAPS/P-DIM/suivre')({
  component: SuivrePlanning,
});

function SuivrePlanning() {
  const [poste, setPoste] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <NavigationMenu />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6 text-black">Suivre un planning</h1>
     <PosteSelection selectedPoste={poste} onSelect={setPoste} />

        {poste && (
          <PlanningGanttManager
            poste={poste}
            apiUrl="http://localhost:5000/api/pdim/suivre"
          />
        )}
      </div>
    </div>
  );
}
