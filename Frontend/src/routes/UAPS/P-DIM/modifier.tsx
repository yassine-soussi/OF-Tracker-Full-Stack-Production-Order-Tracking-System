import { createFileRoute } from '@tanstack/react-router';
import NavigationMenupdim from '@/components/P-DIM/NavigationMenupdim';
import { PosteSelection } from '@/components/P-DIM/PosteSelectionpdim';
import { PlanningEditor } from '@/components/Planningedit';

function ModifierPdimPage() {
  return (
    <PlanningEditor
      apiBase="pdim"
      NavigationMenu={NavigationMenupdim}
      PosteSelection={PosteSelection}
    />
  );
}

export const Route = createFileRoute('/UAPS/P-DIM/modifier')({
  component: ModifierPdimPage,
});
