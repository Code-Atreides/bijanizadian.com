import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

const STEP_TITLES = ["About you", "The idea", "The details", "Scope", "Anything else"];
const TOTAL_STEPS = STEP_TITLES.length;
const TIMELINE_OPTIONS = ["ASAP", "Within a month", "1–3 months", "Flexible"];
const BUDGET_OPTIONS = ["Under $1k", "$1k–$5k", "$5k–$15k", "Let's talk"];

const EMPTY_DATA = {
  name: "",
  email: "",
  pitch: "",
  problem: "",
  audience: "",
  features: "",
  timeline: "",
  budget: "",
  extra: "",
  inspiration: "",
};

function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium" style={{ color: "var(--ink)" }}>
        {label}
        {hint && (
          <span className="text-xs font-normal ml-2" style={{ opacity: 0.5 }}>
            {hint}
          </span>
        )}
      </label>
      {children}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

function ReviewGroup({ title, onEdit, children }) {
  return (
    <div className="pb-4" style={{ borderBottom: "1px solid var(--line)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ opacity: 0.5 }}>
          {title}
        </span>
        <button type="button" className="btn-link" onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs" style={{ opacity: 0.45 }}>
        {label}
      </span>
      <span className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
        {value || "—"}
      </span>
    </div>
  );
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function IdeaIntake() {
  const [screen, setScreen] = useState("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState(EMPTY_DATA);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  function update(field, value) {
    setData((d) => ({ ...d, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  }

  function validateStep(idx) {
    const e = {};
    if (idx === 0) {
      if (!data.name.trim()) e.name = "Add your name to continue.";
      if (!data.email.trim()) e.email = "Add your email to continue.";
      else if (!/\S+@\S+\.\S+/.test(data.email)) e.email = "That email doesn't look right.";
    }
    if (idx === 1) {
      if (!data.pitch.trim()) e.pitch = "Give it a one-line pitch to continue.";
      if (!data.problem.trim()) e.problem = "Say what problem it solves to continue.";
    }
    if (idx === 2) {
      if (!data.audience.trim()) e.audience = "Say who it's for to continue.";
      if (!data.features.trim()) e.features = "List at least one must-have feature.";
    }
    if (idx === 3) {
      if (!data.timeline) e.timeline = "Pick a timeline to continue.";
      if (!data.budget) e.budget = "Pick a ballpark budget to continue.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(stepIndex)) return;
    if (stepIndex < TOTAL_STEPS - 1) setStepIndex((i) => i + 1);
    else setScreen("review");
  }

  function back() {
    if (stepIndex === 0) setScreen("intro");
    else setStepIndex((i) => i - 1);
  }

  function goToStep(n) {
    setStepIndex(n);
    setScreen("form");
  }

  function resetAll() {
    setData(EMPTY_DATA);
    setErrors({});
    setStepIndex(0);
    setScreen("intro");
  }

  async function submit() {
    setSubmitting(true);
    setErrors((e) => ({ ...e, submit: null }));
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = { id, submittedAt: new Date().toISOString(), ...data };
    try {
      const result = await window.storage.set(`submissions:${id}`, JSON.stringify(payload), true);
      if (!result) throw new Error("no result");
      setScreen("done");
    } catch (err) {
      console.error("Submit failed:", err);
      setErrors((e) => ({ ...e, submit: "Couldn't send that — check your connection and try again." }));
    } finally {
      setSubmitting(false);
    }
  }

  async function loadSubmissions() {
    setLoadingSubs(true);
    try {
      const listResult = await window.storage.list("submissions:", true);
      const keys = listResult?.keys || [];
      const items = [];
      for (const key of keys) {
        try {
          const r = await window.storage.get(key, true);
          if (r?.value) items.push(JSON.parse(r.value));
        } catch (innerErr) {
          console.error("Failed to load", key, innerErr);
        }
      }
      items.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      setSubmissions(items);
    } catch (err) {
      console.error("Failed to list submissions:", err);
    } finally {
      setLoadingSubs(false);
    }
  }

  useEffect(() => {
    if (screen === "dashboard") loadSubmissions();
  }, [screen]);

  const firstName = data.name.trim().split(/\s+/)[0] || "there";

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10 sm:py-16"
      style={{
        "--bg": "#E4E2DD",
        "--surface": "#FBFAF7",
        "--ink": "#22221F",
        "--accent": "#3F5D4E",
        "--accent-dark": "#324A3E",
        "--accent-soft": "rgba(63,93,78,0.14)",
        "--line": "#D3CFC5",
        "--danger": "#A34433",
        background: "var(--bg)",
        fontFamily: "'Archivo', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Archivo:wght@400;500;600;700&display=swap');

        .font-display { font-family: 'Spectral', Georgia, serif; }

        .field-input {
          width: 100%;
          padding: 0.65rem 0.8rem;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--ink);
          font-family: 'Archivo', sans-serif;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field-input::placeholder { color: var(--ink); opacity: 0.35; }
        .field-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
        .field-input.has-error { border-color: var(--danger); }

        .chip {
          padding: 0.5rem 0.9rem;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--ink);
          font-family: 'Archivo', sans-serif;
          font-size: 0.875rem;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        .chip:hover { border-color: var(--accent); }
        .chip-selected, .chip-selected:hover {
          background: var(--accent);
          border-color: var(--accent);
          color: var(--surface);
        }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: var(--accent);
          color: var(--surface);
          padding: 0.7rem 1.4rem;
          border-radius: 8px;
          font-family: 'Archivo', sans-serif;
          font-weight: 600;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
        }
        .btn-primary:hover:not(:disabled) { background: var(--accent-dark); }
        .btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-secondary {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: transparent;
          color: var(--ink);
          padding: 0.7rem 1.1rem;
          border-radius: 8px;
          border: 1px solid var(--line);
          font-family: 'Archivo', sans-serif;
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .btn-secondary:hover { border-color: var(--accent); }

        .btn-link {
          background: none; border: none; padding: 0;
          color: var(--ink); opacity: 0.55;
          font-family: 'Archivo', sans-serif;
          font-size: 0.82rem;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .btn-link:hover { opacity: 0.85; }

        .error-text { color: var(--danger); font-size: 0.8rem; font-family: 'Archivo', sans-serif; }

        .progress-track { width: 100%; height: 4px; background: var(--line); border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.35s ease; }

        .check-circle {
          width: 48px; height: 48px; border-radius: 50%;
          background: var(--accent-soft); color: var(--accent-dark);
          display: flex; align-items: center; justify-content: center;
        }

        .meta-pill {
          font-size: 0.72rem;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: var(--accent-soft);
          color: var(--accent-dark);
        }

        button:focus-visible, input:focus-visible, textarea:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition: none !important; animation: none !important; }
        }
      `}</style>

      <div className="w-full max-w-lg">
        <div
          className="rounded-2xl p-6 sm:p-10"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            boxShadow: "0 20px 40px -28px rgba(34,34,31,0.35)",
          }}
        >
          {screen === "intro" && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="font-display text-3xl sm:text-4xl leading-tight" style={{ color: "var(--ink)" }}>
                  Got an idea for a web app?
                </h1>
                <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--ink)", opacity: 0.75 }}>
                  I'm Bijan. I build small web apps for people who have an idea but not the time
                  (or code) to build it themselves. A few quick questions, then I'll follow up
                  with next steps.
                </p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <button type="button" className="btn-primary" onClick={() => setScreen("form")}>
                  Start <ArrowRight size={16} />
                </button>
                <span className="text-sm" style={{ color: "var(--ink)", opacity: 0.5 }}>
                  About 3 minutes
                </span>
              </div>
              <button type="button" className="btn-link self-start" onClick={() => setScreen("dashboard")}>
                View past submissions
              </button>
            </div>
          )}

          {screen === "form" && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--ink)", opacity: 0.5 }}>
                    Step {stepIndex + 1} of {TOTAL_STEPS}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${((stepIndex + 1) / TOTAL_STEPS) * 100}%` }}
                  />
                </div>
              </div>

              <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
                {STEP_TITLES[stepIndex]}
              </h2>

              <div className="flex flex-col gap-4">
                {stepIndex === 0 && (
                  <>
                    <Field label="Your name" htmlFor="name" error={errors.name}>
                      <input
                        id="name"
                        className={`field-input ${errors.name ? "has-error" : ""}`}
                        value={data.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="Full name"
                      />
                    </Field>
                    <Field label="Email" htmlFor="email" error={errors.email}>
                      <input
                        id="email"
                        type="email"
                        className={`field-input ${errors.email ? "has-error" : ""}`}
                        value={data.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="you@email.com"
                      />
                    </Field>
                  </>
                )}

                {stepIndex === 1 && (
                  <>
                    <Field label="Give me the one-line pitch" htmlFor="pitch" error={errors.pitch}>
                      <input
                        id="pitch"
                        className={`field-input ${errors.pitch ? "has-error" : ""}`}
                        value={data.pitch}
                        onChange={(e) => update("pitch", e.target.value)}
                        placeholder='e.g. "An app that helps cafes manage rotating menus"'
                      />
                    </Field>
                    <Field label="What problem does it solve?" htmlFor="problem" error={errors.problem}>
                      <textarea
                        id="problem"
                        rows={3}
                        className={`field-input ${errors.problem ? "has-error" : ""}`}
                        value={data.problem}
                        onChange={(e) => update("problem", e.target.value)}
                        placeholder="What's broken or missing right now?"
                      />
                    </Field>
                  </>
                )}

                {stepIndex === 2 && (
                  <>
                    <Field label="Who's it for?" htmlFor="audience" error={errors.audience}>
                      <input
                        id="audience"
                        className={`field-input ${errors.audience ? "has-error" : ""}`}
                        value={data.audience}
                        onChange={(e) => update("audience", e.target.value)}
                        placeholder='e.g. "Independent coffee shop owners"'
                      />
                    </Field>
                    <Field
                      label="What does it absolutely need to do first?"
                      htmlFor="features"
                      error={errors.features}
                    >
                      <textarea
                        id="features"
                        rows={3}
                        className={`field-input ${errors.features ? "has-error" : ""}`}
                        value={data.features}
                        onChange={(e) => update("features", e.target.value)}
                        placeholder="List 2–4 must-have features for a first version"
                      />
                    </Field>
                  </>
                )}

                {stepIndex === 3 && (
                  <>
                    <Field label="Timeline" error={errors.timeline}>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Timeline">
                        {TIMELINE_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            aria-pressed={data.timeline === opt}
                            onClick={() => update("timeline", opt)}
                            className={`chip ${data.timeline === opt ? "chip-selected" : ""}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Ballpark budget" error={errors.budget}>
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Budget">
                        {BUDGET_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            aria-pressed={data.budget === opt}
                            onClick={() => update("budget", opt)}
                            className={`chip ${data.budget === opt ? "chip-selected" : ""}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </>
                )}

                {stepIndex === 4 && (
                  <>
                    <Field label="Anything else I should know?" htmlFor="extra" hint="Optional">
                      <textarea
                        id="extra"
                        rows={3}
                        className="field-input"
                        value={data.extra}
                        onChange={(e) => update("extra", e.target.value)}
                        placeholder="Sketches, competitors, deadlines — anything helps."
                      />
                    </Field>
                    <Field label="Sites or apps whose vibe you like" htmlFor="inspiration" hint="Optional">
                      <input
                        id="inspiration"
                        className="field-input"
                        value={data.inspiration}
                        onChange={(e) => update("inspiration", e.target.value)}
                        placeholder="A couple names or links"
                      />
                    </Field>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <button type="button" className="btn-secondary" onClick={back}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" className="btn-primary" onClick={next}>
                  {stepIndex === TOTAL_STEPS - 1 ? "Review" : "Next"} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {screen === "review" && (
            <div className="flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--ink)", opacity: 0.5 }}>
                    Review
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: "100%" }} />
                </div>
              </div>

              <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
                One more look
              </h2>

              <ReviewGroup title="About you" onEdit={() => goToStep(0)}>
                <ReviewRow label="Name" value={data.name} />
                <ReviewRow label="Email" value={data.email} />
              </ReviewGroup>
              <ReviewGroup title="The idea" onEdit={() => goToStep(1)}>
                <ReviewRow label="Pitch" value={data.pitch} />
                <ReviewRow label="Problem" value={data.problem} />
              </ReviewGroup>
              <ReviewGroup title="The details" onEdit={() => goToStep(2)}>
                <ReviewRow label="Audience" value={data.audience} />
                <ReviewRow label="Must-haves" value={data.features} />
              </ReviewGroup>
              <ReviewGroup title="Scope" onEdit={() => goToStep(3)}>
                <ReviewRow label="Timeline" value={data.timeline} />
                <ReviewRow label="Budget" value={data.budget} />
              </ReviewGroup>
              {(data.extra || data.inspiration) && (
                <ReviewGroup title="Anything else" onEdit={() => goToStep(4)}>
                  {data.extra && <ReviewRow label="Notes" value={data.extra} />}
                  {data.inspiration && <ReviewRow label="Inspiration" value={data.inspiration} />}
                </ReviewGroup>
              )}

              {errors.submit && <span className="error-text">{errors.submit}</span>}

              <div className="flex items-center justify-between mt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setStepIndex(TOTAL_STEPS - 1);
                    setScreen("form");
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>
                  {submitting ? "Sending…" : "Send it over"} {!submitting && <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          )}

          {screen === "done" && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="check-circle">
                <Check size={22} />
              </div>
              <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
                Thanks, {firstName}.
              </h2>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--ink)", opacity: 0.7 }}>
                Got your idea — I'll take a look and follow up at {data.email} soon.
              </p>
              <button type="button" className="btn-secondary mt-2" onClick={resetAll}>
                Submit another idea
              </button>
            </div>
          )}

          {screen === "dashboard" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
                  Submissions
                </h2>
                <button type="button" className="btn-link" onClick={() => setScreen("intro")}>
                  Back
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--ink)", opacity: 0.5 }}>
                Anyone with this link can open this page — treat it like a shared inbox, not a
                private one.
              </p>
              {loadingSubs && (
                <p className="text-sm" style={{ color: "var(--ink)", opacity: 0.6 }}>
                  Loading…
                </p>
              )}
              {!loadingSubs && submissions.length === 0 && (
                <p className="text-sm" style={{ color: "var(--ink)", opacity: 0.6 }}>
                  Nothing yet — submissions will show up here once someone fills out the form.
                </p>
              )}
              <div className="flex flex-col gap-4 max-h-96 overflow-y-auto pr-1">
                {submissions.map((s) => (
                  <div key={s.id} className="pb-4" style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                        {s.name}
                      </span>
                      <span className="text-xs" style={{ color: "var(--ink)", opacity: 0.45 }}>
                        {formatDate(s.submittedAt)}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: "var(--ink)", opacity: 0.55 }}>
                      {s.email}
                    </span>
                    <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--ink)" }}>
                      {s.pitch}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {s.timeline && <span className="meta-pill">{s.timeline}</span>}
                      {s.budget && <span className="meta-pill">{s.budget}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
