import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar no Gestto" },
      { name: "description", content: "Acesse o Gestto: vendas, estoque, financeiro e equipe do seu negócio." },
      { property: "og:title", content: "Entrar no Gestto" },
      { property: "og:description", content: "Acesse a gestão do seu negócio: vendas, estoque e financeiro." },
    ],
  }),
  component: AuthPage,
});


function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", companyName: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });
    setLoading(false);
    if (error) return toast.error("Não foi possível entrar", { description: error.message });
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: form.fullName, company_name: form.companyName },
      },
    });
    setLoading(false);
    if (error) return toast.error("Não foi possível criar a conta", { description: error.message });

    if (!data.session) {
      toast.success("Conta criada!", {
        description: "Confirme o e-mail que enviamos para ativar seu teste grátis de 2 dias.",
      });
      return;
    }

    toast.success("Conta criada! Teste grátis de 2 dias liberado.");
    navigate({ to: "/dashboard", replace: true });
  }


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

        <h1 className="text-3xl font-bold">Bem-vindo</h1>
        <p className="mt-1 text-muted-foreground">Gerencie vendas, estoque e finanças em um só lugar.</p>

        <Tabs defaultValue="signin" className="mt-7">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="surface mt-4 space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={form.email} onChange={set("email")} placeholder="voce@empresa.com.br" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required value={form.password} onChange={set("password")} placeholder="••••••••" />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />} Entrar
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="surface mt-4 space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Seu nome</Label>
                <Input id="fullName" required value={form.fullName} onChange={set("fullName")} placeholder="Maria Silva" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Nome da empresa</Label>
                <Input id="companyName" required value={form.companyName} onChange={set("companyName")} placeholder="Padaria Bom Dia" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email2">E-mail</Label>
                <Input id="email2" type="email" required value={form.email} onChange={set("email")} placeholder="voce@empresa.com.br" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password2">Senha</Label>
                <Input id="password2" type="password" required minLength={6} value={form.password} onChange={set("password")} placeholder="mínimo 6 caracteres" />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />} Criar conta e testar grátis
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Você cria a conta como Dono/Admin da sua empresa. Depois convide gerentes, vendedores e produção
                em Equipe.
              </p>
              <p className="text-center text-xs text-muted-foreground">
                2 dias grátis. Depois <span className="num">R$ 69,99</span> no 1º mês. Ao criar a conta você
                aceita os{" "}
                <Link to="/termos" className="underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link to="/privacidade" className="underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
