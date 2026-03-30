
-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS for tasks
CREATE POLICY "Owner can do all on tasks" ON public.tasks FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Company users can select own tasks" ON public.tasks FOR SELECT
  TO authenticated USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company users can insert own tasks" ON public.tasks FOR INSERT
  TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company users can update own tasks" ON public.tasks FOR UPDATE
  TO authenticated USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company users can delete own tasks" ON public.tasks FOR DELETE
  TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'playbook',
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS for documents
CREATE POLICY "Owner can do all on documents" ON public.documents FOR ALL
  TO authenticated USING (has_role(auth.uid(), 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Company users can select own documents" ON public.documents FOR SELECT
  TO authenticated USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company users can insert own documents" ON public.documents FOR INSERT
  TO authenticated WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company users can update own documents" ON public.documents FOR UPDATE
  TO authenticated USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Company users can delete own documents" ON public.documents FOR DELETE
  TO authenticated USING (company_id = get_user_company_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
