import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import type { JobStatus } from "@/types";
import { useCollection } from "~/lib/data";
import { formatDate } from "~/lib/format";
import { useCan, useSession } from "~/lib/session";
import { Badge, Card, Empty, ListRow, Screen, SearchBar, Segmented, Text } from "~/ui/components";
import { space } from "~/ui/theme";

type Filter = "open" | "done" | "all";
const open: JobStatus[] = ["Scheduled", "In Progress"];

export default function Jobs() {
  const { user } = useSession();
  const manager = useCan("jobs:manage");
  const jobs = useCollection("jobs");
  const [filter, setFilter] = useState<Filter>("open");
  const [scope, setScope] = useState<"mine" | "everyone">(manager ? "everyone" : "mine");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return jobs.data
      .filter((j) => scope === "everyone" || j.technician === user?.name)
      .filter((j) => (filter === "open" ? open.includes(j.status) : filter === "done" ? !open.includes(j.status) : true))
      .filter((j) => [j.jobNumber, j.customer, j.site, j.technician].some((v) => v.toLowerCase().includes(term)))
      .sort((a, b) =>
        filter === "open"
          ? (a.dateScheduled + a.timeScheduled).localeCompare(b.dateScheduled + b.timeScheduled)
          : b.dateScheduled.localeCompare(a.dateScheduled),
      );
  }, [jobs.data, filter, scope, search, user?.name]);

  return (
    <Screen refreshing={jobs.refreshing} onRefresh={() => void jobs.refetch()}>
      <Segmented
        value={scope}
        onChange={setScope}
        options={[
          { value: "mine", label: "My jobs" },
          { value: "everyone", label: "Everyone" },
        ]}
      />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
          { value: "all", label: "All" },
        ]}
      />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search job, customer, site…" />
      {rows.length === 0 ? (
        <Empty icon="construct-outline" title={jobs.loading ? "Loading…" : "No jobs"} hint={jobs.loading ? undefined : "Try another filter."} />
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          {rows.map((j, i) => (
            <ListRow
              key={j.id}
              title={j.customer}
              subtitle={`${j.jobNumber} · ${formatDate(j.dateScheduled)} ${j.timeScheduled} · ${j.site}${scope === "everyone" ? ` · ${j.technician}` : ""}`}
              right={
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Badge status={j.status} />
                  {j.priority === "High" && <Badge status="High" />}
                </View>
              }
              onPress={() => router.push(`/job/${j.id}`)}
              last={i === rows.length - 1}
            />
          ))}
        </Card>
      )}
      <Text variant="caption" muted style={{ textAlign: "center", marginTop: space.sm }}>
        New jobs are scheduled from the web or desktop app.
      </Text>
    </Screen>
  );
}
