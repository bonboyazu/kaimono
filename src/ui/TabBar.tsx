import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/list', label: 'リスト' },
  { to: '/dashboard', label: 'ダッシュボード' },
  { to: '/data', label: 'データ' },
];

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
