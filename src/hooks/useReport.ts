import { useReportWorkspace } from "@/hooks/report-workspace";
import type { AcquisitionModel } from "@/lib/acquisition-calc";
import type { FeasibilityModel } from "@/lib/feasibility-calc";
import type { ProjectionModel } from "@/lib/projection-calc";
import type { ReportModel } from "@/lib/report-calc";
import type { ReportInput } from "@/lib/report-schema";

export { REPORT_QUERY_KEY, fetchReportWorkbook } from "@/hooks/report-workspace";

/**
 * Veri girişi ve rapor sayfaları AYNI çalışma kopyasını kullanır
 * (bkz. report-workspace.tsx). Veri girişinde yazılan bir değer kaydedilmeyi
 * beklemeden tüm rapor sayfalarında görünür; arka planda otomatik kaydedilir.
 */

/** Ham giriş verisi + güncelleme ve kaydetme. Veri giriş sayfası bunu kullanır. */
export function useReportInput() {
  const workspace = useReportWorkspace();
  return {
    input: workspace.input,
    update: workspace.update,
    isLoading: workspace.isLoading,
    save: workspace.saveNow,
    isSaving: workspace.status === "saving",
    status: workspace.status,
    invalidSections: workspace.invalidSections,
  };
}

/** Hesaplanmış rapor modeli. Tüm rapor sayfaları bunu kullanır. */
export function useReport(): ReportModel & { isLoading: boolean } {
  const { models, isLoading } = useReportWorkspace();
  return { ...models.report, isLoading };
}

/** Edinim (CAC) ekonomisi modeli. */
export function useAcquisition(): AcquisitionModel & { isLoading: boolean } {
  const { models, isLoading } = useReportWorkspace();
  return { ...models.acquisition, isLoading };
}

/** Fizibilite / BEP modeli. */
export function useFeasibility(): FeasibilityModel & { isLoading: boolean } {
  const { models, isLoading } = useReportWorkspace();
  return { ...models.feasibility, isLoading };
}

/** 2027–2032 projeksiyon modeli. */
export function useProjection(): ProjectionModel & { isLoading: boolean } {
  const { models, isLoading } = useReportWorkspace();
  return { ...models.projection, isLoading };
}

/** Kaydedilmiş (sunucudaki) son sürüm; karşılaştırma gerektiğinde kullanılır. */
export function useSavedReportInput(): ReportInput | undefined {
  const { savedInput } = useReportWorkspace();
  return savedInput;
}
