import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { selectTeam, type TeamSelectionResult } from "@/lib/auth";

interface TeamSelectionProps {
  onTeamSelected: (result: TeamSelectionResult) => void;
  onSignOut: () => void;
}

type TeamSelectionTab = "join" | "request" | "create";

export function TeamSelection({
  onTeamSelected,
  onSignOut,
}: TeamSelectionProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TeamSelectionTab>("join");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [joinTeamName, setJoinTeamName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [requestTeamName, setRequestTeamName] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [createTeamName, setCreateTeamName] = useState("");
  const [createJoinPassword, setCreateJoinPassword] = useState("");

  async function submitSelection(action: () => Promise<TeamSelectionResult>) {
    setError(null);
    setLoading(true);

    try {
      const result = await action();
      onTeamSelected(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl w-full bg-card border rounded-2xl p-8 shadow-sm">
      <h1 className="text-2xl font-bold mb-2">{t("teamSelect.title")}</h1>
      <p className="text-muted-foreground mb-6">
        {t("teamSelect.subtitle")}
      </p>

      {error ? <div className="mb-4 text-sm text-destructive">{error}</div> : null}

      <div className="grid grid-cols-3 gap-2 mb-6">
        <Button
          type="button"
          variant={tab === "join" ? "default" : "outline"}
          className="w-full"
          onClick={() => setTab("join")}
        >
          {t("teamSelect.joinExisting")}
        </Button>
        <Button
          type="button"
          variant={tab === "request" ? "default" : "outline"}
          className="w-full"
          onClick={() => setTab("request")}
        >
          {t("teamSelect.requestAccess")}
        </Button>
        <Button
          type="button"
          variant={tab === "create" ? "default" : "outline"}
          className="w-full"
          onClick={() => setTab("create")}
        >
          {t("teamSelect.createNew")}
        </Button>
      </div>

      {tab === "join" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitSelection(() =>
              selectTeam({
                action: "join",
                teamName: joinTeamName.trim(),
                password: joinPassword,
              }),
            );
          }}
        >
          <p className="text-sm text-muted-foreground">
            {t("teamSelect.joinDescription")}
          </p>
          <div>
            <label className="text-sm font-medium">{t("teamSelect.teamName")}</label>
            <Input
              value={joinTeamName}
              onChange={(event) => setJoinTeamName(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              {t("teamSelect.teamPassword")}
            </label>
            <Input
              type="password"
              value={joinPassword}
              onChange={(event) => setJoinPassword(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("actions.processing") : t("teamSelect.join")}
          </Button>
        </form>
      ) : null}

      {tab === "request" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitSelection(() =>
              selectTeam({
                action: "request",
                teamName: requestTeamName.trim(),
                message: requestMessage.trim() || undefined,
              }),
            );
          }}
        >
          <p className="text-sm text-muted-foreground">
            {t("teamSelect.requestDescription")}
          </p>
          <div>
            <label className="text-sm font-medium">{t("teamSelect.teamName")}</label>
            <Input
              value={requestTeamName}
              onChange={(event) => setRequestTeamName(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              {t("teamSelect.requestMessage")}
            </label>
            <Textarea
              value={requestMessage}
              onChange={(event) => setRequestMessage(event.target.value)}
              placeholder={t("teamSelect.requestMessagePlaceholder")}
              maxLength={500}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("actions.processing") : t("teamSelect.sendRequest")}
          </Button>
        </form>
      ) : null}

      {tab === "create" ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitSelection(() =>
              selectTeam({
                action: "create",
                teamName: createTeamName.trim(),
                joinPassword: createJoinPassword,
              }),
            );
          }}
        >
          <p className="text-sm text-muted-foreground">
            {t("teamSelect.createDescription")}
          </p>
          <div>
            <label className="text-sm font-medium">{t("teamSelect.teamName")}</label>
            <Input
              value={createTeamName}
              onChange={(event) => setCreateTeamName(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">
              {t("teamSelect.joinPassword")}
            </label>
            <Input
              type="password"
              value={createJoinPassword}
              onChange={(event) => setCreateJoinPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("actions.processing") : t("teamSelect.create")}
          </Button>
        </form>
      ) : null}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onSignOut}
          className="text-sm text-muted-foreground hover:underline"
        >
          {t("auth.signOut")}
        </button>
      </div>
    </div>
  );
}
