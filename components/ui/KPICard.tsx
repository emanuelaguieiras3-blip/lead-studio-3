import type { ReactNode } from 'react';
import { Card } from './Card';

export type KPITone = 'primary' | 'warning' | 'success';

type KPICardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: KPITone;
  icon: ReactNode;
};

export function KPICard({ label, value, hint, tone = 'primary', icon }: KPICardProps) {
  return (
    <Card className="kpi-card">
      <div className="kpi-card-copy">
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value">{value}</strong>
        <small className="kpi-hint">{hint}</small>
      </div>
      <span className={`kpi-icon kpi-icon-${tone}`}>{icon}</span>
    </Card>
  );
}
