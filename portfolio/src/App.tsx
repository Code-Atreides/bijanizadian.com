import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';

/**
 * Scaffold check, not the portfolio. This exists to prove the toolchain and the
 * shader component work end to end before any design language is committed to.
 */
export default function App() {
  return (
    <main className="grid min-h-dvh place-items-center gap-10 p-8">
      <div className="flex flex-col items-center gap-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          scaffold check
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Bijan Izadian</h1>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-8">
        <LiquidMetalButton label="Get Started" />
        <LiquidMetalButton label="View the work" />
        <LiquidMetalButton viewMode="icon" ariaLabel="Sparkles" />
      </div>

      <p className="max-w-prose text-center text-sm text-muted-foreground">
        React 19 · Vite · TypeScript · Tailwind v4 · shadcn structure. The pill faces are
        live WebGL, running at reduced idle speed.
      </p>
    </main>
  );
}
