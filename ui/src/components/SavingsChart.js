import React, { useRef, useEffect, useCallback } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import moment from 'moment';
import { formatCurrency, formatUsage } from '../utils/rateCalculator';

ChartJS.register(...registerables, ChartDataLabels);

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

  const createChart = useCallback(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    // Use consistent timestamps from pricing data
    const labels = timestamps.map(timestamp => 
      moment(timestamp).format('MMM DD HH:mm')
    );

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
      labels,
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
          bottom: 20,
          left: 10,
          right: 10
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
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
          callbacks: {
            title: (context) => {
              const dataIndex = context[0].dataIndex;
              const timestamp = timestamps[dataIndex];
              return moment(timestamp).format('MMM DD, YYYY HH:mm');
            },
            label: (context) => {
              const dataIndex = context.dataIndex;
              const timestamp = timestamps[dataIndex];
              const timestampStr = new Date(timestamp).toISOString();
              const savingsItem = savingsMap[timestampStr];
              const datasetLabel = context.dataset.label;
              
              if (!savingsItem && datasetLabel === 'No Savings Data') {
                return 'No historical usage data available for this time period';
              }
              
              if (!savingsItem) {
                return ''; // Don't show labels for missing data
              }
              
              if (datasetLabel === 'Base Rate Usage') {
                return `${datasetLabel}: ${formatUsage(Math.min(savingsItem.usageKWh, savingsItem.subscriptionQuantity))}`;
              } else if (datasetLabel === 'Flex Rate Usage') {
                return `${datasetLabel}: ${formatUsage(Math.max(0, savingsItem.usageKWh - savingsItem.subscriptionQuantity))}`;
              }
              return `${datasetLabel}: ${formatUsage(context.parsed?.y || 0)}`;
            },
            afterLabel: (context) => {
              const dataIndex = context.dataIndex;
              const timestamp = timestamps[dataIndex];
              const timestampStr = new Date(timestamp).toISOString();
              const savingsItem = savingsMap[timestampStr];
              
              // Show savings info only if data exists and it's the first dataset
              if (savingsItem && context.datasetIndex === 0) {
                const savingsText = savingsItem.savings >= 0 ? 'Hourly Savings' : 'Hourly Additional Cost';
                return [
                  '',
                  `Total Usage: ${formatUsage(savingsItem.usageKWh)}`,
                  `Subscription: ${formatUsage(savingsItem.subscriptionQuantity)}`,
                  `${savingsText}: ${formatCurrency(Math.abs(savingsItem.savings))}`,
                  `TOU Cost: ${formatCurrency(savingsItem.touCost)}`,
                  `Dynamic Cost: ${formatCurrency(savingsItem.dynamicCost)}`
                ];
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            maxTicksLimit: 20, // Limit number of labels shown
            callback: function(value, index, values) {
              // Show every nth label based on data length
              const totalLabels = values.length;
              const showEvery = Math.max(1, Math.floor(totalLabels / 15));
              return index % showEvery === 0 ? this.getLabelForValue(value) : '';
            }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Usage (kWh)'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
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


  return (
    <div className="graph-container baseline-usage-chart">
      <h2>Usage Analysis: Base Rate vs. Flex Rate</h2>
      
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
    </div>
  );
};

export default SavingsChart;