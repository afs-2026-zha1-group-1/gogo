import {
  PENDING_LABEL,
  truncateLabel,
  type GraphModel,
  type GraphRow,
  type RoundSpan,
} from "./graph-model"

/**
 * Team-route graph (US-086, ui-design-reference Screen 11). Three lanes: Route B on the left, the
 * shared main line in the middle and Route A on the right. Main labels alternate sides; branch
 * labels stay outside their lane. Travel rows are connectors, not nodes: they render as a small
 * minutes tag on the lane line (so a split can start with two lines instead of a 路程 dot). Rows are
 * clickable when an `onNodeClick` handler is supplied; the screen derives the sheet content from the
 * same split snapshot (US-092).
 */

const WIDTH = 320
const ROW = 56
const PAD = 20
const LANE = { b: 132, m: 160, a: 188 } as const

const rowCenter = (index: number) => PAD + ROW * index + ROW / 2

function laneX(row: GraphRow): number {
  if (row.kind === "branch") return LANE[row.route]
  return LANE.m
}

function labelAnchor(row: GraphRow): { x: number; anchor: "start" | "end" } {
  if (row.kind === "branch") {
    return row.route === "a" ? { x: LANE.a + 12, anchor: "start" } : { x: LANE.b - 12, anchor: "end" }
  }
  if (row.kind === "fork") return { x: LANE.m + 16, anchor: "start" }
  if (row.kind === "join" || row.kind === "join-fork") return { x: LANE.m - 16, anchor: "end" }
  return row.side === "right" ? { x: LANE.m + 16, anchor: "start" } : { x: LANE.m - 16, anchor: "end" }
}

function nodeFill(row: GraphRow): string {
  if (row.kind === "fork" || row.kind === "join-fork") return "#245b46"
  if (row.kind === "join") return "#2e8061"
  if (row.kind === "branch") return row.route === "a" ? "#39806e" : "#ae7957"
  return "#245b46"
}

function isJunctionRow(row: GraphRow): boolean {
  return row.kind === "fork" || row.kind === "join" || row.kind === "join-fork"
}

function spansFor(model: GraphModel): RoundSpan[] {
  if (model.rounds.length > 0) return model.rounds
  if (model.forkRow != null && model.joinRow != null) {
    return [{ roundIndex: 1, forkRow: model.forkRow, joinRow: model.joinRow }]
  }
  return []
}

function spanBranchBounds(rows: GraphRow[], span: RoundSpan) {
  const first = span.forkRow == null ? -1 : span.forkRow + 1
  let lastA = first
  let lastB = first
  if (span.joinRow != null) {
    for (let index = first; index <= span.joinRow; index += 1) {
      const row = rows[index]
      if (row?.kind !== "branch") continue
      if (row.route === "a") lastA = index
      else lastB = index
    }
  }
  const has = span.forkRow != null && span.joinRow != null && lastA > span.forkRow && lastB > span.forkRow
  return { first, lastA, lastB, has }
}

