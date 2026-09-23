import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  Calendar,
  CheckCircle2,
  Clock,
  LogIn,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Timer,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import SearchInput from "@/components/common/SearchInput";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import ServiceForm from "@/components/forms/ServiceForm";
import {
  attendanceHours,
  formatDate,
  formatHours,
  formatSGD,
  partsTotal,
  todayISO,
} from "@/lib/calc";
import { printServiceReport } from "@/lib/print";
import { notify } from "@/lib/result";
import { useCan, useStore, type NewServiceJob } from "@/store/useStore";
import type { JobStatus, ServiceJob } from "@/types";

const filters: ("All" | JobStatus)[] = [
  "All",
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
];

const ServicePage = () => {
  const navigate = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const attendance = useStore((s) => s.attendance);
  const invoices = useStore((s) => s.invoices);
  const settings = useStore((s) => s.settings);
  const store = useStore.getState;
  const me = useStore((s) => s.user);
  const canManage = useCan("jobs:manage");
  const canWrite = useCan("jobs:write");
  const canInvoice = useCan("invoices:write");
  const canAttendAny = useCan("attendance:manage");
  const canAttendSelf = useCan("attendance:self");
  /** Technicians may only work on jobs assigned to them. */
  const isMine = (job: ServiceJob) => job.technician === me?.name;
  const canEdit = (job: ServiceJob) => canManage || (canWrite && isMine(job));

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceJob | null>(null);
  const [preset, setPreset] = useState<Partial<NewServiceJob> | undefined>();
  const [deleting, setDeleting] = useState<ServiceJob | null>(null);

  const today = todayISO();
  const hoursFor = (jobId: string) =>
    attendance
      .filter((a) => a.jobId === jobId)
      .reduce((s, a) => s + attendanceHours(a), 0);

  const rows = useMemo(
    () =>
      jobs
        .filter((j) => {
          const term = search.toLowerCase();
          const matches = [j.jobNumber, j.customer, j.technician, j.site].some(
            (v) => v.toLowerCase().includes(term),
          );
          return matches && (filter === "All" || j.status === filter);
        })
        .sort(
          (a, b) =>
            b.dateScheduled.localeCompare(a.dateScheduled) ||
            b.jobNumber.localeCompare(a.jobNumber),
        ),
    [jobs, search, filter],
  );

  const openForm = (job: ServiceJob | null, p?: Partial<NewServiceJob>) => {
    setEditing(job);
    setPreset(p);
    setFormOpen(true);
  };

  const save = async (data: NewServiceJob) => {
    if (editing) {
      // Parts are immutable once deducted; don't send them back.
      const patch: Partial<NewServiceJob> = { ...data };
      if (editing.partsDeducted) delete patch.partsUsed;
      if (
        notify(
          await store().updateJob(editing.id, patch),
          `${editing.jobNumber} updated`,
        )
      )
        setFormOpen(false);
    } else {
      const r = await store().addJob(data);
      if (notify(r, r.ok ? `${r.value.jobNumber} created` : undefined))
        setFormOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Jobs"
        description="Schedule field work, track parts and attendance, and bill completed jobs."
        actions={
          canManage && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  openForm(null, {
                    serviceType: "Emergency Repair",
                    priority: "High",
                  })
                }
              >
                <AlertOctagon className="mr-2 h-4 w-4" /> Emergency
              </Button>
              <Button onClick={() => openForm(null)}>
                <Plus className="mr-2 h-4 w-4" /> New job
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's jobs"
          value={jobs.filter((j) => j.dateScheduled === today).length}
          icon={Calendar}
        />
        <StatCard
          label="In progress"
          value={jobs.filter((j) => j.status === "In Progress").length}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Completed, not invoiced"
          value={
            jobs.filter((j) => j.status === "Completed" && !j.invoiceId).length
          }
          icon={Receipt}
          tone="violet"
        />
        <StatCard
          label="Completed"
          value={jobs.filter((j) => j.status === "Completed").length}
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search job, customer, site or technician…"
            />
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as typeof filter)}
            >
              <TabsList className="flex-wrap">
                {filters.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={Wrench} title="No service jobs found" />
          ) : (
            <div className="space-y-3">
              {rows.map((job) => {
                const hours = hoursFor(job.id);
                const invoice = invoices.find((i) => i.id === job.invoiceId);
                const open =
                  job.status === "Scheduled" || job.status === "In Progress";
                return (
                  <div
                    key={job.id}
                    className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{job.jobNumber}</h3>
                          <StatusBadge status={job.status} />
                          <StatusBadge status={job.priority} />
                          {invoice && (
                            <StatusBadge
                              status={`Invoiced ${invoice.number}`}
                              className="bg-muted text-muted-foreground"
                            />
                          )}
                        </div>
                        <p className="mt-1 text-sm">
                          <span className="font-medium">{job.serviceType}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            — {job.description}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {open &&
                          (canAttendAny || (canAttendSelf && isMine(job))) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(`/attendance?job=${job.id}`)
                              }
                            >
                              <LogIn className="mr-1 h-4 w-4" /> Check in
                            </Button>
                          )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${job.jobNumber}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit(job) && (
                              <DropdownMenuItem onClick={() => openForm(job)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                printServiceReport(
                                  job,
                                  attendance.filter((a) => a.jobId === job.id),
                                  settings,
                                )
                              }
                            >
                              <Printer className="mr-2 h-4 w-4" /> Service
                              report
                            </DropdownMenuItem>
                            {open && canEdit(job) && (
                              <DropdownMenuItem
                                onClick={async () =>
                                  notify(
                                    await store().updateJob(job.id, {
                                      status: "Completed",
                                    }),
                                    `${job.jobNumber} completed${job.partsUsed.some((p) => p.itemId) ? " — parts deducted from stock" : ""}`,
                                  )
                                }
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark
                                completed
                              </DropdownMenuItem>
                            )}
                            {!job.invoiceId &&
                              job.status !== "Cancelled" &&
                              canInvoice && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    const r =
                                      await store().createInvoiceFromJob(
                                        job.id,
                                      );
                                    if (
                                      notify(
                                        r,
                                        r.ok
                                          ? `Draft invoice ${r.value.number} created`
                                          : undefined,
                                      )
                                    )
                                      navigate("/invoices");
                                  }}
                                >
                                  <Receipt className="mr-2 h-4 w-4" /> Create
                                  invoice
                                </DropdownMenuItem>
                              )}
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleting(job)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Customer
                        </p>
                        <p className="font-medium">{job.customer}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Site</p>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />{" "}
                          {job.site}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Technician
                        </p>
                        <p className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />{" "}
                          {job.technician}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Scheduled
                        </p>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />{" "}
                          {formatDate(job.dateScheduled)} {job.timeScheduled}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Hours · Parts
                        </p>
                        <p className="tabular flex items-center gap-1">
                          <Timer className="h-3 w-3 text-muted-foreground" />{" "}
                          {formatHours(hours)} · {formatSGD(partsTotal(job))}
                        </p>
                      </div>
                    </div>
                    {job.notes && (
                      <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                        {job.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceForm
        open={formOpen}
        job={editing}
        preset={preset}
        restricted={!canManage}
        onOpenChange={setFormOpen}
        onSave={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.jobNumber}?`}
        description="The job and its attendance records will be removed. Invoiced jobs can't be deleted."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting)
            notify(
              await store().deleteJob(deleting.id),
              `${deleting.jobNumber} deleted`,
            );
          setDeleting(null);
        }}
      />
    </div>
  );
};

export default ServicePage;
