import type { ReportInput } from "@/lib/report-schema";

export type PatchFn = <K extends keyof ReportInput>(key: K, value: ReportInput[K]) => void;

/** Her veri girişi sekmesinin aldığı ortak props. */
export type EntryTabProps = {
  draft: ReportInput;
  patch: PatchFn;
};

export const monthLabels = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];
