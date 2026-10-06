export type KpiKey = 'referentialItems' | 'openOrderLines' | 'activeUsers' | 'pendingApprovals';
export type ActivityType = 'create' | 'update' | 'delete' | 'save';
export type ActivityEntity = 'country' | 'employee' | 'orderLines';

export interface DashboardSummary {
  kpis: { key: KpiKey; value: number; delta: number }[];
  activity: { date: string; signIns: number; changes: number }[];
  regions: { region: string; count: number }[];
  recentActivity: {
    type: ActivityType;
    entity: ActivityEntity;
    label: string;
    user: string;
    at: string;
  }[];
  recentCountries: { id: string; code: string; name: string; region: string; updatedAt: string }[];
}
