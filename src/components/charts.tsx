import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Txt } from './ui';

/**
 * Charts are plain SVG. Every value comes from the API already computed —
 * these components only map numbers to geometry.
 */

// ------------------------------------------------------------ progress ring

export function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 11,
  color,
  trackColor,
  children,
  startAngle = -90,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  startAngle?: number;
}) {
  const { theme } = useTheme();
  const accent = color || theme.primary;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, percentage || 0));
  const dash = (pct / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id={`ring-${accent.replace('#', '')}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity="1" />
            <Stop offset="1" stopColor={accent} stopOpacity="0.55" />
          </SvgGradient>
        </Defs>
        {/* rotate(angle cx cy) is the SVG-standard form. The `rotation`/`origin`
            props would work on native, but react-native-svg's web build turns
            them into a kebab-case `transform-origin` DOM attribute that React
            rejects. */}
        <G transform={`rotate(${startAngle} ${size / 2} ${size / 2})`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor || theme.surfaceMuted}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#ring-${accent.replace('#', '')})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

// ------------------------------------------------------------ activity rings

export function ActivityRings({
  rings,
  size = 140,
  strokeWidth = 12,
  gap = 5,
}: {
  rings: { percentage: number; color: string; label?: string }[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {rings.map((ring, index) => {
            const radius = (size - strokeWidth) / 2 - index * (strokeWidth + gap);
            if (radius <= 0) return null;
            const circumference = 2 * Math.PI * radius;
            const pct = Math.max(0, Math.min(100, ring.percentage || 0));
            const dash = (pct / 100) * circumference;

            return (
              <G key={index}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={`${ring.color}26`}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeLinecap="round"
                  fill="none"
                />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// ---------------------------------------------------------------- bar chart

export function BarChart({
  data,
  height = 120,
  color,
  highlightColor,
  showValues = false,
  onBarPress,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  color?: string;
  highlightColor?: string;
  showValues?: boolean;
  onBarPress?: (index: number) => void;
}) {
  const { theme, radius, spacing } = useTheme();
  const accent = color || theme.primary;
  const highlight = highlightColor || theme.primary;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          height,
        }}
      >
        {data.map((item, index) => {
          const barHeight = Math.max(4, (item.value / max) * (height - 22));
          const isActive = item.highlight;

          return (
            <Pressable
              key={`${item.label}-${index}`}
              onPress={onBarPress ? () => onBarPress(index) : undefined}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}
            >
              {showValues && item.value > 0 && (
                <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: 3 }}>
                  {item.value}
                </Txt>
              )}
              <View
                style={{
                  width: '58%',
                  height: barHeight,
                  borderRadius: radius.pill,
                  backgroundColor: isActive
                    ? highlight
                    : item.value > 0
                      ? // Pale blue in the light theme, to match the navy highlight.
                        color || theme.mode === 'dark'
                        ? `${accent}66`
                        : '#A9C3F0'
                      : theme.surfaceMuted,
                  boxShadow: isActive ? `0px 6px 12px -4px ${highlight}88` : [],
                  ...(isActive
                    ? {
                        shadowColor: highlight,
                        shadowOpacity: 0.6,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 4,
                      }
                    : {}),
                }}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
        {data.map((item, index) => (
          <View key={`label-${index}`} style={{ flex: 1, alignItems: 'center' }}>
            <Txt
              variant="caption"
              color={item.highlight ? theme.primary : theme.textTertiary}
            >
              {item.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

// --------------------------------------------------------------- line chart

export function LineChart({
  points,
  height = 170,
  width,
  color,
  showArea = true,
  showDots = true,
  targetValue,
  unit = '',
  yAxisLabels = true,
}: {
  points: { date: string; value: number }[];
  height?: number;
  width: number;
  color?: string;
  showArea?: boolean;
  showDots?: boolean;
  targetValue?: number | null;
  unit?: string;
  yAxisLabels?: boolean;
}) {
  const { theme, spacing } = useTheme();
  const accent = color || theme.primary;

  const padLeft = yAxisLabels ? 36 : 8;
  const padRight = 10;
  const padTop = 14;
  const padBottom = 24;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const values = points.map((p) => p.value);
    const candidates = targetValue != null ? [...values, targetValue] : values;
    let min = Math.min(...candidates);
    let max = Math.max(...candidates);

    // A flat series would collapse to a zero-height band, so pad it out.
    if (max - min < 0.5) {
      min -= 1;
      max += 1;
    } else {
      const padding = (max - min) * 0.14;
      min -= padding;
      max += padding;
    }

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const x = (i: number) =>
      points.length === 1
        ? padLeft + chartW / 2
        : padLeft + (i / (points.length - 1)) * chartW;
    const y = (v: number) => padTop + chartH - ((v - min) / (max - min)) * chartH;

    const coords = points.map((p, i) => ({ x: x(i), y: y(p.value), value: p.value, date: p.date }));

    // Smooth the line with a simple cardinal-style curve.
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i += 1) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const areaPath = `${path} L ${coords[coords.length - 1].x} ${padTop + chartH} L ${coords[0].x} ${padTop + chartH} Z`;

    return {
      coords,
      path,
      areaPath,
      min,
      max,
      chartH,
      targetY: targetValue != null ? y(targetValue) : null,
    };
  }, [points, width, height, targetValue, padLeft]);

  if (!geometry) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Txt variant="small" color={theme.textTertiary}>
          No data yet
        </Txt>
      </View>
    );
  }

  const { coords, path, areaPath, min, max, targetY } = geometry;
  const gradientId = `area-${accent.replace('#', '')}`;

  // Show at most five date labels so they never overlap.
  const labelStep = Math.max(1, Math.ceil(points.length / 5));

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity="0.32" />
          <Stop offset="1" stopColor={accent} stopOpacity="0.01" />
        </SvgGradient>
      </Defs>

      {/* horizontal grid */}
      {[0, 0.5, 1].map((ratio) => {
        const gy = padTop + ratio * (height - padTop - padBottom);
        return (
          <Line
            key={ratio}
            x1={padLeft}
            y1={gy}
            x2={width - padRight}
            y2={gy}
            stroke={theme.divider}
            strokeWidth={1}
          />
        );
      })}

      {yAxisLabels &&
        [0, 0.5, 1].map((ratio) => {
          const gy = padTop + ratio * (height - padTop - padBottom);
          const value = max - ratio * (max - min);
          return (
            <SvgText
              key={`y-${ratio}`}
              x={padLeft - 6}
              y={gy + 3.5}
              fill={theme.textTertiary}
              fontSize="9.5"
              fontWeight="600"
              textAnchor="end"
            >
              {value.toFixed(value >= 100 ? 0 : 1)}
            </SvgText>
          );
        })}

      {targetY != null && (
        <Line
          x1={padLeft}
          y1={targetY}
          x2={width - padRight}
          y2={targetY}
          stroke={theme.streak}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      )}

      {showArea && <Path d={areaPath} fill={`url(#${gradientId})`} />}

      <Path d={path} stroke={accent} strokeWidth={2.75} fill="none" strokeLinecap="round" />

      {showDots &&
        coords.map((c, i) => {
          const isLast = i === coords.length - 1;
          if (!isLast && coords.length > 14 && i % 2 !== 0) return null;
          return (
            <Circle
              key={`dot-${i}`}
              cx={c.x}
              cy={c.y}
              r={isLast ? 5 : 3}
              fill={isLast ? accent : theme.background}
              stroke={accent}
              strokeWidth={isLast ? 2.5 : 2}
            />
          );
        })}

      {points.map((p, i) => {
        if (i % labelStep !== 0 && i !== points.length - 1) return null;
        return (
          <SvgText
            key={`x-${i}`}
            x={coords[i].x}
            y={height - 7}
            fill={theme.textTertiary}
            fontSize="9.5"
            fontWeight="600"
            textAnchor="middle"
          >
            {p.date.slice(5).replace('-', '/')}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// -------------------------------------------------------------- donut chart

export function DonutChart({
  segments,
  size = 150,
  strokeWidth = 22,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const { theme } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let offset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.surfaceMuted}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((segment, index) => {
            const portion = segment.value / total;
            const dash = portion * circumference;
            // A tiny gap between segments keeps adjacent colours readable.
            const gap = segments.length > 1 ? 2 : 0;
            const element = (
              <Circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${Math.max(0, dash - gap)} ${circumference}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                fill="none"
              />
            );
            offset += dash;
            return element;
          })}
        </G>
      </Svg>

      <View style={{ alignItems: 'center' }}>
        {centerValue && <Txt variant="h2">{centerValue}</Txt>}
        {centerLabel && (
          <Txt variant="caption" color={theme.textTertiary}>
            {centerLabel}
          </Txt>
        )}
      </View>
    </View>
  );
}

// ------------------------------------------------------------- sparkline

export function Sparkline({
  values,
  width = 70,
  height = 26,
  color,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const { theme } = useTheme();
  const accent = color || theme.primary;

  if (values.length < 2) {
    return <View style={{ width, height }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const path = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Path d={path} stroke={accent} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// ------------------------------------------------------- segmented legend

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; value?: string }[];
}) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 4.5,
              backgroundColor: item.color,
              marginRight: spacing.sm,
            }}
          />
          <Txt variant="small" color={theme.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
            {item.label}
          </Txt>
          {item.value && (
            <Txt variant="small" color={theme.text} style={{ fontWeight: '700' }}>
              {item.value}
            </Txt>
          )}
        </View>
      ))}
    </View>
  );
}
