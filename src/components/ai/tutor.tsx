"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import {
  ArrowUpRight,
  MessageCircle,
  Send,
  Check,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Japanese } from "@/components/learning/japanese";
import { defaultSettings } from "@/lib/ai/scenarios";
import { demoReply } from "@/lib/ai/demo";
import type {
  AiScenario,
  TutorSettings,
  TutorSnapshot,
  TutorFeedback,
  TutorSession,
  TutorLesson,
} from "@/lib/ai/schema";
type History = {
  sessions: TutorSession[];
  settings: TutorSettings | null;
  usage: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    unknownRequests: number;
    estimatedCost: number | null;
  };
};
class TutorError extends Error {}
async function api<T>(body?: unknown, id?: string): Promise<T> {
  const response = await fetch(
    `/api/ai${id ? `?session=${encodeURIComponent(id)}` : ""}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const data = await response.json();
  if (!response.ok)
    throw new TutorError(
      typeof data.error === "string" ? data.error : "network",
    );
  return data as T;
}
function Feedback({ item }: { item: TutorFeedback }) {
  const t = useTranslations("Ai");
  return (
    <details className="ai-feedback">
      <summary>
        {t(`categories.${item.category}`)} <span>· {item.turn}</span>
      </summary>
      <p>
        <strong>{t("original")}</strong>
      </p>
      <span lang="ja">{item.original}</span>
      {item.correction && (
        <p>
          <strong>{t("correction")}</strong>
          <br />
          <span lang="ja">{item.correction}</span>
        </p>
      )}
      <p>{item.explanation}</p>
      {(["natural", "polite", "grammar", "example"] as const).map(
        (key) =>
          item[key] && (
            <p key={key}>
              <strong>{t(key)}</strong>
              <br />
              <span lang="ja">{item[key]}</span>
            </p>
          ),
      )}
    </details>
  );
}
export function ConversationTutor({
  scenarios,
  live,
  member,
  initial,
  lessons,
  preselectedScenarioId,
}: {
  scenarios: AiScenario[];
  live: boolean;
  member: boolean;
  initial: TutorSnapshot | null;
  lessons: TutorLesson[];
  preselectedScenarioId?: string;
}) {
  const locale = useLocale(),
    t = useTranslations("Ai"),
    router = useRouter();
  const [settings, setSettings] = useState<TutorSettings>(
    initial?.session.settings ?? {
      ...defaultSettings(locale),
      scenarioId:
        preselectedScenarioId ??
        scenarios[0]?.id ??
        defaultSettings(locale).scenarioId,
    },
  );
  const [current, setCurrent] = useState<TutorSnapshot | null>(initial),
    [isDemo, setIsDemo] = useState(!initial && !(live && member));
  const [history, setHistory] = useState<History | null>(null),
    [historyError, setHistoryError] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [draft, setDraft] = useState("");
  const input = useRef<HTMLTextAreaElement>(null),
    status = useRef<HTMLDivElement>(null);
  const retryRequest = useRef<{
    session: string;
    text: string;
    id: string;
  } | null>(null);
  const scenario = scenarios.find(
    (s) => s.id === (current?.session.scenario_id ?? settings.scenarioId),
  );
  const complete = current?.session.status === "completed";
  const showFeedback =
    !!current &&
    (complete || current.session.settings.correctionMode === "each");
  function problem(e: unknown) {
    const key = e instanceof TutorError ? e.message : "network";
    const errors = [
      "sign_in",
      "quota",
      "pending",
      "ended",
      "provider_busy",
      "timeout",
      "unavailable",
      "provider_failed",
      "disabled",
      "not_found",
      "invalid",
      "origin",
      "network",
    ] as const;
    const known = errors.find((value) => value === key) ?? "network";
    setError(t(`errors.${known}`));
  }
  async function refreshHistory() {
    if (!member) return;
    try {
      setHistory(await api<History>());
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    }
  }
  useEffect(() => {
    if (!member) return;
    let active = true;
    api<History>()
      .then((data) => {
        if (active) {
          setHistory(data);
          if (!initial && data.settings)
            setSettings({
              ...data.settings,
              scenarioId: preselectedScenarioId ?? data.settings.scenarioId,
              locale: locale === "ja" ? "ja" : "en",
            });
        }
      })
      .catch(() => {
        if (active) setHistoryError(true);
      });
    return () => {
      active = false;
    };
  }, [member, initial, locale, preselectedScenarioId]);
  async function execute(action: () => Promise<void>) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      problem(e);
    } finally {
      setPending(false);
    }
  }
  function change<K extends keyof TutorSettings>(
    key: K,
    value: TutorSettings[K],
  ) {
    setSettings((s) => ({ ...s, [key]: value }));
    setNotice("");
  }
  async function start() {
    await execute(async () => {
      if (!scenario) throw new TutorError("unavailable");
      const config = {
        ...settings,
        locale: locale === "ja" ? ("ja" as const) : ("en" as const),
      };
      if (isDemo) {
        setCurrent({
          session: {
            id: crypto.randomUUID(),
            scenario_id: scenario.id,
            settings: config,
            status: "active",
            completed_turns: 0,
            created_at: new Date().toISOString(),
          },
          messages: [
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: scenario.opening,
              translation: scenario.opening_translation,
              reviewed: true,
              turn: 0,
            },
          ],
          feedback: [],
        });
      } else {
        const result = await api<TutorSnapshot>({
          action: "start",
          settings: config,
          requestId: crypto.randomUUID(),
        });
        setCurrent(result);
        router.replace(`/ai-practice?session=${result.session.id}`, {
          scroll: false,
        });
        await refreshHistory();
      }
      setDraft("");
      document
        .getElementById("ai-chat")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  }
  async function send() {
    if (!current || !scenario || !draft.trim() || complete) return;
    await execute(async () => {
      if (isDemo) {
        const turn = current.session.completed_turns + 1,
          output = demoReply(
            draft.trim(),
            current.session.settings,
            scenario,
            turn,
          );
        setCurrent({
          ...current,
          session: {
            ...current.session,
            completed_turns: turn,
            status:
              turn >= current.session.settings.target ? "completed" : "active",
          },
          messages: [
            ...current.messages,
            {
              id: crypto.randomUUID(),
              role: "user",
              content: draft.trim(),
              translation: "",
              reviewed: false,
              turn,
            },
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: output.dialogue,
              translation: output.translation,
              reviewed: false,
              turn,
            },
          ],
          feedback: [
            ...current.feedback,
            { ...output, original: draft.trim(), turn },
          ],
        });
      } else {
        const retry = retryRequest.current;
        const requestId =
          retry?.session === current.session.id && retry.text === draft.trim()
            ? retry.id
            : crypto.randomUUID();
        retryRequest.current = {
          session: current.session.id,
          text: draft.trim(),
          id: requestId,
        };
        try {
          setCurrent(
            await api<TutorSnapshot>({
              action: "reply",
              sessionId: current.session.id,
              requestId,
              text: draft.trim(),
            }),
          );
          retryRequest.current = null;
        } catch (error) {
          if (
            error instanceof TutorError &&
            !["network", "pending"].includes(error.message)
          )
            retryRequest.current = null;
          throw error;
        }
        await refreshHistory();
      }
      setDraft("");
      input.current?.focus();
    });
  }
  async function end() {
    if (!current) return;
    await execute(async () => {
      if (isDemo)
        setCurrent({
          ...current,
          session: { ...current.session, status: "completed" },
        });
      else {
        setCurrent(
          await api<TutorSnapshot>({
            action: "end",
            sessionId: current.session.id,
          }),
        );
        await refreshHistory();
      }
    });
  }
  async function open(id: string) {
    await execute(async () => {
      const data = await api<TutorSnapshot>(undefined, id);
      setCurrent(data);
      setSettings(data.session.settings);
      setIsDemo(false);
      setDraft("");
      router.replace(`/ai-practice?session=${id}`, { scroll: false });
      document
        .getElementById("ai-chat")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  }
  async function remove(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    await execute(async () => {
      await api({ action: "delete", sessionId: id });
      if (current?.session.id === id) {
        setCurrent(null);
        router.replace("/ai-practice", { scroll: false });
      }
      await refreshHistory();
    });
  }
  async function saveSettings() {
    await execute(async () => {
      await api({
        action: "settings",
        settings: { ...settings, locale: locale === "ja" ? "ja" : "en" },
      });
      setNotice(t("saved"));
    });
  }
  const vocabulary =
    current?.feedback
      .flatMap((f) => f.vocabulary)
      .filter((v, i, a) => a.findIndex((x) => x.term === v.term) === i) ?? [];
  const expressions =
    current?.feedback
      .flatMap((f) =>
        [f.natural, f.polite, f.example].filter((v): v is string => !!v),
      )
      .filter((v, i, a) => a.indexOf(v) === i) ?? [];
  return (
    <>
      <section className="container ai-scenarios">
        <div className="platform-section-heading">
          <p className="eyebrow">01 / YOUR SITUATION</p>
          <h2>{t("scenarios")}</h2>
        </div>
        <div className="ai-scenario-grid">
          {scenarios.map((s, i) => (
            <article className="ai-scenario-card" key={s.id}>
              <span className="ai-card-number">
                0{i + 1}
                <MessageCircle aria-hidden="true" size={23} />
              </span>
              <h3>{locale === "ja" ? s.title_ja : s.title}</h3>
              <p>{locale === "ja" ? s.description_ja : s.description}</p>
              <small>
                {t("suggested")} · {s.suggested_level}
              </small>
              <Button
                variant="outline"
                disabled={!!current || pending}
                onClick={() => {
                  change("scenarioId", s.id);
                  document
                    .getElementById("tutor-config")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t("startPractice")}
                <ArrowUpRight size={16} />
              </Button>
            </article>
          ))}
        </div>
      </section>
      <div className="container ai-workspace">
        <aside className="ai-sidebar">
          <section className="prep-card ai-config" id="tutor-config">
            <p className="eyebrow">02 / MAKE IT YOURS</p>
            <h2>{t("configure")}</h2>
            {live && member && !current && (
              <label className="ai-toggle">
                <input
                  type="checkbox"
                  checked={!isDemo}
                  onChange={(e) => setIsDemo(!e.target.checked)}
                />
                {t("live")}
              </label>
            )}
            <fieldset disabled={pending || !!current}>
              <label htmlFor="ai-level">{t("level")}</label>
              <select
                id="ai-level"
                value={settings.level}
                onChange={(e) =>
                  change("level", e.target.value as TutorSettings["level"])
                }
              >
                {["n5", "n4", "n3", "n2", "n1"].map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
              <label htmlFor="ai-scenario">{t("scenario")}</label>
              <select
                id="ai-scenario"
                value={settings.scenarioId}
                onChange={(e) => change("scenarioId", e.target.value)}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {locale === "ja" ? s.title_ja : s.title}
                  </option>
                ))}
              </select>
              <label htmlFor="ai-correction">{t("correctionMode")}</label>
              <select
                id="ai-correction"
                value={settings.correctionMode}
                onChange={(e) =>
                  change("correctionMode", e.target.value as "each" | "end")
                }
              >
                <option value="each">{t("each")}</option>
                <option value="end">{t("end")}</option>
              </select>
              <label htmlFor="ai-target">{t("target")}</label>
              <select
                id="ai-target"
                value={settings.target}
                onChange={(e) =>
                  change("target", Number(e.target.value) as 5 | 10 | 15)
                }
              >
                {[5, 10, 15].map((n) => (
                  <option key={n} value={n}>
                    {n} {t("turns")}
                  </option>
                ))}
              </select>
            </fieldset>
            <label className="ai-toggle">
              <input
                type="checkbox"
                checked={settings.furigana}
                onChange={(e) => change("furigana", e.target.checked)}
              />
              {t("furigana")}
            </label>
            <label className="ai-toggle">
              <input
                type="checkbox"
                checked={settings.translation}
                onChange={(e) => change("translation", e.target.checked)}
              />
              {t("translation")}
            </label>
            <p className="ai-fine">{t("readingNote")}</p>
            {!current ? (
              <Button disabled={pending || !scenario} onClick={start}>
                {t("start")}
                <MessageCircle size={18} />
              </Button>
            ) : (
              <p className="ai-fine">{t("settingsNote")}</p>
            )}
            {member && (
              <Button
                disabled={pending}
                variant="outline"
                onClick={saveSettings}
              >
                {t("saveSettings")}
              </Button>
            )}
            {notice && <p role="status">{notice}</p>}
          </section>
          <section className="prep-card ai-history">
            <h2>{t("history")}</h2>
            {!member ? (
              <Link className="text-link" href="/login">
                {t("signIn")}
              </Link>
            ) : historyError ? (
              <p role="status">{t("historyError")}</p>
            ) : !history ? (
              <p>{t("loading")}</p>
            ) : !history.sessions.length ? (
              <p>{t("emptyHistory")}</p>
            ) : (
              <ul>
                {history.sessions.map((s) => (
                  <li key={s.id}>
                    <strong>
                      {scenarios.find((sc) => sc.id === s.scenario_id)?.[
                        locale === "ja" ? "title_ja" : "title"
                      ] ?? t("conversation")}
                    </strong>
                    <small>
                      {s.settings.level.toUpperCase()} · {s.completed_turns}/
                      {s.settings.target} · {s.created_at.slice(0, 10)}
                    </small>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => open(s.id)}
                      >
                        {t("resume")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => remove(s.id)}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {history && (
            <section className="prep-card ai-usage">
              <h3>{t("usage")}</h3>
              <p>
                {history.usage.requests} {t("requests")}
              </p>
              <p>
                {history.usage.inputTokens + history.usage.outputTokens}{" "}
                {t("tokens")}
              </p>
              <small>
                {history.usage.estimatedCost === null
                  ? t("costUnknown")
                  : `${t("cost")}: $${history.usage.estimatedCost.toFixed(4)}`}
              </small>
              {history.usage.unknownRequests > 0 && (
                <p className="ai-fine">{t("usageUnknown")}</p>
              )}
            </section>
          )}
        </aside>
        <section
          className={`ai-chat ${settings.furigana ? "" : "hide-furigana"}`}
          id="ai-chat"
          aria-label={t("conversation")}
        >
          <div className="ai-mode">
            <MessageCircle aria-hidden="true" />
            <strong>{t(isDemo ? "demo" : "live")}</strong>
            <span>{t("textMode")}</span>
          </div>
          <p className="ai-mode-note">{t(isDemo ? "demoNote" : "liveNote")}</p>
          {!live && <p className="ai-fine">{t("disabled")}</p>}
          {!member && <p className="ai-fine">{t("signIn")}</p>}
          {error && (
            <div className="ai-error" role="alert">
              <p>{error}</p>
              <small>{t("retryNote")}</small>
            </div>
          )}
          <div ref={status} role="status" className="ai-progress">
            {pending
              ? t("sending")
              : current
                ? `${current.session.completed_turns} / ${current.session.settings.target} ${t("turns")}`
                : ""}
          </div>
          {current ? (
            <>
              <header className="ai-chat-heading">
                <h2>
                  {scenario?.[locale === "ja" ? "title_ja" : "title"] ??
                    t("conversation")}
                </h2>
                <span>{current.session.settings.level.toUpperCase()}</span>
              </header>
              <progress
                aria-label={t("progress")}
                max={current.session.settings.target}
                value={current.session.completed_turns}
              />
              <ol
                className="ai-messages"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-label={t("conversation")}
              >
                {current.messages.map((m) => (
                  <li key={m.id} className={`ai-bubble ai-${m.role}`}>
                    <strong>{t(m.role === "user" ? "you" : "tutor")}</strong>
                    <div className="ai-japanese">
                      {m.reviewed ? (
                        <Japanese text={m.content} />
                      ) : (
                        <span lang="ja">{m.content}</span>
                      )}
                    </div>
                    {m.role === "assistant" &&
                      settings.translation &&
                      m.translation && (
                        <p className="ai-translation">{m.translation}</p>
                      )}
                  </li>
                ))}
              </ol>
              {!complete ? (
                <>
                  <form
                    className="ai-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send();
                    }}
                  >
                    <label htmlFor="ai-reply">{t("reply")}</label>
                    <textarea
                      ref={input}
                      id="ai-reply"
                      lang="ja"
                      rows={3}
                      maxLength={1200}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={t("placeholder")}
                      disabled={pending}
                    />
                    <div>
                      <small>{draft.length} / 1200</small>
                      <Button disabled={pending || !draft.trim()} type="submit">
                        {pending ? t("sending") : t("send")}
                        <Send size={16} />
                      </Button>
                    </div>
                  </form>
                  {isDemo && (
                    <details className="ai-samples">
                      <summary>{t("examples")}</summary>
                      {[
                        "今日は本を読みました。",
                        "昨日、映画を見ますでした。",
                        "明日、行くよ。",
                      ].map((sample) => (
                        <button
                          key={sample}
                          disabled={pending}
                          onClick={() => {
                            setDraft(sample);
                            input.current?.focus();
                          }}
                          lang="ja"
                        >
                          {sample}
                        </button>
                      ))}
                    </details>
                  )}
                  <Button variant="outline" disabled={pending} onClick={end}>
                    {t("endSession")}
                  </Button>
                </>
              ) : (
                <p className="ai-completed">
                  <Check aria-hidden="true" />
                  {t("finished")} · {current.session.completed_turns}{" "}
                  {t("turns")}
                </p>
              )}
              <div className="prep-controls ai-review-controls">
                <a href="#ai-corrections" className="text-link">
                  {t("viewCorrections")}
                </a>
                {showFeedback && (
                  <a href="#ai-vocabulary" className="text-link">
                    {t("reviewVocabulary")}
                  </a>
                )}
                {complete && (
                  <Button
                    disabled={pending}
                    onClick={() => {
                      setCurrent(null);
                      setDraft("");
                      setError("");
                      setIsDemo(!(live && member));
                      router.replace("/ai-practice", { scroll: false });
                      document
                        .getElementById("tutor-config")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {t("newSession")}
                  </Button>
                )}
                {isDemo && (
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      setCurrent(null);
                      setDraft("");
                    }}
                  >
                    {t("localDelete")}
                  </Button>
                )}
              </div>
              <section id="ai-corrections" className="ai-results">
                <h2>{complete ? t("summary") : t("corrections")}</h2>
                <p className="ai-fine">
                  {t(isDemo ? "demoEstimate" : "aiEstimate")}
                </p>
                {!showFeedback ? (
                  <p>{t("deferred")}</p>
                ) : (
                  <>
                    {complete && (
                      <p>
                        <strong>{t("completed")}:</strong>{" "}
                        {current.session.completed_turns} ·{" "}
                        {scenario?.[locale === "ja" ? "title_ja" : "title"]}
                      </p>
                    )}
                    <h3>{t("reviewItems")}</h3>
                    {current.feedback.length ? (
                      current.feedback.map((f) => (
                        <Feedback key={f.turn} item={f} />
                      ))
                    ) : (
                      <p>{t("noItems")}</p>
                    )}
                    <h3 id="ai-vocabulary">{t("vocabulary")}</h3>
                    <ul>
                      {vocabulary.map((v) => (
                        <li key={v.term}>
                          <span lang="ja">{v.term}</span> — {v.meaning}
                        </li>
                      ))}
                    </ul>
                    <h3>{t("expressions")}</h3>
                    <ul>
                      {expressions.map((e) => (
                        <li key={e}>
                          <span lang="ja">{e}</span>
                        </li>
                      ))}
                    </ul>
                    <h3>{t("recommended")}</h3>
                    <div className="prep-controls">
                      <Link
                        className="text-link"
                        href={`/courses/${current.session.settings.level}`}
                      >
                        <BookOpen size={16} /> JLPT{" "}
                        {current.session.settings.level.toUpperCase()} →
                      </Link>
                      {lessons
                        .filter(
                          (l) => l.level === current.session.settings.level,
                        )
                        .slice(0, 3)
                        .map((l) => (
                          <Link
                            key={l.id}
                            className="text-link"
                            href={`/lessons/${l.id}`}
                          >
                            {l.title} →
                          </Link>
                        ))}
                      {["interview", "business", "workplace"].includes(
                        scenario?.slug ?? "",
                      ) && (
                        <Link
                          className="text-link"
                          href="/interview-preparation"
                        >
                          {locale === "ja"
                            ? "面接の例文"
                            : "Interview examples"}{" "}
                          →
                        </Link>
                      )}
                      <Link className="text-link" href="/workplace-japanese">
                        {locale === "ja"
                          ? "職場の会話"
                          : "Workplace conversations"}{" "}
                        →
                      </Link>
                    </div>
                  </>
                )}
              </section>
            </>
          ) : (
            <div className="ai-empty-chat">
              <div className="ai-empty-icon">
                <MessageCircle size={42} />
              </div>
              <h2>{t("conversation")}</h2>
              <p>{t("intro")}</p>
              <p className="ai-japanese" lang="ja">
                少しずつ、話してみよう。
              </p>
            </div>
          )}
          <p className="ai-fine ai-voice-note">{t("noVoice")}</p>
        </section>
      </div>
    </>
  );
}
