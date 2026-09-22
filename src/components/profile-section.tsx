import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Camera, User, Mail, Phone, KeyRound, Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useGestto } from "@/hooks/use-gestto";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme, type ThemePreference } from "@/components/theme-provider";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const nameSchema = z.string().trim().min(2, "Informe seu nome completo").max(120, "Nome muito longo");
const emailSchema = z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo");
const phoneSchema = z
  .string()
  .trim()
  .max(20, "Telefone muito longo")
  .regex(/^[0-9()+\-\s]*$/, "Use apenas números e os símbolos + ( ) -");

export function ProfileSection() {
  const { session } = useGestto();
  const { theme, setTheme, mounted } = useTheme();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    if (!session) return;
    setFullName(session.fullName);
    setPhone(session.phone ?? "");
  }, [session]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["gestto-session"] });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!session) throw new Error("Sessão não encontrada");
      if (!file.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem");
      if (file.size > MAX_AVATAR_BYTES) throw new Error("A imagem deve ter no máximo 2MB");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", session.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto de perfil atualizada");
      refresh();
    },
    onError: (e: Error) => toast.error("Erro ao enviar foto", { description: e.message }),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Sessão não encontrada");
      const name = nameSchema.parse(fullName);
      const tel = phoneSchema.parse(phone);
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name, phone: tel || null })
        .eq("id", session.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados pessoais salvos");
      refresh();
    },
    onError: (e: Error) =>
      toast.error("Erro ao salvar", {
        description: e instanceof z.ZodError ? e.issues[0].message : e.message,
      }),
  });

  const changeEmail = useMutation({
    mutationFn: async () => {
      const email = emailSchema.parse(newEmail);
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Confirmação enviada", {
        description: "Você receberá um link de confirmação no novo e-mail antes da troca ser efetivada.",
      });
      setNewEmail("");
      setEmailOpen(false);
    },
    onError: (e: Error) =>
      toast.error("Erro ao alterar e-mail", {
        description: e instanceof z.ZodError ? e.issues[0].message : e.message,
      }),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres");
      if (password !== passwordConfirm) throw new Error("As senhas não conferem");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso");
      setPassword("");
      setPasswordConfirm("");
    },
    onError: (e: Error) => toast.error("Erro ao trocar senha", { description: e.message }),
  });

  return (
    <div className="surface space-y-5 p-5">
      <div className="flex items-center gap-2">
        <User className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Meu perfil</h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Trocar foto de perfil"
        >
          <UserAvatar name={session?.fullName} avatarPath={session?.avatarUrl} className="size-16" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
            {uploadAvatar.isPending ? (
              <Loader2 className="size-5 animate-spin text-background" />
            ) : (
              <Camera className="size-5 text-background" />
            )}
          </span>
        </button>
        <div>
          <p className="text-sm font-medium">Foto de perfil</p>
          <p className="text-xs text-muted-foreground">Clique na foto para trocar. Imagem de até 2MB.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) uploadAvatar.mutate(file);
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full-name">Nome completo</Label>
          <Input id="full-name" value={fullName} maxLength={120} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="flex items-center gap-1.5">
            <Phone className="size-3.5" /> Telefone / WhatsApp
          </Label>
          <Input
            id="phone"
            value={phone}
            maxLength={20}
            inputMode="tel"
            placeholder="(11) 99999-9999"
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
        {saveProfile.isPending && <Loader2 className="size-4 animate-spin" />} Salvar dados pessoais
      </Button>

      <div className="space-y-3 border-t border-border pt-4">
        <Label>Tema da interface</Label>
        <div
          className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted p-1"
          role="radiogroup"
          aria-label="Tema da interface"
        >
          {([
            { value: "light", label: "Claro", icon: Sun },
            { value: "dark", label: "Escuro", icon: Moon },
            { value: "system", label: "Automático", icon: Monitor },
          ] as const).map(({ value, label, icon: Icon }) => {
            const selected = mounted && theme === value;
            return (
              <Button
                key={value}
                type="button"
                variant="ghost"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value as ThemePreference)}
                className={`h-10 min-w-0 gap-1.5 px-2 text-xs sm:text-sm ${
                  selected
                    ? "bg-card text-foreground shadow-sm hover:bg-card"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Label className="flex items-center gap-1.5">
          <Mail className="size-3.5" /> E-mail de acesso
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input readOnly value={session?.email ?? ""} className="bg-muted/50" />
          {!emailOpen && (
            <Button variant="outline" onClick={() => setEmailOpen(true)}>
              Alterar e-mail
            </Button>
          )}
        </div>
        {emailOpen && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label htmlFor="new-email">Novo e-mail</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              maxLength={255}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Você receberá um link de confirmação no novo e-mail antes da troca ser efetivada.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => changeEmail.mutate()} disabled={changeEmail.isPending}>
                {changeEmail.isPending && <Loader2 className="size-4 animate-spin" />} Enviar confirmação
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEmailOpen(false);
                  setNewEmail("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <Label className="flex items-center gap-1.5">
          <KeyRound className="size-3.5" /> Trocar senha
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-pass" className="text-xs text-muted-foreground">
              Nova senha
            </Label>
            <Input
              id="new-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pass2" className="text-xs text-muted-foreground">
              Confirmar nova senha
            </Label>
            <Input
              id="new-pass2"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => changePassword.mutate()}
          disabled={changePassword.isPending || !password}
        >
          {changePassword.isPending && <Loader2 className="size-4 animate-spin" />} Atualizar senha
        </Button>
      </div>
    </div>
  );
}
