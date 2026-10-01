import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — Gestto" },
      { name: "description", content: "Defina uma nova senha para acessar o Gestto." },
      { property: "og:title", content: "Redefinir senha — Gestto" },
      { property: "og:description", content: "Defina uma nova senha para acessar o Gestto." },
    ],
  }),
  component: ResetPasswordPage,
});

type Status = "waiting" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("waiting");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });
    const timer = setTimeout(() => {
      setStatus((s) => (s === "waiting" ? "invalid" : s));
    }, 6000);
    return () => {
      data.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error("Não foi possível redefinir a senha", { description: error.message });
    await supabase.auth.signOut();
    setStatus("done");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <Logo size={36} />
          <span className="font-display text-xl font-bold">Gestto</span>
        </Link>

        <h1 className="text-3xl font-bold">Redefinir senha</h1>

        {status === "waiting" && (
          <div className="surface mt-7 flex items-center gap-3 p-5">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validando seu link de recuperação…</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="surface mt-7 space-y-4 p-5">
            <p className="text-sm text-muted-foreground">
              Este link expirou ou é inválido. Solicite um novo link de recuperação.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link to="/auth">Voltar para o login</Link>
            </Button>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={submit} className="surface mt-7 space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="repita a senha"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />} Salvar nova senha
            </Button>
          </form>
        )}

        {status === "done" && (
          <div className="surface mt-7 space-y-4 p-5">
            <p className="text-sm text-muted-foreground">
              Senha redefinida com sucesso! Entre novamente com sua nova senha.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link to="/auth">Ir para o login</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
