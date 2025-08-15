-- Migration: Update profilee user permissions to avoid encoding issues with special characters
-- Created: 2025-08-09
-- Description: Updates permissions for vm.profilee user to use "matiere" instead of "matiére" to avoid encoding issues

-- Update permissions for vm.profilee user to use route without special characters
UPDATE users SET permissions = '["/UAPS/PROFILEE/Validation/matiere"]' 
WHERE email = 'vm.profilee@figeac-aero.com';

-- Also update the redirect path for this user
UPDATE users SET redirect = '/UAPS/PROFILEE/Validation/matiere'
WHERE email = 'vm.profilee@figeac-aero.com';