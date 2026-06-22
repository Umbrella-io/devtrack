import { formatDate, formatRelativeDate } from "./date-utils";

export { formatDate, formatRelativeDate };

export function formatDisplayDate(date: string | Date) {
  return new Date(date).toLocaleDateString();
}