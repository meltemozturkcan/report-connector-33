import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { computeAcquisition } from "@/lib/acquisition-calc";
import { computeFeasibility } from "@/lib/feasibility-calc";
import { computeProjection } from "@/lib/projection-calc";
import { computeReport } from "@/lib/report-calc";
import {
  emptyReportInput,
  parseReportInputDetailed,
  reportInputSchema,
  type ReportInput,
} from "@/lib/report-schema";

/**
 * Rapor çalışma alanı.
 *
 * Önceden veri giriş sayfası kendi yerel taslağını tutuyor, rapor sayfaları ise
 * yalnızca kaydedilmiş veriyi okuyordu: "Kaydet"e basılmadan hiçbir rapor
 * değişmiyor, sayfadan çıkınca girilen veri kayboluyordu.
 *
 * Artık tek bir çalışma kopyası uygulamanın kökünde tutulur:
 *  - Veri girişindeki her değişiklik anında tüm rapor sayfalarına yansır.
 *  - Değişiklikler 1,5 sn sonra otomatik kaydedilir (veya "Kaydet" ile hemen).
 *  - Kayıttaki bir bölüm doğrulanamazsa otomatik kayıt durur; böylece o
 *    bölüm varsayılan boş değerle ezilmez.
 */

export const REPORT_QUERY_KEY = ["report-workbook"] as const;
const AUTOSAVE_DELAY_MS = 1500;
const NO_SECTIONS: string[] = [];

type Workbook = {
  input: ReportInput;
  invalidSections: string[];
  userId: string | null;
};

export async function fetchReportWorkbook(): Promise<Workbook> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { input: emptyReportInput, invalidSections: [], userId: null };

  const { data, error } = await supabase
    .from("report_workbook")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) throw error;
  const parsed = parseReportInputDetailed(data?.data);
  return { ...parsed, userId: auth.user.id };
}

async function saveWorkbook(input: ReportInput) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Kaydetmek için giriş yapmalısınız.");

  const { error } = await supabase
    .from("report_workbook")
    .upsert({ user_id: auth.user.id, data: input as never }, { onConflict: "user_id" });

  if (error) throw error;
  return auth.user.id;
}

export type SaveStatus = "signed-out" | "saved" | "dirty" | "saving" | "error" | "blocked";

type Models = {
  report: ReturnType<typeof computeReport>;
  acquisition: ReturnType<typeof computeAcquisition>;
  feasibility: ReturnType<typeof computeFeasibility>;
  projection: ReturnType<typeof computeProjection>;
};

type Workspace = {
  input: ReportInput;
  savedInput: ReportInput | undefined;
  models: Models;
  isLoading: boolean;
  status: SaveStatus;
  lastError: string | null;
  invalidSections: string[];
  update: (updater: (current: ReportInput) => ReportInput) => void;
  saveNow: () => Promise<boolean>;
};

const WorkspaceContext = createContext<Workspace | null>(null);

const computeModels = (input: ReportInput): Models => ({
  report: computeReport(input),
  acquisition: computeAcquisition(input.acquisition),
  feasibility: computeFeasibility(input.feasibility),
  projection: computeProjection(input),
});

export function ReportWorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: REPORT_QUERY_KEY, queryFn: fetchReportWorkbook });

  const [draft, setDraft] = useState<ReportInput | null>(null);
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const draftRef = useRef<ReportInput | null>(null);
  const revisionRef = useRef(0);

  const savedInput = query.data?.input;
  const input = draft ?? savedInput ?? emptyReportInput;
  const userId = query.data?.userId ?? null;
  const invalidSections = query.data?.invalidSections ?? NO_SECTIONS;

  /** Oturum değişince (giriş / çıkış / başka kullanıcı) taslak sıfırlanır. */
  const sessionUserRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    // Supabase sekmeye dönüldüğünde de SIGNED_IN yayınlayabilir; taslak yalnızca
    // kullanıcı gerçekten değiştiğinde atılır, aksi halde kaydedilmemiş veri kaybolurdu.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user.id ?? null;
      const previousUser = sessionUserRef.current;
      sessionUserRef.current = nextUser;
      if (previousUser === undefined || previousUser === nextUser) return;
      draftRef.current = null;
      setDraft(null);
      setLastError(null);
      void queryClient.invalidateQueries({ queryKey: REPORT_QUERY_KEY });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const update = useCallback(
    (updater: (current: ReportInput) => ReportInput) => {
      const base =
        draftRef.current ??
        queryClient.getQueryData<Workbook>(REPORT_QUERY_KEY)?.input ??
        emptyReportInput;
      const next = updater(base);
      draftRef.current = next;
      revisionRef.current += 1;
      // Yeni bir düzenleme, önceki kayıt hatasından sonra otomatik kaydı yeniden dener.
      setLastError(null);
      setDraft(next);
      setRevision(revisionRef.current);
    },
    [queryClient],
  );

  const saveNow = useCallback(async () => {
    const current = draftRef.current;
    if (!current) return true;
    const parsed = reportInputSchema.safeParse(current);
    if (!parsed.success) {
      setLastError(parsed.error.issues[0]?.message ?? "Veriler doğrulanamadı");
      return false;
    }
    const startedAt = revisionRef.current;
    setSaving(true);
    try {
      const savedUser = await saveWorkbook(parsed.data);
      queryClient.setQueryData<Workbook>(REPORT_QUERY_KEY, {
        input: parsed.data,
        invalidSections: [],
        userId: savedUser,
      });
      setSavedRevision(startedAt);
      setLastError(null);
      return true;
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Kaydedilemedi");
      return false;
    } finally {
      setSaving(false);
    }
  }, [queryClient]);

  const hasUnsaved = draft !== null && revision > savedRevision;
  const blocked = invalidSections.length > 0;

  /** Otomatik kayıt: yazmayı bıraktıktan kısa süre sonra. */
  useEffect(() => {
    if (!hasUnsaved || saving || !userId || blocked || lastError) return;
    const timer = setTimeout(() => void saveNow(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasUnsaved, saving, userId, blocked, lastError, revision, saveNow]);

  /** Kaydedilmemiş değişiklik varken sekme kapatılırsa uyar. */
  useEffect(() => {
    if (!hasUnsaved && !saving) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved, saving]);

  /** Yazarken hesaplama arayüzü bloklamasın diye modeller ertelenmiş girişten hesaplanır. */
  const deferredInput = useDeferredValue(input);
  const models = useMemo(() => computeModels(deferredInput), [deferredInput]);

  const status: SaveStatus = !userId
    ? "signed-out"
    : saving
      ? "saving"
      : lastError
        ? "error"
        : hasUnsaved && blocked
          ? "blocked"
          : hasUnsaved
            ? "dirty"
            : "saved";

  const value = useMemo<Workspace>(
    () => ({
      input,
      savedInput,
      models,
      isLoading: query.isLoading,
      status,
      lastError,
      invalidSections,
      update,
      saveNow,
    }),
    [
      input,
      savedInput,
      models,
      query.isLoading,
      status,
      lastError,
      invalidSections,
      update,
      saveNow,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useReportWorkspace(): Workspace {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useReportWorkspace, ReportWorkspaceProvider içinde kullanılmalı.");
  }
  return value;
}
