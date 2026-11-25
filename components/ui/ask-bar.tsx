"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import "./ask-bar-utils/ask-bar.css";

/** One choice in the bar's picker (a scope, a model — whatever the page needs). */
export type AskModel = { id: string; name: string; detail: string };

export type AskMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Shown under an assistant reply, e.g. the scope it answered for. */
  model?: string;
  /** A request that failed; drawn muted. */
  failed?: boolean;
};

export type AskTemplate = { label: string; text: string };

export type AskBarProps = {
  greeting: string;
  /** One quiet line under the greeting. */
  subline?: ReactNode;
  placeholder?: string;
  models: AskModel[];
  model: AskModel;
  onModelChange: (model: AskModel) => void;
  /** The conversation, owned by the page. */
  messages: AskMessage[];
  /** Waiting for the reply to the last question. */
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  /** Ready-made questions in the plus menu and under the greeting. */
  templates?: AskTemplate[];
  /** Anything to draw after an assistant reply once it has finished appearing. */
  renderAfter?: (message: AskMessage) => ReactNode;
  /** Top-right slot (e.g. "new conversation"). */
  actions?: ReactNode;
  /** A notice pinned above the bar (e.g. demo mode). */
  notice?: ReactNode;
  /** BCP 47 tag for voice input. */
  lang?: string;
  className?: string;
};

type Speech = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  interimResults: boolean;
  continuous: boolean;
  lang: string;
};

/** Each word with the whitespace before it — the steps a reply appears in. */
function tokens(text: string): string[] {
  return text.match(/\s*\S+/g) ?? [];
}

/** While a reply is half-shown, close a dangling ** so bold never flashes as asterisks. */
function balanced(text: string): string {
  return (text.match(/\*\*/g)?.length ?? 0) % 2 === 1 ? `${text}**` : text;
}

const LINE = 24;
const MAX_ROWS = 8;

const Icon = {
  plus: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5v15M4.5 12h15" />
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11.5" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5.5M6 11.5l6-6 6 6" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" className="askb__fill" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="askb__fill"
        d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5v.4c-4.6.6-6.9 2.9-7.5 7.5h-.4c-.6-4.6-2.9-6.9-7.5-7.5V10c4.6-.6 6.9-2.9 7.5-7.5Z"
        transform="translate(0 1.6)"
      />
    </svg>
  ),
  template: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 12.5h8M8 16h5" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5.5 12.5 4 4 9-9" />
    </svg>
  ),
};

/**
 * Ask Bar
 * A quiet place to start a conversation: a greeting over a warm glow and one
 * rounded bar to ask in. The bar grows as you write, swaps the microphone for
 * send when there is something to send, offers ready questions from its plus
 * menu and switches scope from its own. Once you ask, the greeting steps aside
 * and each answer appears word by word above the bar.
 *
 * Controlled: the page owns the messages and the request; this draws them.
 */
