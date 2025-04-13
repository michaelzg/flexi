import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-moment';
import moment from 'moment';
import { generateDayBackgrounds, externalTooltipHandler } from '../utils/chartUtils';

// Register Chart.js plugins
ChartJS.register(...registerables, ChartDataLabels, annotationPlugin);

const BaselineUsageChart = ({ historicalUsageData, timestamps, isLoading, onBarSelect, selectedTimestamp }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const tooltipRef = useRef(null);
  
  useEffect(() => {
    // Only create chart if we have data and not loading
    if (timestamps && timestamps.length > 0 && !isLoading) {
      createChart();
    }
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [historicalUsageData, timestamps, isLoading, selectedTimestamp]);

  const calculateBaselineUsage = () => {
    // If no historical data, return empty arrays
    if (!historicalUsageData || historicalUsageData.length === 0) {
      return {
        chartTimestamps: timestamps,
        baselineValues: Array(timestamps.length).fill(null)
      };
    }

    // Create a map to store weekday and weekend hourly averages
    const hourlyAverages = {
      weekday: Array(24).fill({ sum: 0, count: 0 }),
      weekend: Array(24).fill({ sum: 0, count: 0 })
    };

    // Calculate the sum and count for each hour, separated by weekday/weekend
    historicalUsageData.forEach(item => {
      const date = moment(item.timestamp);
      const hour = date.hour();
      const isWeekend = date.day() === 0 || date.day() === 6; // 0 = Sunday, 6 = Saturday
      const dayType = isWeekend ? 'weekend' : 'weekday';
      
      // Initialize if needed (to avoid issues with the spread operator on undefined)
      if (!hourlyAverages[dayType][hour]) {
        hourlyAverages[dayType][hour] = { sum: 0, count: 0 };
      }
      
      // Update sum and count
      hourlyAverages[dayType][hour] = {
        sum: hourlyAverages[dayType][hour].sum + item.usage,
        count: hourlyAverages[dayType][hour].count + 1
      };
    });

    // Calculate averages for each hour
    const hourlyBaselineRates = {
      weekday: hourlyAverages.weekday.map(data => data.count > 0 ? data.sum / data.count : null),
      weekend: hourlyAverages.weekend.map(data => data.count > 0 ? data.sum / data.count : null)
    };

    // Map the baseline rates to the timestamps in the chart
    const baselineValues = timestamps.map(timestamp => {
      const date = moment(timestamp);
      const hour = date.hour();
      const isWeekend = date.day() === 0 || date.day() === 6;
      const dayType = isWeekend ? 'weekend' : 'weekday';
      
      return hourlyBaselineRates[dayType][hour] || null;
    });

    return {
      chartTimestamps: timestamps,
      baselineValues
    };
  };

  const createChart = () => {
    // Calculate baseline usage from historical data
    const { chartTimestamps, baselineValues } = calculateBaselineUsage();
    
    // Check if we have any baseline values
    const hasBaselineData = baselineValues.some(value => value !== null);
    
    // Generate day background annotations
    const dayBackgrounds = generateDayBackgrounds(chartTimestamps);
    
    // Create a selection highlight annotation if a timestamp is selected
    let selectionHighlight = {};
    if (selectedTimestamp) {
      // Find the index of the selected timestamp
      const selectedIndex = chartTimestamps.findIndex(ts => 
        new Date(ts).getTime() === new Date(selectedTimestamp).getTime()
      );
      
      if (selectedIndex !== -1) {
        // Calculate the width of a single bar (approximate)
        const barWidth = chartTimestamps.length > 1 
          ? (new Date(chartTimestamps[1]).getTime() - new Date(chartTimestamps[0]).getTime()) 
          : 3600000; // Default to 1 hour in milliseconds
          
        // Create a box annotation for the selected bar
        selectionHighlight = {
          selectionBox: {
            type: 'box',
            xMin: new Date(chartTimestamps[selectedIndex]).getTime() - (barWidth * 0.4),
            xMax: new Date(chartTimestamps[selectedIndex]).getTime() + (barWidth * 0.4),
            yMin: 'min',
            yMax: 'max',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 0.6)',
            borderWidth: 1,
            drawTime: 'beforeDatasetsDraw'
          }
        };
      }
    }
    
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create the chart
    const ctx = chartRef.current.getContext('2d');
    
    // If we don't have historical data, show a greyed out chart with a message
    if (!hasBaselineData) {
      // Draw a greyed out chart with a message
      chartInstance.current = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: chartTimestamps,
          datasets: [{
            label: 'Baseline Usage Rate (kWh)',
            data: Array(chartTimestamps.length).fill(0), // Empty data
            backgroundColor: 'rgba(200, 200, 200, 0.3)', // Light grey
            borderColor: 'rgba(200, 200, 200, 0.5)',
            borderWidth: 1,
            barPercentage: 0.98,
            categoryPercentage: 0.98
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
                  return date.format('MMM D, hA');
                },
                color: '#000000' // High contrast black text
              }
            },
            y: {
              title: {
                display: true,
                text: 'Usage (kWh)',
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
              text: 'Baseline Usage Rate',
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
              enabled: false
            },
            annotation: {
              annotations: {
                noDataLabel: {
                  type: 'label',
                  xValue: chartTimestamps.length > 0 ? new Date(chartTimestamps[Math.floor(chartTimestamps.length / 2)]).getTime() : new Date().getTime(),
                  yValue: 0.5,
                  backgroundColor: 'rgba(100, 100, 100, 0.8)',
                  content: 'Please upload historical usage CSV to see baseline rates',
                  font: {
                    size: 16,
                    weight: 'bold'
                  },
                  color: 'white',
                  padding: 10
                }
              }
            },
            datalabels: {
              display: false
            }
          },
          animation: {
            duration: 0 // No animation for the empty chart
          },
          events: [] // Disable all events
        }
      });
    } else {
      // Create the actual chart with data
      chartInstance.current = new ChartJS(ctx, {
        type: 'bar',
        data: {
          labels: chartTimestamps,
          datasets: [{
            label: 'Baseline Usage Rate (kWh)',
            data: baselineValues,
            backgroundColor: 'rgba(144, 238, 144, 0.7)', // Light green
            borderColor: 'rgba(50, 205, 50, 1)',
            borderWidth: 1,
            barPercentage: 0.98,
            categoryPercentage: 0.98,
            hoverBackgroundColor: 'rgba(144, 238, 144, 0.9)',
            hoverBorderColor: 'rgba(50, 205, 50, 1)',
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
          onClick: (event, elements) => {
            if (elements && elements.length > 0 && typeof onBarSelect === 'function') {
              const index = elements[0].index;
              const timestamp = chartTimestamps[index];
              const baselineUsage = baselineValues[index];
              
              // Pass the timestamp and baseline usage to the onBarSelect callback
              onBarSelect(timestamp, baselineUsage, null);
            } else if (typeof onBarSelect === 'function') {
              // Reset when clicking outside the bars
              onBarSelect(null, null, null);
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
                },
                color: '#000000' // High contrast black text
              }
            },
            y: {
              title: {
                display: true,
                text: 'Usage (kWh)',
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
              text: 'Baseline Usage Rate',
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
                ...dayBackgrounds,
                ...selectionHighlight
              }
            },
            datalabels: {
              display: false // Disable data labels for this chart
            }
          },
          animation: {
            duration: selectedTimestamp ? 0 : 1000, // Disable animation when selection changes
            easing: 'easeOutQuart'
          },
          hover: {
            mode: 'nearest',
            intersect: true
          }
        }
      });
    }
  };

  return (
    <div className="graph-container baseline-usage-chart">
      <canvas ref={chartRef}></canvas>
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color legend-baseline"></div>
          <span>Baseline Usage (kWh)</span>
        </div>
      </div>
      <div id="chart-tooltip" className="baseline-tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default BaselineUsageChart;
