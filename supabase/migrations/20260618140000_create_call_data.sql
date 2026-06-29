-- Data Calling feature
-- Admins upload a daily Excel of customers to call and assign the whole batch to one team member.
-- The assigned member sees those records in their Data Calling panel and updates the status/notes per record.
-- Columns are dynamic: each row's full content is stored as JSONB and the batch records the ordered headers.

-- Batch = one uploaded file, assigned to a single team member
CREATE TABLE IF NOT EXISTS public.call_data_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  file_name text,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,   -- ordered array of Excel header names
  total_records integer NOT NULL DEFAULT 0,
  call_date date NOT NULL DEFAULT current_date,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Record = one row from the uploaded Excel
CREATE TABLE IF NOT EXISTS public.call_data_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.call_data_batches(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,       -- full row keyed by header name
  contact_name text,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  called_at timestamptz,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_data_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_data_records ENABLE ROW LEVEL SECURITY;

-- Batches: admins manage everything; assigned members can view their own batches.
CREATE POLICY "Admins manage call batches" ON public.call_data_batches
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Members view assigned batches" ON public.call_data_batches
  FOR SELECT USING (
    assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Records: admins manage everything; assigned members can view & update their own records.
CREATE POLICY "Admins manage call records" ON public.call_data_records
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Members view assigned records" ON public.call_data_records
  FOR SELECT USING (
    assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Members update assigned records" ON public.call_data_records
  FOR UPDATE USING (
    assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ) WITH CHECK (
    assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE INDEX idx_call_data_batches_assigned_to ON public.call_data_batches(assigned_to);
CREATE INDEX idx_call_data_batches_call_date ON public.call_data_batches(call_date DESC);
CREATE INDEX idx_call_data_records_batch_id ON public.call_data_records(batch_id);
CREATE INDEX idx_call_data_records_assigned_to ON public.call_data_records(assigned_to);
CREATE INDEX idx_call_data_records_status ON public.call_data_records(status);

CREATE TRIGGER update_call_data_batches_updated_at
  BEFORE UPDATE ON public.call_data_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_data_records_updated_at
  BEFORE UPDATE ON public.call_data_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
