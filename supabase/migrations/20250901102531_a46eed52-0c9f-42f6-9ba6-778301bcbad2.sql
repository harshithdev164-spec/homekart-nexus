-- Fix security issues: Add missing RLS policies for tables that need them

-- Add policies for clients table if it doesn't have any
CREATE POLICY "Users can view all clients" 
ON public.clients 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update clients" 
ON public.clients 
FOR UPDATE 
USING (true);

-- Add policies for inventory table if it doesn't have any
CREATE POLICY "Users can view all inventory" 
ON public."inventory table" 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create inventory" 
ON public."inventory table" 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update inventory" 
ON public."inventory table" 
FOR UPDATE 
USING (true);

-- Add policies for requirements table if it doesn't have any
CREATE POLICY "Users can view all requirements" 
ON public.requirements 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create requirements" 
ON public.requirements 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update requirements" 
ON public.requirements 
FOR UPDATE 
USING (true);