import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/UAPS/G-DIM/journalier')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/UAPS/G-DIM/journalier"!</div>
}
