import { useEffect, useRef, useState } from "react";
import mascot from "../assets/jollibee-mascot.png";

type Status = "Done" | "In progress" | "Not started";
interface Item { id: string; section: string; update: string; status: Status; comment: string }
type SaveState = "idle" | "saving" | "file" | "browser" | "error";

// Comments are written to public/change-log/data.json through the dev server's /api/change-log.
// A static host (GitHub Pages) has nothing that can write a file, so there the page keeps
// comments in this browser instead and says so.
const DATA_URL = "./data.json";
const API_URL = "/api/change-log";
const LOCAL_KEY = "jollibee-change-log-comments";

const STATUS_STYLE: Record<Status, string> = {
  Done: "bg-success-subtle text-success",
  "In progress": "bg-reward text-ink",
  "Not started": "bg-sunken text-ink-2",
};

const readLocal = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}"); } catch { return {}; }
};

export function ChangeLog() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Decided on the first save attempt: can this host write the JSON file?
  const canWriteFile = useRef<boolean | null>(null);

  useEffect(() => {
    fetch(`${DATA_URL}?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { items: Item[] }) => {
        const local = readLocal();
        setItems(d.items.map((i) => (local[i.id] !== undefined ? { ...i, comment: local[i.id] } : i)));
      })
      .catch(() => setLoadError(true));
  }, []);

  const persist = async (id: string, comment: string) => {
    setSave("saving");
    if (canWriteFile.current !== false) {
      try {
        const r = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, comment }) });
        if (!r.ok) throw new Error();
        canWriteFile.current = true;
        // The file now holds this comment, so drop any browser-only copy of it.
        const local = readLocal();
        delete local[id];
        localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
        return setSave("file");
      } catch {
        if (canWriteFile.current === true) return setSave("error");
        canWriteFile.current = false;
      }
    }
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...readLocal(), [id]: comment }));
      setSave("browser");
    } catch {
      setSave("error");
    }
  };

  const onComment = (id: string, comment: string) => {
    setItems((list) => list!.map((i) => (i.id === id ? { ...i, comment } : i)));
    setSave("saving");
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => persist(id, comment), 600);
  };

  const counts = (s: Status) => items?.filter((i) => i.status === s).length ?? 0;
  const sections = items ? [...new Set(items.map((i) => i.section))] : [];

  const saveText: Record<SaveState, string> = {
    idle: "Comments save automatically",
    saving: "Saving…",
    file: "All changes saved to data.json",
    browser: "Saved in this browser only — this site can't write the shared file",
    error: "Couldn't save. Check the connection and edit again.",
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="bg-brand text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5 sm:px-6">
          <img src={mascot} alt="Jollibee" className="h-12 w-12 [filter:drop-shadow(1px_0_0_white)_drop-shadow(-1px_0_0_white)_drop-shadow(0_1px_0_white)_drop-shadow(0_-1px_0_white)]" />
          <div className="min-w-0 flex-1">
            <h1 className="t-h1">Change log</h1>
            <p className="text-sm">Jollibee UAE mobile app · design feedback and what has been done about it</p>
          </div>
          <a href="../" className="hidden rounded-md bg-surface px-4 py-2 text-sm font-semibold text-brand-text sm:block">Open the prototype</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["Done", "In progress", "Not started"] as Status[]).map((s) => (
            <span key={s} className={`t-num rounded-sm px-2 py-1 text-sm font-semibold ${STATUS_STYLE[s]}`}>{counts(s)} {s}</span>
          ))}
          <span role="status" className={`ml-auto text-sm ${save === "error" ? "font-semibold text-error" : save === "browser" ? "text-warning" : "text-ink-3"}`}>
            {saveText[save]}
          </span>
        </div>

        {loadError && <p role="alert" className="rounded-lg bg-error-subtle p-4 text-error">The change log couldn't be loaded. Refresh the page to try again.</p>}
        {!items && !loadError && <p className="p-4 text-ink-3">Loading…</p>}

        {items && (
          <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-sunken">
                  <th scope="col" className="t-label w-[46%] px-4 py-3 text-ink-2">Updates</th>
                  <th scope="col" className="t-label w-[14%] px-4 py-3 text-ink-2">Status</th>
                  <th scope="col" className="t-label px-4 py-3 text-ink-2">Comment</th>
                </tr>
              </thead>
              {sections.map((section) => (
                <tbody key={section}>
                  <tr className="border-b border-line bg-brand-subtle">
                    <th scope="colgroup" colSpan={3} className="px-4 py-2 font-bold text-brand-text">{section}</th>
                  </tr>
                  {items.filter((i) => i.section === section).map((i) => (
                    <tr key={i.id} className="border-b border-line align-top last:border-b-0">
                      <td className="px-4 py-3">{i.update}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block whitespace-nowrap rounded-sm px-2 py-0.5 text-sm font-semibold ${STATUS_STYLE[i.status]}`}>{i.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          value={i.comment}
                          onChange={(e) => onComment(i.id, e.target.value)}
                          aria-label={`Comment on update ${i.id}`}
                          placeholder="Add a comment"
                          rows={Math.max(2, Math.ceil(i.comment.length / 48))}
                          className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-base outline-none placeholder:text-ink-3 hover:border-line-strong focus:border-ink"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
