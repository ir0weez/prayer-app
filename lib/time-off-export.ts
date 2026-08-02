/**
 * Time-off export and sharing utilities
 */

import { TimeOff, getTimeOffWithDuration, getTimeOffLabel } from './time-off';
import { formatDateLocal } from './date-utils';
import * as FileSystem from 'expo-file-system/legacy';
import { Clipboard } from 'react-native';

/**
 * Generate a formatted text summary of time-off periods
 */
export function generateTimeOffSummary(timeOffList: TimeOff[]): string {
  if (timeOffList.length === 0) {
    return 'No time-off periods scheduled.';
  }

  const sorted = [...timeOffList].sort((a, b) => a.startDate.localeCompare(b.startDate));

  let summary = '📅 TIME-OFF SUMMARY\n';
  summary += '═'.repeat(50) + '\n\n';

  let totalDays = 0;

  sorted.forEach((timeOff, index) => {
    const withDuration = getTimeOffWithDuration(timeOff);
    totalDays += withDuration.durationDays;

    summary += `${index + 1}. ${timeOff.title}\n`;
    summary += `   Type: ${getTimeOffLabel(timeOff.type)}\n`;
    summary += `   Dates: ${formatDateLocal(new Date(timeOff.startDate))} - ${formatDateLocal(new Date(timeOff.endDate))}\n`;
    summary += `   Duration: ${withDuration.durationDays} day${withDuration.durationDays !== 1 ? 's' : ''}\n`;

    if (timeOff.notes) {
      summary += `   Notes: ${timeOff.notes}\n`;
    }

    summary += '\n';
  });

  summary += '─'.repeat(50) + '\n';
  summary += `Total Time-Off: ${totalDays} days\n`;
  summary += `Periods Scheduled: ${timeOffList.length}\n`;
  summary += `Generated: ${new Date().toLocaleString()}\n`;

  return summary;
}

/**
 * Generate a detailed markdown version for sharing
 */
export function generateTimeOffMarkdown(timeOffList: TimeOff[]): string {
  if (timeOffList.length === 0) {
    return '# Time-Off Summary\n\nNo time-off periods scheduled.';
  }

  const sorted = [...timeOffList].sort((a, b) => a.startDate.localeCompare(b.startDate));

  let markdown = '# Time-Off Summary\n\n';
  markdown += `*Generated: ${new Date().toLocaleString()}*\n\n`;

  let totalDays = 0;

  sorted.forEach((timeOff) => {
    const withDuration = getTimeOffWithDuration(timeOff);
    totalDays += withDuration.durationDays;

    const icon = getTimeOffIcon(timeOff.type);
    markdown += `## ${icon} ${timeOff.title}\n\n`;
    markdown += `- **Type:** ${getTimeOffLabel(timeOff.type)}\n`;
    markdown += `- **Dates:** ${formatDateLocal(new Date(timeOff.startDate))} – ${formatDateLocal(new Date(timeOff.endDate))}\n`;
    markdown += `- **Duration:** ${withDuration.durationDays} day${withDuration.durationDays !== 1 ? 's' : ''}\n`;

    if (timeOff.notes) {
      markdown += `- **Notes:** ${timeOff.notes}\n`;
    }

    markdown += '\n';
  });

  markdown += '---\n\n';
  markdown += `**Total Time-Off:** ${totalDays} days across ${timeOffList.length} period${timeOffList.length !== 1 ? 's' : ''}\n`;

  return markdown;
}

/**
 * Get icon emoji for time-off type
 */
function getTimeOffIcon(type: string): string {
  const icons: Record<string, string> = {
    vacation: '🏖️',
    sick: '🏥',
    personal: '🧘',
    sabbatical: '📚',
    other: '⏸️',
  };
  return icons[type] || '⏸️';
}

/**
 * Copy time-off summary to clipboard
 */
export async function copyTimeOffToClipboard(timeOffList: TimeOff[]): Promise<boolean> {
  try {
    const summary = generateTimeOffSummary(timeOffList);
    Clipboard.setString(summary);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Share time-off summary
 */
export async function shareTimeOffSummary(timeOffList: TimeOff[]): Promise<boolean> {
  try {
    const summary = generateTimeOffSummary(timeOffList);
    const fileName = `TimeOff_${new Date().toISOString().split('T')[0]}.txt`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, summary);

    // For now, just copy to clipboard as fallback
    Clipboard.setString(summary);
    return true;
  } catch (error) {
    console.error('Error sharing time-off:', error);
    return false;
  }
}

/**
 * Get time-off statistics
 */
export function getTimeOffStats(timeOffList: TimeOff[]) {
  if (timeOffList.length === 0) {
    return {
      totalPeriods: 0,
      totalDays: 0,
      byType: {},
      upcomingCount: 0,
      pastCount: 0,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  let totalDays = 0;
  const byType: Record<string, number> = {};
  let upcomingCount = 0;
  let pastCount = 0;

  timeOffList.forEach((timeOff) => {
    const withDuration = getTimeOffWithDuration(timeOff);
    totalDays += withDuration.durationDays;

    byType[timeOff.type] = (byType[timeOff.type] || 0) + withDuration.durationDays;

    if (timeOff.endDate < today) {
      pastCount++;
    } else if (timeOff.startDate > today) {
      upcomingCount++;
    }
  });

  return {
    totalPeriods: timeOffList.length,
    totalDays,
    byType,
    upcomingCount,
    pastCount,
  };
}