export function TeamRouteGraph({
  model,
  onNodeClick,
  selectedId,
}: {
  model: GraphModel
  onNodeClick?: (row: GraphRow) => void
  /** US-092: row whose detail sheet is open, marked in place without leaving the graph. */
  selectedId?: string
}) {
  const { rows, routeLabels } = model
  const spans = spansFor(model)
  const showRoutes = rows.some((row) => row.kind === "branch")
  const height = PAD * 2 + ROW * rows.length
  const last = rows.length - 1
  const y = (index: number) => rowCenter(index)

  // The main line is continuous except across each fork→join span, where it is dashed.
  const mainSegments: Array<[number, number]> = []
  if (spans.length === 0) {
    mainSegments.push([0, last])
  } else {
    let start = 0
    for (const span of spans) {
      if (span.forkRow != null && span.forkRow > start) mainSegments.push([start, span.forkRow])
      if (span.joinRow != null) start = span.joinRow
    }
    if (start < last) mainSegments.push([start, last])
  }

  return (
    <div className="relative isolate -mx-1 px-2 pb-1">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-panel"
        style={{
          background:
            "radial-gradient(115% 72% at 50% 0%, #fff 0%, rgba(255,255,255,0.62) 40%, rgba(255,255,255,0) 74%), radial-gradient(62% 46% at 10% 10%, rgba(13,148,136,0.08), transparent 72%), radial-gradient(62% 46% at 94% 34%, rgba(37,99,235,0.06), transparent 74%), radial-gradient(54% 42% at 14% 64%, rgba(234,88,12,0.05), transparent 74%)",
          maskImage: "linear-gradient(180deg,#000 0%,#000 72%,transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg,#000 0%,#000 72%,transparent 100%)",
        }}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-dashed border-line px-1 pb-2.5 pt-1 text-[10.5px] font-semibold text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-brand" /> 全员主线
        </span>
        {showRoutes ? (
          <>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <i className="size-2 shrink-0 rounded-full bg-a" />
              <span className="truncate">{routeLabels.a}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <i className="size-2 shrink-0 rounded-full bg-b" />
              <span className="truncate">{routeLabels.b}</span>
            </span>
          </>
        ) : null}
        {spans.length > 1 ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-[9.5px] text-ink-3">
            {spans.length} 次分头 · {spans.length} 次会合
          </span>
        ) : null}
      </div>

      <svg
        className="mt-1 block w-full"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label="队伍路线图：主线、分头、两条分队路线与会合"
      >
        {mainSegments.map(([from, to]) => (
          <path
            key={`main-${from}-${to}`}
            d={`M${LANE.m} ${y(from)} V${y(to)}`}
            stroke="#245b46"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        ))}

        {spans.map((span) =>
          span.forkRow != null && span.joinRow != null && span.joinRow > span.forkRow ? (
            <path
              key={`dash-${span.roundIndex}`}
              d={`M${LANE.m} ${y(span.forkRow)} V${y(span.joinRow)}`}
              stroke="#cbdacb"
              strokeWidth={2}
              strokeDasharray="4 6"
              fill="none"
              strokeLinecap="round"
            />
          ) : null,
        )}

        {spans.map((span) => {
          if (span.forkRow == null || span.joinRow == null) return null
          const bounds = spanBranchBounds(rows, span)
          if (!bounds.has) return null
          const { first, lastA, lastB } = bounds
          return (
            <g key={`branches-${span.roundIndex}`}>
              <path
                d={`M${LANE.m} ${y(span.forkRow)} C${LANE.m} ${y(span.forkRow) + 28} ${LANE.a} ${y(first) - 28} ${LANE.a} ${y(first)} V${y(lastA)} C${LANE.a} ${y(span.joinRow) - 28} ${LANE.m} ${y(span.joinRow) - 28} ${LANE.m} ${y(span.joinRow)}`}
                stroke="#39806e"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
              <path
                d={`M${LANE.m} ${y(span.forkRow)} C${LANE.m} ${y(span.forkRow) + 28} ${LANE.b} ${y(first) - 28} ${LANE.b} ${y(first)} V${y(lastB)} C${LANE.b} ${y(span.joinRow) - 28} ${LANE.m} ${y(span.joinRow) - 28} ${LANE.m} ${y(span.joinRow)}`}
                stroke="#ae7957"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
            </g>
          )
        })}

        {rows.map((row, index) => {
          const cy = y(index)
          const cx = laneX(row)
          const label = labelAnchor(row)
          const isJunction = isJunctionRow(row)
          const isBranch = row.kind === "branch"
          // Travel legs are drawn on the line between two nodes: no dot, no big title, no click target.
          if (isBranch && row.leg) {
            const minutesLabel = row.legMinutes == null ? PENDING_LABEL : `${row.legMinutes} 分`
            const color = row.route === "a" ? "#39806e" : "#ae7957"
            return (
              <g key={row.id} aria-label={`${row.route === "a" ? "A 组" : "B 组"}路程 ${minutesLabel}`}>
                <rect
                  x={cx - 21}
                  y={cy - 8}
                  width={42}
                  height={16}
                  rx={8}
                  fill="#fff"
                  fillOpacity={0.94}
                  stroke={color}
                  strokeOpacity={0.35}
                />
                <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>
                  {minutesLabel}
                </text>
              </g>
            )
          }
          const isJoinFork = row.kind === "join-fork"
          const titleSize = isJunction ? 13 : isBranch ? 11.5 : 12.5
          const titleWeight = isJunction ? 750 : isBranch ? 620 : 650
          const title = truncateLabel(row.title, isBranch ? 9 : isJunction ? 10 : 11)
          const meta = truncateLabel(row.meta, isBranch ? 14 : isJoinFork ? 18 : 16)
          const selected = row.id === selectedId
          return (
            <g
              key={row.id}
              onClick={onNodeClick ? () => onNodeClick(row) : undefined}
              onKeyDown={
                onNodeClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        onNodeClick(row)
                      }
                    }
                  : undefined
              }
              role={onNodeClick ? "button" : undefined}
              tabIndex={onNodeClick ? 0 : undefined}
              aria-label={`${row.meta} ${row.title}`}
              aria-current={selected ? "true" : undefined}
              className={onNodeClick ? "cursor-pointer outline-none" : undefined}
            >
              <title>{`${row.meta} · ${row.title}`}</title>
              {selected ? (
                <rect
                  x={2}
                  y={cy - 26}
                  width={316}
                  height={52}
                  rx={10}
                  fill="#edf5ee"
                  stroke="#a7c9b3"
                  strokeWidth={1.5}
                />
              ) : null}
              {onNodeClick ? (
                <rect
                  x={2}
                  y={cy - 26}
                  width={316}
                  height={52}
                  rx={10}
                  fill="transparent"
                  className="hover:fill-black/5"
                />
              ) : null}
              {isJunction ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={13}
                  fill={row.kind === "fork" ? "#e4f0e3" : row.kind === "join" ? "#e1f1de" : "#e4f0e3"}
                />
              ) : null}
              {isJoinFork ? (
                <circle cx={cx} cy={cy} r={16} fill="none" stroke="#a7c9b3" strokeWidth={1.5} />
              ) : null}
              <circle
                cx={cx}
                cy={cy}
                r={isJunction ? 8 : 6.5}
                fill={nodeFill(row)}
                stroke="#fff"
                strokeWidth={isJunction ? 2.5 : 2}
              />
              <text
                x={label.x}
                y={cy - 6}
                textAnchor={label.anchor}
                fontSize={isBranch ? 9 : 9.5}
                fontWeight={700}
                fill="#94a499"
              >
                {meta}
              </text>
              <text
                x={label.x}
                y={cy + 11}
                textAnchor={label.anchor}
                fontSize={titleSize}
                fontWeight={titleWeight}
                fill={row.kind === "fork" || row.kind === "join-fork" ? "#235b45" : row.kind === "join" ? "#2e8061" : "#1c382e"}
              >
                {title}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
