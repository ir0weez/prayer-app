# Duration Calculation Bug Investigation

## Issue
The Prayer App is showing incorrect duration badges for time blocks. For example, "4:44 PM to 7:00 PM" should show "2h 16m" but is showing "13h" instead.

## Investigation Findings

### 1. Time Format
- Times are stored in 24-hour HH:mm format (e.g., "16:44" for 4:44 PM)
- The `format12HourTime` function correctly converts 24-hour to 12-hour format for display
- The DateTimePicker stores times in 24-hour format

### 2. Duration Calculation
- The `formatDuration` function is correct and produces proper output (e.g., "2h 16m")
- The `timeToMinutes` function correctly converts HH:mm to minutes
- Test cases confirm the calculation logic is correct:
  - 16:44 to 19:00 = 136 minutes = "2h 16m" ✓
  - 04:44 to 17:44 = 780 minutes = "13h" (this matches the reported bug!)

### 3. Root Cause Hypothesis
The bug occurs when:
1. User selects "4:44 PM" in the time picker
2. The time is stored as "04:44" (4:44 AM) instead of "16:44" (4:44 PM)
3. The end time is "17:44" (5:44 PM)
4. Duration = 17:44 - 04:44 = 13 hours

This suggests the time picker might be:
- Selecting the wrong hour value
- Or the hour value is being parsed incorrectly

### 4. Components Involved
- `DateTimePicker`: Handles time input and stores in 24-hour format
- `TimeBlockIndicator`: Displays the duration badge using `block.label`
- `calculateAvailableTimeBlocks`: Creates TimeBlock objects with correct labels
- `formatDuration`: Formats minutes to readable string

### 5. Specific Issue Location
The TimeBlockIndicator component displays `block.label` which should be correct. However, if the TimeBlock is created with incorrect start/end times, the label will be wrong.

## Next Steps
1. Add validation to ensure times are always in 24-hour format
2. Add a conversion function to handle any 12-hour format times that might be stored
3. Add comprehensive tests for the time picker to ensure it's selecting the correct hour
4. Add validation in the event/todo creation to ensure times are in the correct format
