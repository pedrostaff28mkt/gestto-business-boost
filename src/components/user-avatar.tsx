import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function initialsOf(name: string | undefined | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Resolve a signed URL for a private "avatars" storage path. */
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      if (/^https?:\/\//.test(path)) return path;
      const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  });
}

export function UserAvatar({
  name,
  avatarPath,
  className,
}: {
  name?: string | null;
  avatarPath?: string | null;
  className?: string;
}) {
  const { data: url } = useAvatarUrl(avatarPath);
  return (
    <Avatar className={cn("size-10", className)}>
      {url ? <AvatarImage src={url} alt={name ?? "Foto de perfil"} /> : null}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
