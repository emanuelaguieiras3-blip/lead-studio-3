import { Card } from './Card';
import { KPICard } from './KPICard';
import { IconCheck, IconClock, IconTarget, IconTrend } from './icons';

type StudioOverviewProps = {
  leadsCount: number;
  selectedName: string | null;
  currentStep: number;
  totalSteps: number;
  city: string;
  segment: string;
  sourceMode: 'idle' | 'blocked' | 'google' | 'openstreetmap';
};

function sourceLabel(sourceMode: StudioOverviewProps['sourceMode']): string {
  if (sourceMode === 'google') return 'Google Places';
  if (sourceMode === 'openstreetmap') return 'OpenStreetMap';
  if (sourceMode === 'blocked') return 'Busca bloqueada';
  return 'Aguardando busca';
}

export function StudioOverview({
  leadsCount,
  selectedName,
  currentStep,
  totalSteps,
  city,
  segment,
  sourceMode,
}: StudioOverviewProps) {
  const stepPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <section className="overview" data-reveal>
      <div className="overview-heading">
        <div>
          <h1>Visão geral</h1>
          <p>Resumo em tempo real do seu fluxo de oportunidades</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard
          label="Oportunidades"
          value={String(leadsCount)}
          hint={leadsCount === 0 ? 'Nenhuma busca concluída nesta sessão' : 'Cadastros reais sem site informado'}
          tone="success"
          icon={<IconTarget />}
        />
        <KPICard
          label="Lead selecionado"
          value={selectedName ? '1' : '0'}
          hint={selectedName ?? 'Selecione uma oportunidade para avançar'}
          tone={selectedName ? 'primary' : 'warning'}
          icon={selectedName ? <IconCheck /> : <IconClock />}
        />
        <KPICard
          label="Etapa do assistente"
          value={`${currentStep}/${totalSteps}`}
          hint={`${stepPercent}% do fluxo de criação`}
          tone="primary"
          icon={<IconTrend />}
        />
      </div>

      <div className="chart-grid">
        <Card className="chart-card chart-card-wide">
          <h2>Funil do assistente</h2>
          <p className="chart-subtitle">Etapas concluídas nesta sessão, sem métricas inventadas</p>
          <div className="funnel-bars" aria-hidden="true">
            {['Filtros', 'Leads', 'Direção', 'Brief', 'Site'].map((label, index) => {
              const step = index + 1;
              const filled = currentStep >= step;
              return (
                <div key={label} className={filled ? 'funnel-row is-filled' : 'funnel-row'}>
                  <span>{label}</span>
                  <div className="funnel-track"><b style={{ width: filled ? '100%' : `${Math.max(12, 100 - index * 14)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="chart-card">
          <h2>Cobertura da busca</h2>
          <p className="chart-subtitle">Somente dados públicos desta sessão</p>
          <dl className="coverage-list">
            <div><dt>Segmento</dt><dd>{segment || '—'}</dd></div>
            <div><dt>Cidade</dt><dd>{city || '—'}</dd></div>
            <div><dt>Fonte</dt><dd>{sourceLabel(sourceMode)}</dd></div>
          </dl>
        </Card>
      </div>
    </section>
  );
}
