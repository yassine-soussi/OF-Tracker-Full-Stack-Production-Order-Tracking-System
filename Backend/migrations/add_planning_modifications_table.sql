-- Create sequence for planning modifications
CREATE SEQUENCE IF NOT EXISTS public.planning_modifications_pdim_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.planning_modifications_pdim_id_seq OWNER TO postgres;

-- Create table for planning modifications (separate from original imports)
CREATE TABLE IF NOT EXISTS public.planning_modifications_pdim (
    id integer NOT NULL DEFAULT nextval('public.planning_modifications_pdim_id_seq'::regclass),
    poste character varying(50) NOT NULL,
    filename character varying(255) NOT NULL,
    data jsonb NOT NULL,
    importdate timestamp without time zone DEFAULT now(),
    version integer DEFAULT 1,
    original_version integer DEFAULT 1,  -- Track which original version this modification is based on
    modified_date timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone DEFAULT NULL  -- Soft delete field
);

-- Set sequence ownership
ALTER SEQUENCE public.planning_modifications_pdim_id_seq OWNED BY public.planning_modifications_pdim.id;

-- Add primary key constraint
ALTER TABLE ONLY public.planning_modifications_pdim
    ADD CONSTRAINT planning_modifications_pdim_pkey PRIMARY KEY (id);

-- Add unique constraint on poste (one modification per poste)
ALTER TABLE ONLY public.planning_modifications_pdim
    ADD CONSTRAINT planning_modifications_pdim_poste_key UNIQUE (poste);

-- Add soft delete column to original planning table if it doesn't exist
ALTER TABLE public.planning_pdim
ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone DEFAULT NULL;

-- Grant permissions
ALTER TABLE public.planning_modifications_pdim OWNER TO postgres;