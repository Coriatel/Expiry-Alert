import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "suspended";
  date_created?: string;
}

interface TeamMembersPanelProps {
  teamId: number;
}

export function TeamMembersPanel({ teamId }: TeamMembersPanelProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    member?: TeamMember;
    action?: "suspend" | "unsuspend";
  }>({ open: false });

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/teams/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleStatusChange = async (member: TeamMember, status: "active" | "suspended") => {
    try {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/members/${member.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      showToast(
        status === "suspended" ? t("teamManagement.memberSuspended") : t("teamManagement.memberUnsuspended"),
        "success"
      );
      await loadMembers();
    } catch (err: any) {
      showToast(err.message || t("errors.unexpectedError"), "error");
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "owner": return t("teamManagement.owner");
      case "admin": return t("teamManagement.admin");
      default: return t("teamManagement.member");
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("actions.processing")}</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{t("teamManagement.members")}</h3>
      <div className="divide-y rounded-lg border">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{member.name}</p>
              <p className="text-sm text-muted-foreground truncate">{member.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                {roleLabel(member.role)}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                member.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                {member.status === "active" ? t("teamManagement.active") : t("teamManagement.suspended")}
              </span>
              {member.role !== "owner" && (
                member.status === "active" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirm({ open: true, member, action: "suspend" })}
                  >
                    {t("teamManagement.suspend")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(member, "active")}
                  >
                    {t("teamManagement.unsuspend")}
                  </Button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false })}
        onConfirm={() => {
          if (confirm.member && confirm.action) {
            handleStatusChange(confirm.member, confirm.action === "suspend" ? "suspended" : "active");
          }
        }}
        title={t("teamManagement.suspend")}
        message={t("teamManagement.confirmSuspend", { name: confirm.member?.name ?? "" })}
        variant="warning"
      />
    </div>
  );
}
