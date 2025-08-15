import { Outlet, createRootRouteWithContext, useLocation, useNavigate } from '@tanstack/react-router'
import Header from '../components/ui/Header'
import Footer from '@/components/ui/Footer'// ou '@/components/Footer'
import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { hasPermission, getUserPermissions } from '@/lib/permissions'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Hide header on login pages
  const isLoginPage = location.pathname === '/' || location.pathname === '/login/page'
  
  // Global route protection
  useEffect(() => {
    // Skip protection on login pages
    if (isLoginPage) return;
    
    // Check if user is logged in
    const userPerms = getUserPermissions();
    if (!userPerms) {
      // No user logged in, redirect to login
      navigate({ to: '/login/page' });
      return;
    }
    
    // Check if user has permission for current route
    if (!hasPermission(location.pathname)) {
      // User doesn't have permission for this route
      alert('Unauthorized access. You will be redirected to the login page.');
      // Clear user session
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userPermissions');
      // Redirect to login
      navigate({ to: '/login/page' });
    }
  }, [location.pathname, isLoginPage, navigate]);
  
  return (
    <div className="flex flex-col min-h-screen">
      {!isLoginPage && <Header />}
      <div className="flex-1">
        <Outlet />
      </div>
      {!isLoginPage && <Footer />}
        
    </div>
  )
}
