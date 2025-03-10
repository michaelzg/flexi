import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-moment';
import moment from 'moment';
import { generateDayBackgrounds, externalTooltipHandler, findLowestPriceIndicesPerDay } from '../utils/chartUtils';

// Register Chart.js plugins
ChartJS.register(...registerables, ChartDataLabels, annotationPlugin);

const Chart = ({ timestamps, prices, isLoading, onBarSelect, selectedTimestamp }) => {
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
  }, [timestamps, prices, isLoading, selectedTimestamp]);

  const createChart = () => {
    // Generate day background annotations
    const dayBackgrounds = generateDayBackgrounds(timestamps);
    
    // Find the lowest price indices for each day, separated by daytime and nighttime
    const { lowestIndices, daytimeLowIndices, nighttimeLowIndices } = findLowestPriceIndicesPerDay(timestamps, prices, 2);
    
    // Create a selection highlight annotation if a timestamp is selected
    let selectionHighlight = {};
    if (selectedTimestamp) {
      // Find the index of the selected timestamp
      const selectedIndex = timestamps.findIndex(ts => 
        new Date(ts).getTime() === new Date(selectedTimestamp).getTime()
      );
      
      if (selectedIndex !== -1) {
        // Calculate the width of a single bar (approximate)
        const barWidth = timestamps.length > 1 
          ? (new Date(timestamps[1]).getTime() - new Date(timestamps[0]).getTime()) 
          : 3600000; // Default to 1 hour in milliseconds
          
        // Create a box annotation for the selected bar
        selectionHighlight = {
          selectionBox: {
            type: 'box',
            xMin: new Date(timestamps[selectedIndex]).getTime() - (barWidth * 0.4),
            xMax: new Date(timestamps[selectedIndex]).getTime() + (barWidth * 0.4),
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
            
            // Check if this is one of the lowest price hours
            if (lowestIndices.includes(index)) {
              return value < 0 ? 'rgba(121, 184, 121, 0.8)' : 'rgba(119, 155, 184, 0.8)';
            }
            
            return value < 0 ? 'rgba(181, 224, 181, 0.7)' : 'rgba(179, 205, 224, 0.7)';
          },
          borderColor: function(context) {
            const index = context.dataIndex;
            const value = context.dataset.data[index];
            
            // Check if this is one of the lowest price hours
            if (lowestIndices.includes(index)) {
              return value < 0 ? 'rgba(46, 145, 50, 1)' : 'rgba(76, 60, 175, 1)';
            }
            
            return value < 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(106, 90, 205, 1)';
          },
          borderWidth: 1,
          barPercentage: 0.98,
          categoryPercentage: 0.98,
          hoverBackgroundColor: function(context) {
            const index = context.dataIndex;
            const value = context.dataset.data[index];
            
            // Check if this is one of the lowest price hours
            if (lowestIndices.includes(index)) {
              return value < 0 ? 'rgba(121, 184, 121, 0.9)' : 'rgba(119, 155, 184, 0.9)';
            }
            
            return value < 0 ? 'rgba(181, 224, 181, 0.9)' : 'rgba(179, 205, 224, 0.9)';
          },
          hoverBorderColor: function(context) {
            const index = context.dataIndex;
            const value = context.dataset.data[index];
            
            // Check if this is one of the lowest price hours
            if (lowestIndices.includes(index)) {
              return value < 0 ? 'rgba(46, 145, 50, 1)' : 'rgba(76, 60, 175, 1)';
            }
            
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
        onClick: (event, elements) => {
          if (elements && elements.length > 0 && typeof onBarSelect === 'function') {
            const index = elements[0].index;
            const timestamp = timestamps[index];
            const price = prices[index];
            
            // Pass the timestamp and price to the onBarSelect callback
            // The App component will handle finding the corresponding usage data
            onBarSelect(timestamp, null, price);
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
                // Always include the date in the x-axis labels
                return date.format('MMM D, hA');
              },
              color: '#000000' // High contrast black text
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
            text: 'Flex Hourly Pricing',
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
            external: (context) => {
              externalTooltipHandler(tooltipRef.current, false)(context);
              // We no longer update the What This Means section on hover
            }
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
              ...dayBackgrounds,
              ...selectionHighlight
            }
          },
          datalabels: {
            display: function(context) {
              const index = context.dataIndex;
              // Show labels for daytime and nighttime lowest price hours
              return daytimeLowIndices.includes(index) || nighttimeLowIndices.includes(index);
            },
            formatter: function(value, context) {
              const index = context.dataIndex;
              // Add sun icon for daytime best prices, moon icon for nighttime best prices
              if (daytimeLowIndices.includes(index)) {
                return '☀️ best';
              } else if (nighttimeLowIndices.includes(index)) {
                return '🌙 best';
              }
              return 'best';
            },
            color: '#ffffff',
            backgroundColor: function(context) {
              const index = context.dataIndex;
              const value = context.dataset.data[index];
              return value < 0 ? 'rgba(46, 145, 50, 0.8)' : 'rgba(76, 60, 175, 0.8)';
            },
            borderRadius: 4,
            padding: {
              top: 2,
              right: 4,
              bottom: 2,
              left: 4
            },
            font: {
              size: 10,
              weight: 'bold'
            },
            align: function(context) {
              const index = context.dataIndex;
              const value = context.dataset.data[index];
              // Position above for positive prices, below for negative prices
              return value < 0 ? 'bottom' : 'top';
            },
            offset: 15 // Increased offset to ensure it doesn't cover the bars
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
