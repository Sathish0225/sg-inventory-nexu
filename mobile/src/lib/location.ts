import * as Location from "expo-location";
import type { GeoPoint } from "@/types";

/**
 * Best-effort GPS fix for attendance, or null (permission denied, no fix in time). The wait is
 * capped so a slow fix never blocks a technician from checking in.
 */
export async function currentLocation(maxWaitMs = 10_000): Promise<GeoPoint | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const fix = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then((p) => ({
      lat: p.coords.latitude,
      lng: p.coords.longitude,
    }));
    const giveUp = new Promise<null>((resolve) => setTimeout(() => resolve(null), maxWaitMs));
    return await Promise.race([fix, giveUp]);
  } catch {
    return null;
  }
}
