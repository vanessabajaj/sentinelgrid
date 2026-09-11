import type { Classification, EnvironmentId } from "@/features/sentinel/types";

export type ToneName =
  | "moss"
  | "clay"
  | "ocean"
  | "plum"
  | "honey"
  | "rose"
  | "paper";

export interface Tone {
  /** Tint fill, for pills and soft panels. */
  bg: string;
  /** Readable ink on top of that tint. */
  fg: string;
  /** Hairline border matching the tint. */
  bc: string;
  /** The full-strength hue, for bars and dots. */
  solid: string;
}

export const TONES: Record<ToneName, Tone> = {
  moss: {
    bg: "var(--accent-moss-tint)",
    fg: "var(--accent-moss-ink)",
    bc: "rgba(92,122,79,0.25)",
    solid: "var(--accent-moss)",
  },
  clay: {
    bg: "var(--accent-clay-tint)",
    fg: "var(--accent-clay-ink)",
    bc: "rgba(194,90,46,0.25)",
    solid: "var(--accent-clay)",
  },
  ocean: {
    bg: "var(--accent-ocean-tint)",
    fg: "var(--accent-ocean-ink)",
    bc: "rgba(46,107,122,0.25)",
    solid: "var(--accent-ocean)",
  },
  plum: {
    bg: "var(--accent-plum-tint)",
    fg: "var(--accent-plum-ink)",
    bc: "rgba(107,62,94,0.25)",
    solid: "var(--accent-plum)",
  },
  honey: {
    bg: "var(--accent-honey-tint)",
    fg: "var(--accent-honey-ink)",
    bc: "rgba(212,165,58,0.35)",
    solid: "var(--accent-honey)",
  },
  rose: {
    bg: "var(--accent-rose-tint)",
    fg: "var(--accent-rose-ink)",
    bc: "rgba(184,74,94,0.25)",
    solid: "var(--accent-rose)",
  },
  paper: {
    bg: "var(--paper-2)",
    fg: "var(--ink-3)",
    bc: "var(--paper-3)",
    solid: "var(--paper-4)",
  },
};

/** One hue per environment, carried consistently across every surface. */
export const ENVIRONMENT_TONE: Record<EnvironmentId, ToneName> = {
  CLOUD: "ocean",
  ON_PREM: "moss",
  AIR_GAPPED: "plum",
};

/** Sensitivity rises with the classification, so the hue deepens with it. */
export const CLASSIFICATION_TONE: Record<Classification, ToneName> = {
  PUBLIC: "paper",
  INTERNAL: "ocean",
  CONFIDENTIAL: "moss",
  SECRET: "plum",
  CLASSIFIED: "rose",
};

export function toneFor(name: ToneName): Tone {
  return TONES[name];
}

export function environmentTone(id: EnvironmentId): Tone {
  return TONES[ENVIRONMENT_TONE[id]];
}
