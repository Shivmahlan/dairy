export function getTodayDateString(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMonthStartDateString(baseDate = new Date()) {
  return getTodayDateString(
    new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
  );
}

export function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDisplayDate(startDate);
  }

  return `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`;
}
