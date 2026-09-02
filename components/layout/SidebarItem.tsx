import Link from 'next/link';
import type { ReactNode } from 'react';

type SidebarItemProps = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onClick?: () => void;
};

export function SidebarItem({ href, label, icon, active = false, onClick }: SidebarItemProps) {
  return (
    <Link href={href} className={active ? 'sidebar-item is-active' : 'sidebar-item'} onClick={onClick}>
      <span className="sidebar-item-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
