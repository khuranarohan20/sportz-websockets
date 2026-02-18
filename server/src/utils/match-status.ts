
// Temporary type - will use database type after Phase 4
type MatchStatus = 'scheduled' | 'live' | 'finished';

export function getMatchStatus(
  startTime: string | Date,
  endTime: string | Date,
  now: Date = new Date()
): MatchStatus | null {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (now < start) {
    return 'scheduled' as MatchStatus;
  }

  if (now >= end) {
    return 'finished' as MatchStatus;
  }

  return 'live' as MatchStatus;
}

export async function syncMatchStatus(
  match: { status: MatchStatus; startTime: string | Date; endTime: string | Date },
  updateStatus: (status: MatchStatus) => Promise<void>
): Promise<MatchStatus> {
  const nextStatus = getMatchStatus(match.startTime, match.endTime);
  if (!nextStatus) {
    return match.status;
  }
  if (match.status !== nextStatus) {
    await updateStatus(nextStatus);
    match.status = nextStatus;
  }
  return match.status;
}
