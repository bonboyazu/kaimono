// 行ける曜日：日〜土の7つのボタン
import { useRow } from '../../data/hooks.ts';
import { SETTINGS_ID } from '../../domain/types.ts';
import { WEEKDAYS } from '../data/filters.ts';
import { DEFAULT_WEEKDAYS, toggleWeekday } from './actions.ts';

export default function WeekdaySetting() {
  const settings = useRow('settings', SETTINGS_ID);
  const days = settings && !settings.deleted_at ? settings.available_weekdays : DEFAULT_WEEKDAYS;
  return (
    <section className="card">
      <h2>行ける曜日</h2>
      <div className="weekday-buttons" role="group" aria-label="行ける曜日">
        {WEEKDAYS.map((label, w) => (
          <button key={label} type="button" aria-pressed={days.includes(w)} onClick={() => void toggleWeekday(w)}>
            {label}
          </button>
        ))}
      </div>
      <p className="note">提案は、今日から7日間のうち、この曜日で考えます</p>
    </section>
  );
}
