-- Add signalement columns to statut_outils_pdim table
-- These columns are needed to track when tools are signaled as missing

ALTER TABLE statut_outils_pdim 
ADD COLUMN IF NOT EXISTS date_validation TIMESTAMP,
ADD COLUMN IF NOT EXISTS date_signalement TIMESTAMP,
ADD COLUMN IF NOT EXISTS cause VARCHAR(255) DEFAULT '-',
ADD COLUMN IF NOT EXISTS detaille TEXT DEFAULT '-';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_statut_outils_pdim_date_validation ON statut_outils_pdim(date_validation);
CREATE INDEX IF NOT EXISTS idx_statut_outils_pdim_date_signalement ON statut_outils_pdim(date_signalement);

-- Update existing records to have default timestamps where appropriate
UPDATE statut_outils_pdim 
SET date_validation = NOW(), 
    cause = '-', 
    detaille = '-'
WHERE statut = 'ready' AND date_validation IS NULL;

-- Note: Records with 'missing' status should have their signalement data
-- filled when they are actually signaled through the validation interface