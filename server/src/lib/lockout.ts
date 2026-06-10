/**
 * Returns true when predictions should be rejected.
 * The boundary is inclusive: equal to kickoff is already locked.
 * Accepting `now` as a parameter keeps this function purely testable.
 */
export function isPredictionLocked(kickoffTime: Date, now: Date = new Date()): boolean {
  return now.getTime() >= kickoffTime.getTime()
}
