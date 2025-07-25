import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/UAPS/P-DIM/hebdomadaire')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/UAPS/P-DIM/hebdomadaire"!</div>
}
