export const pad = (n: number) => String(n).padStart(2, '0');

const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (date: string) => new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));

/** Today as a local calendar day (never UTC, so late-evening entries stay on the right day). */
export const todayStr = () => toStr(new Date());
export const monthOf = (date: string) => date.slice(0, 7);
export const currentMonth = () => monthOf(todayStr());

export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setDate(d.getDate() + n);
  return toStr(d);
}

export function addMonths(month: string, n: number): string {
  const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export const daysInMonth = (month: string) =>
  new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

/** The day a new entry gets by default: today, or a day inside the month being browsed. */
export function defaultDateFor(month: string): string {
  const today = todayStr();
  if (monthOf(today) === month) return today;
  return month < monthOf(today) ? `${month}-${pad(daysInMonth(month))}` : `${month}-01`;
}

/** Days of the month that have already happened (the whole month for past months, 0 for future ones). */
export function elapsedDays(month: string): number {
  const today = todayStr();
  if (month < monthOf(today)) return daysInMonth(month);
  if (month > monthOf(today)) return 0;
  return Number(today.slice(8, 10));
}

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatMonth(month: string, style: 'long' | 'short' = 'long', withYear = true): string {
  const name = (style === 'long' ? MONTH_LONG : MONTH_SHORT)[Number(month.slice(5, 7)) - 1] ?? month;
  return withYear ? `${name} ${month.slice(0, 4)}` : name;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Today", "Yesterday" or "Fri 20 Nov" (the year is added when it is not the current one). */
export function formatDay(date: string, relative = true): string {
  const today = todayStr();
  if (relative && date === today) return 'Today';
  if (relative && date === addDays(today, -1)) return 'Yesterday';
  const d = parse(date);
  const text = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
  return date.slice(0, 4) === today.slice(0, 4) ? text : `${text} ${d.getFullYear()}`;
}

export const ordinal = (day: number) => {
  const rest = day % 100;
  if (rest >= 11 && rest <= 13) return `${day}th`;
  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`;
};
