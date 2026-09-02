'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const titles: Record<string, string> = {
  '/': 'Visão geral',
  '/dashboard': 'Visão geral',
  '/oportunidades': 'Oportunidades',
  '/insights': 'Direção criativa',
  '/briefs': 'Briefs',
};

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    window.addEventListener('popstate', syncHash);
    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('popstate', syncHash);
    };
  }, [pathname]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    window.setTimeout(() => setHash(window.location.hash), 0);
  }, []);

  const title = titles[pathname] ?? 'Visão geral';

  return (
    <div className={menuOpen ? 'app-frame menu-open' : 'app-frame'}>
      <Sidebar pathname={pathname} hash={hash} onNavigate={closeMenu} />
      <div className="app-main">
        <Topbar title={title} onOpenMenu={() => setMenuOpen((open) => !open)} />
        <div className="app-content">{children}</div>
      </div>
      {menuOpen ? <button type="button" className="sidebar-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} /> : null}
    </div>
  );
}
