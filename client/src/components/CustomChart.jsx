import React, { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useTheme } from '../hooks/useTheme';
import { Camera, Maximize2, X } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CustomChart = ({ type = 'line', data, options = {}, height }) => {
  const { activeTheme } = useTheme();
  const chartRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Setup default premium configuration
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: type === 'doughnut',
        position: 'bottom',
        labels: {
          color: '#E2E8F0',
          font: { family: 'Outfit', size: 12 },
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: '#1E293B',
        titleColor: '#F8FAFC',
        bodyColor: '#E2E8F0',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += typeof context.parsed.y === 'number' 
                ? 'INR ' + context.parsed.y.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : context.parsed.y;
            } else if (context.parsed !== null) {
              label += 'INR ' + context.parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
            }
            return label;
          }
        }
      }
    },
    scales: type !== 'doughnut' ? {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.03)',
          borderColor: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#94A3B8',
          font: { family: 'Inter', size: 11 }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
          borderColor: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#94A3B8',
          font: { family: 'Inter', size: 11 },
          callback: function(value) {
            if (value >= 1000) {
              return (value / 1000) + 'k';
            }
            return value;
          }
        }
      }
    } : undefined
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins,
      legend: {
        ...defaultOptions.plugins.legend,
        ...(options.plugins?.legend || {})
      },
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        ...(options.plugins?.tooltip || {})
      }
    },
    scales: type !== 'doughnut' ? {
      x: {
        ...defaultOptions.scales.x,
        ...(options.scales?.x || {})
      },
      y: {
        ...defaultOptions.scales.y,
        ...(options.scales?.y || {})
      }
    } : undefined
  };

  // Build chart dataset with custom accent gradient
  const buildChartData = () => {
    if (!data) return { labels: [], datasets: [] };

    // Deep copy data to prevent prop modification warnings
    const chartData = JSON.parse(JSON.stringify(data));

    if (type === 'line' || type === 'area') {
      chartData.datasets = chartData.datasets.map(dataset => {
        return {
          ...dataset,
          borderColor: activeTheme.color,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) {
              return 'transparent';
            }
            // Create vertical fading gradient
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, activeTheme.glow);
            gradient.addColorStop(1, 'transparent');
            return gradient;
          },
          borderWidth: 2,
          pointBackgroundColor: activeTheme.color,
          pointBorderColor: '#0B0F19',
          pointBorderWidth: 1.5,
          pointHoverRadius: 6,
          pointRadius: 3,
          fill: type === 'area',
          tension: 0.3
        };
      });
    } else if (type === 'bar') {
      chartData.datasets = chartData.datasets.map(dataset => {
        return {
          ...dataset,
          backgroundColor: activeTheme.color,
          borderColor: activeTheme.color,
          borderWidth: 1,
          borderRadius: 4
        };
      });
    } else if (type === 'doughnut') {
      const colors = ['#F59E0B', '#94A3B8', '#CBD5E1', '#F97316', '#10B981', '#6366F1'];
      chartData.datasets = chartData.datasets.map(dataset => {
        return {
          ...dataset,
          backgroundColor: dataset.backgroundColor || colors.slice(0, dataset.data.length),
          borderColor: '#0B0F19',
          borderWidth: 2,
          hoverOffset: 4
        };
      });
    }

    return chartData;
  };

  const handleExport = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const base64Url = chart.toBase64Image();
    const link = document.createElement('a');
    link.href = base64Url;
    link.download = `BullionVault_Chart_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  };

  const renderChartElement = () => {
    if (type === 'line' || type === 'area') {
      return <Line ref={chartRef} data={buildChartData()} options={mergedOptions} />;
    } else if (type === 'bar') {
      return <Bar ref={chartRef} data={buildChartData()} options={mergedOptions} />;
    } else {
      return <Doughnut ref={chartRef} data={buildChartData()} options={mergedOptions} />;
    }
  };

  return (
    <div className="relative group/chart" style={{ height: height || '100%' }}>
      {/* Chart Controls toolbar overlay */}
      <div className="absolute top-2 right-2 flex space-x-1.5 opacity-0 group-hover/chart:opacity-100 transition-opacity duration-300 z-20">
        <button
          onClick={handleExport}
          title="Export Chart Image"
          className="p-1.5 bg-[#1E293B]/80 hover:bg-[#1E293B] border border-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          <Camera size={13} />
        </button>
        <button
          onClick={() => setIsFullscreen(true)}
          title="Maximize Screen"
          className="p-1.5 bg-[#1E293B]/80 hover:bg-[#1E293B] border border-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {renderChartElement()}

      {/* Fullscreen Overlay portal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-[#0B0F19]/95 z-[999] flex flex-col p-10 space-y-6 animate-fade-in">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-black text-white">Advanced Chart View</h3>
              <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">BullionVault Platform Live Metrics Feed</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 border border-white/10 hover:border-accent/40 bg-white/5 text-gray-300 hover:text-white rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Camera size={14} />
                <span>Export Image</span>
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 border border-white/10 hover:border-accent bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 w-full relative min-h-[300px]">
            {type === 'line' || type === 'area' ? (
              <Line data={buildChartData()} options={mergedOptions} />
            ) : type === 'bar' ? (
              <Bar data={buildChartData()} options={mergedOptions} />
            ) : (
              <Doughnut data={buildChartData()} options={mergedOptions} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomChart;
