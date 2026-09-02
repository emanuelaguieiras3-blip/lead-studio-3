'use client';

import { Button } from '../ui/Button';
import { IconBell, IconCalendar, IconChevron, IconMenu, IconMoon, IconSun, IconUsers } from '../ui/icons';
import { useTheme } from '../theme-provider';

type TopbarProps = {
  title: string;
  onOpenMenu: () => void;
};

export function Topbar({ title, onOpenMenu }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-menu" aria-label="Abrir menu" onClick={onOpenMenu}>
          <IconMenu />
        </button>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>Lead Studio</span>
          <span>/</span>
          <strong>{title}</strong>
        </nav>
      </div>

      <div className="topbar-actions">
        <Button variant="secondary" className="community-chip" type="button">
          <span className="community-dot" aria-hidden="true" />
          <IconUsers width={16} height={16} />
          Participe da nossa comunidade
        </Button>
        <button type="button" className="date-filter" aria-label="Período da sessão">
          <IconCalendar />
          <span>Sessão atual</span>
          <IconChevron />
        </button>
        <button type="button" className="icon-button" aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'} onClick={toggleTheme}>
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <button type="button" className="icon-button" aria-label="Notificações">
          <IconBell />
        </button>
        <div className="topbar-user">
          <span className="sidebar-avatar">LS</span>
          <span>Sessão local</span>
        </div>
      </div>
    </header>
  );
}
