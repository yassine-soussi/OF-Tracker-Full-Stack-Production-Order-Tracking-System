-- Remove unique constraint on poste column from planning_modifications_pdim table
-- This allows multiple modification versions for the same poste

ALTER TABLE public.planning_modifications_pdim 
DROP CONSTRAINT IF EXISTS planning_modifications_pdim_poste_key;