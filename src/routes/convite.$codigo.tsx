import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { roleLabels, type AppRole } from "@/hooks/use-gestto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/convite/$codigo")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Convite para equipe — Gestto" },
      { name: "description", content: "Aceite o convite e entre na equipe da empresa no Gestto." },
      { property: "og:title", content: "Convite para equipe — Gestto" },
      { property: "og:description", content: "Crie seu acesso e entre na equipe da empresa no Gestto." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { codigo } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  const { data: invite, isLoading } = useQuery({
    queryKey: ["invite-preview", codigo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invite_preview", { _code: codigo });
      if (error) throw error;
      return (data?.[0] ?? null) as {
        company_name: string;
        role: AppRole;
        full_name: string | null;
        email: string | null;
        expired: boolean;
        used: boolean;
      } | null;
    },
  });

  useEffect(() => {
    if (invite) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || invite.full_name || "",
        email: f.email || invite.email || "",
      }));
    }
  }, [invite]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.fullName, invite_code: codigo },
      },
    });
    setLoading(false);
    if (error) return toast.error("Não foi possível criar o acesso", { description: error.message });
    if (!data.session) {
      toast.success("Acesso criado!", {
        description: "Confirme o e-mail que enviamos para entrar na equipe.",
      });
      return;
    }
    toast.success("Bem-vindo à equipe!");
    navigate({ to: "/dashboard", replace: true });
  }

  const invalid = !invite || invite.expired || invite.used;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div
            className="flex size-9 items-center justify-center rounded-lg font-display font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            G
          </div>
          <span className="font-display text-xl font-bold">Gestto Beta</span>
        </Link>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Verificando convite…
          </div>
        ) : invalid ? (
          <div className="surface p-6">
            <h1 className="font-display text-2xl font-bold">Convite indisponível</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {invite?.used
                ? "Este convite já foi utilizado."
                : invite?.expired
                  ? "Este convite expirou. Peça um novo link para o dono da empresa."
                  : "Não encontramos este convite. Confira o link recebido."}
            </p>
            <Button asChild variant="secondary" className="mt-5 w-full">
              <Link to="/auth">Ir para o login</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold">Você foi convidado</h1>
            <div className="surface mt-4 space-y-2 p-4">
              <p className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-primary" />
                <span className="font-medium">{invite.company_name}</span>
              </p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-success" />
                Seu papel: <span className="font-medium text-foreground">{roleLabels[invite.role]}</span>
              </p>
            </div>

            <form onSubmit={accept} className="surface mt-4 space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Seu nome</Label>
                <Input id="fullName" required value={form.fullName} onChange={set("fullName")} placeholder="João Souza" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={form.email} onChange={set("email")} placeholder="voce@empresa.com.br" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="mínimo 6 caracteres"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />} Entrar na equipe
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Ao continuar você aceita os <Link to="/termos" className="underline">Termos de Uso</Link> e a{" "}
                <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
