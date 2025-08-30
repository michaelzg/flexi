import React, { useRef, useEffect, useCallback } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-moment';
import moment from 'moment';
import { formatCurrency, formatUsage } from '../utils/rateCalculator';
import { generateDayBackgrounds } from '../utils/chartUtils';

ChartJS.register(...registerables, annotationPlugin);

const SavingsChart = ({ 
  savingsData, 
  timestamps,
  prices,
  onBarSelect, 
  selectedTimestamp,
  isLoading = false,
  onHoverSummary
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const tooltipRef = useRef(null);
  const lastHoverRef = useRef(null);

  // No local summary computations; summary now lives in WhatThisMeans

  const createChart = useCallback(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    // Generate day background annotations
    const dayBackgrounds = generateDayBackgrounds(timestamps);

    // Create a map of savings data by timestamp for quick lookup
    const savingsMap = {};
    savingsData.forEach(item => {
      const timestamp = new Date(item.timestamp).toISOString();
      savingsMap[timestamp] = item;
    });

    // Map savings data to consistent timeline, use null for missing data
    const baseRateUsage = timestamps.map(timestamp => {
      const timestampStr = new Date(timestamp).toISOString();
      const savingsItem = savingsMap[timestampStr];
      if (savingsItem) {
        return Math.min(savingsItem.usageKWh, savingsItem.subscriptionQuantity);
      }
      return null; // No data available
    });
    
    const flexRateUsage = timestamps.map(timestamp => {
      const timestampStr = new Date(timestamp).toISOString();
      const savingsItem = savingsMap[timestampStr];
      if (savingsItem) {
        return Math.max(0, savingsItem.usageKWh - savingsItem.subscriptionQuantity);
      }
      return null; // No data available
    });

    // Create grey bars for periods with no data
    const noDataBars = timestamps.map((timestamp, index) => {
      const timestampStr = new Date(timestamp).toISOString();
      const savingsItem = savingsMap[timestampStr];
      return savingsItem ? null : 0.1; // Small grey bar for no data
    });

    const data = {
      labels: timestamps,
      datasets: [
        {
          type: 'bar',
          label: 'Base Rate Usage',
          data: baseRateUsage,
          backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue for base rate
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          yAxisID: 'y',
          stack: 'usage',
          barPercentage: 0.98,
          categoryPercentage: 0.98
        },
        {
          type: 'bar',
          label: 'Flex Rate Usage',
          data: flexRateUsage,
          backgroundColor: 'rgba(245, 158, 11, 0.8)', // Orange for flex rate
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          yAxisID: 'y',
          stack: 'usage',
          barPercentage: 0.98,
          categoryPercentage: 0.98
        },
        {
          type: 'bar',
          label: 'No Savings Data',
          data: noDataBars,
          backgroundColor: 'rgba(156, 163, 175, 0.3)', // Light grey for no data
          borderColor: 'rgba(156, 163, 175, 0.5)',
          borderWidth: 1,
          yAxisID: 'y',
          stack: 'usage',
          barPercentage: 0.98,
          categoryPercentage: 0.98
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 20,
          right: 20,
          bottom: 80,
          left: 10
        }
      },
      interaction: {
        mode: 'nearest',
        intersect: true,
      },
      plugins: {
        title: {
          display: true,
          text: 'Hourly Usage: Base Rate vs Flex Rate',
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
        legend: {
          display: true,
          position: 'top'
        },
        // Ensure datalabels are disabled (plugin is registered globally by price chart)
        datalabels: {
          display: false
        },
        tooltip: {
          enabled: false,
          external: (context) => {
            const tooltipEl = tooltipRef.current;
            if (!tooltipEl) return;
            
            // Hide tooltip if no tooltip data or outside chart
            if (!context.tooltip || context.tooltip.opacity === 0) {
              tooltipEl.style.opacity = '0';
              if (lastHoverRef.current !== null) {
                lastHoverRef.current = null;
                if (onHoverSummary) onHoverSummary(null);
              }
              return;
            }
            
            const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
            if (dataIndex === undefined) {
              tooltipEl.style.opacity = '0';
              if (lastHoverRef.current !== null) {
                lastHoverRef.current = null;
                if (onHoverSummary) onHoverSummary(null);
              }
              return;
            }
            
            const timestamp = timestamps[dataIndex];
            const timestampStr = new Date(timestamp).toISOString();
            const savingsItem = savingsMap[timestampStr];
            
            if (!savingsItem) {
              if (lastHoverRef.current !== null) {
                lastHoverRef.current = null;
                if (onHoverSummary) onHoverSummary(null);
              }
              tooltipEl.innerHTML = `
                <div class="chart-tooltip">
                  <div class="chart-tooltip-header">${moment(timestamp).format('MMM D, YYYY hA')}</div>
                  <div>No savings data available</div>
                </div>
              `;
            } else {
              const baseRateUsage = Math.min(savingsItem.usageKWh, savingsItem.subscriptionQuantity);
              const flexRateUsage = Math.max(0, savingsItem.usageKWh - savingsItem.subscriptionQuantity);
              
              // The savings data structure provides:
              // - touRate: TOU rate per kWh 
              // - dynamicRate: Dynamic rate per kWh
              // - touCost: Total cost if all usage was at TOU rate
              // - dynamicCost: Cost difference for usage above subscription (can be negative)
              
              const baseRateCostPerKWh = savingsItem.touRate || 0;
              const flexRateCostPerKWh = savingsItem.dynamicRate || 0;
              
              // For subscription quantity, we pay the TOU rate
              const subscriptionCost = baseRateUsage * baseRateCostPerKWh;
              
              // For flex usage, we pay the dynamic rate
              const flexCost = flexRateUsage * flexRateCostPerKWh;
              
              // Actual cost = subscription cost + flex cost 
              const actualCost = subscriptionCost + flexCost;
              
              // Total savings = what we would pay at TOU rate - what we actually pay
              const totalSavings = savingsItem.touCost - actualCost;
              
              // Set hovered data for the summary panel
              const summaryObj = {
                timestamp,
                totalUsage: savingsItem.usageKWh,
                baseRateOnlyCost: savingsItem.touCost,
                actualCost,
                totalSavings
              };
              // Only notify parent if summary changed to prevent re-render churn
              const prev = lastHoverRef.current;
              const changed = !prev || prev.timestamp !== summaryObj.timestamp ||
                prev.totalUsage !== summaryObj.totalUsage ||
                prev.baseRateOnlyCost !== summaryObj.baseRateOnlyCost ||
                prev.actualCost !== summaryObj.actualCost ||
                prev.totalSavings !== summaryObj.totalSavings;
              if (changed) {
                lastHoverRef.current = summaryObj;
                if (onHoverSummary) onHoverSummary(summaryObj);
              }
              
              tooltipEl.innerHTML = `
                <div class="chart-tooltip">
                  <div class="chart-tooltip-header">${moment(timestamp).format('MMM D, YYYY hA')}</div>
                  
                  <div class="chart-tooltip-section">
                    <div class="chart-tooltip-label">
                      <div class="chart-tooltip-color-square" style="background: rgba(59, 130, 246, 0.8);"></div>
                      <span style="color: rgba(59, 130, 246, 1);">Base Rate Usage</span>
                    </div>
                    <div class="chart-tooltip-details">
                      <div>${formatUsage(baseRateUsage)} at ${formatCurrency(baseRateCostPerKWh)}/kWh</div>
                      <div>Total: ${formatCurrency(subscriptionCost)}</div>
                    </div>
                  </div>
                  
                  ${flexRateUsage > 0 ? `
                  <div class="chart-tooltip-section">
                    <div class="chart-tooltip-label">
                      <div class="chart-tooltip-color-square" style="background: rgba(245, 158, 11, 0.8);"></div>
                      <span style="color: rgba(245, 158, 11, 1);">Flex Rate Usage</span>
                    </div>
                    <div class="chart-tooltip-details">
                      <div>${formatUsage(flexRateUsage)} at ${formatCurrency(flexRateCostPerKWh)}/kWh</div>
                      <div>Total: ${formatCurrency(flexCost)}</div>
                    </div>
                  </div>
                  ` : ''}
                  
                  <div class="chart-tooltip-divider">
                    <div style="text-align: center; padding: 8px; background-color: ${totalSavings >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; border-radius: 6px;">
                      <div style="font-weight: bold; color: ${totalSavings >= 0 ? '#10B981' : '#EF4444'}; font-size: 14px;">
                        ${totalSavings >= 0 ? 'Savings: ' : 'Additional Cost: '}${formatCurrency(Math.abs(totalSavings))}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }
            
            // Position tooltip
            const containerEl = context.chart.canvas.parentElement;
            
            // Position relative to the chart container
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.left = context.tooltip.caretX + 'px';
            tooltipEl.style.top = context.tooltip.caretY + 'px';
            tooltipEl.style.opacity = '1';
            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.zIndex = '1000';
            
            // Ensure the tooltip container has relative positioning
            if (containerEl && containerEl.style.position !== 'relative') {
              containerEl.style.position = 'relative';
            }
            
            // Synchronize tooltips between charts
            if (window.syncTooltip) {
              clearTimeout(window.syncTooltip);
            }
            
            window.syncTooltip = setTimeout(() => {
              const currentTimestamp = timestamps[dataIndex];
              const allCharts = Object.values(ChartJS.instances);
              
              allCharts.forEach(otherChart => {
                if (otherChart.id !== context.chart.id) {
                  try {
                    // For SavingsChart, we need to find corresponding timestamps in other charts
                    // Historical chart uses timestamps from 1 year ago
                    // Price chart uses current timestamps
                    const searchTimestamp = moment(currentTimestamp).subtract(1, 'year').toISOString();
                    
                    let matchingIndex = -1;
                    
                    // Try to find matching timestamp (exact or adjusted for historical)
                    matchingIndex = otherChart.data.labels.findIndex(label => {
                      // For historical chart comparison (1 year ago)
                      if (moment(label).isSame(moment(searchTimestamp), 'hour')) {
                        return true;
                      }
                      // For price chart comparison (current year)
                      if (moment(label).isSame(moment(currentTimestamp), 'hour')) {
                        return true;
                      }
                      return false;
                    });
                    
                    // Only proceed if we found a matching index and it's within the valid range
                    if (matchingIndex !== -1 && 
                        matchingIndex < otherChart.data.datasets[0].data.length && 
                        otherChart.data.datasets[0].data[matchingIndex] !== undefined) {
                      
                      try {
                        otherChart.tooltip.setActiveElements([
                          { datasetIndex: 0, index: matchingIndex }
                        ], { x: 0, y: 0 });
                        otherChart.update();
                      } catch (error) {
                        console.log("Error setting tooltip on other chart:", error);
                      }
                    }
                  } catch (error) {
                    console.log("Error synchronizing tooltips from SavingsChart:", error);
                  }
                }
              });
            }, 10);
          }
        },
        annotation: {
          annotations: {
            ...dayBackgrounds
          }
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
            },
            callback: function(value) {
              return formatUsage(value);
            }
          }
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const elementIndex = elements[0].index;
          const timestamp = timestamps[elementIndex];
          const timestampStr = new Date(timestamp).toISOString();
          const savingsItem = savingsMap[timestampStr];
          
          if (onBarSelect && savingsItem) {
            onBarSelect(timestamp, savingsItem.usageKWh, null);
          }
        } else {
          if (onBarSelect) {
            onBarSelect(null);
          }
        }
      },
      onHover: (event, elements) => {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      },
      hover: {
        mode: 'nearest',
        intersect: true
      }
    };

    chartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: data,
      options: options
    });
  }, [savingsData, timestamps]);

  useEffect(() => {
    console.log("SavingsChart useEffect - savingsData:", savingsData?.length || 0, "isLoading:", isLoading);
    
    if (timestamps && timestamps.length > 0 && !isLoading) {
      console.log("Creating savings chart with", timestamps.length, "time points and", savingsData?.length || 0, "savings data points");
      createChart();
    } else {
      console.log("Not creating chart - no timestamps or loading");
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [timestamps, savingsData, isLoading, createChart]);

  if (!timestamps || timestamps.length === 0) {
    return (
      <div className="graph-container baseline-usage-chart">
        <div className="chart-placeholder">
          {isLoading ? (
            <div className="loading-placeholder">Loading pricing data...</div>
          ) : (
            <div className="no-data-placeholder">
              Pricing data is required to display the usage analysis chart.
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="graph-container baseline-usage-chart" style={{position: 'relative'}}>      
      <canvas ref={chartRef}></canvas>
      <div id="savings-chart-tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default SavingsChart;
