import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ConsultationMessage, UserProfile } from '../types';
import {
  extractHealthMetricsTimeline,
  HealthDataPoint,
  METRIC_SERIES_CONFIGS,
  MetricCategory,
} from '../utils/metricExtractor';
import {
  Activity,
  Heart,
  Droplets,
  Scale,
  ShieldAlert,
  Calendar,
  ChevronRight,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from 'lucide-react';

interface ClinicalHealthTrendChartProps {
  messages: ConsultationMessage[];
  currentProfile: UserProfile;
}

export const ClinicalHealthTrendChart: React.FC<ClinicalHealthTrendChartProps> = ({
  messages,
  currentProfile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState<MetricCategory>('cardio');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'systolicBP',
    'diastolicBP',
    'heartRate',
  ]);
  const [hoveredPoint, setHoveredPoint] = useState<HealthDataPoint | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(680);

  // Extract timeline points
  const timelineData = useMemo(() => {
    return extractHealthMetricsTimeline(messages, currentProfile);
  }, [messages, currentProfile]);

  // Adjust active metrics when category changes
  const handleCategoryChange = (cat: MetricCategory) => {
    setActiveCategory(cat);
    switch (cat) {
      case 'cardio':
        setSelectedMetrics(['systolicBP', 'diastolicBP', 'heartRate']);
        break;
      case 'metabolic':
        setSelectedMetrics(['bloodGlucose']);
        break;
      case 'lifestyle':
        setSelectedMetrics(['weightKg', 'sleepHours']);
        break;
      case 'triage':
        setSelectedMetrics(['symptomSeverity', 'triageScore']);
        break;
      case 'all':
        setSelectedMetrics(['systolicBP', 'bloodGlucose', 'weightKg', 'symptomSeverity']);
        break;
    }
  };

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(key)
        ? prev.length > 1
          ? prev.filter((k) => k !== key)
          : prev
        : [...prev, key]
    );
  };

  // ResizeObserver for responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Main D3 Rendering Logic
  useEffect(() => {
    if (!svgRef.current || timelineData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 24, right: 36, bottom: 44, left: 48 };
    const width = Math.max(320, containerWidth);
    const height = 280;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Create main drawing group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale (Time)
    const xExtent = d3.extent(timelineData, (d) => d.date) as [Date, Date];
    // Pad slightly if start and end are equal
    if (xExtent[0] && xExtent[1] && xExtent[0].getTime() === xExtent[1].getTime()) {
      xExtent[0] = new Date(xExtent[0].getTime() - 86400000);
      xExtent[1] = new Date(xExtent[1].getTime() + 86400000);
    }

    const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);

    // Determine Y range across all selected metrics
    let yMin = Infinity;
    let yMax = -Infinity;

    selectedMetrics.forEach((mKey) => {
      timelineData.forEach((d) => {
        const val = d[mKey as keyof HealthDataPoint];
        if (typeof val === 'number') {
          if (val < yMin) yMin = val;
          if (val > yMax) yMax = val;
        }
      });
      // also consider normal ranges
      const conf = METRIC_SERIES_CONFIGS[mKey];
      if (conf) {
        if (conf.normalRange[0] < yMin) yMin = conf.normalRange[0];
        if (conf.normalRange[1] > yMax) yMax = conf.normalRange[1];
      }
    });

    if (yMin === Infinity || yMax === -Infinity) {
      yMin = 0;
      yMax = 150;
    }

    // Add padding to Y scale
    const yPadding = (yMax - yMin) * 0.15 || 10;
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .attr('stroke-opacity', 0.1)
      .selectAll('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-dasharray', '3,3');

    // Normal Range Reference Shading for primary metric if single category
    if (selectedMetrics.length === 1 || activeCategory === 'metabolic') {
      const primaryConf = METRIC_SERIES_CONFIGS[selectedMetrics[0]];
      if (primaryConf && primaryConf.normalRange) {
        const [low, high] = primaryConf.normalRange;
        const topY = yScale(Math.min(yScale.domain()[1], high));
        const bottomY = yScale(Math.max(yScale.domain()[0], low));
        const bandHeight = Math.max(0, bottomY - topY);

        g.append('rect')
          .attr('x', 0)
          .attr('y', topY)
          .attr('width', innerWidth)
          .attr('height', bandHeight)
          .attr('fill', '#10b981')
          .attr('fill-opacity', 0.08)
          .attr('rx', 4);

        g.append('text')
          .attr('x', innerWidth - 6)
          .attr('y', topY + 12)
          .attr('text-anchor', 'end')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('fill', '#059669')
          .attr('opacity', 0.8)
          .text(`Clinical Normal Range: ${low}–${high} ${primaryConf.unit}`);
      }
    }

    // Draw X Axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(6, timelineData.length + 1))
      .tickFormat((d) => d3.timeFormat('%b %d')(d as Date));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr('color', '#94a3b8')
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('dy', '1.2em');

    // Draw Y Axis
    const yAxis = d3.axisLeft(yScale).ticks(5);
    g.append('g')
      .call(yAxis)
      .attr('color', '#94a3b8')
      .selectAll('text')
      .attr('font-size', '11px');

    // Gradient definitions for area fills
    const defs = svg.append('defs');

    selectedMetrics.forEach((mKey) => {
      const conf = METRIC_SERIES_CONFIGS[mKey];
      if (!conf) return;

      const gradId = `grad-${mKey}`;
      const grad = defs
        .append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      grad.append('stop').attr('offset', '0%').attr('stop-color', conf.color).attr('stop-opacity', 0.25);
      grad.append('stop').attr('offset', '100%').attr('stop-color', conf.color).attr('stop-opacity', 0.0);

      // Area generator
      const area = d3
        .area<HealthDataPoint>()
        .defined((d) => typeof d[mKey as keyof HealthDataPoint] === 'number')
        .x((d) => xScale(d.date))
        .y0(innerHeight)
        .y1((d) => yScale(d[mKey as keyof HealthDataPoint] as number))
        .curve(d3.curveMonotoneX);

      // Line generator
      const line = d3
        .line<HealthDataPoint>()
        .defined((d) => typeof d[mKey as keyof HealthDataPoint] === 'number')
        .x((d) => xScale(d.date))
        .y((d) => yScale(d[mKey as keyof HealthDataPoint] as number))
        .curve(d3.curveMonotoneX);

      // Render Area Fill
      g.append('path')
        .datum(timelineData)
        .attr('fill', `url(#${gradId})`)
        .attr('d', area);

      // Render Stroke Line
      const path = g
        .append('path')
        .datum(timelineData)
        .attr('fill', 'none')
        .attr('stroke', conf.color)
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', line);

      // Animate line draw on render
      const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 1000;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Data point dots
      g.selectAll(`.dot-${mKey}`)
        .data(timelineData.filter((d) => typeof d[mKey as keyof HealthDataPoint] === 'number'))
        .enter()
        .append('circle')
        .attr('class', `dot-${mKey}`)
        .attr('cx', (d) => xScale(d.date))
        .attr('cy', (d) => yScale(d[mKey as keyof HealthDataPoint] as number))
        .attr('r', 4.5)
        .attr('fill', '#ffffff')
        .attr('stroke', conf.color)
        .attr('stroke-width', 2.5)
        .style('cursor', 'pointer');
    });

    // Crosshair vertical line
    const focusLine = g
      .append('line')
      .attr('stroke', '#64748b')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .style('opacity', 0)
      .style('pointer-events', 'none');

    // Overlay rect for mouse hover tracking
    const bisect = d3.bisector<HealthDataPoint, Date>((d) => d.date).center;

    g.append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event);
        const xDate = xScale.invert(mx);
        const index = bisect(timelineData, xDate);
        const point = timelineData[index] || timelineData[0];

        if (point) {
          setHoveredPoint(point);
          const px = xScale(point.date);
          focusLine.attr('x1', px).attr('x2', px).style('opacity', 0.8);
        }
      })
      .on('mouseleave', function () {
        setHoveredPoint(null);
        focusLine.style('opacity', 0);
      });
  }, [timelineData, selectedMetrics, containerWidth, activeCategory]);

  // Compute stat summary for primary selected metric
  const primaryKey = selectedMetrics[0] || 'systolicBP';
  const primaryConfig = METRIC_SERIES_CONFIGS[primaryKey] || METRIC_SERIES_CONFIGS.systolicBP;

  const validValues = timelineData
    .map((d) => d[primaryKey as keyof HealthDataPoint])
    .filter((v): v is number => typeof v === 'number');

  const latestVal = validValues[validValues.length - 1] ?? 0;
  const initialVal = validValues[0] ?? latestVal;
  const minVal = validValues.length ? Math.min(...validValues) : 0;
  const maxVal = validValues.length ? Math.max(...validValues) : 0;
  const delta = latestVal - initialVal;

  const isImproving =
    primaryKey === 'systolicBP' || primaryKey === 'bloodGlucose' || primaryKey === 'symptomSeverity'
      ? delta < 0
      : primaryKey === 'sleepHours'
      ? delta > 0
      : Math.abs(delta) < 1;

  return (
    <div
      id="clinical-health-trend-section"
      className="p-4 sm:p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-teal-100/90 dark:border-slate-700/80 shadow-xs space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-teal-50 dark:border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 font-display">
                Biometric &amp; Clinical Health Trajectory
              </h3>
              <span className="px-2 py-0.5 bg-teal-100/70 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 text-[10px] font-extrabold rounded-md border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                D3 Interactive
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Longitudinal analysis compiled from consultation logs &amp; patient baseline
            </p>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold print:hidden">
          <button
            type="button"
            onClick={() => handleCategoryChange('cardio')}
            className={`px-2.5 py-1.2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'cardio'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Cardio (BP/HR)</span>
          </button>
          <button
            type="button"
            onClick={() => handleCategoryChange('metabolic')}
            className={`px-2.5 py-1.2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'metabolic'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Glucose &amp; Labs</span>
          </button>
          <button
            type="button"
            onClick={() => handleCategoryChange('lifestyle')}
            className={`px-2.5 py-1.2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'lifestyle'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Weight &amp; Sleep</span>
          </button>
          <button
            type="button"
            onClick={() => handleCategoryChange('triage')}
            className={`px-2.5 py-1.2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'triage'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Symptom Intensity</span>
          </button>
        </div>
      </div>

      {/* Metric Quick Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-teal-50/50 dark:bg-slate-900/60 rounded-xl border border-teal-100/80 dark:border-slate-700">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Latest {primaryConfig.label}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-display">
              {primaryConfig.formatter ? primaryConfig.formatter(latestVal) : latestVal}
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Baseline Intake
          </span>
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-display mt-0.5">
            {primaryConfig.formatter ? primaryConfig.formatter(initialVal) : initialVal}
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Observed Min / Max
          </span>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
            {minVal} – {maxVal} <span className="text-xs font-normal text-slate-500">{primaryConfig.unit}</span>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Trajectory Status
          </span>
          <div className="flex items-center gap-1 mt-1">
            {delta === 0 ? (
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Minus className="w-3.5 h-3.5 text-slate-400" /> Stable Baseline
              </span>
            ) : isImproving ? (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Improving ({Math.abs(delta).toFixed(1)})
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Elevated ({Math.abs(delta).toFixed(1)})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Series Toggle Chips */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Series:</span>
        {Object.entries(METRIC_SERIES_CONFIGS)
          .filter(([_, conf]) => activeCategory === 'all' || conf.category === activeCategory)
          .map(([key, conf]) => {
            const isSelected = selectedMetrics.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleMetric(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                    : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: conf.color }}
                />
                <span>{conf.label}</span>
              </button>
            );
          })}
      </div>

      {/* D3 SVG Container */}
      <div
        ref={containerRef}
        className="w-full bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-2 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden"
      >
        <svg ref={svgRef} className="w-full text-slate-600 dark:text-slate-400 select-none overflow-visible" />

        {/* Floating Tooltip Callout */}
        {hoveredPoint && (
          <div
            ref={tooltipRef}
            className="absolute top-3 right-3 p-2.5 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-white rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 pointer-events-none z-10 min-w-44 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="font-bold text-teal-300 font-display flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {hoveredPoint.dateStr}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">#{hoveredPoint.sessionIndex}</span>
            </div>

            <div className="space-y-0.5">
              {selectedMetrics.map((mKey) => {
                const conf = METRIC_SERIES_CONFIGS[mKey];
                const val = hoveredPoint[mKey as keyof HealthDataPoint];
                if (typeof val !== 'number') return null;

                return (
                  <div key={mKey} className="flex items-center justify-between gap-3">
                    <span className="text-slate-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: conf.color }} />
                      {conf.label}:
                    </span>
                    <strong className="text-white font-mono">
                      {conf.formatter ? conf.formatter(val) : val}
                    </strong>
                  </div>
                );
              })}
            </div>

            {hoveredPoint.notes && (
              <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800 line-clamp-1">
                {hoveredPoint.notes}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Hover over data points to inspect session-specific values and contextual consultation notes.
        </span>
        <span className="font-mono text-[10px] hidden sm:inline">
          {timelineData.length} Session Data Points Logged
        </span>
      </div>
    </div>
  );
};
