import { openDB } from "idb";
import type { FoilCalibrationDatabase, FoilCalibrationSample } from "@/lib/interfaces/foil-calibration";
import { FOIL_CALIBRATION_SAMPLE_LIMIT } from "@/lib/constants/foil-calibration";

function database() {
  return openDB<FoilCalibrationDatabase>("mault-foil-calibration", 1, {
    upgrade(db) {
      db.createObjectStore("samples", { keyPath: "id" });
    },
  });
}

export async function loadFoilSamples(orgId: string, deviceGuid: string) {
  const db = await database();
  try {
    const all = await db.getAll("samples");
    const samples = all
      .filter((sample) => sample.orgId === orgId && sample.deviceGuid === deviceGuid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { samples, totalCount: all.length };
  } finally {
    db.close();
  }
}

export async function saveFoilSample(sample: FoilCalibrationSample) {
  const db = await database();
  try {
    const tx = db.transaction("samples", "readwrite");
    if (await tx.store.count() >= FOIL_CALIBRATION_SAMPLE_LIMIT) {
      await tx.done;
      throw new Error("Foil calibration sample storage limit reached");
    }
    await tx.store.add(sample);
    await tx.done;
  } finally {
    db.close();
  }
}

export async function deleteFoilSample(id: string) {
  const db = await database();
  try {
    await db.delete("samples", id);
  } finally {
    db.close();
  }

}

export async function updateFoilSample(sample: FoilCalibrationSample) {
  const db = await database();
  try {
    const tx = db.transaction("samples", "readwrite");
    if (!(await tx.store.get(sample.id))) {
      await tx.done;
      throw new Error("Foil sample no longer exists");
    }
    await tx.store.put(sample);
    await tx.done;
  } finally {
    db.close();
  }
}

export function exportFoilSample(sample: FoilCalibrationSample) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(sample)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `mault-foil-calibration-${sample.id}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
