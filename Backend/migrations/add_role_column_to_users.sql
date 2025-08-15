-- Migration: Add role column to users table
-- Created: 2025-08-03
-- Description: Adds role column to users table for user role management

-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50);

-- Set default role values for existing users
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Make role column NOT NULL after populating data
ALTER TABLE users ALTER COLUMN role SET NOT NULL;