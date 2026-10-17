"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { api } from "@/lib/api-client";
import { Contributor } from "./Contributor";
import { notebookVars, SERIF } from "./theme";

type Step = "welcome" | "role" | "contribute";

interface JoinFlowProps {
  sessionId: string;
}

const NAME_MAX = 40;
const CAPABILITIES = ["camera", "text"];

export function JoinFlow({ sessionId }: JoinFlowProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speaker = name.trim() || undefined;

  async function choose(role: "contributor" | "ambient") {
    setBusy(true);
    setError(null);
    try {
      const { device } = await api.registerDevice(sessionId, {
        role,
        capabilities: role === "contributor" ? CAPABILITIES : ["display"],
        speakerName: speaker,
      });
      setDeviceId(device.id);
    } catch {
      // Registration is best-effort; contributing works without a device row.
    }
    setBusy(false);
    if (role === "ambient") router.push(`/ambient/${encodeURIComponent(sessionId)}`);
    else setStep("contribute");
  }

  return (
    <main
      style={{ ...notebookVars, background: "var(--paper)", color: "var(--ink)" }}
      className="min-h-dvh w-full font-sans"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8 pt-10">
        {step === "welcome" && (
          <motion.section
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col"
          >
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--signal-ink)" }}>
              Blind Spot
            </p>
            <h1
              className="mt-4 text-[2.6rem] font-semibold leading-[1.05]"
              style={{ fontFamily: SERIF }}
            >
              You&rsquo;re joining a brainstorm.
            </h1>
            <p className="mt-4 text-base" style={{ color: "var(--ink-soft)" }}>
              Add ideas from your phone. They land on the shared map, and the room gets a question
              whenever it&rsquo;s circling one spot.
            </p>
            <label className="mt-10 block text-sm font-medium" htmlFor="join-name">
              What should we call you?
            </label>
            <input
              id="join-name"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name is plenty"
              autoComplete="given-name"
              className="mt-2 w-full rounded-xl border px-4 py-3.5 text-lg outline-none focus:ring-2"
              style={{
                background: "var(--paper-raised)",
                borderColor: "var(--rule)",
                ["--tw-ring-color" as string]: "var(--signal)",
              }}
            />
            <div className="flex-1" />
            <PrimaryButton onClick={() => setStep("role")}>Continue</PrimaryButton>
          </motion.section>
        )}

        {step === "role" && (
          <motion.section
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 flex-col"
          >
            <h1 className="text-[2rem] font-semibold leading-tight" style={{ fontFamily: SERIF }}>
              {speaker ? `Hi ${speaker}. ` : ""}How do you want to help?
            </h1>
            <div className="mt-8 flex flex-col gap-4">
              <RoleCard
                title="Add ideas"
                body="Snap a photo of sticky notes or type ideas straight from your phone."
                disabled={busy}
                onClick={() => void choose("contributor")}
              />
              <RoleCard
                title="Be the room light"
                body="Prop this up as a glowing display. It shifts colour as the room's ideas spread out."
                disabled={busy}
                onClick={() => void choose("ambient")}
              />
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm" style={{ color: "var(--signal-ink)" }}>
                {error}
              </p>
            )}
          </motion.section>
        )}

        {step === "contribute" && (
          <Contributor sessionId={sessionId} speaker={speaker} deviceId={deviceId} />
        )}
      </div>
    </main>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="mt-8 w-full rounded-xl px-6 py-4 text-lg font-medium"
      style={{ background: "var(--ink)", color: "var(--paper)" }}
    >
      {children}
    </motion.button>
  );
}

function RoleCard(props: { title: string; body: string; disabled: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      disabled={props.disabled}
      onClick={props.onClick}
      className="rounded-2xl border p-5 text-left disabled:opacity-60"
      style={{ background: "var(--paper-raised)", borderColor: "var(--rule)" }}
    >
      <span className="block text-xl font-semibold" style={{ fontFamily: SERIF }}>
        {props.title}
      </span>
      <span className="mt-1 block text-sm" style={{ color: "var(--ink-soft)" }}>
        {props.body}
      </span>
    </motion.button>
  );
}
