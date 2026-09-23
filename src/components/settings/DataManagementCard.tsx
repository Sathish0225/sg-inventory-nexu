import { toast } from "sonner";
import { Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayISO } from "@/lib/calc";
import { downloadFile } from "@/lib/html";
import { useStore } from "@/store/useStore";

const EXPORT_KEYS = [
  "settings",
  "customers",
  "inventory",
  "jobs",
  "attendance",
  "quotations",
  "salesOrders",
  "invoices",
] as const;

/** Data now lives in the PostgreSQL database; this offers a readable export of what you can see. */
const DataManagementCard = () => {
  const exportJson = () => {
    const state = useStore.getState();
    const data = Object.fromEntries(EXPORT_KEYS.map((k) => [k, state[k]]));
    downloadFile(
      `inventrack-export-${todayISO()}.json`,
      JSON.stringify({ app: "inventrack-sg", exportedAt: new Date().toISOString(), data }, null, 2),
      "application/json",
    );
    toast.success("Export downloaded");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data</CardTitle>
        <CardDescription>All records are stored in the company PostgreSQL database and shared by every user.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Database className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Backups are taken on the server with <code className="rounded bg-muted px-1">pg_dump</code> (see the README).
            Schedule them daily and keep copies off the server.
          </p>
        </div>
        <Button variant="outline" onClick={exportJson}>
          <Download className="mr-2 h-4 w-4" /> Export data (JSON)
        </Button>
      </CardContent>
    </Card>
  );
};

export default DataManagementCard;
