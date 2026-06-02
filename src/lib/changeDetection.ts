import { GLOBAL_DATASETS } from "@/services/datasetService";

/** Re-enable when change detection is ready for users. */
export const ENABLE_CHANGE_DETECTION = false;

/** Layers that are static snapshots — not meaningful for date-based comparison. */
export const CHANGE_DETECTION_STATIC_IDS = new Set([
  "terrain",
  "landcover",
  "soilgrids_baseline",
  "population",
  "gfsad_cropland_extent",
  "fao_drained_organic_soils",
  "forest_loss_drivers_wri_gdm",
]);

/** All catalog layers available in the change-detection picker (non-static). */
export const CHANGE_DETECTION_DATASET_IDS = new Set(
  GLOBAL_DATASETS.filter((ds) => !CHANGE_DETECTION_STATIC_IDS.has(ds.id)).map((ds) => ds.id)
);

export function isChangeDetectionDataset(id: string): boolean {
  return CHANGE_DETECTION_DATASET_IDS.has(id);
}
