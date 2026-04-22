/**
 * Taksonomi snapshot — 2026-04-22 (Phase 4.9.2)
 *
 * Kaynak: retrieval-service/scripts/dump-category-tree.ts çıktısı
 * (docs/phase-4-reports/05-category-tree-2026-04-22.md). Toplam 26
 * template_group · 165 sub_type kaydı · 511 ürün.
 *
 * Admin API (Phase 4.9.4) bağlanınca bu modül `/admin/taxonomy`
 * fetch'ine devredilir — imza korunur.
 */

export type SubType = { sub: string; count: number };
export type TemplateGroup = {
  group: string;
  total: number;
  subs: SubType[];
};

export const TAXONOMY: TemplateGroup[] = [
  {
    group: "fragrance",
    total: 93,
    subs: [
      { sub: "vent_clip", count: 55 },
      { sub: "spray_perfume", count: 10 },
      { sub: "hanging_card", count: 9 },
      { sub: "home_fragrance", count: 7 },
      { sub: "odor_eliminator", count: 7 },
      { sub: "laundry_scent", count: 3 },
      { sub: "refill", count: 2 },
    ],
  },
  {
    group: "sprayers_bottles",
    total: 48,
    subs: [
      { sub: "pump_sprayer", count: 22 },
      { sub: "trigger_sprayer", count: 15 },
      { sub: "foaming_pump_sprayer", count: 10 },
      { sub: "dispenser_bottle", count: 1 },
    ],
  },
  {
    group: "polishing_pad",
    total: 33,
    subs: [
      { sub: "foam_pad", count: 26 },
      { sub: "wool_pad", count: 5 },
      { sub: "felt_pad", count: 1 },
      { sub: "microfiber_pad", count: 1 },
    ],
  },
  {
    group: "microfiber",
    total: 31,
    subs: [
      { sub: "wash_mitt", count: 8 },
      { sub: "buffing_cloth", count: 4 },
      { sub: "glass_cloth", count: 4 },
      { sub: "drying_towel", count: 3 },
      { sub: "multi_purpose_cloth", count: 3 },
      { sub: "interior_cloth", count: 2 },
      { sub: "kit", count: 2 },
      { sub: "chamois_drying_towel", count: 1 },
      { sub: "cleaning_cloth", count: 1 },
      { sub: "coating_cloth", count: 1 },
      { sub: "interior_cleaning_applicator", count: 1 },
      { sub: "suede_cloth", count: 1 },
    ],
  },
  {
    group: "car_shampoo",
    total: 30,
    subs: [
      { sub: "prewash_foaming_shampoo", count: 14 },
      { sub: "ph_neutral_shampoo", count: 6 },
      { sub: "ceramic_infused_shampoo", count: 3 },
      { sub: "decon_shampoo", count: 3 },
      { sub: "towel_wash", count: 2 },
      { sub: "ppf_shampoo", count: 1 },
      { sub: "rinseless_wash", count: 1 },
    ],
  },
  {
    group: "spare_part",
    total: 28,
    subs: [
      { sub: "backing_plate", count: 8 },
      { sub: "trigger_head", count: 4 },
      { sub: "maintenance_kit", count: 3 },
      { sub: "carbon_brush", count: 2 },
      { sub: "hose", count: 2 },
      { sub: "repair_part", count: 2 },
      { sub: "battery", count: 1 },
      { sub: "charger", count: 1 },
      { sub: "extension_kit", count: 1 },
      { sub: "handle", count: 1 },
      { sub: "nozzle", count: 1 },
      { sub: "nozzle_kit", count: 1 },
      { sub: "trigger_gun", count: 1 },
    ],
  },
  {
    group: "interior_cleaner",
    total: 25,
    subs: [
      { sub: "fabric_cleaner_concentrate", count: 4 },
      { sub: "interior_apc", count: 4 },
      { sub: "plastic_dressing", count: 3 },
      { sub: "surface_disinfectant", count: 2 },
      { sub: "degreaser", count: 1 },
      { sub: "fabric_cleaner", count: 1 },
      { sub: "fabric_leather_cleaner", count: 1 },
      { sub: "fabric_protector", count: 1 },
      { sub: "foam_cleaner", count: 1 },
      { sub: "heavy_duty_cleaner", count: 1 },
      { sub: "interior_detailer", count: 1 },
      { sub: "interior_disinfectant", count: 1 },
      { sub: "plastic_cleaner", count: 1 },
      { sub: "plastic_restorer", count: 1 },
      { sub: "wood_cleaner", count: 1 },
      { sub: "wood_protector", count: 1 },
    ],
  },
  {
    group: "abrasive_polish",
    total: 24,
    subs: [
      { sub: "heavy_cut_compound", count: 13 },
      { sub: "polish", count: 6 },
      { sub: "finish", count: 2 },
      { sub: "metal_polish", count: 1 },
      { sub: "one_step_polish", count: 1 },
      { sub: "sanding_paste", count: 1 },
    ],
  },
  {
    group: "ceramic_coating",
    total: 23,
    subs: [
      { sub: "paint_coating", count: 5 },
      { sub: "glass_coating", count: 3 },
      { sub: "fabric_coating", count: 2 },
      { sub: "single_layer_coating", count: 2 },
      { sub: "interior_coating", count: 1 },
      { sub: "leather_coating", count: 1 },
      { sub: "matte_coating", count: 1 },
      { sub: "multi_step_coating_kit", count: 1 },
      { sub: "paint_coating_kit", count: 1 },
      { sub: "ppf_coating", count: 1 },
      { sub: "spray_coating", count: 1 },
      { sub: "tire_coating", count: 1 },
      { sub: "top_coat", count: 1 },
      { sub: "trim_coating", count: 1 },
      { sub: "wheel_coating", count: 1 },
    ],
  },
  {
    group: "polisher_machine",
    total: 23,
    subs: [
      { sub: "mini_cordless_polisher", count: 5 },
      { sub: "other", count: 5 },
      { sub: "da_polisher", count: 4 },
      { sub: "corded_rotary_polisher", count: 3 },
      { sub: "forced_rotation_polisher", count: 2 },
      { sub: "sander", count: 2 },
      { sub: "cordless_rotary_polisher", count: 1 },
      { sub: "machine_kit", count: 1 },
    ],
  },
  {
    group: "storage_accessories",
    total: 23,
    subs: [
      { sub: "wall_stand", count: 4 },
      { sub: "vacuum_cleaner", count: 3 },
      { sub: "work_gear", count: 3 },
      { sub: "work_light", count: 3 },
      { sub: "bag_carrier", count: 2 },
      { sub: "holder_clamp", count: 2 },
      { sub: "protective_cover", count: 2 },
      { sub: "bucket_accessories", count: 1 },
      { sub: "cart_trolley", count: 1 },
      { sub: "storage_box", count: 1 },
      { sub: "water_spray_gun", count: 1 },
    ],
  },
  {
    group: "paint_protection_quick",
    total: 22,
    subs: [
      { sub: "spray_sealant", count: 5 },
      { sub: "quick_detailer", count: 4 },
      { sub: "rinse_wax_concentrate", count: 4 },
      { sub: "spray_wipe_sealant", count: 3 },
      { sub: "liquid_sealant", count: 2 },
      { sub: "spray_rinse_sealant", count: 2 },
      { sub: "glass_coating", count: 1 },
      { sub: "paste_wax", count: 1 },
    ],
  },
  {
    group: "contaminant_solvers",
    total: 21,
    subs: [
      { sub: "wheel_iron_remover", count: 4 },
      { sub: "clay_bar", count: 3 },
      { sub: "water_spot_remover", count: 3 },
      { sub: "bug_remover", count: 2 },
      { sub: "iron_remover", count: 2 },
      { sub: "tar_glue_remover", count: 2 },
      { sub: "clay_lubricant", count: 1 },
      { sub: "oil_degreaser", count: 1 },
      { sub: "single_layer_coating", count: 1 },
      { sub: "specialty_cleaner", count: 1 },
      { sub: "wax_remover", count: 1 },
    ],
  },
  {
    group: "applicators",
    total: 14,
    subs: [
      { sub: "applicator_pad", count: 6 },
      { sub: "tire_applicator", count: 3 },
      { sub: "coating_applicator", count: 2 },
      { sub: "cleaning_sponge", count: 1 },
      { sub: "scrub_pad", count: 1 },
      { sub: "wash_sponge", count: 1 },
    ],
  },
  {
    group: "ppf_tools",
    total: 14,
    subs: [
      { sub: "squeegee", count: 7 },
      { sub: "application_kit", count: 3 },
      { sub: "ppf_install_solution", count: 2 },
      { sub: "consumable", count: 1 },
      { sub: "positioning_tool", count: 1 },
    ],
  },
  {
    group: "industrial_products",
    total: 12,
    subs: [
      { sub: "metal_polish", count: 11 },
      { sub: "engine_cleaner", count: 1 },
    ],
  },
  {
    group: "clay_products",
    total: 8,
    subs: [
      { sub: "clay_pad", count: 4 },
      { sub: "clay_bar", count: 1 },
      { sub: "clay_cloth", count: 1 },
      { sub: "clay_disc", count: 1 },
      { sub: "clay_mitt", count: 1 },
    ],
  },
  {
    group: "tire_care",
    total: 7,
    subs: [
      { sub: "tire_dressing", count: 3 },
      { sub: "tire_gel", count: 3 },
      { sub: "tire_cleaner", count: 1 },
    ],
  },
  {
    group: "leather_care",
    total: 7,
    subs: [
      { sub: "leather_cleaner", count: 3 },
      { sub: "leather_care_kit", count: 2 },
      { sub: "leather_conditioner", count: 1 },
      { sub: "leather_protectant", count: 1 },
    ],
  },
  {
    group: "brushes",
    total: 6,
    subs: [
      { sub: "wheel_brush", count: 3 },
      { sub: "detail_brush", count: 1 },
      { sub: "leather_brush", count: 1 },
      { sub: "tire_brush", count: 1 },
    ],
  },
  {
    group: "marin_products",
    total: 5,
    subs: [
      { sub: "interior_detailer", count: 2 },
      { sub: "iron_remover", count: 1 },
      { sub: "one_step_polish", count: 1 },
      { sub: "water_spot_remover", count: 1 },
    ],
  },
  {
    group: "glass_cleaner_protectant",
    total: 5,
    subs: [
      { sub: "glass_cleaner", count: 3 },
      { sub: "glass_hydrophobic_sealant", count: 1 },
      { sub: "screen_cleaner", count: 1 },
    ],
  },
  {
    group: "masking_tapes",
    total: 4,
    subs: [
      { sub: "detailing_tape", count: 1 },
      { sub: "high_performance_tape", count: 1 },
      { sub: "premium_tape", count: 1 },
      { sub: "trim_tape", count: 1 },
    ],
  },
  {
    group: "glass_cleaner",
    total: 2,
    subs: [
      { sub: "glass_cleaner_additive", count: 2 },
    ],
  },
  {
    group: "product_sets",
    total: 2,
    subs: [
      { sub: "experience_set", count: 2 },
    ],
  },
  {
    group: "accessory",
    total: 1,
    subs: [
      { sub: "(null sub_type)", count: 1 },
    ],
  },
];

export function findGroup(name: string): TemplateGroup | undefined {
  return TAXONOMY.find((g) => g.group === name);
}
