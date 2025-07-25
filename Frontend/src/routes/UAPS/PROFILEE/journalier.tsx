import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/UAPS/PROFILEE/journalier')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/UAPS/PROFILEE/journalier"!</div>
}
