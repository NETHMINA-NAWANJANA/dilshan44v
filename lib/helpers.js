export const DEFAULT_DAILY_FEE = 250;

export function formatMoney(value) {
  const amount = Number(value) || 0;
  return `Rs. ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function makeStudentCode() {
  const part = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ST-${part}`;
}

export function makeQrToken() {
  return crypto.randomUUID();
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo"
  }).format(date);
}
