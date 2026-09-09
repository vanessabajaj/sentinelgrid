import { EnvironmentCard } from "@/features/sentinel/components/environment-card";
import type {
  Environment,
  RoutingDecision,
} from "@/features/sentinel/types";

interface EnvironmentGridProps {
  environments: Environment[];
  decision: RoutingDecision | null;
}

export function EnvironmentGrid({
  environments,
  decision,
}: EnvironmentGridProps) {
  return (
    <section aria-labelledby="environment-heading">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
            Deployment fabric
          </p>
          <h2
            id="environment-heading"
            className="mt-1 text-lg font-semibold text-white"
          >
            Environment status
          </h2>
        </div>
        <p className="text-xs text-muted">
          Eligibility reflects the latest evaluation
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {environments.map((environment) => (
          <EnvironmentCard
            key={environment.id}
            environment={environment}
            evaluation={decision?.evaluations.find(
              (evaluation) => evaluation.environmentId === environment.id,
            )}
            selectedEnvironment={decision?.selectedEnvironment ?? null}
          />
        ))}
      </div>
    </section>
  );
}
