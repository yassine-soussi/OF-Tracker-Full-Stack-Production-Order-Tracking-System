import React, { useEffect, useState } from 'react';
import { hasPermission, redirectUnauthorized } from '@/lib/permissions';
import { useNavigate } from '@tanstack/react-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoute: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoute }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check permissions when component mounts
    if (!hasPermission(requiredRoute)) {
      console.log(`Access denied to route: ${requiredRoute}`);
      // Show error message before redirecting
      alert('Unauthorized access. You will be redirected to the login page.');
      // Clear user session and redirect to login
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userPermissions');
      navigate({ to: '/login/page' });
      return;
    }
    
    setIsAuthorized(true);
  }, [requiredRoute, navigate]);

  // If user has permission, render the component
  if (isAuthorized === true) {
    return <>{children}</>;
  }

  // Show loading while checking permissions
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#ef8f0e] mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // This should not be reached due to redirect, but just in case
  return null;
};

export default ProtectedRoute;