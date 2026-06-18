-- Add "Site Visit Scheduled" and "Site Visit Done" stages to the lead_status enum.
-- Positioned after 'qualified' to reflect the natural sales funnel:
--   new -> contacted -> qualified -> site_visit_scheduled -> site_visit_done -> proposal -> negotiation -> closed_won/closed_lost
-- IF NOT EXISTS keeps this migration idempotent.

ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'site_visit_scheduled' AFTER 'qualified';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'site_visit_done' AFTER 'site_visit_scheduled';