export function AskBar({
  greeting,
  subline,
  placeholder = "Спросите что угодно",
  models,
  model,
  onModelChange,
  messages,
  busy,
  onSend,
  onStop,
  templates = [],
  renderAfter,
  actions,
  notice,
  lang = "ru-RU",
  className = "",
}: AskBarProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [menu, setMenu] = useState<null | "plus" | "model">(null);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");
  const [rows, setRows] = useState(1);
  /** The reply being revealed and how many of its words are shown. */
  const [reveal, setReveal] = useState<{ id: string; shown: number } | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const plusBtn = useRef<HTMLButtonElement>(null);
  const modelBtn = useRef<HTMLButtonElement>(null);
  const menuEl = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const speech = useRef<Speech | null>(null);
  /** Replies already on screen when we mounted (restored history) never animate. */
  const seen = useRef<Set<string> | null>(null);
  if (seen.current === null) seen.current = new Set(messages.map((m) => m.id));

  // Grow the field with its content, up to eight lines.
  useLayoutEffect(() => {
    const a = area.current;
    if (!a) return;
    a.style.height = "auto";
    const r = Math.max(1, Math.min(MAX_ROWS, Math.round(a.scrollHeight / LINE)));
    a.style.height = `${r * LINE}px`;
    setRows(r);
  }, [text]);

  // A new assistant reply: reveal it word by word (all at once under reduced motion).
  const last = messages[messages.length - 1];
  useEffect(() => {
    if (!last || seen.current!.has(last.id)) return;
    seen.current!.add(last.id);
    if (last.role !== "assistant" || last.failed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const total = tokens(last.text).length;
    let shown = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the reveal of a reply that just arrived
    setReveal({ id: last.id, shown });
    const timer = setInterval(() => {
      shown += 1 + Math.floor(total / 120); // long replies speed up
      if (shown >= total) {
        clearInterval(timer);
        setReveal(null);
      } else {
        setReveal({ id: last.id, shown });
      }
    }, 32);
    return () => {
      clearInterval(timer);
      setReveal(null);
    };
  }, [last]);

  // Keep the newest line in view.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, reveal, busy]);

  // Menus: focus the current item on open, close on a click elsewhere.
  useEffect(() => {
    if (!menu) return;
    menuEl.current?.querySelector<HTMLElement>("[aria-checked='true'], [role^='menuitem']")?.focus();
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuEl.current?.contains(t) && !plusBtn.current?.contains(t) && !modelBtn.current?.contains(t)) {
        setMenu(null);
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [menu]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(""), 3600);
    return () => clearTimeout(t);
  }, [note]);

  useEffect(() => () => speech.current?.abort(), []);

  // Focus the field again once a reply is in.
  useEffect(() => {
    if (!busy) area.current?.focus({ preventScroll: true });
  }, [busy]);

  const close = (back: "plus" | "model") => {
    setMenu(null);
    (back === "plus" ? plusBtn : modelBtn).current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuEl.current?.querySelectorAll<HTMLElement>("[role^='menuitem']") ?? [])];
    const k = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(k + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      items[e.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      close(menu!);
    }
  };

  const send = (value = text) => {
    const prompt = value.trim();
    if (!prompt || busy) return;
    speech.current?.stop();
    setText("");
    onSend(prompt);
  };

  const listen = () => {
    if (listening) {
      speech.current?.stop();
      return;
    }
    const W = window as unknown as {
      SpeechRecognition?: new () => Speech;
      webkitSpeechRecognition?: new () => Speech;
    };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) {
      setNote("Голосовой ввод в этом браузере недоступен.");
      return;
    }
    const r = new SR();
    r.interimResults = true;
    r.continuous = false;
    r.lang = lang;
    const before = text ? `${text.trimEnd()} ` : "";
    r.onresult = (e) =>
      setText(
        before +
          Array.from(e.results)
            .map((x) => x[0].transcript)
            .join(""),
      );
    r.onend = () => {
      setListening(false);
      area.current?.focus();
    };
    r.onerror = () => {
      setListening(false);
      setNote("Не расслышал. Проверьте микрофон и попробуйте ещё раз.");
    };
    speech.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setNote("Голосовой ввод сейчас недоступен.");
    }
  };

  const started = messages.length > 0;
  const canSend = text.trim().length > 0;

  return (
    <section className={`askb ${className}`} data-started={started || undefined} aria-label="Ассистент">
      <div className="askb__glow" aria-hidden="true" />
      {actions && started && <div className="askb__actions">{actions}</div>}

      {!started && (
        <div className="askb__intro">
          <span className="askb__mark" aria-hidden="true">
            {Icon.spark}
          </span>
          <h2 className="askb__hello">
            {greeting.split(" ").map((w, i) => (
              <span key={i} style={{ animationDelay: `${120 + i * 70}ms` }}>
                {w}{" "}
              </span>
            ))}
          </h2>
          {subline && <p className="askb__subline">{subline}</p>}
        </div>
      )}

      {started && (
        <div ref={log} className="askb__log" role="log" aria-live="polite" aria-label="Диалог">
          <div className="askb__thread">
            {messages.map((m) => {
              if (m.role === "user") {
                return (
                  <div key={m.id} className="askb__me" data-failed={m.failed || undefined}>
                    <p>{m.text}</p>
                  </div>
                );
              }
              const revealing = reveal?.id === m.id;
              const shown = revealing ? balanced(tokens(m.text).slice(0, reveal.shown).join("")) : m.text;
              return (
                <div key={m.id} className="askb__ai" data-live={revealing || undefined} data-failed={m.failed || undefined}>
                  <span className="askb__spark" aria-hidden="true">
                    {Icon.spark}
                  </span>
                  <div className="askb__ai-body">
                    <AskText text={shown} />
                    {!revealing && renderAfter?.(m)}
                    {!revealing && m.model && <small className="askb__meta">{m.model}</small>}
                  </div>
                </div>
              );
            })}
            {busy && (
              <div className="askb__ai" data-live>
                <span className="askb__spark" aria-hidden="true">
                  {Icon.spark}
                </span>
                <div className="askb__ai-body">
                  <span className="askb__dots" role="status" aria-label="Ассистент смотрит данные">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="askb__dock">
        {notice && <div className="askb__notice">{notice}</div>}
        <form
          className="askb__bar"
          data-expanded={rows > 1 || undefined}
          data-listening={listening || undefined}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {templates.length > 0 && (
            <div className="askb__plus-wrap">
              <button
                ref={plusBtn}
                type="button"
                className="askb__icon"
                aria-label="Готовые вопросы"
                aria-haspopup="menu"
                aria-expanded={menu === "plus"}
                aria-controls={menu === "plus" ? `${id}-plus` : undefined}
                onClick={() => setMenu((m) => (m === "plus" ? null : "plus"))}
              >
                {Icon.plus}
              </button>
              {menu === "plus" && (
                <div
                  ref={menuEl}
                  id={`${id}-plus`}
                  className="askb__menu askb__menu--plus"
                  role="menu"
                  aria-label="Готовые вопросы"
                  onKeyDown={onMenuKey}
                >
                  {templates.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => {
                        setMenu(null);
                        setText(t.text);
                        area.current?.focus();
                      }}
                    >
                      {Icon.template}
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="askb__field">
            <span className="askb__sr">Вопрос ассистенту</span>
            <textarea
              ref={area}
              rows={1}
              value={text}
              maxLength={4000}
              placeholder={listening ? "Слушаю…" : placeholder}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
            />
          </label>

          {models.length > 1 && (
            <div className="askb__model-wrap">
              <button
                ref={modelBtn}
                type="button"
                className="askb__model"
                aria-haspopup="menu"
                aria-expanded={menu === "model"}
                aria-controls={menu === "model" ? `${id}-model` : undefined}
                aria-label={`Охват: ${model.name}`}
                onClick={() => setMenu((m) => (m === "model" ? null : "model"))}
              >
                <span>{model.name}</span>
                {Icon.chevron}
              </button>
              {menu === "model" && (
                <div
                  ref={menuEl}
                  id={`${id}-model`}
                  className="askb__menu askb__menu--model"
                  role="menu"
                  aria-label="Охват"
                  onKeyDown={onMenuKey}
                >
                  {models.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={m.id === model.id}
                      tabIndex={-1}
                      onClick={() => {
                        onModelChange(m);
                        close("model");
                      }}
                    >
                      <span>
                        <strong>{m.name}</strong>
                        <small>{m.detail}</small>
                      </span>
                      {m.id === model.id && Icon.check}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {busy ? (
            <button type="button" className="askb__action askb__action--stop" aria-label="Остановить" onClick={onStop}>
              {Icon.stop}
            </button>
          ) : canSend ? (
            <button type="submit" className="askb__action askb__action--send" aria-label="Отправить">
              {Icon.send}
            </button>
          ) : (
            <button
              type="button"
              className="askb__icon askb__mic"
              aria-label={listening ? "Остановить запись" : "Сказать голосом"}
              aria-pressed={listening}
              onClick={listen}
            >
              {listening ? (
                <span className="askb__bars" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                Icon.mic
              )}
            </button>
          )}
        </form>

        {!started && templates.length > 0 && (
          <div className="askb__chips">
            {templates.slice(0, 4).map((t, i) => (
              <button
                key={t.label}
                type="button"
                className="askb__chip"
                style={{ animationDelay: `${420 + i * 60}ms` }}
                onClick={() => send(t.text)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <p className="askb__note" aria-live="polite">
          {note}
        </p>
      </div>
    </section>
  );
}

/** Paragraphs, "- " lists and **bold**, as React elements — model text never reaches the DOM as HTML. */
function AskText({ text }: { text: string }) {
  const bullet = /^\s*[-•]\s+/;
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  const runs: { list: boolean; lines: string[] }[] = [];
  for (const block of text.trim().split(/\n{2,}/)) {
    let prev: { list: boolean; lines: string[] } | null = null;
    for (const line of block.split("\n")) {
      const list = bullet.test(line);
      if (prev && prev.list === list) prev.lines.push(line);
      else runs.push((prev = { list, lines: [line] }));
    }
  }
  return (
    <div className="askb__text">
      {runs.map((r, i) =>
        r.list ? (
          <ul key={i}>
            {r.lines.map((l, j) => (
              <li key={j}>{inline(l.replace(bullet, ""))}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(r.lines.join("\n"))}</p>
        ),
      )}
    </div>
  );
}

export default AskBar;
