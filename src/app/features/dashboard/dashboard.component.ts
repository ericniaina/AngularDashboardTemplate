import { HttpClient, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideClipboardCheck,
  lucideGlobe,
  lucidePencil,
  lucidePlus,
  lucideReceiptText,
  lucideSave,
  lucideShieldAlert,
  lucideTrash2,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideUserCog,
  lucideUserPlus,
  lucideUsers,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import type { ColDef } from 'ag-grid-community';
import {
  ArcElement,
  CategoryScale,
  type ChartConfiguration,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { translateGroup, TranslocoPipe } from '../../core/i18n';
import { MenuService } from '../../core/layout/menu.service';
import { ThemeService } from '../../core/layout/theme.service';
import { LocaleService } from '../../core/locale';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { formatLocalizedDate } from '../../shared/date/date-format.util';
import { LocalizedDatePipe } from '../../shared/pipes/localized-date.pipe';
import { readChartPalette } from './chart-palette';
import type { ActivityType, DashboardSummary, KpiKey } from './dashboard.model';

type RecentCountry = DashboardSummary['recentCountries'][number];

const KPI_ICONS: Record<KpiKey, string> = {
  referentialItems: 'lucideGlobe',
  openOrderLines: 'lucideReceiptText',
  activeUsers: 'lucideUsers',
  pendingApprovals: 'lucideClipboardCheck',
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  create: 'lucidePlus',
  update: 'lucidePencil',
  delete: 'lucideTrash2',
  save: 'lucideSave',
};

@Component({
  selector: 'app-dashboard',
  imports: [
    BaseChartDirective,
    DataTableComponent,
    HlmButtonImports,
    HlmCardImports,
    HlmEmptyImports,
    HlmSkeletonImports,
    LocalizedDatePipe,
    NgIcon,
    PageHeaderComponent,
    RouterLink,
    TranslocoPipe,
  ],
  providers: [
    // Only the Chart.js pieces this page draws, registered with the (lazy) dashboard.
    provideCharts({
      registerables: [
        ArcElement,
        CategoryScale,
        DoughnutController,
        Legend,
        LinearScale,
        LineController,
        LineElement,
        PointElement,
        Tooltip,
      ],
    }),
    provideIcons({
      lucideArrowRight,
      lucideClipboardCheck,
      lucideGlobe,
      lucidePencil,
      lucidePlus,
      lucideReceiptText,
      lucideSave,
      lucideShieldAlert,
      lucideTrash2,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideUserCog,
      lucideUserPlus,
      lucideUsers,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly http = inject(HttpClient);
  private readonly theme = inject(ThemeService);
  private readonly locale = inject(LocaleService).locale;
  private readonly menu = inject(MenuService);

  private readonly summary = httpResource<DashboardSummary>(() => '/api/dashboard/summary');
  protected readonly data = computed(() => (this.summary.hasValue() ? this.summary.value() : null));
  protected readonly failed = computed(() => this.summary.status() === 'error');

  private readonly chartText = translateGroup<'signIns' | 'changes'>('dashboard.chart');
  private readonly regionText = translateGroup<string>('common.regions');
  private readonly columnText = translateGroup<'code' | 'name' | 'region' | 'updatedAt'>(
    'dashboard.recentCountries.columns',
  );

  /** Re-read the canvas colors whenever the theme flips. */
  private readonly palette = computed(() => {
    this.theme.isDark();
    return readChartPalette();
  });

  private readonly number = computed(() => new Intl.NumberFormat(this.locale()));
  private readonly percent = computed(
    () =>
      new Intl.NumberFormat(this.locale(), {
        style: 'percent',
        signDisplay: 'always',
        maximumFractionDigits: 1,
      }),
  );

  protected readonly kpis = computed(() =>
    (this.data()?.kpis ?? []).map((kpi) => ({
      ...kpi,
      icon: KPI_ICONS[kpi.key],
      formattedValue: this.number().format(kpi.value),
      formattedDelta: this.percent().format(kpi.delta / 100),
      up: kpi.delta >= 0,
    })),
  );

  protected readonly activity = computed(() =>
    (this.data()?.recentActivity ?? []).map((item) => ({
      ...item,
      icon: ACTIVITY_ICONS[item.type],
    })),
  );

  protected readonly quickLinks = computed(() =>
    this.menu.items().filter((item) => item.route !== '/dashboard'),
  );

  protected readonly lineChart = computed<ChartConfiguration<'line'> | null>(() => {
    const data = this.data();
    if (!data) return null;
    const palette = this.palette();
    const text = this.chartText();
    const locale = this.locale();
    return {
      type: 'line',
      data: {
        labels: data.activity.map((point) => formatLocalizedDate(point.date, locale, 'dayMonth')),
        datasets: [
          {
            label: text.signIns,
            data: data.activity.map((p) => p.signIns),
            borderColor: palette.series[0],
            backgroundColor: palette.series[0],
          },
          {
            label: text.changes,
            data: data.activity.map((p) => p.changes),
            borderColor: palette.series[1],
            backgroundColor: palette.series[1],
          },
        ].map((dataset) => ({
          ...dataset,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: palette.mutedText, maxTicksLimit: 8 },
            border: { color: palette.grid },
          },
          y: {
            grid: { color: palette.grid },
            ticks: { color: palette.mutedText },
            border: { display: false },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: palette.text, usePointStyle: true, boxHeight: 6 },
          },
        },
      },
    };
  });

  protected readonly donutChart = computed<ChartConfiguration<'doughnut'> | null>(() => {
    const data = this.data();
    if (!data) return null;
    const palette = this.palette();
    const regions = this.regionText();
    return {
      type: 'doughnut',
      data: {
        labels: data.regions.map((r) => regions[r.region] ?? r.region),
        datasets: [
          {
            data: data.regions.map((r) => r.count),
            backgroundColor: palette.series,
            borderColor: palette.surface,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: palette.text, usePointStyle: true, boxHeight: 6 },
          },
        },
      },
    };
  });

  protected readonly recentCountries = computed(() => this.data()?.recentCountries ?? []);

  protected readonly recentCountryColumns = computed<ColDef<RecentCountry>[]>(() => {
    const text = this.columnText();
    const regions = this.regionText();
    const locale = this.locale();
    // A compact preview: no filters or sorting, the full page has those.
    const plain: ColDef<RecentCountry> = { sortable: false, filter: false, floatingFilter: false };
    const columns: ColDef<RecentCountry>[] = [
      { field: 'code', headerName: text.code, maxWidth: 110 },
      { field: 'name', headerName: text.name },
      {
        field: 'region',
        headerName: text.region,
        valueFormatter: (p) => regions[p.value as string] ?? p.value,
      },
      {
        field: 'updatedAt',
        headerName: text.updatedAt,
        valueFormatter: (p) => formatLocalizedDate(p.value as string, locale, 'mediumDate'),
      },
    ];
    return columns.map((col) => ({ ...plain, ...col }));
  });

  protected readonly getRecentCountryId = (p: { data: RecentCountry }) => p.data.id;

  protected retry(): void {
    this.summary.reload();
  }

  /** Always 403 from the BFF: the interceptor routes to /forbidden, independent of route guards. */
  protected tryForbidden(): void {
    this.http.get('/api/restricted-demo').subscribe({ error: () => undefined });
  }
}
