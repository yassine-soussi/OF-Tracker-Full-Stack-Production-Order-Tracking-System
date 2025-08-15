-- Migration: Add redirect column to users table
-- Created: 2025-08-03
-- Description: Adds redirect column to users table for storing user redirection paths after login

-- Add redirect column to users table
ALTER TABLE users ADD COLUMN redirect VARCHAR(255);

-- Set default redirect values for existing users
UPDATE users SET redirect = '/login/page' WHERE redirect IS NULL;

-- Make redirect column NOT NULL after populating data
ALTER TABLE users ALTER COLUMN redirect SET NOT NULL;