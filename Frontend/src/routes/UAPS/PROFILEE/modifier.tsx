import { createFileRoute } from '@tanstack/react-router';
import NavigationMenuprofilee from '@/components/PROFILEE/NavigationMenuprofilee';
import { PosteSelection } from '@/components/PROFILEE/PosteSelectionprofilee';
import { PlanningEditor } from  '@/components/Planningedit';

function ModifierprofileePage() {
  return (
    <PlanningEditor
      apiBase="profilee"
      NavigationMenu={NavigationMenuprofilee}
      PosteSelection={PosteSelection}
    />
  );
}

export const Route = createFileRoute('/UAPS/PROFILEE/modifier')({
  component: ModifierprofileePage,
});
