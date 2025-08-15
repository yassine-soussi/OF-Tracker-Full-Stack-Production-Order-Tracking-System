-- Migration: Add email column to users table and populate with generated emails
-- Created: 2025-08-03
-- Description: Adds email column to users table and generates email addresses for existing users

-- Add email column to users table
ALTER TABLE users ADD COLUMN email VARCHAR(100);

-- Add unique constraint to email column
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Populate email addresses for existing users based on their nom
UPDATE users SET email = 
    CASE 
        WHEN nom = 'chef_gdim' THEN 'chef.gdim@figeac-aero.com'
        WHEN nom = 'chef_pdim' THEN 'chef.pdim@figeac-aero.com'
        WHEN nom = 'chef_profilee' THEN 'chef.profilee@figeac-aero.com'
        WHEN nom = 'admin' THEN 'admin@figeac-aero.com'
        WHEN nom = 'vmpdim' THEN 'vm.pdim@figeac-aero.com'
        WHEN nom = 'vmgdim' THEN 'vm.gdim@figeac-aero.com'
        WHEN nom = 'vmpro' THEN 'vm.profilee@figeac-aero.com'
        WHEN nom = 'vopdim' THEN 'vo.pdim@figeac-aero.com'
        WHEN nom = 'vogdim' THEN 'vo.gdim@figeac-aero.com'
        WHEN nom = 'vopro' THEN 'vo.profilee@figeac-aero.com'
        WHEN nom = 'planipdim' THEN 'plani.pdim@figeac-aero.com'
        WHEN nom = 'planigdim' THEN 'plani.gdim@figeac-aero.com'
        WHEN nom = 'planipro' THEN 'plani.profilee@figeac-aero.com'
        ELSE CONCAT(nom, '@figeac-aero.com')
    END
WHERE email IS NULL;

-- Make email column NOT NULL after populating data
ALTER TABLE users ALTER COLUMN email SET NOT NULL;