-- Migration: Add permissions column to users table for access control
-- Created: 2025-08-03
-- Description: Adds permissions column to control user access to specific routes

-- Add permissions column to users table (JSON array of allowed routes)
ALTER TABLE users ADD COLUMN permissions TEXT;

-- Set default permissions for all users (full access for existing users)
UPDATE users SET permissions = '["*"]' WHERE permissions IS NULL;

-- Set restricted permissions for vm.profilee user
UPDATE users SET permissions = '["/UAPS/PROFILEE/Validation/matiére"]' 
WHERE email = 'vm.profilee@figeac-aero.com';

-- Make permissions column NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN permissions SET NOT NULL;