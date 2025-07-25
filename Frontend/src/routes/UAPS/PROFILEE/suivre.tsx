import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/UAPS/PROFILEE/suivre')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/UAPS/PROFILEE/suivre"!</div>
}
