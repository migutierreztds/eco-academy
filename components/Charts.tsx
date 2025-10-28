//components/Charts.tsx
import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Line, Polyline, G, Text as SvgText } from "react-native-svg";

function formatMonthLabel(key: string): string {
  // Expecting "YYYY-MM"
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" }); // "Sep 2025"
}

export type MonthDatum = {
  key: string;     // "YYYY-MM"
  recycle: number; // lbs
  compost: number; // lbs
  diverted: number;// recycle + compost
};

const AXIS_COLOR = "#CBD5E1";    // slate-300
const GRID_COLOR = "#E5E7EB";    // gray-200
const RECYCLE_COLOR = "#3B82F6"; // blue-500
const COMPOST_COLOR = "#10B981"; // emerald-500
const LINE_COLOR = "#0EA5E9";    // sky-500

// Utility: compute nice rounded max for axes
function niceMax(n: number) {
  if (n <= 0) return 1;
  const pow10 = Math.pow(10, Math.floor(Math.log10(n)));
  const base = Math.ceil(n / pow10);
  const nice = (base <= 2 ? 2 : base <= 5 ? 5 : 10) * pow10;
  return nice;
}

/** Simple stacked bar chart (Recycle + Compost) */
export function StackedBarChart({
  data,
  height = 200,
  barGap = 12,
  padding = 24,
}: {
  data: MonthDatum[];
  height?: number;
  barGap?: number;
  padding?: number;
}) {
  const labels = data.map((d) => formatMonthLabel(d.key));
  const totals = data.map((d) => d.recycle + d.compost);
  const maxY = niceMax(Math.max(...totals, 1));

  const W = Math.max(240, data.length * 36 + padding * 2); // auto width per bar
  const H = height;
  const chartW = W - padding * 2;
  const chartH = H - padding * 2;
  const barWidth = data.length > 0 ? (chartW - (data.length - 1) * barGap) / data.length : 0;

  return (
    <View style={{ backgroundColor: "#fff" }}>
      <Svg width={W} height={H}>
        <G x={padding} y={padding}>
          {/* grid / y-axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = chartH - t * chartH;
            return (
              <G key={i}>
                <Line x1={0} y1={y} x2={chartW} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
                <TextSvg x={-8} y={y} textAnchor="end" dy={4}>
                  {Math.round(maxY * t).toLocaleString()}
                </TextSvg>
              </G>
            );
          })}

          {/* bars */}
          {data.map((d, i) => {
            const total = d.recycle + d.compost;
            const totalH = (total / maxY) * chartH;
            const recycleH = (d.recycle / maxY) * chartH;
            const compostH = (d.compost / maxY) * chartH;
            const x = i * (barWidth + barGap);
            const yBase = chartH - totalH;
            return (
              <G key={d.key}>
                {/* compost (top) */}
                <Rect
                  x={x}
                  y={yBase}
                  width={barWidth}
                  height={compostH}
                  fill={COMPOST_COLOR}
                  opacity={0.9}
                />
                {/* recycle (bottom) */}
                <Rect
                  x={x}
                  y={yBase + compostH}
                  width={barWidth}
                  height={recycleH}
                  fill={RECYCLE_COLOR}
                  opacity={0.9}
                />
                {/* label */}
                <TextSvg x={x + barWidth / 2} y={chartH + 16} textAnchor="middle">
                  {labels[i]}
                </TextSvg>
              </G>
            );
          })}

          {/* left axis line */}
          <Line x1={0} y1={0} x2={0} y2={chartH} stroke={AXIS_COLOR} strokeWidth={1.2} />
        </G>
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 16, paddingHorizontal: 8, marginTop: 6 }}>
        <LegendSwatch color={RECYCLE_COLOR} label="Recycle" />
        <LegendSwatch color={COMPOST_COLOR} label="Compost" />
      </View>
    </View>
  );
}

/** Simple line chart for Diverted lbs */
export function LineChart({
  data,
  height = 180,
  padding = 24,
}: {
  data: MonthDatum[];
  height?: number;
  padding?: number;
}) {
  const labels = data.map((d) => formatMonthLabel(d.key));
  const values = data.map((d) => d.diverted);
  const maxY = niceMax(Math.max(...values, 1));

  const W = Math.max(240, data.length * 36 + padding * 2);
  const H = height;
  const chartW = W - padding * 2;
  const chartH = H - padding * 2;

  const points = values.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * chartW;
    const y = chartH - (v / maxY) * chartH;
    return `${x},${y}`;
  });

  return (
    <View style={{ backgroundColor: "#fff" }}>
      <Svg width={W} height={H}>
        <G x={padding} y={padding}>
          {[0, 0.5, 1].map((t, i) => {
            const y = chartH - t * chartH;
            return (
              <G key={i}>
                <Line x1={0} y1={y} x2={chartW} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
                <TextSvg x={-8} y={y} textAnchor="end" dy={4}>
                  {Math.round(maxY * t).toLocaleString()}
                </TextSvg>
              </G>
            );
          })}
          {points.length > 1 && (
            <Polyline
              points={points.join(" ")}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {/* x labels */}
          {labels.map((lab, i) => {
            const x = (i / Math.max(data.length - 1, 1)) * chartW;
            return (
              <TextSvg key={i} x={x} y={chartH + 16} textAnchor="middle">
                {lab}
              </TextSvg>
            );
          })}
          <Line x1={0} y1={0} x2={0} y2={chartH} stroke={AXIS_COLOR} strokeWidth={1.2} />
        </G>
      </Svg>

      <View style={{ flexDirection: "row", gap: 16, paddingHorizontal: 8, marginTop: 6 }}>
        <LegendSwatch color={LINE_COLOR} label="Diverted" />
      </View>
    </View>
  );
}

/** Tiny SVG text helper that renders crisp labels across platforms */
function TextSvg({
  x,
  y,
  children,
  textAnchor = "start",
  dy = 0,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  textAnchor?: "start" | "middle" | "end";
  dy?: number;
}) {
  return (
    <SvgText
      x={x}
      y={y}
      dy={dy}
      fill="#64748B"
      fontSize={10}
      textAnchor={textAnchor}
    >
      {children}
    </SvgText>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color }} />
      <Text style={{ color: "#334155", fontSize: 12 }}>{label}</Text>
    </View>
  );
}