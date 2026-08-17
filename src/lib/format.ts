export const formatAmount = (value: number, digits = 0) =>
  new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

export const formatSigned = (value: number, digits = 0) =>
  `${value > 0 ? "+" : ""}${formatAmount(value, digits)}`;

export const formatPercent = (value: number, digits = 1) =>
  `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}%`;

export const formatRatio = (value: number, digits = 2) =>
  `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)}x`;

export const changePercent = (current: number, previous: number) =>
  previous === 0 ? 0 : ((current - previous) / Math.abs(previous)) * 100;
