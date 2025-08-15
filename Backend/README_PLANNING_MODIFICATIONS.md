# Planning Modifications Implementation

This implementation separates original imported planning data from user modifications, ensuring that the import page always shows the original data while the modifier page can show and save modifications separately.

## Database Changes

### Updated Table: `planning_pdim`
- **NEW**: `deleted_at` column for soft deletes
- All queries now filter `WHERE deleted_at IS NULL` to exclude soft deleted records
- History is preserved - deleted records remain in database

### New Table: `planning_modifications_pdim`
- Stores user modifications separately from original imports
- Maintains reference to original version
- Allows version tracking of modifications
- **NEW**: `deleted_at` column for soft deletes

### Migration Required
Run the following SQL to create the modifications table:

**Option 1: Using psql command line**
```bash
psql -U postgres -d your_database_name -f Backend/migrations/add_planning_modifications_table.sql
```

**Option 2: Using psql with \i command**
```sql
-- Connect to your database first, then:
\i Backend/migrations/add_planning_modifications_table.sql
```

**Option 3: Copy and paste the SQL directly**
The migration file creates:
- New sequence: `planning_modifications_pdim_id_seq`
- New table: `planning_modifications_pdim`
- Proper constraints and permissions

## API Endpoints

### Original Planning Endpoints
- `GET /api/pdim/planning/:poste` - Returns ONLY original imported data (excludes soft deleted)
- `POST /api/pdim/planning` - Creates/updates original planning (restores if soft deleted)
- `DELETE /api/pdim/planning/:poste` - **SOFT DELETE** - Marks as deleted for history (cascades to modifications)

### New Modification Endpoints
- `GET /api/pdim/planning/:poste/edit` - Returns modifications if available, otherwise original (excludes soft deleted)
- `PUT /api/pdim/planning/:poste/modify` - Saves modifications (separate from original)
- `DELETE /api/pdim/planning/:poste/modify` - **SOFT DELETE** - Marks modification as deleted (reverts to original)

## Frontend Changes

### Import Page (`/UAPS/P-DIM/importer`)
- **Always shows original data** - uses `GET /planning/:poste` endpoint
- Shows "Données originales uniquement" badge
- Cannot see or be affected by modifications

### Modifier Page (`/UAPS/P-DIM/modifier`)  
- **Shows modifications if available, otherwise original** - uses `GET /planning/:poste/edit` endpoint
- Shows "Version modifiée" badge when displaying modifications
- Saves to modifications table - uses `PUT /planning/:poste/modify` endpoint
- Displays version info: "Version: X (basée sur l'original vY)"

## Testing Instructions

### 1. Setup Database
```bash
# Run migrations in order:
psql -U postgres -d your_database_name -f Backend/migrations/add_planning_modifications_table.sql
psql -U postgres -d your_database_name -f Backend/migrations/add_soft_delete_columns.sql
```

**Verify the migrations worked:**
```sql
-- Check if modifications table was created
\d planning_modifications_pdim

-- Check if sequence was created
\d planning_modifications_pdim_id_seq

-- Verify deleted_at columns were added
\d planning_pdim
\d planning_modifications_pdim

-- Check for the new indexes
\di *deleted_at*
```

### 2. Test Scenario 1: Original Data Only
1. Go to Import page (`/UAPS/P-DIM/importer`)
2. Select a poste and import Excel file
3. Verify data is saved and displayed
4. Go to Modifier page (`/UAPS/P-DIM/modifier`)
5. Select same poste - should show same original data
6. Make some modifications and save
7. **KEY TEST**: Go back to Import page - should still show original data (not modifications)

### 3. Test Scenario 2: Modifications Tracking
1. On Modifier page, make changes to an existing planning
2. Save modifications
3. Verify "Version modifiée" badge appears
4. Check version shows: "Version: 1 (basée sur l'original v1)"
5. Make more changes and save again
6. Version should increment: "Version: 2 (basée sur l'original v1)"

### 4. Test Scenario 3: Soft Delete Behavior
1. Delete planning from import page
2. Verify planning disappears from both import and modifier pages
3. Check database - records should still exist with `deleted_at` timestamp
4. Import new planning for same poste
5. Verify planning reappears in both import and modifier pages
6. Previous modifications should be restored and visible

### 5. Test Scenario 4: Data Separation
1. Import page should ALWAYS show original data
2. Modifier page should show modifications when available
3. Import new data for same poste - should update original, modifications remain separate
4. Modifier page should now show modifications "basée sur l'original v2"

## Database Schema

### Original Table (unchanged)
```sql
planning_pdim (
    id, poste, filename, data, importdate, version
)
```

### New Modifications Table
```sql
planning_modifications_pdim (
    id, poste, filename, data, importdate, version,
    original_version, modified_date, deleted_at
)
```

## Benefits

1. **Data Integrity**: Original imports are never hard deleted
2. **Complete History**: All data preserved with soft deletes
3. **Audit Trail**: Clear separation between original and modified data
4. **Version Tracking**: Know which original version modifications are based on
5. **Rollback Capability**: Can easily revert to original by soft deleting modifications
6. **Import Safety**: Re-importing doesn't lose user modifications
7. **Cascade Deletes**: Deleting original planning also soft deletes related modifications
8. **Restoration**: Re-importing planning restores both original and modification data