// sessionUtils.ts
export interface Session {
  name: string;
  start: number;
  end: number;
  gradient: string;
  glow: string;
}

export function getActiveSession(sessions: Session[], hour: number): Session | null {
  return sessions.find(
    (s) =>
      (s.start < s.end && hour >= s.start && hour < s.end) ||
      (s.start > s.end && (hour >= s.start || hour < s.end))
  ) ?? null;
}

export function getNextSession(sessions: Session[], hour: number): Session | null {
  const sorted = sessions
    .map((s) => ({
      ...s,
      startOffset: ((s.start - hour + 24) % 24),
    }))
    .sort((a, b) => a.startOffset - b.startOffset);

  return sorted[0] ?? null;
}
