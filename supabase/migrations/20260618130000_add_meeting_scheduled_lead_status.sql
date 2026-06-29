-- Add "Meeting Scheduled" stage to the lead_status enum.
-- Positioned after 'qualified', ahead of the site-visit stages:
--   new -> contacted -> qualified -> meeting_scheduled -> site_visit_scheduled -> site_visit_done -> proposal -> negotiation -> closed_won/closed_lost
-- IF NOT EXISTS keeps this migration idempotent.

ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'meeting_scheduled' AFTER 'qualified';
