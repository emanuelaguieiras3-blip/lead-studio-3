'use client';

import Link from 'next/link';
import { SidebarItem } from './SidebarItem';
import { useStudio } from '../studio-provider';
import { IconFile, IconLayout, IconSpark, IconTarget } from '../ui/icons';

type SidebarProps = {
  pathname: string;
  hash: string;
  onNavigate?: () => void;
};

export function Sidebar({ pathname, hash, onNavigate }: SidebarProps) {
  const { studio } = useStudio();
  const progress = Math.round((studio.currentStep / studio.totalSteps) * 100);
  const isHome = pathname === '/';

  const items = [
    { href: '/', label: 'Visão geral', icon: <IconLayout />, active: isHome && hash !== '#oportunidades' && hash !== '#direcao' && hash !== '#brief' },
    { href: '/#oportunidades', label: 'Oportunidades', icon: <IconTarget />, active: hash === '#oportunidades' || pathname === '/oportunidades' },
    { href: '/#direcao', label: 'Direção', icon: <IconSpark />, active: hash === '#direcao' || pathname === '/insights' },
    { href: '/#brief', label: 'Briefs', icon: <IconFile />, active: hash === '#brief' || pathname === '/briefs' },
  ];

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-logo" onClick={onNavigate}>
        <span className="sidebar-logo-mark">L</span>
        <span className="sidebar-logo-copy">
          <strong>Lead Studio</strong>
          <small>Radar local</small>
        </span>
      </Link>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        {items.map((item) => (
          <SidebarItem key={item.href} {...item} onClick={onNavigate} />
        ))}
      </nav>

      <article className="sidebar-progress">
        <div className="sidebar-progress-head">
          <div>
            <span>Progresso do fluxo</span>
            <b>{studio.currentStep} / {studio.totalSteps}</b>
          </div>
          <Link href="/#wizard" className="sidebar-progress-action" onClick={onNavigate}>VER</Link>
        </div>
        <div className="sidebar-progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </article>

      <div className="sidebar-user">
        <span className="sidebar-avatar" aria-hidden="true">LS</span>
        <div>
          <b>Sessão local</b>
          <small>Operação no navegador</small>
        </div>
      </div>
    </aside>
  );
}
