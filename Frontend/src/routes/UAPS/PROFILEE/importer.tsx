// pages/importer.tsx
import { createFileRoute } from '@tanstack/react-router';
import NavigationMenuprofilee from '@/components/PROFILEE/NavigationMenuprofilee';
import { PosteSelection } from '@/components/PROFILEE/PosteSelectionprofilee';
import { PlanningImporter } from '@/components/PlanningImporter';

function ImporterPage() {
  return (
    <PlanningImporter
      apiBase="profilee"
      NavigationMenu={NavigationMenuprofilee}
      PosteSelection={PosteSelection}
    />
  );
}

export const Route = createFileRoute('/UAPS/PROFILEE/importer')({
  component: ImporterPage,
});
