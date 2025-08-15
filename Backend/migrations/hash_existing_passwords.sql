-- Migration: Hash existing passwords using bcrypt
-- Created: 2025-08-03
-- Description: Converts plain text passwords to bcrypt hashes for security

-- Note: This migration will be executed via Node.js script since PostgreSQL doesn't have bcrypt built-in
-- The actual password hashing will be done by the Node.js migration script