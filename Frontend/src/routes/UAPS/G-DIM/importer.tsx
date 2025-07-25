// pages/G-DIM/importer.tsx
import { createFileRoute } from '@tanstack/react-router';
import NavigationMenugdim from '@/components/G-DIM/NavigationMenugdim';
import { PosteSelection } from '@/components/G-DIM/PosteSelectiongdim';
import { PlanningImporter } from '@/components/PlanningImporter';

function ImporterGdimPage() {
  return (
    <PlanningImporter
      apiBase="gdim"
      NavigationMenu={NavigationMenugdim}
      PosteSelection={PosteSelection}
    />
  );
}

export const Route = createFileRoute('/UAPS/G-DIM/importer')({
  component: ImporterGdimPage,
});
