import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useReport } from "@/hooks/useReport";
import { AppShell, EmptyState } from "@/components/report/AppShell";
import { PageHeader } from "@/components/report/PageHeader";
import { Section } from "@/components/report/Section";
import { KpiCard } from "@/components/report/KpiCard";
import { DataTable } from "@/components/report/DataTable";
import { Delta } from "@/components/report/Delta";
import { Insight } from "@/components/report/Insight";
import { formatAmount } from "@/lib/format";

export const Route = createFileRoute("/nakit")({
  head: () => ({
    meta: [
      { title: "Nakit ve İşletme Sermayesi — Aylık Yönetim Raporu" },
      {
        name: "description",
        content: "Nakit akışı köprüsü, alacak, stok ve ticari borçların seyri ile nakit dönüşüm döngüsü.",
      },
      { property: "og:title", content: "Nakit ve İşletme Sermayesi" },
      { property: "og:description", content: "Nakit azaldıysa nerede bağlandı? Alacak mı, stok mu, borç ödemesi mi?" },
    ],
  }),
  component: CashPage,
});

function CashPage() {
  const {
    cashConversionCycle,
    cashFlow,
    currentMonth,
    hasReportData,
    inventory,
    payables,
    receivables,
    workingCapital,
  } = useReport();

  if (!hasReportData) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  const cycle = receivables.days + inventory.days - payables.days;

  return (
    <AppShell>
      <PageHeader
        title="Nakit Akışı ve İşletme Sermayesi"
        description="Kârın nakde dönüp dönmediği burada görülür. Nakit azaldıysa hangi kalemde bağlandığı açıkça gösterilmelidir."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Dönem başı nakit" value={formatAmount(cashFlow.opening)} />
        <KpiCard
          label="Faaliyetlerden nakit"
          value={formatAmount(cashFlow.operating)}
          delta={{
            text: cashFlow.operating >= 0 ? "Pozitif" : "Negatif",
            tone: cashFlow.operating >= 0 ? "positive" : "negative",
          }}
        />
        <KpiCard label="Dönem sonu nakit" value={formatAmount(cashFlow.closing)} />
        <KpiCard
          label="Nakit dönüşüm döngüsü"
          value={`${cycle} gün`}
          delta={{
            text: `Hedef ${receivables.targetDays + inventory.targetDays - payables.targetDays} gün`,
            tone:
              cycle <= receivables.targetDays + inventory.targetDays - payables.targetDays
                ? "positive"
                : "negative",
          }}
        />
      </div>

      <Section title="Nakit köprüsü" description="FAVÖK'ten dönem sonu nakde giden yol.">
        <DataTable
          caption="Nakit köprüsü"
          rowKey={(row) => row.name}
          rows={cashFlow.bridge}
          columns={[
            { header: "Kalem", cell: (row) => row.name },
            {
              header: "Tutar",
              align: "right",
              cell: (row) =>
                row.name.includes("nakit") ? (
                  <span className="font-semibold">{formatAmount(row.value)}</span>
                ) : (
                  <Delta value={row.value} />
                ),
            },
          ]}
        />
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlow.bridge} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} interval={0} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: number) => formatAmount(value)}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Bar dataKey="value" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section
        title="Alacak, stok ve ticari borçların seyri"
        description="Gün sayıları hedeflerle birlikte değerlendirilir."
      >
        <DataTable
          caption="İşletme sermayesi kalemleri"
          rowKey={(row) => row.name}
          rows={workingCapital}
          columns={[
            { header: "Kalem", cell: (row) => row.name },
            { header: "Bu ay", align: "right", cell: (row) => formatAmount(row.current) },
            { header: "Geçen ay", align: "right", cell: (row) => formatAmount(row.previous) },
            {
              header: "Değişim",
              align: "right",
              cell: (row) => <Delta value={row.current - row.previous} invert={row.name !== "Ticari borçlar"} />,
            },
            { header: "Gün", align: "right", cell: (row) => `${row.days} gün` },
            { header: "Hedef", align: "right", cell: (row) => `${row.targetDays} gün` },
          ]}
        />
      </Section>

      <Section title="Nakit dönüşüm döngüsü" description="Alacak + stok - ticari borç gün sayısı.">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashConversionCycle} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} unit=" g" />
              <Tooltip
                formatter={(value: number) => `${value} gün`}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }}
              />
              <Line dataKey="days" stroke="var(--destructive)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Insight question="Nakit azaldıysa nerede bağlandı?">
        FAVÖK {formatAmount(currentMonth.ebitda)} olmasına rağmen ticari alacaklar{" "}
        {formatAmount(receivables.current - receivables.previous)} ve stoklar{" "}
        {formatAmount(inventory.current - inventory.previous)} arttı; ticari borçlar ise yalnızca{" "}
        {formatAmount(payables.current - payables.previous)} yükseldi. Nakdin ana bağlandığı yer
        alacak ve stoktur: toplam {formatAmount(cashFlow.bridge[2]?.value ?? 0)}.
      </Insight>
    </AppShell>
  );
}
