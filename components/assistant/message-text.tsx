import { Fragment } from "react";

/**
 * The few Markdown shapes the assistant uses — paragraphs, "- " lists and
 * **bold** — rendered as plain React elements. No HTML from the model ever
 * reaches the DOM.
 */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const BULLET = /^\s*[-•]\s+/;

/** Splits one paragraph block into runs of plain lines and bullet lines,
 * so "За месяц:\n- приход…" renders as a line followed by a list. */
function runs(block: string): { list: boolean; lines: string[] }[] {
  const out: { list: boolean; lines: string[] }[] = [];
  for (const line of block.split("\n")) {
    const list = BULLET.test(line);
    const last = out[out.length - 1];
    if (last && last.list === list) last.lines.push(line);
    else out.push({ list, lines: [line] });
  }
  return out;
}

export function MessageText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/).flatMap(runs);
  return (
    <div className="space-y-2.5 text-[15px] leading-relaxed text-foreground/90">
      {blocks.map((run, i) =>
        run.list ? (
          <ul key={i} className="space-y-1 pl-5">
            {run.lines.map((l, j) => (
              <li key={j} className="list-disc marker:text-muted-foreground/60">
                {inline(l.replace(BULLET, ""))}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">
            {inline(run.lines.join("\n"))}
          </p>
        ),
      )}
    </div>
  );
}
