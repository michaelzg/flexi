# Electricity Rate Savings Feature Design

## Overview
This feature visually represents savings from participating in a dynamic flex pricing pilot program compared to standard time-of-use electricity rates. The system calculates savings based on historical usage patterns and dynamic pricing from the existing pricing API.

## Feature Goals
- Calculate and visualize potential savings from dynamic flex pricing vs. standard TOU rates
- Allow users to upload historical electricity usage data
- Provide clear graphical representation of savings over time
- Show both individual period savings and cumulative savings trends

## User Stories
- As a pilot program participant, I want to see how much I'm saving compared to standard rates
- As a user, I want to upload my historical usage data to calculate personalized savings
- As a user, I want to see both individual time period savings and running totals
- As a user, I want to understand my savings potential before joining the pilot program

## Rate Structure

### Standard Time-of-Use Rates

#### Summer Rates (June 1 - September 30):
- Peak (4-9 PM): $0.62277 per kWh
- Partial-Peak (3-4 PM and 9 PM-midnight): $0.51228 per kWh
- Off-Peak (all other hours): $0.31026 per kWh

#### Winter Rates (October 1 - May 31):
- Peak (4-9 PM): $0.49566 per kWh
- Partial-Peak (3-4 PM and 9 PM-midnight): $0.47896 per kWh
- Off-Peak (all other hours): $0.31027 per kWh

### Dynamic Flex Pricing
- Based on subscription quantities derived from previous year's usage
- Weekday and weekend averages calculated for each hour
- Credits for usage below subscription quantity at dynamic prices
- Charges for usage above subscription quantity at dynamic prices

## Technical Requirements

### Data Processing
- Historical usage data import (CSV/Excel formats)
- Time-of-use rate calculation engine
- Dynamic pricing integration with existing pricing API
- Subscription quantity calculation from historical data
- Savings calculation algorithm

### Calculations
1. **Standard TOU Cost**: `usage × rate_for_hour_and_season`
2. **Dynamic Cost**: `(usage - subscription) × dynamic_rate` (if usage > subscription)
3. **Dynamic Credit**: `(subscription - usage) × dynamic_rate` (if usage < subscription)
4. **Savings**: `standard_cost - (dynamic_cost || -dynamic_credit)`

## Implementation Plan

### Phase 1: Core Calculation Engine
1. Build rate calculation module for standard TOU rates
2. Implement subscription quantity calculation from historical data
3. Create savings calculation algorithm
4. Integrate with existing pricing API for dynamic rates

### Phase 2: Data Import
1. Create historical usage data upload interface
2. Implement CSV/Excel parsing and validation
3. Build data storage and retrieval system
4. Add data validation and error handling

### Phase 3: Visualization
1. Implement bar chart for individual period savings
2. Create running total line chart overlay
3. Add time period filtering and selection
4. Implement responsive chart design

### Phase 4: User Interface
1. Design upload flow for historical data
2. Create savings dashboard layout
3. Add chart controls and filters
4. Implement data export functionality

## UI/UX Considerations

### Dashboard Layout
- Clean, intuitive interface focusing on savings visualization
- Prominent upload area for historical data
- Clear legend and labeling for all charts
- Responsive design for mobile and desktop

### Chart Design
- Bar chart showing savings/costs for each time period
- Running total line chart showing cumulative savings
- Color coding: green for savings, red for additional costs
- Hover tooltips with detailed breakdown

### User Flow
1. User uploads historical usage data
2. System calculates subscription quantities
3. System fetches dynamic pricing data
4. Charts display calculated savings
5. User can filter by date ranges and export results

## Data Models

### Historical Usage Record
```javascript
{
  timestamp: Date,
  usage: Number, // kWh
  period_type: 'weekday' | 'weekend',
  hour: Number // 0-23
}
```

### Subscription Quantity
```javascript
{
  hour: Number, // 0-23
  period_type: 'weekday' | 'weekend',
  average_usage: Number, // kWh
  bill_period: String // e.g., "2024-01"
}
```

### Savings Calculation Result
```javascript
{
  timestamp: Date,
  standard_cost: Number,
  dynamic_cost: Number,
  savings: Number,
  cumulative_savings: Number,
  usage: Number,
  subscription_quantity: Number,
  dynamic_rate: Number
}
```

## API Endpoints

### New Endpoints
- `POST /api/usage/upload` - Upload historical usage data
- `GET /api/savings/calculate` - Calculate savings for date range
- `GET /api/subscription/quantities` - Get subscription quantities for period

### Existing Integrations
- Pricing API for dynamic rates (already implemented)

## Testing Strategy

### Unit Tests
- Rate calculation functions
- Subscription quantity calculations
- Savings algorithm validation
- Data parsing and validation

### Integration Tests
- Historical data upload flow
- API integration with pricing service
- End-to-end savings calculation

### User Testing
- Upload flow usability
- Chart readability and understanding
- Mobile responsiveness

## Technical Considerations

### Performance
- Efficient data processing for large historical datasets
- Chart rendering optimization for large time series
- Caching of calculated subscription quantities

### Data Validation
- Historical usage data format validation
- Date range validation
- Usage value sanity checks

### Error Handling
- Invalid file format handling
- Missing data period handling
- API failure graceful degradation

## Future Enhancements
- Predictive savings modeling
- What-if scenario analysis
- Integration with smart meter data
- Automated savings reports
- Comparison with other rate plans

---
*This document serves as the design specification for the electricity rate savings visualization feature.*