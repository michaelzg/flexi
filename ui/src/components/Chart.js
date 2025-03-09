import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-moment';
import moment from 'moment';
import { generateDayBackgrounds, externalTooltipHandler } from '../utils/chartUtils';

// Register Chart.js plugins
ChartJS.register(...registerables, ChartDataLabels, annotationPlugin);

const Chart = ({ timestamps, prices, isLoading }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const tooltipRef = useRef(null);
  
  useEffect(() => {
    // Only create chart if we have data and not loading
    if (timestamps && prices && timestamps.length > 0 && !isLoading) {
      createChart();
    }
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [timestamps, prices, isLoading]);

  const createChart = () => {
    // Get current time for highlighting
    const currentTime = new Date().toISOString();
    
    // Generate day background annotations
    const dayBackgrounds = generateDayBackgrounds(timestamps);
    
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create the chart
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: timestamps,
        datasets: [{
          label: 'Price (¢/kWh)',
          data: prices,
          backgroundColor: function(context) {
            const index = context.dataIndex;
            const value = context.dataset.data[index];
            return value < 0 ? 'rgba(181, 224, 181, 0.7)' : 'rgba(179, 205, 224, 0.7)';
          },
          borderColor: function(context) {
            const index = context.dataIndex;
            const value = context.dataset.data[index];
            return value < 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(106, 90, 205, 1)';
          },
          borderWidth: 1,
          barPercentage: 0.98,
          categoryPercentage: 0.98,
          hoverBackgroundColor: function(context) {
            const index = context.dataIndex;
            const value = context.dataset.data[index];
            return value < 0 ? 'rgba(181, 224, 181, 0.9)' : 'rgba(179, 205, 224, 0.9)';
          },
          hoverBorderColor: function(context) {
            const index = context.dataIndex;
            const value = context.dataset.data[index];
            return value < 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(106, 90, 205, 1)';
          },
          hoverBorderWidth: 2
        }]
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
                // Always include the date in the x-axis labels
                return date.format('MMM D, hA');
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Price (¢/kWh)',
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
              },
              callback: function(value) {
                // Convert from dollars to cents
                return (value * 100).toFixed(2) + '¢';
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
            text: 'Electricity Pricing Data',
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
            external: externalTooltipHandler(tooltipRef.current, false)
          },
          annotation: {
            annotations: {
              currentTime: {
                type: 'line',
                xMin: new Date().toISOString(),
                xMax: new Date().toISOString(),
                borderColor: 'rgba(244, 67, 54, 0.8)',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  display: true,
                  content: 'Current Time',
                  position: 'top',
                  backgroundColor: 'rgba(244, 67, 54, 0.8)',
                  font: {
                    family: "'Poppins', sans-serif",
                    size: 12,
                    weight: 'bold'
                  },
                  padding: 6
                }
              },
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
          mode: 'nearest',
          intersect: true
        }
      }
    });
  };

  return (
    <div className="graph-container">
      <canvas ref={chartRef}></canvas>
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color legend-positive"></div>
          <span>Positive Prices</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-negative"></div>
          <span>Negative Prices</span>
        </div>
        <div className="legend-item">
          <div className="legend-current"></div>
          <span>Current Time</span>
        </div>
      </div>
      <div id="chart-tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default Chart;
