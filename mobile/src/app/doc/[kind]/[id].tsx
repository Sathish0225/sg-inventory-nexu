import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { amountPaid, balanceDue, documentTotals, invoiceDisplayStatus, lineNet, todayISO } from "@/lib/calc";
import { invoiceDocument, quotationDocument, salesOrderDocument, type PrintableDocument } from "@/lib/documents";
import type { Invoice, LineItem, PaymentMethod, Quotation, SalesOrder } from "@/types";
import { api, useAction, useCollection, type Collection } from "~/lib/data";
import { formatDate, formatSGD } from "~/lib/format";
import { printDocument, shareDocumentPdf } from "~/lib/printing";
import { useCan } from "~/lib/session";
import { Badge, Button, Card, Empty, Input, KeyValue, ListRow, Screen, SectionTitle, Segmented, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

type Kind = "quotation" | "salesOrder" | "invoice";
const docs: Collection[] = ["quotations", "salesOrders", "invoices"];
const methods: PaymentMethod[] = ["PayNow", "Bank Transfer", "Cheque", "Cash"];

const confirm = (title: string, message: string, action: string, destructive = false) =>
  new Promise<boolean>((resolve) => {
    if (Platform.OS === "web") return resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: action, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });

function Lines({ lines, gstRate, children }: { lines: LineItem[]; gstRate: number; children?: React.ReactNode }) {
  const t = documentTotals(lines, gstRate);
  return (
    <View style={{ gap: space.sm }}>
      <SectionTitle>Items</SectionTitle>
      <Card style={{ paddingVertical: 0 }}>
        {lines.map((l) => (
          <ListRow
            key={l.id}
            title={l.description}
            subtitle={`${l.quantity} × ${formatSGD(l.unitPrice)}${l.discountPct ? ` · ${l.discountPct}% off` : ""}`}
            right={<Text variant="money">{formatSGD(lineNet(l))}</Text>}
          />
        ))}
        <View style={{ paddingVertical: space.md, gap: 6 }}>
          {t.discount > 0 && <KeyValue label="Discount" value={`−${formatSGD(t.discount)}`} />}
          <KeyValue label="Subtotal" value={formatSGD(t.subtotal)} />
          <KeyValue label={`GST ${gstRate}%`} value={formatSGD(t.gst)} />
          <KeyValue label="Total" value={<Text variant="money" style={{ fontSize: 17 }}>{formatSGD(t.total)}</Text>} />
          {children}
        </View>
      </Card>
    </View>
  );
}

export default function DocumentDetail() {
  const { kind, id } = useLocalSearchParams<{ kind: Kind; id: string }>();
  const quotations = useCollection("quotations");
  const orders = useCollection("salesOrders");
  const invoices = useCollection("invoices");
  const customers = useCollection("customers");
  const settings = useCollection("settings");
  const canSales = useCan("sales:write");
  const canInvoices = useCan("invoices:write");
  const canFulfil = useCan("inventory:write");
  const c = useColors();

  const action = useAction((args: { path: string; body?: unknown }) => api.post<{ id?: string }>(args.path, args.body ?? {}), [
    ...docs,
    "jobs",
    "inventory",
    "stockMovements",
  ]);

  const doc: Quotation | SalesOrder | Invoice | undefined =
    kind === "quotation" ? quotations.data.find((q) => q.id === id) : kind === "salesOrder" ? orders.data.find((o) => o.id === id) : invoices.data.find((i) => i.id === id);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("PayNow");
  const [reference, setReference] = useState("");
  const balance = kind === "invoice" && doc ? balanceDue(doc as Invoice) : 0;
  useEffect(() => setAmount(balance > 0 ? balance.toFixed(2) : ""), [balance]);

  if (!doc) return <Empty icon="receipt-outline" title="Loading…" />;
  const customer = customers.data.find((x) => x.id === doc.customerId);
  const today = todayISO();

  const run = async (path: string, body?: unknown, then?: (value: { id?: string }) => void) => {
    const r = await action.run({ path, body });
    if (r.ok && then) then(r.value);
  };

  const printable = (): PrintableDocument | null => {
    if (!settings.data) return null;
    if (kind === "quotation") return quotationDocument(doc as Quotation, customer, settings.data);
    if (kind === "salesOrder") return salesOrderDocument(doc as SalesOrder, customer, settings.data);
    return invoiceDocument(doc as Invoice, customer, settings.data);
  };

  let status: string = doc.status;
  let actions: React.ReactNode = null;
  let extra: React.ReactNode = null;

  if (kind === "quotation") {
    const q = doc as Quotation;
    status = q.status === "Sent" && q.validUntil < today ? "Expired" : q.status;
    const locked = Boolean(q.salesOrderId || q.invoiceId);
    extra = (
      <Card style={{ gap: space.md }}>
        <KeyValue label="Date" value={formatDate(q.date)} />
        <KeyValue label="Valid until" value={formatDate(q.validUntil)} />
        {q.reference ? <KeyValue label="Reference" value={q.reference} /> : null}
      </Card>
    );
    if (canSales && !locked) {
      actions = (
        <>
          {q.status === "Draft" && <Button title="Mark as sent" icon="send-outline" tone="secondary" onPress={() => void run(`/quotations/${q.id}/status`, { status: "Sent" })} />}
          {status !== "Rejected" && status !== "Expired" && (
            <Button
              title="Convert to sales order"
              icon="cart-outline"
              onPress={() => void run(`/quotations/${q.id}/convert-to-sales-order`, undefined, (o) => router.replace(`/doc/salesOrder/${o.id}`))}
            />
          )}
          {status !== "Rejected" && status !== "Expired" && canInvoices && (
            <Button
              title="Convert to invoice"
              icon="receipt-outline"
              tone="secondary"
              onPress={() => void run(`/quotations/${q.id}/convert-to-invoice`, undefined, (inv) => router.replace(`/doc/invoice/${inv.id}`))}
            />
          )}
          {status !== "Rejected" && (
            <Button
              title="Mark as rejected"
              tone="danger"
              onPress={async () => (await confirm("Mark as rejected?", `${q.number} will be closed.`, "Reject", true)) && run(`/quotations/${q.id}/status`, { status: "Rejected" })}
            />
          )}
        </>
      );
    }
  } else if (kind === "salesOrder") {
    const o = doc as SalesOrder;
    const quote = quotations.data.find((q) => q.id === o.quotationId);
    extra = (
      <Card style={{ gap: space.md }}>
        <KeyValue label="Date" value={formatDate(o.date)} />
        <KeyValue label="Delivery" value={formatDate(o.deliveryDate)} />
        {quote ? <KeyValue label="From quotation" value={quote.number} /> : null}
      </Card>
    );
    const open = o.status === "Pending" || o.status === "Confirmed";
    actions = (
      <>
        {canSales && o.status === "Pending" && <Button title="Confirm order" icon="checkmark-outline" tone="secondary" onPress={() => void run(`/sales-orders/${o.id}/confirm`)} />}
        {canSales && canFulfil && open && (
          <Button
            title="Fulfil (deduct stock)"
            icon="cube-outline"
            onPress={async () => (await confirm(`Fulfil ${o.number}?`, "Stock for every inventory line will be deducted now.", "Fulfil")) && run(`/sales-orders/${o.id}/fulfil`)}
          />
        )}
        {canInvoices && !o.invoiceId && o.status !== "Cancelled" && (
          <Button title="Create invoice" icon="receipt-outline" tone="secondary" onPress={() => void run(`/sales-orders/${o.id}/invoice`, undefined, (inv) => router.replace(`/doc/invoice/${inv.id}`))} />
        )}
      </>
    );
  } else {
    const inv = doc as Invoice;
    status = invoiceDisplayStatus(inv, today);
    extra = (
      <Card style={{ gap: space.md }}>
        <KeyValue label="Date" value={formatDate(inv.date)} />
        <KeyValue label="Due" value={<Text color={status === "Overdue" ? c.danger : undefined} style={{ fontWeight: "500" }}>{formatDate(inv.dueDate)}</Text>} />
        {inv.reference ? <KeyValue label="Reference" value={inv.reference} /> : null}
      </Card>
    );
    const value = Number(amount);
    actions = canInvoices && (
      <>
        {inv.status === "Draft" && (
          <Button
            title="Issue invoice"
            icon="checkmark-done-outline"
            onPress={async () => (await confirm(`Issue ${inv.number}?`, "Issued tax invoices can be voided but not edited.", "Issue")) && run(`/invoices/${inv.id}/issue`)}
          />
        )}
        {inv.status === "Issued" && balance > 0 && (
          <Card style={{ gap: space.md }}>
            <Text variant="heading">Record payment</Text>
            <Input label="Amount (S$)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Segmented value={method} onChange={setMethod} options={methods.map((m) => ({ value: m, label: m === "Bank Transfer" ? "Bank" : m }))} />
            <Input label="Reference" value={reference} onChangeText={setReference} placeholder="Transaction / cheque number" />
            <Button
              title={`Record ${Number.isFinite(value) && value > 0 ? formatSGD(value) : "payment"}`}
              icon="cash-outline"
              disabled={!(value > 0)}
              loading={action.busy}
              onPress={() =>
                void run(`/invoices/${inv.id}/payments`, { date: today, amount: value, method, reference: reference.trim() }, () => setReference(""))
              }
            />
          </Card>
        )}
        {inv.status === "Issued" && inv.payments.length === 0 && (
          <Button
            title="Void invoice"
            tone="danger"
            onPress={async () => (await confirm(`Void ${inv.number}?`, "It stays on record marked VOID.", "Void", true)) && run(`/invoices/${inv.id}/void`)}
          />
        )}
      </>
    );
  }

  const totalsExtra =
    kind === "invoice" && (doc as Invoice).status === "Issued" ? (
      <>
        <KeyValue label="Paid" value={`−${formatSGD(amountPaid(doc as Invoice))}`} />
        <KeyValue label="Balance due" value={<Text variant="money" style={{ fontSize: 17 }}>{formatSGD(balance)}</Text>} />
      </>
    ) : null;

  return (
    <Screen refreshing={quotations.refreshing || orders.refreshing || invoices.refreshing} onRefresh={() => void Promise.all([quotations.refetch(), orders.refetch(), invoices.refetch()])}>
      <Stack.Screen options={{ title: doc.number }} />
      <Card style={{ gap: space.sm }}>
        <Badge status={status} />
        <Text variant="heading">{customer?.name ?? "Customer"}</Text>
        {customer?.contactPerson ? <Text muted>Attn: {customer.contactPerson}</Text> : null}
      </Card>
      {extra}
      <Lines lines={doc.lines} gstRate={doc.gstRate}>
        {totalsExtra}
      </Lines>
      {kind === "invoice" && (doc as Invoice).payments.length > 0 && (
        <View style={{ gap: space.sm }}>
          <SectionTitle>Payments</SectionTitle>
          <Card style={{ paddingVertical: 0 }}>
            {(doc as Invoice).payments.map((p, i, all) => (
              <ListRow
                key={p.id}
                title={formatSGD(p.amount)}
                subtitle={`${formatDate(p.date)} · ${p.method}${p.reference ? ` · ${p.reference}` : ""}`}
                last={i === all.length - 1}
              />
            ))}
          </Card>
        </View>
      )}
      <View style={{ gap: space.sm }}>
        {actions}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button title="Print" icon="print-outline" tone="secondary" style={{ flex: 1 }} onPress={() => void (printable() && printDocument(printable()!))} />
          <Button title="Share PDF" icon="share-outline" tone="secondary" style={{ flex: 1 }} onPress={() => void (printable() && shareDocumentPdf(printable()!))} />
        </View>
      </View>
    </Screen>
  );
}
