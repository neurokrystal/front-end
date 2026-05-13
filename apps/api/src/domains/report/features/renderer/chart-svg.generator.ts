// domains/report/features/renderer/chart-svg.generator.ts

export interface ChartData {
  labels: string[];
  values: number[];
}

export interface ChartOptions {
  width?: number;
  height?: number;
  colors?: string[];
  max?: number;
}

export interface IChartSvgGenerator {
  renderRadar(data: ChartData, options: ChartOptions): string;
  renderBar(data: ChartData, options: ChartOptions): string;
  renderHorizontalBar(data: ChartData, options: ChartOptions): string;
  renderGauge(value: number, max: number, options: ChartOptions): string;
}

export class ChartSvgGenerator implements IChartSvgGenerator {
  renderRadar(data: ChartData, options: ChartOptions): string {
    const { width = 400, height = 400, colors = ['#4A90D9'], max = 5 } = options;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    const angleStep = (Math.PI * 2) / data.labels.length;

    // Background polygons
    let backgroundPolygons = '';
    for (let i = 1; i <= 5; i++) {
      const r = (radius / 5) * i;
      const points = data.labels.map((_, idx) => {
        const x = centerX + r * Math.sin(idx * angleStep);
        const y = centerY - r * Math.cos(idx * angleStep);
        return `${x},${y}`;
      }).join(' ');
      backgroundPolygons += `<polygon points="${points}" fill="none" stroke="#ddd" stroke-width="1" />`;
    }

    // Data polygon
    const dataPoints = data.values.map((v, idx) => {
      const r = (radius * (v / max));
      const x = centerX + r * Math.sin(idx * angleStep);
      const y = centerY - r * Math.cos(idx * angleStep);
      return `${x},${y}`;
    }).join(' ');

    const labels = data.labels.map((label, idx) => {
      const x = centerX + (radius + 20) * Math.sin(idx * angleStep);
      const y = centerY - (radius + 20) * Math.cos(idx * angleStep);
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-family="sans-serif">${label}</text>`;
    }).join('');

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${backgroundPolygons}
  <polygon points="${dataPoints}" fill="${colors[0]}44" stroke="${colors[0]}" stroke-width="2" />
  ${labels}
</svg>`;
  }

  renderBar(data: ChartData, options: ChartOptions): string {
    const { width = 400, height = 200, colors = ['#4A90D9'], max = 5 } = options;
    const barWidth = (width - 40) / data.labels.length;
    
    const bars = data.values.map((v, idx) => {
      const barHeight = (v / max) * (height - 40);
      const x = 20 + idx * barWidth + 5;
      const y = height - 20 - barHeight;
      return `<rect x="${x}" y="${y}" width="${barWidth - 10}" height="${barHeight}" fill="${colors[idx % colors.length]}" />`;
    }).join('');

    const labels = data.labels.map((label, idx) => {
      const x = 20 + idx * barWidth + (barWidth / 2);
      return `<text x="${x}" y="${height - 5}" text-anchor="middle" font-size="10" font-family="sans-serif">${label}</text>`;
    }).join('');

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <line x1="20" y1="${height - 20}" x2="${width - 20}" y2="${height - 20}" stroke="#000" />
  ${bars}
  ${labels}
</svg>`;
  }

  renderHorizontalBar(data: ChartData, options: ChartOptions): string {
    const { width = 400, height = 200, colors = ['#4A90D9'], max = 5 } = options;
    const barHeight = (height - 40) / data.labels.length;
    
    const bars = data.values.map((v, idx) => {
      const barWidth = (v / max) * (width - 100);
      const y = 20 + idx * barHeight + 5;
      return `<rect x="80" y="${y}" width="${barWidth}" height="${barHeight - 10}" fill="${colors[idx % colors.length]}" />`;
    }).join('');

    const labels = data.labels.map((label, idx) => {
      const y = 20 + idx * barHeight + (barHeight / 2);
      return `<text x="75" y="${y}" text-anchor="end" font-size="10" font-family="sans-serif" alignment-baseline="middle">${label}</text>`;
    }).join('');

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <line x1="80" y1="20" x2="80" y2="${height - 20}" stroke="#000" />
  ${bars}
  ${labels}
</svg>`;
  }

  renderGauge(value: number, max: number, options: ChartOptions): string {
    const { width = 200, height = 120, colors = ['#4A90D9'] } = options;
    const centerX = width / 2;
    const centerY = height - 20;
    const radius = 80;
    const angle = (value / max) * Math.PI - Math.PI;
    
    const arcX = centerX + radius * Math.cos(angle);
    const arcY = centerY + radius * Math.sin(angle);
    
    const largeArc = value / max > 0.5 ? 1 : 0;

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <path d="M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}" fill="none" stroke="#eee" stroke-width="20" />
  <path d="M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 ${largeArc} 1 ${arcX} ${arcY}" fill="none" stroke="${colors[0]}" stroke-width="20" />
  <text x="${centerX}" y="${centerY - 10}" text-anchor="middle" font-size="24" font-weight="bold" font-family="sans-serif">${value}</text>
</svg>`;
  }
}
