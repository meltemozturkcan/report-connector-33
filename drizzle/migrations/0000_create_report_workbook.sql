CREATE TABLE public.report_workbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_workbook_user_unique UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_workbook TO authenticated;
GRANT ALL ON public.report_workbook TO service_role;

ALTER TABLE public.report_workbook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own workbook" ON public.report_workbook
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own workbook" ON public.report_workbook
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own workbook" ON public.report_workbook
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own workbook" ON public.report_workbook
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER report_workbook_set_updated_at
BEFORE UPDATE ON public.report_workbook
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();