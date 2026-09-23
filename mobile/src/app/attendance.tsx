import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { addDays, attendanceHours, formatHours, todayISO } from "@/lib/calc";
import { useCollection } from "~/lib/data";
import { formatDayTime, formatTime } from "~/lib/format";
import { useCan, useSession } from "~/lib/session";
import { Card, Empty, ListRow, Screen, SectionTitle, Segmented, Stat, Text } from "~/ui/components";
import { space } from "~/ui/theme";

export default function Attendance() {
  const { user } = useSession();
  const everyone = useCan("attendance:read");
  const attendance = useCollection("attendance");
  const jobs = useCollection("jobs");
  const [range, setRange] = useState<"7" | "30">("7");

  const since = addDays(todayISO(), range === "7" ? -6 : -29);
  const visits = useMemo(
    () => attendance.data.filter((a) => a.checkIn.slice(0, 10) >= since).sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
    [attendance.data, since],
  );
  const onSite = attendance.data.filter((a) => !a.checkOut);
  const mine = visits.filter((v) => v.technician === user?.name);
  const hours = (list: typeof visits) => list.reduce((s, v) => s + attendanceHours(v), 0);
  const jobLabel = (id: string) => {
    const j = jobs.data.find((x) => x.id === id);
    return j ? `${j.jobNumber} · ${j.customer}` : "Job";
  };

  const perTech = useMemo(() => {
    const totals = new Map<string, number>();
    for (const v of visits) totals.set(v.technician, (totals.get(v.technician) ?? 0) + attendanceHours(v));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [visits]);

  return (
    <Screen refreshing={attendance.refreshing} onRefresh={() => void attendance.refetch()}>
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: "7", label: "Last 7 days" },
          { value: "30", label: "Last 30 days" },
        ]}
      />
      <View style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
        <Stat label="My hours" value={formatHours(hours(mine))} icon="time-outline" />
        <Stat label="My visits" value={mine.length} icon="location-outline" tone="violet" />
      </View>

      {everyone && (
        <View style={{ gap: space.sm }}>
          <SectionTitle>On site now</SectionTitle>
          <Card style={{ paddingVertical: 0 }}>
            {onSite.length === 0 ? (
              <Text muted style={{ paddingVertical: space.lg }}>
                Nobody is checked in.
              </Text>
            ) : (
              onSite.map((a, i) => (
                <ListRow
                  key={a.id}
                  title={a.technician}
                  subtitle={`${jobLabel(a.jobId)} · since ${formatTime(a.checkIn)}`}
                  onPress={() => router.push(`/job/${a.jobId}`)}
                  last={i === onSite.length - 1}
                />
              ))
            )}
          </Card>
        </View>
      )}

      {everyone && perTech.length > 0 && (
        <View style={{ gap: space.sm }}>
          <SectionTitle>Hours by technician</SectionTitle>
          <Card style={{ paddingVertical: 0 }}>
            {perTech.map(([tech, h], i) => (
              <ListRow key={tech} title={tech} right={<Text variant="money">{formatHours(h)}</Text>} last={i === perTech.length - 1} />
            ))}
          </Card>
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <SectionTitle>{everyone ? "All visits" : "My visits"}</SectionTitle>
        {visits.length === 0 ? (
          <Empty icon="time-outline" title="No visits in this period" />
        ) : (
          <Card style={{ paddingVertical: 0 }}>
            {visits.map((v, i) => (
              <ListRow
                key={v.id}
                title={`${everyone ? `${v.technician} · ` : ""}${formatHours(attendanceHours(v))}`}
                subtitle={`${jobLabel(v.jobId)}\n${formatDayTime(v.checkIn)} → ${v.checkOut ? formatTime(v.checkOut) : "on site"}`}
                onPress={() => router.push(`/job/${v.jobId}`)}
                last={i === visits.length - 1}
              />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}
