
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('owner','manager','seller','production');
CREATE TYPE public.app_module AS ENUM ('sales','inventory','finance','dashboard','team','ai','crm','integrations','settings');
CREATE TYPE public.subscription_status AS ENUM ('trialing','active','past_due','canceled');
CREATE TYPE public.payment_method AS ENUM ('pix','card_credit','card_debit','cash');
CREATE TYPE public.sale_status AS ENUM ('pending','paid','canceled');

-- UPDATED AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- COMPANIES
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  document TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  role public.app_role NOT NULL DEFAULT 'seller',
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  monthly_goal NUMERIC(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE TABLE public.module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  module public.app_module NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (membership_id, module)
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '2 days',
  current_period_end TIMESTAMPTZ,
  price_cents INTEGER NOT NULL DEFAULT 9999,
  first_month_price_cents INTEGER NOT NULL DEFAULT 6999,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  pix_key TEXT,
  pix_key_type TEXT,
  merchant_name TEXT,
  merchant_city TEXT,
  card_provider TEXT,
  debit_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  credit_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  installment_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  terminal_monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'un',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  max_stock NUMERIC(12,3),
  expires_at DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL,
  method public.payment_method NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.sale_status NOT NULL DEFAULT 'paid',
  pix_payload TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.is_company_member(_company_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.company_id = _company_id AND m.user_id = auth.uid() AND m.active);
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_company_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.company_id = _company_id AND m.user_id = auth.uid() AND m.active AND m.role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.owns_membership(_membership_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships m
    WHERE m.id = _membership_id AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.membership_company(_membership_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.memberships WHERE id = _membership_id;
$$;

-- SIGNUP BOOTSTRAP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company_id UUID;
  _branch_id UUID;
  _membership_id UUID;
  _role public.app_role;
  _module public.app_module;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));

  _role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'owner');

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
    VALUES (
      _membership_id, _module,
      CASE
        WHEN _role IN ('owner','manager') THEN true
        WHEN _role = 'seller' THEN _module IN ('sales','inventory','crm','dashboard')
        ELSE _module IN ('inventory','team')
      END,
      CASE
        WHEN _role IN ('owner','manager') THEN true
        WHEN _role = 'seller' THEN _module IN ('sales','crm')
        ELSE _module = 'inventory'
      END,
      CASE WHEN _role IN ('owner','manager') THEN true ELSE false END,
      CASE WHEN _role = 'owner' THEN true ELSE false END
    );
  END LOOP;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.companies, public.branches, public.profiles, public.memberships,
  public.module_permissions, public.subscriptions, public.payment_settings,
  public.products, public.sales, public.sale_items, public.audit_logs TO service_role;

-- RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated USING (public.is_company_member(id));
CREATE POLICY "owner updates company" ON public.companies FOR UPDATE TO authenticated USING (public.has_company_role(id, ARRAY['owner']::public.app_role[]));
CREATE POLICY "user creates company" ON public.companies FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "members read branches" ON public.branches FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "admins write branches" ON public.branches FOR ALL TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner','manager']::public.app_role[]));

CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (
  id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.memberships me
    JOIN public.memberships them ON them.company_id = me.company_id
    WHERE me.user_id = auth.uid() AND them.user_id = profiles.id
  )
);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "read memberships of my companies" ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_company_member(company_id));
CREATE POLICY "admins manage memberships" ON public.memberships FOR ALL TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner','manager']::public.app_role[]));

CREATE POLICY "read permissions" ON public.module_permissions FOR SELECT TO authenticated
  USING (public.owns_membership(membership_id) OR public.is_company_member(public.membership_company(membership_id)));
CREATE POLICY "owner manages permissions" ON public.module_permissions FOR ALL TO authenticated
  USING (public.has_company_role(public.membership_company(membership_id), ARRAY['owner']::public.app_role[]))
  WITH CHECK (public.has_company_role(public.membership_company(membership_id), ARRAY['owner']::public.app_role[]));

CREATE POLICY "members read subscription" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "owner updates subscription" ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner']::public.app_role[]));

CREATE POLICY "members read payment settings" ON public.payment_settings FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "owner manages payment settings" ON public.payment_settings FOR ALL TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner']::public.app_role[]));

CREATE POLICY "members read products" ON public.products FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "staff writes products" ON public.products FOR ALL TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner','manager','production']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner','manager','production']::public.app_role[]));

CREATE POLICY "members read sales" ON public.sales FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "members create sales" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id) AND seller_id = auth.uid());
CREATE POLICY "admins update sales" ON public.sales FOR UPDATE TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner','manager']::public.app_role[]))
  WITH CHECK (public.has_company_role(company_id, ARRAY['owner','manager']::public.app_role[]));

CREATE POLICY "members read sale items" ON public.sale_items FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "members create sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id));

CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_company_role(company_id, ARRAY['owner','manager']::public.app_role[]));
CREATE POLICY "members write audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(company_id) AND user_id = auth.uid());

-- TRIGGERS updated_at
CREATE TRIGGER t_companies BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_branches BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_memberships BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_module_permissions BEFORE UPDATE ON public.module_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_subscriptions BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_payment_settings BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_products BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_sales BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
