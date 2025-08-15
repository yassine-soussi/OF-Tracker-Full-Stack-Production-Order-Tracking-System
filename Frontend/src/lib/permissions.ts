// Utility functions for handling user permissions and route protection

export interface UserPermissions {
  email: string;
  name: string;
  permissions: string[];
}

/**
 * Get user permissions from localStorage
 */
export const getUserPermissions = (): UserPermissions | null => {
  try {
    const email = localStorage.getItem('userEmail');
    const name = localStorage.getItem('userName');
    const permissions = localStorage.getItem('userPermissions');
    
    if (!email || !name || !permissions) {
      return null;
    }
    
    return {
      email,
      name,
      permissions: JSON.parse(permissions)
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
};

/**
 * Check if user has permission to access a route
 */
export const hasPermission = (route: string): boolean => {
  const userPerms = getUserPermissions();
  
  if (!userPerms) {
    return false;
  }
  
  // If user has wildcard permission, allow all routes
  if (userPerms.permissions.includes('*')) {
    return true;
  }
  
  // Check if user has specific permission for this route
  return userPerms.permissions.includes(route);
};

/**
 * Redirect unauthorized users to their allowed page or login
 */
export const redirectUnauthorized = (currentRoute: string) => {
  const userPerms = getUserPermissions();
  
  // Clear user session
  clearUserSession();
  
  if (!userPerms) {
    // No user logged in, redirect to login
    window.location.href = '/login/page';
    return;
  }
  
  // If user doesn't have permission for current route
  if (!hasPermission(currentRoute)) {
    // If user has wildcard, something went wrong
    if (userPerms.permissions.includes('*')) {
      window.location.href = '/login/page';
      return;
    }
    
    // Redirect to the first allowed route if it's different from current
    if (userPerms.permissions.length > 0 && userPerms.permissions[0] !== currentRoute) {
      window.location.href = userPerms.permissions[0];
    } else {
      // No valid permissions or same route, redirect to login
      window.location.href = '/login/page';
    }
  }
};

/**
 * Clear user session data
 */
export const clearUserSession = () => {
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('userPermissions');
};