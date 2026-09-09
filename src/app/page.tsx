import {
  mockEnvironments,
  mockIncidents,
} from "@/data/mock-sentinel-data";
import { SentinelWorkspace } from "@/features/sentinel/components/sentinel-workspace";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center gap-4">
            <div
              className="grid size-11 shrink-0 place-items-center rounded-md border border-accent/40 bg-accent/10 font-mono text-sm font-bold tracking-widest text-accent"
              aria-hidden="true"
            >
              SG
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  SentinelGrid
                </h1>
                <span className="rounded border border-border bg-panel px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Hybrid Security Control Plane
                </span>
              </div>
              <p className="text-sm text-muted">
                Policy-Driven Hybrid AI Orchestration for Cybersecurity
                Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start rounded-md border border-border bg-panel px-3 py-2 lg:self-auto">
            <span className="relative flex size-2.5" aria-hidden="true">
              <span className="absolute inline-flex size-full rounded-full bg-success/40" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
            <div>
              <p className="text-xs font-medium text-white">
                Control plane operational
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Policy SG-POLICY-1.0
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <SentinelWorkspace
          environments={mockEnvironments}
          demoIncidents={mockIncidents}
        />
      </div>
    </main>
  );
}
