import { createFileRoute } from '@tanstack/react-router';
import NavigationMenu from '@/components/G-DIM/NavigationMenugdim';
import { PosteSelection } from '@/components/G-DIM/PosteSelectiongdim';
import { PlanningEditor } from '@/components/Planningedit';

function ModifiergdimPage() {
  return (
    <PlanningEditor
      apiBase="gdim"
      NavigationMenu={NavigationMenu}
      PosteSelection={PosteSelection}
    />
  );
}

export const Route = createFileRoute('/UAPS/G-DIM/modifier')({
  component: ModifiergdimPage,
});

