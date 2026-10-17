import Link from "next/link";
import { fraunces } from "./fonts";
import { HeroIntro } from "./HeroIntro";
import { Mark, StickyNav } from "./StickyNav";
import { Reveal } from "./Reveal";
import { ThoughtField } from "./ThoughtField";
import { ArtAsk, ArtCluster, ArtWrite, CountUp } from "./SectionArt";
import styles from "./landing.module.css";

const RESEARCH_URL =
  "https://www.microsoft.com/en-us/research/articles/rethinking-ai-in-knowledge-work-from-assistant-to-tool-for-thought/";
const GITHUB_URL = "https://github.com/RonKat2008/blindspot";

const STEPS = [
  { n: "01", title: "Write", body: "Everyone drops ideas on the board. Short and fast.", Art: ArtWrite },
  { n: "02", title: "See the map", body: "Related ideas pull together. The empty spots stand out.", Art: ArtCluster },
  { n: "03", title: "Answer the question", body: "It asks about the empty spot. You fill it. It never does.", Art: ArtAsk },
] as const;

const DECISIONS = [
  "The AI never writes an idea — we built a checker to enforce it.",
  "We caught an AI-proposed scoring flaw that would have hidden every real gap.",
  "We chose questions over answers.",
] as const;

export function Landing() {
  return (
    <div className={`${fraunces.variable} ${styles.root}`}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <StickyNav />

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <ThoughtField />
          <HeroIntro />
        </section>

        <section className={styles.problem} aria-labelledby="problem-heading">
          <Reveal>
            <h2 id="problem-heading" className={styles.label}>The problem</h2>
            <blockquote className={styles.quote}>
              <p>When people brainstorm with AI, their ideas start to look <em>the same</em>.</p>
            </blockquote>
            <p className={styles.cite}>
              Generative AI tends to narrow the range of ideas people come up with. —{" "}
              <a href={RESEARCH_URL} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                Microsoft Research, Tools for Thought<span aria-hidden="true"> ↗</span>
              </a>
            </p>
          </Reveal>
        </section>

        <section className={styles.how} aria-labelledby="how-heading">
          <Reveal>
            <h2 id="how-heading" className={styles.label}>How it works</h2>
          </Reveal>
          <ol className={styles.steps}>
            {STEPS.map(({ n, title, body, Art }, i) => (
              <Reveal as="li" key={n} className={styles.step} delay={i * 0.08}>
                <div className={styles.stepArt}><Art /></div>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNum} aria-hidden="true">{n}</span>
                  {title}
                </h3>
                <p className={styles.stepBody}>{body}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className={styles.rule} aria-labelledby="rule-heading">
          <Reveal>
            <h2 className={styles.label}>The one rule</h2>
            <p id="rule-heading" className={styles.ruleStatement}>The AI never writes an idea.</p>
            <p className={styles.ledger} aria-label="You wrote 10 ideas. AI wrote 0. It asked 1 question.">
              <span>You wrote <strong><CountUp to={10} /></strong> ideas</span>
              <span className={styles.ledgerSep} aria-hidden="true">·</span>
              <span>AI wrote <strong>0</strong></span>
              <span className={styles.ledgerSep} aria-hidden="true">·</span>
              <span>asked <strong><CountUp to={1} /></strong> question</span>
            </p>
          </Reveal>
        </section>

        <section className={styles.why} aria-labelledby="why-heading">
          <Reveal className={styles.whyStory}>
            <h2 id="why-heading" className={styles.label}>Why we built this</h2>
            {/* FOUNDER_STORY */}
            <p className={styles.story}>When everyone asks the same model, everyone gets the same answer.</p>
          </Reveal>
          <Reveal className={styles.decided} delay={0.08}>
            <p className={styles.decidedTitle}>Built with AI, decided by humans</p>
            <ul className={styles.decidedList}>
              {DECISIONS.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <Link href="/why" className={styles.inlineLink}>
              How we made the calls <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <Reveal className={styles.ctaInner}>
            <h2 id="cta-heading" className={styles.ctaTitle}>
              Your next brainstorm has a blind spot. <em>Go find it.</em>
            </h2>
            <div className={styles.ctas}>
              <Link href="/new" className={styles.btnPrimary}>Start a whiteboard</Link>
              <Link href="/tour?live=1" className={styles.btnGhost}>Watch it live</Link>
            </div>
            <p className={styles.ctaNote}>Async boards · phones in the room · ambient light · replay</p>
          </Reveal>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Mark />
          <span>Blind Spot</span>
          <span className={styles.footerNote}>AI wrote 0 ideas on this page.</span>
        </div>
        <nav aria-label="Footer" className={styles.footerLinks}>
          <Link href="/why">Why we built it</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/pitch">Pitch</Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  );
}
