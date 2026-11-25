"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, RotateCcw, Square } from "lucide-react";
import { cn } from "cn";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ActionCard, type ActionState } from "@/components/assistant/action-card";
import { MessageText } from "@/components/assistant/message-text";
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
  toolsUsed?: string[];
  actions?: ActionState[];
  /** A failed request; kept on screen with a retry, never sent as history. */
  failed?: boolean;
}

const SUGGESTIONS = [
  "Сколько денег в кассе по всем проектам?",
  "Кому и сколько мы должны?",
  "Что заканчивается на складе?",
  "Сравни расходы проектов за этот месяц",
];

/** The backend takes at most 60 turns; the oldest ones matter least. */
const HISTORY_TURNS = 40;

function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "ASSISTANT_DISABLED") return "Ассистент ещё не подключён: на сервере нет ключа Claude API.";
    if (error.code === "ASSISTANT_BUSY") return "Ассистент перегружен. Попробуйте через минуту.";
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
  const loaded = useRef(false);

  useEffect(() => {
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage
      if (raw) setItems(JSON.parse(raw) as ChatItem[]);
    } catch {
      sessionStorage.removeItem(key);
    }
    loaded.current = true;
  }, [key]);

  useEffect(() => {
    if (key && loaded.current) sessionStorage.setItem(key, JSON.stringify(items));
  }, [key, items]);

  return [items, setItems] as const;
}

export default function AssistantPage() {
  const { user } = useAuth();
  const { projectId, projects, setProjectId } = useProject();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [items, setItems] = useStoredChat(user?.id);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Re-render each minute so cards notice when their 15 minutes run out.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length, busy]);

  const ask = useCallback(
    async (question: string, base: ChatItem[]) => {
      const userItem: ChatItem = { id: crypto.randomUUID(), role: "user", text: question };
      const next = [...base, userItem];
      setItems(next);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const reply = await sendAssistantChat(toHistory(next), projectId, controller.signal);
        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: reply.reply,
            toolsUsed: reply.toolsUsed,
            actions: reply.pendingActions.map((action) => ({ action, status: "pending" })),
          },
        ]);
      } catch (error) {
        if (controller.signal.aborted) {
          setItems((prev) => prev.map((i) => (i.id === userItem.id ? { ...i, failed: true } : i)));
        } else {
          setItems((prev) => [
            ...prev.map((i) => (i.id === userItem.id ? { ...i, failed: true } : i)),
            { id: crypto.randomUUID(), role: "assistant", text: errorText(error), failed: true },
          ]);
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [projectId, setItems],
  );

  function submit(text = draft) {
    const question = text.trim();
    if (!question || busy) return;
    setDraft("");
    void ask(question, items);
  }

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

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name;
  const empty = items.length === 0;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <PageHeader
        title="Ассистент"
        subtitle="Отвечает по данным CRM. Записывает в кассу только после вашего подтверждения."
        actions={
          !empty && (
            <Button
              variant="outline"
              className="h-9 gap-1.5"
              onClick={() => {
                abortRef.current?.abort();
                setItems([]);
              }}
            >
              <RotateCcw className="size-4" />
              Новый диалог
            </Button>
          )
        }
      />

      {ASSISTANT_MOCK && (
        <p className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          Демо-режим: ассистент не подключён к Claude, цифры в ответах выдуманы.
        </p>
      )}

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {empty ? (
          <div className="flex h-full flex-col justify-center pb-10">
            <h2 className="text-lg font-semibold text-foreground text-balance">
              {user?.displayName ? `${user.displayName.split(" ")[0]}, о чём рассказать?` : "О чём рассказать?"}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Деньги, долги поставщикам, склады и расход материалов — по одному проекту или по всем сразу.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border bg-card px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-foreground/25 hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-6 pb-4">
            {items.map((item) =>
              item.role === "user" ? (
                <li key={item.id} className="flex justify-end">
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground",
                      item.failed && "opacity-60",
                    )}
                  >
                    {item.text}
                  </div>
                </li>
              ) : (
                <li key={item.id} className="space-y-3">
                  {item.failed ? (
                    <div className="flex flex-wrap items-center gap-3 text-sm text-destructive">
                      <span>{item.text}</span>
                      {items[items.length - 1]?.id === item.id && (
                        <Button size="sm" variant="outline" className="h-7" onClick={retry} disabled={busy}>
                          Повторить
                        </Button>
                      )}
                    </div>
                  ) : (
                    <MessageText text={item.text} />
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
                  {item.toolsUsed && item.toolsUsed.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Смотрел: {[...new Set(item.toolsUsed.map((t) => TOOL_LABELS[t] ?? t))].join(", ")}
                    </p>
                  )}
                </li>
              ),
            )}
            {busy && (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex gap-1" aria-hidden>
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60 motion-reduce:animate-none"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
                Смотрю данные…
              </li>
            )}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 mt-2 bg-background pb-1 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border bg-card p-2 shadow-[0_2px_8px_oklch(0.22_0.012_55/0.06)] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <label htmlFor="assistant-input" className="sr-only">
            Вопрос ассистенту
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Спросите о деньгах, долгах, складе…"
            className="field-sizing-content max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9 shrink-0"
              onClick={() => abortRef.current?.abort()}
              aria-label="Остановить"
            >
              <Square className="size-3.5 fill-current" />
            </Button>
          ) : (
            <Button type="submit" size="icon" className="size-9 shrink-0" disabled={!draft.trim()} aria-label="Отправить">
              <ArrowUp className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 hidden px-1 text-xs text-muted-foreground md:block">
          Enter — отправить, Shift+Enter — новая строка
        </p>
      </form>
    </div>
  );
}
