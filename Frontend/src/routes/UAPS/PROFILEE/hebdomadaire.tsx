import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/UAPS/PROFILEE/hebdomadaire')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/UAPS/PROFILEE/hebdomadaire"!</div>
}
