"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskBar, type AskMessage, type AskModel } from "@/components/ui/ask-bar";
import { ActionCard, type ActionState } from "@/components/assistant/action-card";
import {
  ASSISTANT_MOCK,
  TOOL_LABELS,
  confirmAssistantAction,
  sendAssistantChat,
  type AssistantTurn,
} from "@/lib/api/assistant";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { useProject } from "@/lib/project/project-context";

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** The scope the question was asked in, shown under the reply. */
  scope?: string;
  toolsUsed?: string[];
  actions?: ActionState[];
  /** A failed request; kept on screen with a retry, never sent as history. */
  failed?: boolean;
}

const TEMPLATES = [
  { label: "Сколько денег в кассе?", text: "Сколько денег в кассе сейчас, по наличным и банку?" },
  { label: "Кому и сколько мы должны?", text: "Кому из поставщиков и сколько мы должны? Начни с самых старых долгов." },
  { label: "Что заканчивается на складе?", text: "Какие материалы на складах ниже минимума?" },
  { label: "Расходы за месяц", text: "Какие были расходы в этом месяце и на что больше всего ушло?" },
  { label: "Записать расход", text: "Запиши расход " },
];

const ALL = "all";

/** The backend takes at most 60 turns; the oldest ones matter least. */
const HISTORY_TURNS = 40;

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "ASSISTANT_DISABLED") return "Ассистент ещё не подключён: на сервере нет ключа Claude API.";
    if (error.code === "ASSISTANT_BUSY") return "Ассистент перегружен. Попробуйте через минуту.";
    if (error.code === "ASSISTANT_UPSTREAM_ERROR") return "Ассистент временно недоступен. Попробуйте ещё раз чуть позже.";
    if (error.code === "ASSISTANT_ACTION_INVALID") return "Предложение устарело. Попросите ассистента подготовить его заново.";
    if (error.statusCode === 403) return "Нет прав на это действие.";
    return error.message;
  }
  return "Не удалось связаться с сервером. Проверьте соединение.";
}

/** What the model should know about a card's fate on the next question. */
function actionNote(state: ActionState): string {
  if (state.status === "confirmed") return `[Владелец подтвердил: ${state.action.summary}. Записано.]`;
  if (state.status === "rejected") return `[Владелец отклонил: ${state.action.summary}.]`;
  return `[Предложение не подтверждено: ${state.action.summary}.]`;
}

function toHistory(items: ChatItem[]): AssistantTurn[] {
  return items
    .filter((i) => !i.failed)
    .map((i) => ({
      role: i.role,
      text: [i.text, ...(i.actions ?? []).map(actionNote)].filter(Boolean).join("\n\n") || "…",
    }))
    .slice(-HISTORY_TURNS);
}

function useStoredChat(userId: string | undefined) {
  const key = userId ? `plaza-assistant:${userId}` : null;
  const [items, setItems] = useState<ChatItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage
      if (raw) setItems(JSON.parse(raw) as ChatItem[]);
    } catch {
      sessionStorage.removeItem(key);
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (key && ready) sessionStorage.setItem(key, JSON.stringify(items));
  }, [key, items, ready]);

  return [items, setItems, ready] as const;
}

