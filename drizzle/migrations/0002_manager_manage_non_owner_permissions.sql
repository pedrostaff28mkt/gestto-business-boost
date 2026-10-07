CREATE POLICY "manager manages non-owner permissions" ON public.module_permissions
FOR ALL TO authenticated
USING (
  public.has_company_role(public.membership_company(membership_id), ARRAY['manager'::public.app_role])
  AND EXISTS (SELECT 1 FROM public.memberships m WHERE m.id = membership_id AND m.role <> 'owner'::public.app_role AND m.user_id <> auth.uid())
)
WITH CHECK (
  public.has_company_role(public.membership_company(membership_id), ARRAY['manager'::public.app_role])
  AND EXISTS (SELECT 1 FROM public.memberships m WHERE m.id = membership_id AND m.role <> 'owner'::public.app_role AND m.user_id <> auth.uid())
);