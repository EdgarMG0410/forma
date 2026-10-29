import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { compact, num } from '~/lib/format'

/**
 * Charts stay quiet: one accent series, hairline grid, no legends when a
 * single series is plotted. Colors come from the theme tokens.
 */
const axis = {
  stroke: 'var(--muted-foreground)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const

function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="num mt-0.5 font-medium text-popover-foreground">
          {num(p.value)} {p.payload?.unit ?? unit ?? ''}
          {p.name && payload.length > 1 ? (
            <span className="ml-1 text-muted-foreground">{p.name}</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function VolumeBars({
  data,
  dataKey,
  xKey,
  unit,
  height = 180,
  highlightLast = true,
}: {
  data: Array<Record<string, any>>
  dataKey: string
  xKey: string
  unit?: string
  height?: number
  highlightLast?: boolean
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} {...axis} interval="preserveStartEnd" minTickGap={8} />
          <YAxis {...axis} tickFormatter={(v) => compact(v)} width={40} />
          <Tooltip
            content={<ChartTooltip unit={unit} />}
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
          />
          <Bar
            dataKey={dataKey}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            shape={(props: any) => {
              const isLast = highlightLast && props.index === data.length - 1
              return (
                <rect
                  x={props.x}
                  y={props.y}
                  width={props.width}
                  height={Math.max(0, props.height)}
                  rx={4}
                  fill={isLast ? 'var(--chart-1)' : 'var(--chart-2)'}
                  opacity={isLast ? 1 : 0.55}
                />
              )
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendLine({
  data,
  lines,
  xKey,
  unit,
  height = 220,
}: {
  data: Array<Record<string, any>>
  lines: Array<{ key: string; name: string; muted?: boolean }>
  xKey: string
  unit?: string
  height?: number
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} {...axis} minTickGap={16} />
          <YAxis {...axis} width={40} domain={['auto', 'auto']} tickFormatter={(v) => compact(v)} />
          <Tooltip content={<ChartTooltip unit={unit} />} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.muted ? 'var(--chart-2)' : 'var(--chart-1)'}
              strokeWidth={line.muted ? 1.5 : 2.25}
              strokeDasharray={line.muted ? '4 4' : undefined}
              dot={{
                r: 2.5,
                strokeWidth: 0,
                fill: line.muted ? 'var(--chart-2)' : 'var(--chart-1)',
              }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
