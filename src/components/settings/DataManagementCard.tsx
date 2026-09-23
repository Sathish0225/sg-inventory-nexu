import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { downloadFile } from "@/lib/html";
import { todayISO } from "@/lib/calc";
import { useStore } from "@/store/useStore";

const DATA_KEYS = [
  "settings",
  "customers",
  "inventory",
  "stockMovements",
  "jobs",
  "attendance",
  "quotations",
  "salesOrders",
  "invoices",
  "counters",
] as const;

/** Data lives in this browser (localStorage); backups are the way to move or protect it. */
const DataManagementCard = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const backup = () => {
    const state = useStore.getState();
    const data = Object.fromEntries(DATA_KEYS.map((k) => [k, state[k]]));
    downloadFile(
      `inventrack-backup-${todayISO()}.json`,
      JSON.stringify({ app: "inventrack-sg", version: 1, exportedAt: new Date().toISOString(), data }, null, 2),
      "application/json",
    );
    toast.success("Backup downloaded");
  };

  const restore = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== "inventrack-sg" || typeof parsed.data !== "object") throw new Error("Not an InvenTrack backup");
      const missing = DATA_KEYS.filter((k) => !(k in parsed.data));
      if (missing.length) throw new Error(`Backup is missing: ${missing.join(", ")}`);
      const current = useStore.getState().settings;
      useStore.setState({ ...parsed.data, settings: { ...current, ...parsed.data.settings } });
      toast.success("Backup restored");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read backup file");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup &amp; restore</CardTitle>
        <CardDescription>
          All records are stored in this browser. Download a backup regularly and before clearing browser data.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button onClick={backup}>
          <Download className="mr-2 h-4 w-4" /> Download backup
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Restore from file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void restore(file);
            e.target.value = "";
          }}
        />
        <Button variant="ghost" className="text-destructive" onClick={() => setConfirmReset(true)}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset to demo data
        </Button>
        <ConfirmDialog
          open={confirmReset}
          onOpenChange={setConfirmReset}
          title="Reset all data?"
          description="Every customer, job, quotation, order and invoice in this browser will be replaced with demo data."
          confirmLabel="Reset"
          onConfirm={() => {
            useStore.getState().resetDemoData();
            setConfirmReset(false);
            toast.success("Demo data restored");
          }}
        />
      </CardContent>
    </Card>
  );
};

export default DataManagementCard;
