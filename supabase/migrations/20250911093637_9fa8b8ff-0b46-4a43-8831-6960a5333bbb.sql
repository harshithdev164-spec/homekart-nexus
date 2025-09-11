-- Add AI-related columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ai_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_insights JSONB,
ADD COLUMN IF NOT EXISTS ai_last_analysis TIMESTAMP WITH TIME ZONE;