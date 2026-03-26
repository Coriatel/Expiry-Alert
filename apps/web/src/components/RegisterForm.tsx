import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { register, type AuthUser } from "@/lib/auth";

interface RegisterFormProps {
  onSuccess: (user: AuthUser) => void;
  onSwitchToLogin: () => void;
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || undefined,
        password,
      });
      onSuccess(user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.unexpectedError"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-sm">
      <div className="flex justify-center mb-4">
        <img
          src="/logo-icon-v2.png"
          alt="Expiry Alert"
          className={`h-16 w-16 object-contain ${loading ? "logo-thinking" : "logo-entrance"}`}
        />
      </div>
      <h1 className="text-2xl font-bold mb-2">{t("auth.register")}</h1>
      <p className="text-muted-foreground mb-6">{t("auth.signInSubtitle")}</p>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">{t("auth.firstName")}</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("auth.lastName")}</label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">{t("auth.email")}</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="text-sm font-medium">
            {t("auth.phoneOptional")}
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div>
          <label className="text-sm font-medium">{t("auth.password")}</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <div>
          <label className="text-sm font-medium">
            {t("auth.confirmPassword")}
          </label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("actions.processing") : t("auth.register")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.hasAccount")}{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium text-primary hover:underline"
        >
          {t("auth.signIn")}
        </button>
      </p>
    </div>
  );
}
