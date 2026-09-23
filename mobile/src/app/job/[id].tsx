import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Platform, TextInput, View } from "react-native";
import { attendanceHours, formatHours, partsTotal } from "@/lib/calc";
import { serviceReportDocument } from "@/lib/documents";
import type { AttendanceRecord, GeoPoint, Invoice } from "@/types";
import { api, useAction, useCollection } from "~/lib/data";
import { formatDate, formatDayTime, formatSGD, formatTime } from "~/lib/format";
import { currentLocation } from "~/lib/location";
import { printDocument, shareDocumentPdf } from "~/lib/printing";
import { useCan, useSession } from "~/lib/session";
import { Badge, Button, Card, Empty, KeyValue, ListRow, Screen, SectionTitle, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

const confirm = (title: string, message: string, action: string) =>
  new Promise<boolean>((resolve) => {
    if (Platform.OS === "web") return resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: action, onPress: () => resolve(true) },
    ]);
  });

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const c = useColors();
  const jobs = useCollection("jobs");
  const attendance = useCollection("attendance");
  const settings = useCollection("settings");
  const manager = useCan("jobs:manage");
  const canWrite = useCan("jobs:write");
  const canAttendAny = useCan("attendance:manage");
  const canAttendSelf = useCan("attendance:self");
  const canInvoice = useCan("invoices:write");
  const [notes, setNotes] = useState("");
  const [locating, setLocating] = useState(false);

  const job = jobs.data.find((j) => j.id === id);
  const visits = attendance.data.filter((a) => a.jobId === id);
  const me = user?.name ?? "";

  const checkIn = useAction(
    (location: GeoPoint | null) => api.post<AttendanceRecord>("/attendance/check-in", { jobId: id, technician: me, location }),
    ["attendance", "jobs"],
  );
  const checkOut = useAction(
    (args: { recordId: string; notes: string; location: GeoPoint | null }) =>
      api.post(`/attendance/${args.recordId}/check-out`, { notes: args.notes, location: args.location }),
    ["attendance"],
  );
  const complete = useAction(() => api.patch(`/jobs/${id}`, { status: "Completed" }), ["jobs", "inventory", "stockMovements"]);
  const invoice = useAction(() => api.post<Invoice>(`/jobs/${id}/invoice`), ["jobs", "invoices"]);

  if (!job) return <Empty icon="construct-outline" title={jobs.loading ? "Loading…" : "Job not found"} />;

  const isMine = job.technician === me;
  const isOpen = job.status === "Scheduled" || job.status === "In Progress";
  const myOpenVisit = attendance.data.find((a) => !a.checkOut && a.technician === me);
  const openHere = myOpenVisit?.jobId === job.id ? myOpenVisit : undefined;
  const canCheckIn = isOpen && (canAttendAny || (canAttendSelf && isMine));
  const canEdit = manager || (canWrite && isMine);
  const hours = visits.reduce((s, v) => s + attendanceHours(v), 0);

  const doCheckIn = async () => {
    setLocating(true);
    const location = await currentLocation();
    setLocating(false);
    const r = await checkIn.run(location);
    if (r.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!location) Alert.alert("Checked in", "Location wasn't available, so the visit was recorded without GPS.");
    }
  };

  const doCheckOut = async () => {
    if (!openHere) return;
    setLocating(true);
    const location = await currentLocation();
    setLocating(false);
    const r = await checkOut.run({ recordId: openHere.id, notes: notes.trim(), location });
    if (r.ok) {
      setNotes("");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const doComplete = async () => {
    const parts = job.partsUsed.some((p) => p.itemId);
    if (!(await confirm(`Complete ${job.jobNumber}?`, parts ? "Parts from stock will be deducted." : "The job will be marked completed.", "Complete"))) return;
    await complete.run(undefined);
  };

  const doInvoice = async () => {
    const r = await invoice.run(undefined);
    if (r.ok) router.push(`/doc/invoice/${r.value.id}`);
  };

  const report = () => settings.data && serviceReportDocument(job, visits, settings.data);

  return (
    <Screen refreshing={jobs.refreshing} onRefresh={() => void Promise.all([jobs.refetch(), attendance.refetch()])}>
      <Stack.Screen options={{ title: job.jobNumber }} />

      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
          <Badge status={job.status} />
          <Badge status={job.priority} />
          {job.invoiceId && <Badge status="Invoiced" />}
        </View>
        <Text variant="heading">{job.customer}</Text>
        <Text muted>
          {job.serviceType} — {job.description}
        </Text>
      </Card>

      {openHere ? (
        <Card style={{ gap: space.md, borderColor: c.warning }}>
          <Text variant="label" color={c.warning}>
            YOU'RE ON SITE SINCE {formatTime(openHere.checkIn)}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Work done / notes (optional)"
            placeholderTextColor={c.muted}
            multiline
            accessibilityLabel="Work done notes"
            style={{ minHeight: 72, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: space.md, color: c.text, backgroundColor: c.input, textAlignVertical: "top" }}
          />
          <Button title={locating ? "Getting location…" : "Check out"} icon="log-out-outline" onPress={doCheckOut} loading={checkOut.busy || locating} />
        </Card>
      ) : (
        canCheckIn && (
          <Button
            title={locating ? "Getting location…" : myOpenVisit ? "Checked in to another job" : "Check in"}
            icon="log-in-outline"
            onPress={doCheckIn}
            loading={checkIn.busy || locating}
            disabled={Boolean(myOpenVisit)}
          />
        )
      )}

      <Card style={{ gap: space.md }}>
        <KeyValue label="Site" value={job.site} />
        <KeyValue label="Scheduled" value={`${formatDate(job.dateScheduled)} ${job.timeScheduled}`} />
        <KeyValue label="Technician" value={job.technician} />
        <KeyValue label="Time on site" value={formatHours(hours)} />
        <Button
          title="Directions"
          tone="secondary"
          icon="navigate-outline"
          onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.site} ${job.customer} Singapore`)}`)}
        />
      </Card>

      <View style={{ gap: space.sm }}>
        <SectionTitle>Parts used</SectionTitle>
        <Card style={{ paddingVertical: 0 }}>
          {job.partsUsed.length === 0 ? (
            <Text muted style={{ paddingVertical: space.lg }}>
              No parts recorded.
            </Text>
          ) : (
            <>
              {job.partsUsed.map((p, i) => (
                <ListRow key={i} title={p.item} subtitle={`${p.quantity} × ${formatSGD(p.cost)}`} right={<Text variant="money">{formatSGD(p.quantity * p.cost)}</Text>} />
              ))}
              <ListRow title="Total" right={<Text variant="money">{formatSGD(partsTotal(job))}</Text>} last />
            </>
          )}
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionTitle>Visits</SectionTitle>
        <Card style={{ paddingVertical: 0 }}>
          {visits.length === 0 ? (
            <Text muted style={{ paddingVertical: space.lg }}>
              No visits yet.
            </Text>
          ) : (
            visits.map((v, i) => (
              <ListRow
                key={v.id}
                icon={v.checkInLocation ? "location-outline" : "time-outline"}
                title={`${v.technician} · ${formatHours(attendanceHours(v))}`}
                subtitle={`${formatDayTime(v.checkIn)} → ${v.checkOut ? formatTime(v.checkOut) : "on site"}${v.notes ? `\n${v.notes}` : ""}`}
                onPress={
                  v.checkInLocation
                    ? () => void Linking.openURL(`https://www.google.com/maps?q=${v.checkInLocation!.lat},${v.checkInLocation!.lng}`)
                    : undefined
                }
                last={i === visits.length - 1}
              />
            ))
          )}
        </Card>
      </View>

      {job.notes ? (
        <Card>
          <Text variant="label" muted>
            NOTES
          </Text>
          <Text style={{ marginTop: 4 }}>{job.notes}</Text>
        </Card>
      ) : null}

      <View style={{ gap: space.sm }}>
        {isOpen && canEdit && <Button title="Mark completed" icon="checkmark-circle-outline" tone="secondary" onPress={doComplete} loading={complete.busy} />}
        {!job.invoiceId && job.status !== "Cancelled" && canInvoice && (
          <Button title="Create invoice" icon="receipt-outline" tone="secondary" onPress={doInvoice} loading={invoice.busy} />
        )}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button title="Print report" icon="print-outline" tone="secondary" style={{ flex: 1 }} onPress={() => void (report() && printDocument(report()!))} />
          <Button title="Share PDF" icon="share-outline" tone="secondary" style={{ flex: 1 }} onPress={() => void (report() && shareDocumentPdf(report()!))} />
        </View>
      </View>
      {!isMine && !manager && (
        <Text variant="caption" muted style={{ textAlign: "center" }}>
          <Ionicons name="lock-closed-outline" /> This job is assigned to {job.technician}.
        </Text>
      )}
    </Screen>
  );
}
