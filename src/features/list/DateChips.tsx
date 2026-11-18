// 行ける日のボタン。押すとその日を外す（もう一度押すと戻す）
import { addDays, weekdayOf } from '../../domain/dates.ts';
import { toggleDate } from './actions.ts';
import { dayLabel } from './planText.ts';

export default function DateChips({ today, weekdays, excluded }: { today: string; weekdays: number[]; excluded: Set<string> }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i)).filter((d) => weekdays.includes(weekdayOf(d)));
  if (days.length === 0) return <p className="note">行ける曜日がありません。設定で選んでください</p>;
  return (
    <div className="chips" role="group" aria-label="行く日">
      {days.map((d) => (
        <button key={d} type="button" aria-pressed={!excluded.has(d)} onClick={() => void toggleDate(d)}>
          {dayLabel(d, today)}
        </button>
      ))}
    </div>
  );
}
