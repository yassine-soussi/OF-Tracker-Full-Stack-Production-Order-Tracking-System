import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import Header from '../components/ui/Header'
import Footer from '@/components/ui/Footer'// ou '@/components/Footer'
import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
