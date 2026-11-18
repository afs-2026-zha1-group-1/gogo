/**
 * Display order for one group's route card (US-095). The backend keeps steps and travel legs as two
 * parallel lists that do not say where each leg sits: a group following the main plan walks
 * step → leg → step → …, while a group leaving for its own activity carries one extra leg in front
 * (leg → step → leg). The counts decide, not the group label: n legs for n steps means each leg
 * follows its step; n+1 legs means the first leg is the entry leg and needs an origin row above it.
 */

export type CardRowRef =
  | { kind: "origin" }
  | { kind: "step"; step: number }
  | { kind: "leg"; leg: number }

export function hasEntryLeg(stepCount: number, legCount: number): boolean {
  return stepCount > 0 && legCount === stepCount + 1
}

export function cardRowOrder(stepCount: number, legCount: number): CardRowRef[] {
  if (stepCount === 0) {
    return [
      { kind: "origin" },
      ...Array.from({ length: legCount }, (_, leg): CardRowRef => ({ kind: "leg", leg })),
    ]
  }
  if (!hasEntryLeg(stepCount, legCount)) {
    const rows: CardRowRef[] = []
    for (let step = 0; step < stepCount; step += 1) {
      rows.push({ kind: "step", step })
      if (step < legCount) rows.push({ kind: "leg", leg: step })
    }
    return rows
  }
  const rows: CardRowRef[] = [{ kind: "origin" }]
  for (let step = 0; step < stepCount; step += 1) {
    rows.push({ kind: "leg", leg: step })
    rows.push({ kind: "step", step })
  }
  if (legCount > stepCount) rows.push({ kind: "leg", leg: stepCount })
  return rows
}
