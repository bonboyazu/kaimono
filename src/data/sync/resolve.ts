/** 列ごとに、あとから行った操作を優先する。opTime >= サーバーの時刻（なければ通す）なら通す */
export function resolvePatch(
  serverFieldTimes: Record<string, string>,
  patch: Record<string, unknown>,
  opTime: string,
): { accepted: Record<string, unknown>; fieldTimes: Record<string, string> } {
  const accepted: Record<string, unknown> = {};
  const fieldTimes = { ...serverFieldTimes };
  for (const [key, value] of Object.entries(patch)) {
    const serverTime = serverFieldTimes[key];
    if (serverTime === undefined || opTime >= serverTime) {
      accepted[key] = value;
      fieldTimes[key] = opTime;
    }
  }
  return { accepted, fieldTimes };
}
