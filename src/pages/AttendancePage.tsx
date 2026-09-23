import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CalendarClock,
  Download,
  LogIn,
  LogOut,
  MapPin,
  Timer,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import {
  addDays,
  attendanceHours,
  formatDate,
  formatHours,
  todayISO,
} from "@/lib/calc";
import { csvCell, downloadFile } from "@/lib/html";
import { notify } from "@/lib/result";
import { useCan, useStore } from "@/store/useStore";
import { getLocation, locationCaptureDefault } from "@/lib/platform";
import type { AttendanceRecord, GeoPoint } from "@/types";

const ALL = "__all";


const mapsLink = (p: GeoPoint) =>
  `https://www.google.com/maps?q=${p.lat},${p.lng}`;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
  });
const localDate = (iso: string) => todayISO(new Date(iso));

/** Re-render every 30s so on-site durations stay live. */
const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
};

const AttendancePage = () => {
  const attendance = useStore((s) => s.attendance);
  const jobs = useStore((s) => s.jobs);
  const allTechnicians = useStore((s) => s.settings.technicians);
  const me = useStore((s) => s.user);
  const store = useStore.getState;
  const canManage = useCan("attendance:manage");
  const canSelf = useCan("attendance:self");
  // Technicians check themselves in; managers can record visits for anyone.
  const technicians = canManage ? allTechnicians : me ? [me.name] : [];
  const selfOnly = !canManage && canSelf;
  const now = useNow();
  const today = todayISO(now);

  // "Check in" on the Service Jobs page links here with ?job=<id> to preselect the job.
  const [params] = useSearchParams();
  const presetJob = jobs.find((j) => j.id === params.get("job"));
  const [jobId, setJobId] = useState(presetJob?.id ?? "");
  const [technician, setTechnician] = useState(
    (selfOnly ? me?.name : presetJob?.technician) ?? "",
  );
  const [captureLocation, setCaptureLocation] = useState(locationCaptureDefault);
  const [busy, setBusy] = useState(false);
  const [checkingOut, setCheckingOut] = useState<AttendanceRecord | null>(null);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [deleting, setDeleting] = useState<AttendanceRecord | null>(null);
  const [techFilter, setTechFilter] = useState(ALL);
  const [from, setFrom] = useState(addDays(today, -6));
  const [to, setTo] = useState(today);

  const jobById = (id: string) => jobs.find((j) => j.id === id);
  const attendableJobs = jobs
    .filter((j) => j.status === "Scheduled" || j.status === "In Progress")
    .filter((j) => !selfOnly || j.technician === me?.name)
    .sort((a, b) => a.dateScheduled.localeCompare(b.dateScheduled));
  const onSite = attendance.filter((a) => !a.checkOut);
  const todays = attendance.filter((a) => localDate(a.checkIn) === today);
  const weekStart = addDays(today, -6);
  const hoursIn = (records: AttendanceRecord[]) =>
    records.reduce((s, a) => s + attendanceHours(a, now), 0);

  const timesheet = useMemo(
    () =>
      attendance
        .filter((a) => {
          const d = localDate(a.checkIn);
          return (
            d >= from &&
            d <= to &&
            (techFilter === ALL || a.technician === techFilter)
          );
        })
        .sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
    [attendance, from, to, techFilter],
  );

  const perTech = useMemo(() => {
    const totals = new Map<string, { hours: number; visits: number }>();
    for (const a of timesheet) {
      const t = totals.get(a.technician) ?? { hours: 0, visits: 0 };
      totals.set(a.technician, {
        hours: t.hours + attendanceHours(a, now),
        visits: t.visits + 1,
      });
    }
    return [...totals.entries()].sort((a, b) => b[1].hours - a[1].hours);
  }, [timesheet, now]);

  const selectJob = (id: string) => {
    setJobId(id);
    const job = jobById(id);
    if (job && !technician) setTechnician(job.technician);
  };

  const doCheckIn = async () => {
    if (!jobId || !technician) return;
    setBusy(true);
    const location = captureLocation ? await getLocation() : null;
    if (captureLocation && !location)
      toast.info("Location unavailable — checked in without GPS.");
    const r = await store().checkIn(jobId, technician, location);
    setBusy(false);
    if (notify(r, `${technician} checked in to ${jobById(jobId)?.jobNumber}`)) {
      setJobId("");
      if (!selfOnly) setTechnician("");
    }
  };

  const doCheckOut = async () => {
    if (!checkingOut) return;
    setBusy(true);
    const location = captureLocation ? await getLocation() : null;
    const r = await store().checkOut(
      checkingOut.id,
      checkoutNotes.trim(),
      location,
    );
    setBusy(false);
    if (notify(r, `${checkingOut.technician} checked out`)) {
      setCheckingOut(null);
      setCheckoutNotes("");
    }
  };

  const exportCsv = () => {
    const header = [
      "Date",
      "Technician",
      "Job",
      "Customer",
      "Site",
      "Check-in",
      "Check-out",
      "Hours",
      "Notes",
    ];
    const lines = timesheet.map((a) => {
      const job = jobById(a.jobId);
      return [
        localDate(a.checkIn),
        a.technician,
        job?.jobNumber ?? "",
        job?.customer ?? "",
        job?.site ?? "",
        new Date(a.checkIn).toLocaleString("en-SG"),
        a.checkOut ? new Date(a.checkOut).toLocaleString("en-SG") : "",
        attendanceHours(a, now).toFixed(2),
        a.notes,
      ]
        .map(csvCell)
        .join(",");
    });
    downloadFile(
      `timesheet-${from}-to-${to}.csv`,
      [header.join(","), ...lines].join("\n"),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Attendance"
        description="Technicians check in and out of service jobs on site. Hours feed timesheets and job invoices."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="On site now"
          value={onSite.length}
          icon={UserCheck}
          tone="amber"
        />
        <StatCard
          label="Visits today"
          value={todays.length}
          icon={CalendarClock}
        />
        <StatCard
          label="Hours today"
          value={formatHours(hoursIn(todays))}
          icon={Timer}
          tone="green"
        />
        <StatCard
          label="Hours (7 days)"
          value={formatHours(
            hoursIn(
              attendance.filter((a) => localDate(a.checkIn) >= weekStart),
            ),
          )}
          icon={Users}
          tone="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {(canManage || canSelf) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Check in</CardTitle>
              <CardDescription>
                Start a site visit for a scheduled or in-progress job.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="att-job">Service job</Label>
                <Select value={jobId} onValueChange={selectJob}>
                  <SelectTrigger id="att-job">
                    <SelectValue
                      placeholder={
                        attendableJobs.length ? "Select job" : "No open jobs"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {attendableJobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.jobNumber} · {j.customer} (
                        {formatDate(j.dateScheduled)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="att-tech">Technician</Label>
                <Select
                  value={technician}
                  onValueChange={setTechnician}
                  disabled={selfOnly}
                >
                  <SelectTrigger id="att-tech">
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="att-gps">Capture GPS location</Label>
                  <p className="text-xs text-muted-foreground">
                    Recorded at check-in and check-out as proof of attendance.
                  </p>
                </div>
                <Switch
                  id="att-gps"
                  checked={captureLocation}
                  onCheckedChange={setCaptureLocation}
                />
              </div>
              <Button
                onClick={doCheckIn}
                disabled={!jobId || !technician || busy}
              >
                <LogIn className="mr-2 h-4 w-4" />{" "}
                {busy ? "Locating…" : "Check in"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card
          className={canManage || canSelf ? "lg:col-span-3" : "lg:col-span-5"}
        >
          <CardHeader>
            <CardTitle className="text-base">On site now</CardTitle>
            <CardDescription>Open visits, with live duration.</CardDescription>
          </CardHeader>
          <CardContent>
            {onSite.length === 0 ? (
              <EmptyState icon={UserCheck} title="Nobody is checked in" />
            ) : (
              <ul className="space-y-3">
                {onSite.map((a) => {
                  const job = jobById(a.jobId);
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {a.technician}{" "}
                          <StatusBadge status="On Site" className="ml-1" />
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {job?.jobNumber} · {job?.customer} · {job?.site}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Since {time(a.checkIn)} ·{" "}
                          <span className="tabular">
                            {formatHours(attendanceHours(a, now))}
                          </span>
                          {a.checkInLocation && (
                            <a
                              className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline"
                              href={mapsLink(a.checkInLocation)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MapPin className="h-3 w-3" /> map
                            </a>
                          )}
                        </p>
                      </div>
                      {(canManage ||
                        (canSelf && a.technician === me?.name)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCheckingOut(a)}
                        >
                          <LogOut className="mr-1 h-4 w-4" /> Check out
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="text-base">Timesheet</CardTitle>
            <CardDescription>
              {timesheet.length} visit{timesheet.length === 1 ? "" : "s"} ·{" "}
              {formatHours(hoursIn(timesheet))}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <Label htmlFor="ts-tech" className="text-xs">
                Technician
              </Label>
              <Select value={techFilter} onValueChange={setTechFilter}>
                <SelectTrigger id="ts-tech" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All technicians</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="ts-from" className="text-xs">
                From
              </Label>
              <Input
                id="ts-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="ts-to" className="text-xs">
                To
              </Label>
              <Input
                id="ts-to"
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              variant="outline"
              onClick={exportCsv}
              disabled={timesheet.length === 0}
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {perTech.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {perTech.map(([tech, t]) => (
                <div
                  key={tech}
                  className="rounded-md border px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{tech}</span>{" "}
                  <span className="tabular text-muted-foreground">
                    {formatHours(t.hours)} · {t.visits} visit
                    {t.visits === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {timesheet.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No visits in this period" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timesheet.map((a) => {
                    const job = jobById(a.jobId);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          {formatDate(localDate(a.checkIn))}
                        </TableCell>
                        <TableCell>{a.technician}</TableCell>
                        <TableCell>
                          <p className="font-medium">
                            {job?.jobNumber ?? "Deleted job"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {job?.customer}
                          </p>
                        </TableCell>
                        <TableCell className="tabular">
                          {time(a.checkIn)}
                          {a.checkInLocation && (
                            <a
                              href={mapsLink(a.checkInLocation)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Check-in location"
                            >
                              <MapPin className="ml-1 inline h-3 w-3 text-primary" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="tabular">
                          {a.checkOut ? (
                            time(a.checkOut)
                          ) : (
                            <StatusBadge status="On Site" />
                          )}
                          {a.checkOutLocation && (
                            <a
                              href={mapsLink(a.checkOutLocation)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Check-out location"
                            >
                              <MapPin className="ml-1 inline h-3 w-3 text-primary" />
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatHours(attendanceHours(a, now))}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {a.notes}
                        </TableCell>
                        <TableCell>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete visit"
                              onClick={() => setDeleting(a)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={checkingOut !== null}
        onOpenChange={(o) => !o && setCheckingOut(null)}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Check out {checkingOut?.technician}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="co-notes">Work done / notes</Label>
            <Textarea
              id="co-notes"
              rows={4}
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="e.g. Replaced switch, tested all ports, customer briefed."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckingOut(null)}>
              Cancel
            </Button>
            <Button onClick={doCheckOut} disabled={busy}>
              <LogOut className="mr-2 h-4 w-4" />{" "}
              {busy ? "Locating…" : "Check out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this visit?"
        description="The attendance record will be removed from the timesheet."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting)
            notify(
              await store().deleteAttendance(deleting.id),
              "Visit deleted",
            );
          setDeleting(null);
        }}
      />
    </div>
  );
};

export default AttendancePage;
