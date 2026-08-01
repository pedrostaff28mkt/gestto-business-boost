CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  role public.app_role NOT NULL,
  full_name text,
  email text,
  module_permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  code text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  used_by uuid,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read invites" ON public.invites FOR SELECT TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner'::public.app_role,'manager'::public.app_role]));
CREATE POLICY "admins create invites" ON public.invites FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner'::public.app_role,'manager'::public.app_role]) AND created_by = auth.uid() AND role <> 'owner'::public.app_role);
CREATE POLICY "admins update invites" ON public.invites FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner'::public.app_role,'manager'::public.app_role]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner'::public.app_role,'manager'::public.app_role]));
CREATE POLICY "admins delete invites" ON public.invites FOR DELETE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner'::public.app_role,'manager'::public.app_role]));

CREATE TRIGGER set_invites_updated_at BEFORE UPDATE ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX invites_company_idx ON public.invites(company_id);

-- Public lookup of a pending invite (safe columns only)
CREATE OR REPLACE FUNCTION public.get_invite_preview(_code text)
RETURNS TABLE (company_name text, role public.app_role, full_name text, email text, expired boolean, used boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.name, i.role, i.full_name, i.email, i.expires_at < now(), i.used_at IS NOT NULL
  FROM public.invites i JOIN public.companies c ON c.id = i.company_id
  WHERE i.code = _code;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon, authenticated;

-- Public signup always creates a new company as owner; invite signup joins the existing company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _company_id UUID;
  _branch_id UUID;
  _membership_id UUID;
  _role public.app_role;
  _module public.app_module;
  _code TEXT;
  _invite public.invites;
  _perm jsonb;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));

  _code := NULLIF(NEW.raw_user_meta_data ->> 'invite_code', '');

  IF _code IS NOT NULL THEN
    SELECT * INTO _invite FROM public.invites
    WHERE code = _code AND used_at IS NULL AND expires_at > now();

    IF _invite.id IS NOT NULL THEN
      SELECT id INTO _branch_id FROM public.branches
      WHERE company_id = _invite.company_id
      ORDER BY is_main DESC, created_at ASC LIMIT 1;

      INSERT INTO public.memberships (user_id, company_id, branch_id, role)
      VALUES (NEW.id, _invite.company_id, COALESCE(_invite.branch_id, _branch_id), _invite.role)
      RETURNING id INTO _membership_id;

      FOR _module IN SELECT unnest(enum_range(NULL::public.app_module)) LOOP
        SELECT p INTO _perm
        FROM jsonb_array_elements(_invite.module_permissions) p
        WHERE p ->> 'module' = _module::text
        LIMIT 1;

        INSERT INTO public.module_permissions (membership_id, module, can_view, can_create, can_edit, can_delete)
        VALUES (
          _membership_id, _module,
          COALESCE((_perm ->> 'can_view')::boolean, false),
          COALESCE((_perm ->> 'can_create')::boolean, false),
          COALESCE((_perm ->> 'can_edit')::boolean, false),
          COALESCE((_perm ->> 'can_delete')::boolean, false)
        );
        _perm := NULL;
      END LOOP;

      UPDATE public.invites SET used_at = now(), used_by = NEW.id WHERE id = _invite.id;
      RETURN NEW;
    END IF;
  END IF;

  _role := 'owner'::public.app_role;

  INSERT INTO public.companies (name, created_by)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_name',''), 'Meu Negócio'), NEW.id)
  RETURNING id INTO _company_id;

  INSERT INTO public.branches (company_id, name, is_main)
  VALUES (_company_id, 'Matriz', true) RETURNING id INTO _branch_id;

  INSERT INTO public.subscriptions (company_id) VALUES (_company_id);
  INSERT INTO public.payment_settings (company_id, merchant_name, merchant_city)
  VALUES (_company_id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'company_name',''), 'GESTTO'), 'SAO PAULO');

  INSERT INTO public.memberships (user_id, company_id, branch_id, role)
  VALUES (NEW.id, _company_id, _branch_id, _role) RETURNING id INTO _membership_id;

  FOR _module IN SELECT unnest(enum_range(NULL::public.app_module)) LOOP
    INSERT INTO public.module_permissions (membership_id, module, can_view, can_create, can_edit, can_delete)
    VALUES (_membership_id, _module, true, true, true, true);
  END LOOP;

  RETURN NEW;
END; $function$;