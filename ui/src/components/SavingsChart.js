import React, { useRef, useEffect, useCallback } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-moment';
import moment from 'moment';
import { formatCurrency, formatUsage } from '../utils/rateCalculator';
import { generateDayBackgrounds } from '../utils/chartUtils';

ChartJS.register(...registerables, ChartDataLabels, annotationPlugin);

const SavingsChart = ({ 
  savingsData, 
  timestamps,
  prices,
  onBarSelect, 
  selectedTimestamp,
  isLoading = false 
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const tooltipRef = useRef(null);

  // Calculate total savings for the time period
  const calculateTotalSavings = () => {
    if (!savingsData || savingsData.length === 0 || !timestamps || timestamps.length === 0) {
      return { totalSavings: 0, totalTouCost: 0 };
    }
    
    // Filter savings data to only include items within the displayed timestamp range
    const startTime = new Date(timestamps[0]).getTime();
    const endTime = new Date(timestamps[timestamps.length - 1]).getTime();
    
    const filteredSavingsData = savingsData.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    });
    
    // Use the pre-calculated savings from each filtered item
    const totalSavings = filteredSavingsData.reduce((sum, item) => sum + (item.savings || 0), 0);
    const totalTouCost = filteredSavingsData.reduce((sum, item) => sum + (item.touCost || 0), 0);
    
    // Debug logging
    console.log('Savings calculation debug:', {
      originalSavingsDataLength: savingsData.length,
      filteredSavingsDataLength: filteredSavingsData.length,
      timestampRange: `${timestamps[0]} to ${timestamps[timestamps.length - 1]}`,
      sampleFiltered: filteredSavingsData.slice(0, 3).map(item => ({
        timestamp: item.timestamp,
        savings: item.savings,
        touCost: item.touCost
      })),
      totalSavings,
      totalTouCost
    });
    
    return { totalSavings, totalTouCost };
  };

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
        datalabels: {
          display: false, // Disable data labels for cleaner hourly view
        },
        tooltip: {
          enabled: false,
          external: (context) => {
            const tooltipEl = tooltipRef.current;
            if (!tooltipEl) return;
            
            // Hide tooltip if no tooltip data or outside chart
            if (!context.tooltip || context.tooltip.opacity === 0) {
              tooltipEl.style.opacity = '0';
              return;
            }
            
            const dataIndex = context.tooltip.dataPoints[0]?.dataIndex;
            if (dataIndex === undefined) {
              tooltipEl.style.opacity = '0';
              return;
            }
            
            const timestamp = timestamps[dataIndex];
            const timestampStr = new Date(timestamp).toISOString();
            const savingsItem = savingsMap[timestampStr];
            
            if (!savingsItem) {
              tooltipEl.innerHTML = `
                <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px;">
                  <div style="font-weight: bold; margin-bottom: 4px;">${moment(timestamp).format('MMM D, YYYY hA')}</div>
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
              
              tooltipEl.innerHTML = `
                <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; min-width: 200px;">
                  <div style="font-weight: bold; margin-bottom: 8px;">${moment(timestamp).format('MMM D, YYYY hA')}</div>
                  
                  <div style="margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; margin-bottom: 2px;">
                      <div style="width: 12px; height: 12px; background: rgba(59, 130, 246, 0.8); margin-right: 6px; border-radius: 2px;"></div>
                      <span style="color: rgba(59, 130, 246, 1); font-weight: bold;">Base Rate Usage</span>
                    </div>
                    <div style="margin-left: 18px; font-size: 11px;">
                      <div>${formatUsage(baseRateUsage)} at ${formatCurrency(baseRateCostPerKWh)}/kWh</div>
                      <div>Total: ${formatCurrency(subscriptionCost)}</div>
                    </div>
                  </div>
                  
                  ${flexRateUsage > 0 ? `
                  <div style="margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; margin-bottom: 2px;">
                      <div style="width: 12px; height: 12px; background: rgba(245, 158, 11, 0.8); margin-right: 6px; border-radius: 2px;"></div>
                      <span style="color: rgba(245, 158, 11, 1); font-weight: bold;">Flex Rate Usage</span>
                    </div>
                    <div style="margin-left: 18px; font-size: 11px;">
                      <div>${formatUsage(flexRateUsage)} at ${formatCurrency(flexRateCostPerKWh)}/kWh</div>
                      <div>Total: ${formatCurrency(flexCost)}</div>
                    </div>
                  </div>
                  ` : ''}
                  
                  <div style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 6px; margin-top: 6px;">
                    <div style="font-weight: bold;">Total Usage: ${formatUsage(savingsItem.usageKWh)}</div>
                    <div style="font-weight: bold;">Actual Cost: ${formatCurrency(actualCost)}</div>
                    <div style="font-weight: bold; color: ${totalSavings >= 0 ? '#10B981' : '#EF4444'};">
                      ${totalSavings >= 0 ? 'Savings' : 'Additional Cost'}: ${formatCurrency(Math.abs(totalSavings))}
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
  }, [savingsData, timestamps, onBarSelect]);

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
        <h2>Usage Analysis: Base Rate vs. Flex Rate</h2>
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


  const { totalSavings, totalTouCost } = calculateTotalSavings();

  return (
    <div className="graph-container baseline-usage-chart" style={{position: 'relative'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
        <h2 style={{margin: 0}}>Usage Analysis: Base Rate vs. Flex Rate</h2>
        <div style={{
          padding: '12px 16px',
          backgroundColor: totalSavings >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `2px solid ${totalSavings >= 0 ? '#10B981' : '#EF4444'}`,
          borderRadius: '8px',
          textAlign: 'center',
          minWidth: '200px'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: totalSavings >= 0 ? '#10B981' : '#EF4444',
            lineHeight: '1.2'
          }}>
            {totalSavings >= 0 ? '+' : ''}{formatCurrency(totalSavings)}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '4px'
          }}>
            Total {totalSavings >= 0 ? 'Savings' : 'Additional Cost'}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#888',
            marginTop: '2px'
          }}>
            vs. Base Rate ({formatCurrency(totalTouCost)})
          </div>
        </div>
      </div>
      
      <canvas ref={chartRef}></canvas>
      
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: 'rgba(59, 130, 246, 0.8)', border: '1px solid rgba(59, 130, 246, 1)'}}></div>
          <span>Base Rate Usage (subscription quantity)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: 'rgba(245, 158, 11, 0.8)', border: '1px solid rgba(245, 158, 11, 1)'}}></div>
          <span>Flex Rate Usage (above subscription)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{backgroundColor: 'rgba(156, 163, 175, 0.3)', border: '1px solid rgba(156, 163, 175, 0.5)'}}></div>
          <span>No Savings Data Available</span>
        </div>
      </div>
      <div id="savings-chart-tooltip" ref={tooltipRef}></div>
    </div>
  );
};

export default SavingsChart;