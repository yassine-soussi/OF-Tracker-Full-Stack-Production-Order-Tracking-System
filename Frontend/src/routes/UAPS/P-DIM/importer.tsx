// pages/importer.tsx
import { createFileRoute } from '@tanstack/react-router';
import NavigationMenupdim from '@/components/P-DIM/NavigationMenupdim';
import { PosteSelection } from '@/components/P-DIM/PosteSelectionpdim';
import { PlanningImporter } from '@/components/PlanningImporter';

function ImporterPage() {
  return (
    <PlanningImporter
      apiBase="pdim"
      NavigationMenu={NavigationMenupdim}
      PosteSelection={PosteSelection}
    />
  );
}

export const Route = createFileRoute('/UAPS/P-DIM/importer')({
  component: ImporterPage,
});
