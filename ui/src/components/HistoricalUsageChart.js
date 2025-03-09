import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-moment';
import moment from 'moment';
import { generateDayBackgrounds, externalTooltipHandler } from '../utils/chartUtils';

// Register Chart.js plugins
ChartJS.register(...registerables, ChartDataLabels, annotationPlugin);

const HistoricalUsageChart = ({ usageData, timestamps, isLoading }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const tooltipRef = useRef(null);
  const [displayMode, setDisplayMode] = useState('usage'); // 'usage' or 'cost'
  
  useEffect(() => {
    // Only create chart if we have data and not loading
    if (usageData && usageData.length > 0 && timestamps && timestamps.length > 0 && !isLoading) {
      createChart();
    }
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [usageData, timestamps, isLoading]);

  useEffect(() => {
    if (usageData && usageData.length > 0 && timestamps && timestamps.length > 0 && !isLoading) {
      createChart();
    }
  }, [displayMode, usageData, timestamps, isLoading]);

  const createChart = () => {
    // Adjust timestamps to be exactly 1 year in the past
    const adjustedTimestamps = timestamps.map(ts => {
      const date = moment(ts);
      return date.subtract(1, 'year').toISOString();
    });
    
    const minTimestamp = adjustedTimestamps[0];
    const maxTimestamp = adjustedTimestamps[adjustedTimestamps.length - 1];
    
    console.log("Adjusted timestamps range (1 year ago):", minTimestamp, maxTimestamp);
    console.log("Usage data:", usageData);
    
    // Filter usageData to match the same month/day/hour as the price chart, but 1 year ago
    const filteredUsageData = usageData.filter(item => {
      const itemDate = moment(item.timestamp);
      // Check if this timestamp falls within our adjusted range (1 year ago)
      return itemDate >= moment(minTimestamp) && itemDate <= moment(maxTimestamp);
    });
    
    console.log("Filtered usage data:", filteredUsageData);
    
    // Create a map of all timestamps from the price chart, but adjusted to 1 year ago
    const timestampMap = new Map();
    adjustedTimestamps.forEach(ts => {
      timestampMap.set(moment(ts).format('YYYY-MM-DDTHH'), {
        timestamp: ts,
        usage: null,
        cost: null
      });
    });
    
    // Fill in the usage and cost data where available
    filteredUsageData.forEach(item => {
      const key = moment(item.timestamp).format('YYYY-MM-DDTHH');
      if (timestampMap.has(key)) {
        timestampMap.get(key).usage = item.usage;
        timestampMap.get(key).cost = item.cost;
      }
    });
    
    // Convert the map back to arrays for the chart
    const chartData = Array.from(timestampMap.values());
    const chartTimestamps = chartData.map(item => item.timestamp);
    const usageValues = chartData.map(item => item.usage);
    const costValues = chartData.map(item => item.cost);
    
    // Generate day background annotations
    const dayBackgrounds = generateDayBackgrounds(chartTimestamps);
    
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create the chart
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: adjustedTimestamps,
        datasets: displayMode === 'usage' ? [
          {
            label: 'Usage (kWh)',
            data: usageValues,
            backgroundColor: 'rgba(205, 180, 219, 0.7)', // Pastel purple
            borderColor: 'rgba(186, 156, 214, 1)',
            borderWidth: 1,
            barPercentage: 0.98,
            categoryPercentage: 0.98
          }
        ] : [
          {
            label: 'Cost ($)',
            data: costValues,
            backgroundColor: 'rgba(255, 200, 150, 0.7)', // Pastel orange
            borderColor: 'rgba(255, 170, 120, 1)',
            borderWidth: 1,
            barPercentage: 0.98,
            categoryPercentage: 0.98
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 20,
            right: 20,
            bottom: 30,
            left: 10
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'hour',
              displayFormats: {
                hour: 'hA' // e.g., "12AM"
              },
              tooltipFormat: 'MMM D, hA'
            },
            title: {
              display: true,
              text: 'Time',
              font: {
                family: "'Inter', sans-serif",
                size: 14,
                weight: 'bold'
              }
            },
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              maxRotation: 45,
              minRotation: 45,
              callback: function(value, index, values) {
                const date = moment(value);
                return date.format('MMM D, hA');
              }
            }
          },
          y: {
            title: {
              display: true,
              text: displayMode === 'usage' ? 'Usage (kWh)' : 'Cost ($)',
              font: {
                family: "'Inter', sans-serif",
                size: 14,
                weight: 'bold'
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: {
                family: "'Inter', sans-serif",
                size: 12
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: displayMode === 'usage' 
              ? 'Historical Electricity Usage (kWh) - 1 Year Ago' 
              : 'Historical Electricity Cost ($) - 1 Year Ago',
            font: {
              family: "'Poppins', sans-serif",
              size: 18,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          tooltip: {
            enabled: false,
            external: externalTooltipHandler(tooltipRef.current, true)
          },
          annotation: {
            annotations: {
              ...dayBackgrounds
            }
          },
          datalabels: {
            display: false // Disable data labels
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        hover: {
          mode: 'index',
          intersect: false
        }
      }
    });
  };

  return (
    <div className="graph-container historical-usage-chart">
      <div className="chart-controls">
        <button 
          className={`display-mode-button ${displayMode === 'usage' ? 'active' : ''}`} 
          onClick={() => setDisplayMode('usage')}
        >
          Show Usage (kWh)
        </button>
        <button 
          className={`display-mode-button ${displayMode === 'cost' ? 'active' : ''}`} 
          onClick={() => setDisplayMode('cost')}
        >
          Show Cost ($)
        </button>
      </div>
      <canvas ref={chartRef}></canvas>
      <div className="chart-legend">
        {displayMode === 'usage' ? (
          <div className="legend-item">
            <div className="legend-color legend-usage"></div>
            <span>Usage (kWh)</span>
          </div>
        ) : (
          <div className="legend-item">
            <div className="legend-color legend-cost"></div>
            <span>Cost ($)</span>
          </div>
        )}
      </div>
      <div id="historical-chart-tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default HistoricalUsageChart;
