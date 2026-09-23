import { documentTotals, formatSGD } from "@/lib/calc";
import type { LineItem } from "@/types";

const TotalsSummary = ({ lines, gstRate, children }: { lines: LineItem[]; gstRate: number; children?: React.ReactNode }) => {
  const t = documentTotals(lines, gstRate);
  const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className={`flex justify-between gap-8 ${strong ? "border-t pt-2 text-base font-semibold" : "text-sm"}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
  return (
    <div className="ml-auto w-full max-w-xs space-y-1.5">
      {t.discount > 0 && <Row label="Discount" value={`−${formatSGD(t.discount)}`} />}
      <Row label="Subtotal" value={formatSGD(t.subtotal)} />
      <Row label={`GST ${gstRate}%`} value={formatSGD(t.gst)} />
      <Row label="Total" value={formatSGD(t.total)} strong />
      {children}
    </div>
  );
};

export default TotalsSummary;
