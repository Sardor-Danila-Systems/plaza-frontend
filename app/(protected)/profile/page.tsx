"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/shared/password-input";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/lib/auth/auth-provider";
import { useProject } from "@/lib/project/project-context";
import { getErrorMessage } from "@/lib/errors/map";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Владелец",
  ACCOUNTANT: "Бухгалтер",
  PROJECT_MANAGER: "Менеджер проекта",
};

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { project } = useProject();

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-24">
      <PageHeader title="Профиль" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Основные данные</CardTitle>
        </CardHeader>
        <CardContent>
          <NameForm displayName={user?.displayName ?? ""} onSave={updateProfile} />

          <dl className="mt-4 space-y-3 border-t pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user?.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Роль</dt>
              <dd>
                <Badge variant="secondary">{user ? ROLE_LABELS[user.role] : ""}</Badge>
              </dd>
            </div>
            {user?.role === "PROJECT_MANAGER" && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Проект</dt>
                <dd>{project?.name ?? "—"}</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Роль и проект назначаются администратором и не могут быть изменены самостоятельно.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Смена пароля</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm onChangePassword={changePassword} />
        </CardContent>
      </Card>
    </div>
  );
}

function NameForm({
  displayName,
  onSave,
}: {
  displayName: string;
  onSave: (displayName: string) => Promise<unknown>;
}) {
  const [name, setName] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);

  const dirty = name.trim() !== displayName && name.trim().length > 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    setIsSaving(true);
    try {
      await onSave(name.trim());
      toast.success("Имя обновлено");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Label htmlFor="profile-name">Имя</Label>
      <div className="flex gap-2">
        <Input
          id="profile-name"
          className="h-11 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" className="h-11" disabled={!dirty || isSaving}>
          {isSaving ? "…" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}

function PasswordForm({
  onChangePassword,
}: {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < 8) {
      setFormError("Новый пароль должен быть не короче 8 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Пароли не совпадают");
      return;
    }

    setIsSubmitting(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      toast.success("Пароль изменён. Другие устройства вышли из системы.");
      reset();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="space-y-2">
        <Label htmlFor="current-password">Текущий пароль</Label>
        <PasswordInput
          id="current-password"
          className="h-11"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">Новый пароль</Label>
        <PasswordInput
          id="new-password"
          className="h-11"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Повторите новый пароль</Label>
        <PasswordInput
          id="confirm-password"
          className="h-11"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        className="h-11 w-full"
        disabled={!currentPassword || !newPassword || !confirmPassword || isSubmitting}
      >
        {isSubmitting ? "Сохранение…" : "Сменить пароль"}
      </Button>
    </form>
  );
}
