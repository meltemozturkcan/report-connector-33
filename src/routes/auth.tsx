import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Giriş — Aylık Yönetim Raporu" },
      {
        name: "description",
        content: "Rapor verilerinizi girmek ve görüntülemek için hesabınıza giriş yapın.",
      },
      { property: "og:title", content: "Giriş — Aylık Yönetim Raporu" },
      {
        property: "og:description",
        content: "Aylık yönetim raporu veri giriş alanına erişim için oturum açın.",
      },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isLoading && session) {
      void navigate({ to: "/veri-girisi" });
    }
  }, [isLoading, session, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Bilgileri kontrol edin");
      return;
    }

    setPending(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/veri-girisi` },
        });
        if (error) throw error;
        toast.success("Kayıt oluşturuldu. E-posta doğrulaması gerekebilir.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem tamamlanamadı");
    } finally {
      setPending(false);
    }
  };

  const handleGoogle = async () => {
    setPending(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setPending(false);
    if (result.error) {
      toast.error("Google ile giriş yapılamadı");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm border border-border bg-card p-6">
        <h1 className="text-base font-semibold text-foreground">
          {mode === "signin" ? "Giriş yap" : "Hesap oluştur"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rapor verileriniz hesabınıza özel olarak saklanır.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {mode === "signin" ? "Giriş yap" : "Kayıt ol"}
          </Button>
        </form>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={handleGoogle}
          disabled={pending}
        >
          Google ile devam et
        </Button>

        <button
          type="button"
          className="mt-4 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
        </button>
      </div>
    </main>
  );
}
