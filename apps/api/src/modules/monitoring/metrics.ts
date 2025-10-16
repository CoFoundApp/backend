export type MetricLabels = Record<string, string>;

const escapeLabelValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

const normaliseLabels = (
  labelNames: readonly string[],
  labels: Record<string, string | number | boolean | null | undefined>,
): MetricLabels => {
  const normalised: MetricLabels = {};
  for (const name of labelNames) {
    const raw = labels[name];
    normalised[name] = raw === undefined || raw === null ? '' : String(raw);
  }
  return normalised;
};

const keyFor = (labelNames: readonly string[], labels: MetricLabels): string =>
  labelNames.map((name) => `${name}:${labels[name] ?? ''}`).join('|');

const formatLabels = (labels: MetricLabels): string => {
  const entries = Object.entries(labels)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${escapeLabelValue(value ?? '')}"`);
  return entries.length ? `{${entries.join(',')}}` : '';
};

abstract class MetricBase<TState> {
  protected readonly store = new Map<string, { labels: MetricLabels; state: TState }>();

  constructor(
    protected readonly name: string,
    protected readonly help: string,
    protected readonly labelNames: readonly string[],
  ) {}

  protected getOrCreateState(labels: MetricLabels, factory: () => TState): TState {
    const key = keyFor(this.labelNames, labels);
    const existing = this.store.get(key);
    if (existing) {
      return existing.state;
    }
    const state = factory();
    this.store.set(key, { labels, state });
    return state;
  }

  protected abstract serializeState(item: { labels: MetricLabels; state: TState }): string[];

  toPrometheus(): string {
    const lines: string[] = [];
    if (!this.store.size) {
      return '';
    }
    lines.push(`# HELP ${this.name} ${this.help}`);
    lines.push(`# TYPE ${this.name} ${this.getType()}`);
    for (const entry of this.store.values()) {
      lines.push(...this.serializeState(entry));
    }
    return lines.join('\n');
  }

  protected abstract getType(): string;
}

class CounterMetric extends MetricBase<number> {
  inc(labels: Record<string, string | number | boolean | null | undefined>, value = 1) {
    const normalised = normaliseLabels(this.labelNames, labels);
    const state = this.getOrCreateState(normalised, () => 0);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }
    const next = state + value;
    const key = keyFor(this.labelNames, normalised);
    this.store.set(key, { labels: normalised, state: next });
  }

  protected serializeState(item: { labels: MetricLabels; state: number }): string[] {
    return [`${this.name}${formatLabels(item.labels)} ${item.state}`];
  }

  protected getType(): string {
    return 'counter';
  }
}

class GaugeMetric extends MetricBase<number> {
  set(labels: Record<string, string | number | boolean | null | undefined>, value: number) {
    if (!Number.isFinite(value)) {
      return;
    }
    const normalised = normaliseLabels(this.labelNames, labels);
    const key = keyFor(this.labelNames, normalised);
    this.store.set(key, { labels: normalised, state: value });
  }

  protected serializeState(item: { labels: MetricLabels; state: number }): string[] {
    return [`${this.name}${formatLabels(item.labels)} ${item.state}`];
  }

  protected getType(): string {
    return 'gauge';
  }
}

interface HistogramState {
  buckets: number[];
  sum: number;
  count: number;
}

class HistogramMetric extends MetricBase<HistogramState> {
  constructor(
    name: string,
    help: string,
    labelNames: readonly string[],
    private readonly bucketBounds: number[],
  ) {
    super(name, help, labelNames);
    this.bucketBounds = [...bucketBounds].sort((a, b) => a - b);
  }

  observe(labels: Record<string, string | number | boolean | null | undefined>, value: number) {
    if (!Number.isFinite(value)) {
      return;
    }
    const normalised = normaliseLabels(this.labelNames, labels);
    const state = this.getOrCreateState(normalised, () => ({
      buckets: new Array(this.bucketBounds.length).fill(0),
      sum: 0,
      count: 0,
    }));

    state.sum += value;
    state.count += 1;

    for (let i = 0; i < this.bucketBounds.length; i += 1) {
      if (value <= this.bucketBounds[i]) {
        state.buckets[i] += 1;
      }
    }
  }

  protected serializeState(item: { labels: MetricLabels; state: HistogramState }): string[] {
    const lines: string[] = [];
    let cumulative = 0;
    for (let i = 0; i < this.bucketBounds.length; i += 1) {
      cumulative = item.state.buckets[i];
      const labels = { ...item.labels, le: String(this.bucketBounds[i]) };
      lines.push(`${this.name}_bucket${formatLabels(labels)} ${cumulative}`);
    }
    const infLabels = { ...item.labels, le: '+Inf' };
    lines.push(`${this.name}_bucket${formatLabels(infLabels)} ${item.state.count}`);
    lines.push(`${this.name}_sum${formatLabels(item.labels)} ${item.state.sum}`);
    lines.push(`${this.name}_count${formatLabels(item.labels)} ${item.state.count}`);
    return lines;
  }

  protected getType(): string {
    return 'histogram';
  }
}

export { CounterMetric, GaugeMetric, HistogramMetric, formatLabels };
