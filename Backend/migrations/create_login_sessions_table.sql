-- Migration: Create login_sessions table to track user sessions with custom names
-- Created: 2025-08-04
-- Description: Creates a table to store login sessions with custom display names

-- Create login_sessions table
CREATE TABLE IF NOT EXISTS login_sessions (
    id SERIAL PRIMARY KEY,
    custom_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_sessions_email ON login_sessions(email);

-- Create index on session_id for session management
CREATE INDEX IF NOT EXISTS idx_login_sessions_session_id ON login_sessions(session_id);

-- Create index on active sessions
CREATE INDEX IF NOT EXISTS idx_login_sessions_active ON login_sessions(is_active);