import { truncateLabel, type GraphModel, type GraphRow } from "./graph-model"

/**
 * Team-route graph (US-086, ui-design-reference Screen 11). Three lanes: Route B on the left, the
 * shared main line in the middle and Route A on the right. Main labels alternate sides; branch
 * labels stay outside their lane. Rows are clickable when an `onNodeClick` handler is supplied;
 * the sheet content itself lives in the screen (currently mock data).
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
  if (row.kind === "join") return { x: LANE.m - 16, anchor: "end" }
  return row.side === "right" ? { x: LANE.m + 16, anchor: "start" } : { x: LANE.m - 16, anchor: "end" }
}

function nodeFill(row: GraphRow): string {
  if (row.kind === "fork") return "#0d9488"
  if (row.kind === "join") return "#059669"
  if (row.kind === "branch") return row.route === "a" ? "#2563eb" : "#ea580c"
  return "#0d9488"
}

export function TeamRouteGraph({
  model,
  onNodeClick,
}: {
  model: GraphModel
  onNodeClick?: (row: GraphRow) => void
}) {
  const { rows, forkRow, joinRow, routeLabels } = model
  const showRoutes = rows.some((row) => row.kind === "branch")
  const height = PAD * 2 + ROW * rows.length
  const last = rows.length - 1
  const y = (index: number) => rowCenter(index)

  const mainPaths: string[] = []
  if (forkRow != null && joinRow != null) {
    mainPaths.push(`M${LANE.m} ${y(0)} V${y(forkRow)}`)
    mainPaths.push(`M${LANE.m} ${y(joinRow)} V${y(last)}`)
  } else {
    mainPaths.push(`M${LANE.m} ${y(0)} V${y(last)}`)
  }

  const firstBranch = forkRow == null ? -1 : forkRow + 1
  const lastA = rows.reduce((acc, row, index) => (row.kind === "branch" && row.route === "a" ? index : acc), firstBranch)
  const lastB = rows.reduce((acc, row, index) => (row.kind === "branch" && row.route === "b" ? index : acc), firstBranch)
  const hasBranches = forkRow != null && joinRow != null && lastA > forkRow && lastB > forkRow

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
      </div>

      <svg
        className="mt-1 block w-full"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label="队伍路线图：主线、分头、两条分队路线与会合"
      >
        {mainPaths.map((path) => (
          <path key={path} d={path} stroke="#0d9488" strokeWidth={3} fill="none" strokeLinecap="round" />
        ))}
        {forkRow != null && joinRow != null ? (
          <path
            d={`M${LANE.m} ${y(forkRow)} V${y(joinRow)}`}
            stroke="#cfccc6"
            strokeWidth={2}
            strokeDasharray="4 6"
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
        {hasBranches && forkRow != null && joinRow != null ? (
          <>
            <path
              d={`M${LANE.m} ${y(forkRow)} C${LANE.m} ${y(forkRow) + 28} ${LANE.a} ${y(firstBranch) - 28} ${LANE.a} ${y(firstBranch)} V${y(lastA)} C${LANE.a} ${y(joinRow) - 28} ${LANE.m} ${y(joinRow) - 28} ${LANE.m} ${y(joinRow)}`}
              stroke="#2563eb"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M${LANE.m} ${y(forkRow)} C${LANE.m} ${y(forkRow) + 28} ${LANE.b} ${y(firstBranch) - 28} ${LANE.b} ${y(firstBranch)} V${y(lastB)} C${LANE.b} ${y(joinRow) - 28} ${LANE.m} ${y(joinRow) - 28} ${LANE.m} ${y(joinRow)}`}
              stroke="#ea580c"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {rows.map((row, index) => {
          const cy = y(index)
          const cx = laneX(row)
          const label = labelAnchor(row)
          const isJunction = row.kind === "fork" || row.kind === "join"
          const isBranch = row.kind === "branch"
          const titleSize = isJunction ? 13 : isBranch ? 11.5 : 12.5
          const titleWeight = isJunction ? 750 : isBranch ? 620 : 650
          const title = truncateLabel(row.title, isBranch ? 9 : isJunction ? 10 : 11)
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
              className={onNodeClick ? "cursor-pointer outline-none" : undefined}
            >
              <title>{row.title}</title>
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
              {isJunction ? <circle cx={cx} cy={cy} r={13} fill={row.kind === "fork" ? "#ccfbf1" : "#d7f5e6"} /> : null}
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
                fill="#a8a29e"
              >
                {row.meta}
              </text>
              <text
                x={label.x}
                y={cy + 11}
                textAnchor={label.anchor}
                fontSize={titleSize}
                fontWeight={titleWeight}
                fill={row.kind === "fork" ? "#0f766e" : row.kind === "join" ? "#047857" : "#1c1917"}
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
