-- Migration: Add nom column to users table
-- Created: 2025-08-03
-- Description: Adds nom (name) column to users table for storing user full names

-- Add nom column to users table
ALTER TABLE users ADD COLUMN nom VARCHAR(100);

-- Set default nom values for existing users based on email patterns
UPDATE users SET nom = 
    CASE 
        WHEN email = 'chef.gdim@figeac-aero.com' THEN 'chef_gdim'
        WHEN email = 'chef.pdim@figeac-aero.com' THEN 'chef_pdim'
        WHEN email = 'chef.profilee@figeac-aero.com' THEN 'chef_profilee'
        WHEN email = 'admin@figeac-aero.com' THEN 'admin'
        WHEN email = 'vm.pdim@figeac-aero.com' THEN 'vmpdim'
        WHEN email = 'vm.gdim@figeac-aero.com' THEN 'vmgdim'
        WHEN email = 'vm.profilee@figeac-aero.com' THEN 'vmpro'
        WHEN email = 'vo.pdim@figeac-aero.com' THEN 'vopdim'
        WHEN email = 'vo.gdim@figeac-aero.com' THEN 'vogdim'
        WHEN email = 'vo.profilee@figeac-aero.com' THEN 'vopro'
        WHEN email = 'plani.pdim@figeac-aero.com' THEN 'planipdim'
        WHEN email = 'plani.gdim@figeac-aero.com' THEN 'planigdim'
        WHEN email = 'plani.profilee@figeac-aero.com' THEN 'planipro'
        ELSE SPLIT_PART(email, '@', 1)
    END
WHERE nom IS NULL;

-- Make nom column NOT NULL after populating data
ALTER TABLE users ALTER COLUMN nom SET NOT NULL;