export default function AssistantPage() {
  const { user } = useAuth();
  const { projectId, project, projects, setProjectId } = useProject();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [items, setItems, ready] = useStoredChat(user?.id);
  const [busy, setBusy] = useState(false);
  const [scopeId, setScopeId] = useState<string>("current");
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  // Re-render now and then so cards notice when their 15 minutes run out.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const scopes: AskModel[] = useMemo(
    () => [
      { id: "current", name: project?.name ?? "Текущий проект", detail: "Только проект, открытый сейчас" },
      ...(projects.length > 1
        ? [{ id: ALL, name: "Все проекты", detail: "Суммирует и сравнивает все проекты" }]
        : []),
    ],
    [project?.name, projects.length],
  );
  const scope = scopes.find((s) => s.id === scopeId) ?? scopes[0];

  const ask = useCallback(
    async (question: string, base: ChatItem[]) => {
      const userItem: ChatItem = { id: crypto.randomUUID(), role: "user", text: question };
      const next = [...base, userItem];
      setItems(next);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const reply = await sendAssistantChat(
          toHistory(next),
          scope.id === ALL ? null : projectId,
          controller.signal,
        );
        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: reply.reply,
            scope: scope.name,
            toolsUsed: reply.toolsUsed,
            actions: reply.pendingActions.map((action) => ({ action, status: "pending" })),
          },
        ]);
      } catch (error) {
        setItems((prev) => {
          const marked = prev.map((i) => (i.id === userItem.id ? { ...i, failed: true } : i));
          return controller.signal.aborted
            ? marked
            : [...marked, { id: crypto.randomUUID(), role: "assistant", text: errorText(error), failed: true }];
        });
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [projectId, scope.id, scope.name, setItems],
  );

  function retry() {
    const lastQuestion = [...items].reverse().find((i) => i.role === "user" && i.failed);
    if (!lastQuestion || busy) return;
    void ask(
      lastQuestion.text,
      items.filter((i) => !i.failed),
    );
  }

  function updateAction(itemId: string, actionId: string, patch: Partial<ActionState>) {
    setItems((prev) =>
      prev.map((i) =>
        i.id !== itemId
          ? i
          : { ...i, actions: i.actions?.map((a) => (a.action.id === actionId ? { ...a, ...patch } : a)) },
      ),
    );
  }

  async function confirm(itemId: string, state: ActionState) {
    updateAction(itemId, state.action.id, { status: "confirming", error: undefined });
    try {
      const created = await confirmAssistantAction(state.action);
      updateAction(itemId, state.action.id, { status: "confirmed", transactionId: created.id });
      void queryClient.invalidateQueries({ queryKey: ["finance", state.action.projectId] });
      void queryClient.invalidateQueries({ queryKey: ["analytics", state.action.projectId] });
    } catch (error) {
      updateAction(itemId, state.action.id, { status: "failed", error: errorText(error) });
    }
  }

  function openTransaction(state: ActionState) {
    if (!state.transactionId) return;
    if (state.action.projectId !== projectId) setProjectId(state.action.projectId);
    router.push(`/finance/${state.transactionId}`);
  }

  const messages: AskMessage[] = items.map((i) => ({
    id: i.id,
    role: i.role,
    text: i.text,
    failed: i.failed,
  }));
  const lastId = items[items.length - 1]?.id;
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name;
  const firstName = user?.displayName?.split(" ")[0];

  if (!ready) return null;

  return (
    <div className="h-full">
      <AskBar
        greeting={firstName ? `${firstName}, что посмотрим?` : "Что посмотрим?"}
        subline="Деньги, долги поставщикам, склады и расход материалов. Записываю в кассу только после вашего подтверждения."
        placeholder="Спросите о деньгах, долгах, складе…"
        models={scopes}
        model={scope}
        onModelChange={(m) => setScopeId(m.id)}
        messages={messages}
        busy={busy}
        onSend={(text) => void ask(text, items)}
        onStop={() => abortRef.current?.abort()}
        templates={TEMPLATES}
        notice={ASSISTANT_MOCK ? "Демо-режим: цифры в ответах выдуманы" : undefined}
        actions={
          items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                abortRef.current?.abort();
                setItems([]);
              }}
            >
              <RotateCcw className="size-3.5" />
              Новый диалог
            </Button>
          )
        }
        renderAfter={(m) => {
          const item = items.find((i) => i.id === m.id);
          if (!item) return null;
          return (
            <>
              {item.failed && item.id === lastId && (
                <div>
                  <Button size="sm" variant="outline" className="h-8" onClick={retry} disabled={busy}>
                    Повторить
                  </Button>
                </div>
              )}
              {item.actions?.map((state) => (
                <ActionCard
                  key={state.action.id}
                  state={state}
                  projectName={projectName(state.action.projectId)}
                  expired={new Date(state.action.expiresAt).getTime() < now}
                  onConfirm={() => void confirm(item.id, state)}
                  onReject={() => updateAction(item.id, state.action.id, { status: "rejected" })}
                  onOpen={ASSISTANT_MOCK ? undefined : () => openTransaction(state)}
                />
              ))}
              {!item.failed && (
                <p className="text-xs text-muted-foreground">
                  {[
                    item.scope,
                    item.toolsUsed?.length
                      ? `смотрел: ${[...new Set(item.toolsUsed.map((t) => TOOL_LABELS[t] ?? t))].join(", ")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </>
          );
        }}
      />
    </div>
  );
}
