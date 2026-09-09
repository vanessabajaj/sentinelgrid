import type {
  Environment,
  EnvironmentEvaluation,
  Incident,
  RoutingCheck,
  RoutingDecision,
} from "@/features/sentinel/types";
import {
  canSatisfyNetworkMode,
  getEnvironmentPreferenceScore,
  isClassificationAllowed,
  POLICY_VERSION,
} from "@/features/sentinel/routing/policy-config";

function evaluateEnvironment(
  incident: Incident,
  environment: Environment,
): EnvironmentEvaluation {
  const availableCapacity = environment.capacity - environment.usedCapacity;

  const checks: RoutingCheck[] = [
    {
      name: "Online",
      passed: environment.online,
      reason: environment.online
        ? `${environment.displayName} is online.`
        : `${environment.displayName} is offline.`,
    },
    {
      name: "Classification clearance",
      passed: isClassificationAllowed(
        incident.classification,
        environment.maxClassification,
      ),
      reason: isClassificationAllowed(
        incident.classification,
        environment.maxClassification,
      )
        ? `${environment.displayName} permits ${incident.classification} workloads.`
        : `${incident.classification} exceeds ${environment.displayName}'s ${environment.maxClassification} clearance.`,
    },
    {
      name: "Network compatibility",
      passed: canSatisfyNetworkMode(
        environment.networkMode,
        incident.requiredNetworkMode,
      ),
      reason: canSatisfyNetworkMode(
        environment.networkMode,
        incident.requiredNetworkMode,
      )
        ? `${environment.displayName}'s ${environment.networkMode} network capability satisfies the ${incident.requiredNetworkMode} requirement.`
        : `${environment.displayName}'s ${environment.networkMode} network capability cannot satisfy the ${incident.requiredNetworkMode} requirement.`,
    },
    {
      name: "Capacity",
      passed: availableCapacity >= incident.estimatedWorkload,
      reason:
        availableCapacity >= incident.estimatedWorkload
          ? `${environment.displayName} has ${availableCapacity} capacity units available; ${incident.estimatedWorkload} are required.`
          : `${environment.displayName} has only ${availableCapacity} capacity units available; ${incident.estimatedWorkload} are required.`,
    },
    {
      name: "Incident type support",
      passed: environment.supportedIncidentTypes.includes(
        incident.incidentType,
      ),
      reason: environment.supportedIncidentTypes.includes(
        incident.incidentType,
      )
        ? `${environment.displayName} supports ${incident.incidentType} workloads.`
        : `${environment.displayName} does not support ${incident.incidentType} workloads.`,
    },
  ];

  return {
    environmentId: environment.id,
    eligible: checks.every((check) => check.passed),
    checks,
    score: getEnvironmentPreferenceScore(
      incident.classification,
      environment.id,
    ),
  };
}

function selectHighestRankedEnvironment(
  evaluations: EnvironmentEvaluation[],
): EnvironmentEvaluation | null {
  return evaluations
    .filter((evaluation) => evaluation.eligible)
    .reduce<EnvironmentEvaluation | null>((selected, evaluation) => {
      if (selected === null || evaluation.score > selected.score) {
        return evaluation;
      }

      if (
        evaluation.score === selected.score &&
        evaluation.environmentId.localeCompare(selected.environmentId) < 0
      ) {
        return evaluation;
      }

      return selected;
    }, null);
}

export function evaluateRouting(
  incident: Incident,
  environments: Environment[],
): RoutingDecision {
  const evaluations = environments.map((environment) =>
    evaluateEnvironment(incident, environment),
  );
  const selectedEvaluation = selectHighestRankedEnvironment(evaluations);

  if (selectedEvaluation === null) {
    return {
      id: `routing-decision:${incident.id}:${POLICY_VERSION}`,
      incidentId: incident.id,
      status: "BLOCKED",
      selectedEnvironment: null,
      policyVersion: POLICY_VERSION,
      explanation:
        "Blocked because no environment can satisfy all policy requirements.",
      evaluations,
      evaluatedAt: incident.submittedAt,
    };
  }

  const selectedEnvironment = environments.find(
    (environment) => environment.id === selectedEvaluation.environmentId,
  );

  if (!selectedEnvironment) {
    throw new Error("Selected environment was not present in the input.");
  }

  return {
    id: `routing-decision:${incident.id}:${POLICY_VERSION}`,
    incidentId: incident.id,
    status: "ROUTED",
    selectedEnvironment: selectedEnvironment.id,
    policyVersion: POLICY_VERSION,
    explanation: `Routed to ${selectedEnvironment.displayName} because the workload is ${incident.classification}, requires ${incident.requiredNetworkMode} network access, and ${selectedEnvironment.displayName} is the highest-preference eligible environment.`,
    evaluations,
    evaluatedAt: incident.submittedAt,
  };
}
