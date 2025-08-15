-- Migration: Add soft delete columns to planning tables
-- Run this AFTER creating the planning_modifications_pdim table

-- Add deleted_at column to existing planning_pdim table
ALTER TABLE public.planning_pdim 
ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone DEFAULT NULL;

-- Add deleted_at column to planning_modifications_pdim table (if not already present)
ALTER TABLE public.planning_modifications_pdim 
ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone DEFAULT NULL;

-- Optional: Add indexes for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_planning_pdim_deleted_at ON public.planning_pdim (deleted_at);
CREATE INDEX IF NOT EXISTS idx_planning_modifications_pdim_deleted_at ON public.planning_modifications_pdim (deleted_at);

-- Optional: Add composite indexes for better performance on poste + deleted_at queries
CREATE INDEX IF NOT EXISTS idx_planning_pdim_poste_deleted_at ON public.planning_pdim (poste, deleted_at);
CREATE INDEX IF NOT EXISTS idx_planning_modifications_pdim_poste_deleted_at ON public.planning_modifications_pdim (poste, deleted_at);