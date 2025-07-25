import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/UAPS/P-DIM/journalier')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/UAPS/P-DIM/journalier"!</div>
}
