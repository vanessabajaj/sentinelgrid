import { EnvironmentCard } from "@/features/sentinel/components/environment-card";
import type { EvaluationResult } from "@/features/sentinel/store/sentinel-store";
import type {
  Environment,
  RoutingDecision,
} from "@/features/sentinel/types";

interface EnvironmentGridProps {
  environments: Environment[];
  decision: RoutingDecision | null;
  results: EvaluationResult[];
}

export function EnvironmentGrid({
  environments,
  decision,
  results,
}: EnvironmentGridProps) {
  const routed = results.filter(
    (result) => result.decision.selectedEnvironment !== null,
  );

  return (
    <section aria-labelledby="environment-heading">
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="environment-heading"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3"
        >
          The three environments
        </h2>
        <p className="font-mono text-[11px] text-ink-3">
          eligibility reflects the latest evaluation
        </p>
      </div>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(288px,1fr))]">
        {environments.map((environment) => {
          const placedHere = routed.filter(
            (result) => result.decision.selectedEnvironment === environment.id,
          ).length;
          const sharePercent =
            routed.length === 0
              ? 0
              : Math.round((placedHere / routed.length) * 100);

          return (
            <EnvironmentCard
              key={environment.id}
              environment={environment}
              evaluation={decision?.evaluations.find(
                (evaluation) => evaluation.environmentId === environment.id,
              )}
              selectedEnvironment={decision?.selectedEnvironment ?? null}
              sharePercent={sharePercent}
            />
          );
        })}
      </div>
    </section>
  );
}
