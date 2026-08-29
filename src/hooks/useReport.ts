import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { computeReport, type ReportModel } from "@/lib/report-calc";
import { emptyReportInput, parseReportInput, type ReportInput } from "@/lib/report-schema";

const QUERY_KEY = ["report-workbook"] as const;

async function fetchReportInput(): Promise<ReportInput> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return emptyReportInput;

  const { data, error } = await supabase
    .from("report_workbook")
    .select("data")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) throw error;
  return parseReportInput(data?.data);
}

async function saveReportInput(input: ReportInput) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Kaydetmek için giriş yapmalısınız.");

  const { error } = await supabase
    .from("report_workbook")
    .upsert(
      { user_id: auth.user.id, data: input as never },
      { onConflict: "user_id" },
    );

  if (error) throw error;
  return input;
}

/** Ham giriş verisi + kaydetme. Veri giriş sayfası bunu kullanır. */
export function useReportInput() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchReportInput });

  const mutation = useMutation({
    mutationFn: saveReportInput,
    onSuccess: (input) => queryClient.setQueryData(QUERY_KEY, input),
  });

  return {
    input: query.data ?? emptyReportInput,
    isLoading: query.isLoading,
    error: query.error,
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}

/** Hesaplanmış rapor modeli. Tüm rapor sayfaları bunu kullanır. */
export function useReport(): ReportModel & { isLoading: boolean } {
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchReportInput });
  const model = useMemo(() => computeReport(query.data ?? emptyReportInput), [query.data]);
  return { ...model, isLoading: query.isLoading };
}
