import React, { useState, useEffect } from "react";

// ============================================================================
// FILE 1: src/types.ts (BẢN CHUẨN HOÀN THIỆN SAU ĐẠI TU CÙNG CHUYÊN GIA)
// - Cập nhật TEa theo % hoặc Số tuyệt đối (Abs).
// - Tính Pooled CV% theo trọng số (n-1) chuẩn CLSI C24.
// - Tích hợp cờ Ngoại lệ Westgard (bỏ qua 6x, 8x, 10x).
// - Ưu tiên Bias ngoại kiểm EQA khi tính MU.
// ✦ An intellectual product by Handsome Long ✦
// ============================================================================

export const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxcshYUkQZOCXtrPGpTggpWgdZ-ObNiBVax9trrXjbkNa2wexNTrgfs2J7HQysGbbXw/exec";

export const STORAGE_KEYS = Object.freeze({
  API_URL: "ORIO_API_URL_V5",
  AUTH: "ORIO_AUTH_V5",
  TOKEN: "ORIO_TOKEN_V5",
  USERS: "ORIO_USERS_V5",
  SECTIONS: "ORIO_SECTIONS_V5",
  MACHINES: "ORIO_MACHINES_V5",
  REAGENTS: "ORIO_REAGENTS_V5",
  CONFIGS: "ORIO_CONFIGS_V5",
  BM09: "ORIO_BM09_V5",
  LOCKS: "ORIO_LOCKS_V5",
  INPUT_MODE: "ORIO_INPUT_MODE_V5",
});

export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}

export async function rpcCall(
  apiUrl: string,
  action: string,
  data: Record<string, any> = {},
  token?: string,
  timeoutMs = 18000
): Promise<{ net: boolean; body: Record<string, any> }> {
  const url = String(apiUrl || "").trim();
  if (!url.startsWith("https://script.google.com/macros/s/")) {
    return { net: false, body: { status: "error" } };
  }
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token, data, ...data }),
      signal: ctrl.signal,
      redirect: "follow",
    });
    window.clearTimeout(timer);
    const text = await res.text();
    return { net: true, body: JSON.parse(text) };
  } catch (err: any) {
    window.clearTimeout(timer);
    return { net: false, body: { status: "error" } };
  }
}

export const COMMON_TEST_NAMES = [
  "Glucose",
  "Urea",
  "Creatinine",
  "AST (GOT)",
  "ALT (GPT)",
  "GGT",
  "Bilirubin Toàn phần",
  "Cholesterol",
  "Triglyceride",
  "CK-MB",
  "Đông máu PT (s)",
  "Đông máu INR",
  "WBC",
  "RBC",
  "HGB",
  "HCT",
  "PLT",
];

export const COMMON_UNITS = [
  "mmol/L",
  "µmol/L",
  "U/L",
  "mg/L",
  "mg/dL",
  "g/L",
  "g/dL",
  "Giây",
  "%",
  "S/Co",
  "10^9/L",
  "10^12/L",
  "L/L",
  "fL",
  "pg",
];

export const SUGGESTED_CAUSES = [
  "Bọt khí trong cóng mẫu/kim hút",
  "Hóa chất QC tự pha suy giảm hoạt độ",
  "Thuốc thử cuối lọ bị bay hơi",
  "Trôi đường chuẩn (Calibration drift)",
];

export const SUGGESTED_ACTIONS = [
  "Kiểm tra kim hút, đuổi bọt khí",
  "Hiệu chuẩn (Calib) lại xét nghiệm",
  "Thay lọ thuốc thử mới",
  "Hoàn nguyên lọ Hóa chất QC mới",
];

// --- QUYỀN HẠN ---
export type UserRole = "ADMIN" | "QLCM" | "USER";
export type PermissionKey =
  | "VOID_LJ_POINT"
  | "OVERRIDE_RESOLUTION"
  | "EDIT_PAST_DATE"
  | "FORCE_UNLOCK_LAB"
  | "MANAGE_CATALOG"
  | "APPROVE_RANGE_MU"
  | "SIGN_BM09_CHECKER"
  | "MANAGE_ACCOUNTS";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  desc: string;
  badgeColor: string;
}
export const ALL_PERMISSIONS: PermissionDef[] = [
  {
    key: "VOID_LJ_POINT",
    label: "Xóa điểm QC trên biểu đồ L-J",
    desc: "Xóa điểm L-J bị nhập nhầm",
    badgeColor: "rose",
  },
  {
    key: "OVERRIDE_RESOLUTION",
    label: "Sửa trạng thái xử lý sự cố",
    desc: "Can thiệp Đạt/KĐ nhật ký",
    badgeColor: "rose",
  },
  {
    key: "EDIT_PAST_DATE",
    label: "Sửa kết quả QC ngày hôm trước",
    desc: "Lùi ngày nhập KQ cũ",
    badgeColor: "indigo",
  },
  {
    key: "FORCE_UNLOCK_LAB",
    label: "Khóa / Mở khóa ép buộc Lab",
    desc: "Mở khóa phiên Lab bị treo",
    badgeColor: "amber",
  },
  {
    key: "MANAGE_CATALOG",
    label: "Sửa / Xóa Danh mục Test",
    desc: "Khai báo hóa chất, Test",
    badgeColor: "teal",
  },
  {
    key: "APPROVE_RANGE_MU",
    label: "Chốt Dải chuẩn & Thiết lập MU",
    desc: "Chốt Range và ĐKBĐĐ",
    badgeColor: "purple",
  },
  {
    key: "SIGN_BM09_CHECKER",
    label: "Ký kiểm tra phiếu BM.09",
    desc: "Duyệt phiếu BM.09",
    badgeColor: "sky",
  },
  {
    key: "MANAGE_ACCOUNTS",
    label: "Quản trị Nhân sự & Lab",
    desc: "Cấp tài khoản, phân quyền",
    badgeColor: "emerald",
  },
];
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  ADMIN: [
    "VOID_LJ_POINT",
    "OVERRIDE_RESOLUTION",
    "EDIT_PAST_DATE",
    "FORCE_UNLOCK_LAB",
    "MANAGE_CATALOG",
    "APPROVE_RANGE_MU",
    "SIGN_BM09_CHECKER",
    "MANAGE_ACCOUNTS",
  ],
  QLCM: [
    "EDIT_PAST_DATE",
    "FORCE_UNLOCK_LAB",
    "MANAGE_CATALOG",
    "APPROVE_RANGE_MU",
    "SIGN_BM09_CHECKER",
  ],
  USER: [],
};

export interface UserAccount {
  id: string;
  name: string;
  password: string;
  role: UserRole;
  mustChange: boolean;
  permissions?: PermissionKey[];
}

export function getEffectivePermissions(
  user?: UserAccount | null
): PermissionKey[] {
  if (!user) return [];
  if (user.id.toLowerCase() === "thlong") return DEFAULT_ROLE_PERMISSIONS.ADMIN;
  return Array.isArray(user.permissions)
    ? user.permissions
    : DEFAULT_ROLE_PERMISSIONS[user.role] || [];
}
export function hasPermission(
  user: UserAccount | null | undefined,
  perm: PermissionKey
): boolean {
  if (!user) return false;
  if (user.id.toLowerCase() === "thlong") return true;
  return getEffectivePermissions(user).includes(perm);
}

// --- KIẾN TRÚC DỮ LIỆU ---
export interface SectionLock {
  section_name: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  locked_at_ms: number;
  epoch?: string;
}

export interface ReagentLotBM16 {
  control_id: string;
  section_name: string;
  machine_name: string;
  control_name: string;
  lot_number: string;
  expiry_date: string;
  is_manual_prep: boolean;
  prep_date: string;
  use_expiry_date?: string;
  prep_by_id: string;
  prep_by_name: string;
  quantity_prepared?: number;
  usage_count: number;
  used_days_map: Record<string, number>;
  note?: string;
}

export interface HistoryPoint {
  isoDate: string;
  date: string;
  time: string;
  lot_number: string;
  val: number;
  z: number;
  qualVal?: "ÂM TÍNH" | "DƯƠNG TÍNH";
  operator: string;
  rule: string;
  status: "PASS" | "WARN" | "FAIL";
  is_rerun?: boolean;
}

export interface LotArchiveItem {
  lot_number: string;
  expiry_date: string;
  range_source: RangeSourceType;
  mean_L1: number;
  sd_L1: number;
  cv_L1: number;
  n_L1: number;
  mean_L2: number;
  sd_L2: number;
  cv_L2: number;
  n_L2: number;
  mean_L3: number;
  sd_L3: number;
  cv_L3: number;
  n_L3: number;
  archived_at: string;
}

export type RangeSourceType = "MANUFACTURER" | "LAB_TEMP" | "LAB_OFFICIAL";
export type TestCategoryType =
  | "QUANTITATIVE"
  | "SEMI_QUANTITATIVE"
  | "QUALITATIVE";
export type MuModeType =
  | "NONE"
  | "MANUAL"
  | "INITIAL_VERIFICATION"
  | "PERIODIC_IQC";

export interface LevelMuConfig {
  mu_mode: MuModeType;
  manual_mu?: number; // %
  verif_cvr?: number; // %
  verif_bias?: number; // %
  urw_pooled?: number; // %
  uc_cal?: number; // %
  ubias_periodic?: number; // % (Ưu tiên dùng số này nếu có)
}

export interface TestConfig {
  test_id: string;
  section: string;
  machine_name: string;
  control_name: string;
  lot_number: string;
  expiry_date: string;

  test_name: string;
  unit: string;
  standard_label: "ISO" | "THUONG";
  test_type: TestCategoryType;
  levels_count: 1 | 2 | 3;

  // Tích hợp Đơn vị TEa & Cờ Ngoại lệ Huyết học (Bỏ luật dài hạn)
  tea?: number;
  tea_unit?: "PERCENT" | "ABSOLUTE";
  is_exempt_long_rules?: boolean;
  order: number;

  mean_L1: number;
  sd_L1: number;
  mean_L2: number;
  sd_L2: number;
  mean_L3: number;
  sd_L3: number;

  mfg_mean_L1: number;
  mfg_sd_L1: number;
  mfg_mean_L2: number;
  mfg_sd_L2: number;
  mfg_mean_L3: number;
  mfg_sd_L3: number;

  expected_qual_L1?: "ÂM TÍNH" | "DƯƠNG TÍNH";
  expected_qual_L2?: "ÂM TÍNH" | "DƯƠNG TÍNH";
  expected_qual_L3?: "ÂM TÍNH" | "DƯƠNG TÍNH";

  mu_L1?: LevelMuConfig;
  mu_L2?: LevelMuConfig;
  mu_L3?: LevelMuConfig;

  range_source: RangeSourceType;
  range_applied_date?: string;
  range_active_days: number;
  accumulated_points: number;

  lot_history?: LotArchiveItem[];
  history_L1: HistoryPoint[];
  history_L2: HistoryPoint[];
  history_L3: HistoryPoint[];
}

export interface EvalRow {
  test: TestConfig;
  valL1: number | null;
  qualL1?: string;
  zL1: number | null;
  lvl1Status: "PASS" | "WARN" | "FAIL" | "SKIP";
  valL2: number | null;
  qualL2?: string;
  zL2: number | null;
  lvl2Status: "PASS" | "WARN" | "FAIL" | "SKIP";
  valL3: number | null;
  qualL3?: string;
  zL3: number | null;
  lvl3Status: "PASS" | "WARN" | "FAIL" | "SKIP";
  status: "PASS" | "WARN" | "FAIL" | "SKIP";
  singleLevelRules: string[];
  crossLevelRules: string[];
  errorType: string;
  suggestion: string;
  cause: string;
  actionTaken: string;
  postFixResult: string;
}

export interface BM09LogEntry {
  run_id: string;
  test_id: string;
  run_date: string;
  run_time: string;
  section: string;
  machine_name: string;
  control_name: string;
  lot_number: string;
  test_name: string;
  westgard_mode: "NORMAL" | "SIGMA";
  val_L1: number | null;
  z_L1: number | null;
  val_L2: number | null;
  z_L2: number | null;
  val_L3?: number | null;
  z_L3?: number | null;
  qual_L1?: string;
  qual_L2?: string;
  qual_L3?: string;
  status: "PASS" | "WARN" | "FAIL";
  rules_single: string;
  rules_cross: string;
  cause: string;
  action_taken: string;
  post_fix_result: string;
  operator_name: string;
  checker_name: string;
  resolved: boolean;
  rerun_val?: number;
  rerun_level?: string;
}

export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}
export function formatShortDM(dateStr?: string): string {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [, m, d] = s.split("-");
    return `${Number(d)}/${Number(m)}`;
  }
  return s;
}
export function getReagentThreshold75(qtyPrepared?: number): number {
  const q = Math.max(1, Number(qtyPrepared) || 1);
  return Math.ceil(q * 0.75);
}
export function isReagentReached75(r: ReagentLotBM16): boolean {
  if (!r.is_manual_prep || !r.quantity_prepared) return false;
  return Number(r.usage_count) >= getReagentThreshold75(r.quantity_prepared);
}
export function getUsageCountForMonthDay(
  usedMap: Record<string, number> | undefined,
  yearMonth: string,
  dayNum: number
): number {
  if (!usedMap) return 0;
  const dd = String(dayNum).padStart(2, "0");
  const fullKey = `${yearMonth}-${dd}`;
  return Number(usedMap[fullKey] || usedMap[String(dayNum)] || 0);
}

// ============================================================================
// HÀM TÍNH POOLED CV% (u_rw) THEO TRỌNG SỐ BẬC TỰ DO (CLSI C24-Ed4)
// ============================================================================
export interface LotHistoryItemForPooled {
  lot_number: string;
  cv_pct: number;
  n_count?: number;
}
export function calculateWeightedPooledCv(lots: LotHistoryItemForPooled[]) {
  const validLots = lots.filter((l) => l.cv_pct > 0);
  if (validLots.length === 0) return { pooledCvPct: 0, totalDf: 0, totalN: 0 };
  let sumSq = 0;
  let totalDf = 0;
  let totalN = 0;
  validLots.forEach((l) => {
    // Nếu thiếu N, mặc định lấy n = 30 (tương đương 1 tháng chạy QC)
    const n = l.n_count && l.n_count > 1 ? l.n_count : 30;
    const df = n - 1;
    sumSq += df * (l.cv_pct * l.cv_pct);
    totalDf += df;
    totalN += n;
  });
  return {
    pooledCvPct: Number(Math.sqrt(sumSq / totalDf).toFixed(2)),
    totalDf,
    totalN,
  };
}

// ============================================================================
// BỘ MÁY TÍNH TOÁN MU MỚI (TÍCH HỢP TEA TUYỆT ĐỐI VS % VÀ BẢO TỒN BIAS NGOẠI KIỂM)
// ============================================================================
export interface EnhancedMuResult {
  meanLab: number;
  sdLab: number;
  cvPct: number;
  biasPct: number;
  biasAbs: number;
  sigma: number | null;
  validPointsCount: number;
  muConfigured: boolean;
  muModeLabel: string;
  ucPct: number | null;
  uePct: number | null;
  ucAbs: number | null;
  ueAbs: number | null;
  targetLimitPct: number | null;
  targetLimitAbs: number | null;
  targetLabel: string;
  isPassMu: boolean | null;
  formulaNote: string;
  biasModeUsed: "PEER_GROUP_EQA" | "MFG_TARGET";
}

export function computeMuAndSigma(
  cfg: TestConfig,
  levelKey: "L1" | "L2" | "L3" = "L1"
): EnhancedMuResult {
  const hist =
    levelKey === "L1"
      ? cfg.history_L1
      : levelKey === "L2"
      ? cfg.history_L2
      : cfg.history_L3;
  const mfgMean =
    levelKey === "L1"
      ? cfg.mfg_mean_L1
      : levelKey === "L2"
      ? cfg.mfg_mean_L2
      : cfg.mfg_mean_L3;

  // Lọc chỉ các điểm thuộc Lô hiện tại và Không vi phạm (Loại FAIL)
  const validPts = (hist || []).filter(
    (p) => p.lot_number === cfg.lot_number && p.status !== "FAIL"
  );
  const vals = validPts.length > 0 ? validPts.map((p) => p.val) : [mfgMean];
  const validPointsCount = validPts.length;

  const meanLab =
    vals.reduce((acc, v) => acc + Number(v || 0), 0) / Math.max(vals.length, 1);
  const rawSdLab =
    vals.length > 1
      ? Math.sqrt(
          vals.reduce(
            (acc, v) => acc + Math.pow(Number(v || 0) - meanLab, 2),
            0
          ) /
            (vals.length - 1)
        )
      : 0;

  const safeMeanLab = Math.max(Math.abs(meanLab), 0.0001);
  const safeMfgMean = Math.max(Math.abs(mfgMean), 0.0001);
  const cvPct = Number(
    Math.max((rawSdLab / safeMeanLab) * 100, 0.001).toFixed(2)
  );

  const muCfg: LevelMuConfig =
    levelKey === "L1"
      ? cfg.mu_L1 || { mu_mode: "NONE" }
      : levelKey === "L2"
      ? cfg.mu_L2 || { mu_mode: "NONE" }
      : cfg.mu_L3 || { mu_mode: "NONE" };

  // Xác định Bias (Ưu tiên Ngoại kiểm nếu người dùng nhập)
  let usedBiasPct = 0;
  let usedBiasAbs = 0;
  let biasModeUsed: "PEER_GROUP_EQA" | "MFG_TARGET" = "MFG_TARGET";

  if (muCfg.ubias_periodic && muCfg.ubias_periodic > 0) {
    usedBiasPct = muCfg.ubias_periodic;
    usedBiasAbs = (usedBiasPct * safeMeanLab) / 100;
    biasModeUsed = "PEER_GROUP_EQA";
  } else if (muCfg.verif_bias && muCfg.verif_bias > 0) {
    usedBiasPct = muCfg.verif_bias;
    usedBiasAbs = (usedBiasPct * safeMeanLab) / 100;
    biasModeUsed = "PEER_GROUP_EQA";
  } else {
    usedBiasAbs = Math.abs(meanLab - mfgMean);
    usedBiasPct = (usedBiasAbs / safeMfgMean) * 100;
    biasModeUsed = "MFG_TARGET";
  }

  const hasTea =
    cfg.tea !== undefined && cfg.tea !== null && Number(cfg.tea) > 0;
  const teaVal = hasTea ? Number(cfg.tea) : 0;
  const teaUnit = cfg.tea_unit || "PERCENT";

  let sigma: number | null = null;
  let targetLimitPct: number | null = null;
  let targetLimitAbs: number | null = null;
  let targetLabel = "Chưa có TEa";

  if (hasTea) {
    if (teaUnit === "PERCENT") {
      sigma =
        cvPct > 0 ? Number(((teaVal - usedBiasPct) / cvPct).toFixed(2)) : null;
      targetLimitPct = 0.75 * teaVal;
      targetLimitAbs = (targetLimitPct * safeMeanLab) / 100;
      targetLabel = `0.75×TEa (${targetLimitPct.toFixed(2)}%)`;
    } else {
      sigma =
        rawSdLab > 0
          ? Number(((teaVal - usedBiasAbs) / rawSdLab).toFixed(2))
          : null;
      targetLimitAbs = 0.75 * teaVal;
      targetLimitPct = (targetLimitAbs / safeMeanLab) * 100;
      targetLabel = `0.75×TEa (${targetLimitAbs.toFixed(3)} ${cfg.unit})`;
    }
  }

  const mode = muCfg.mu_mode;
  let ucPct: number | null = null;
  let uePct: number | null = null;
  let formulaNote = "Vui lòng cấu hình tham số MU cho mức này";
  let muModeLabel = "Chưa thiết lập";

  if (mode === "MANUAL") {
    const manualVal = Number(muCfg.manual_mu || 0);
    if (manualVal > 0) {
      ucPct = manualVal / 2;
      uePct = manualVal;
      formulaNote = "Ue (%) do Admin nhập trực tiếp";
      muModeLabel = "Nhập tay (Admin)";
    }
  } else if (mode === "INITIAL_VERIFICATION") {
    const ur = Number(muCfg.verif_cvr || cvPct || 0);
    const ub = Number(usedBiasPct || 0);
    if (ur > 0) {
      ucPct = Math.sqrt(Math.pow(ur, 2) + Math.pow(ub, 2));
      uePct = 1.96 * ucPct;
      formulaNote = `uc = √(uR² + uB²) = √(${ur.toFixed(2)}² + ${ub.toFixed(
        2
      )}²)`;
      muModeLabel = "Thẩm định Lần đầu (k=1.96)";
    }
  } else if (mode === "PERIODIC_IQC") {
    const urw = Number(muCfg.urw_pooled || cvPct || 0);
    const ub = Number(usedBiasPct || 0);
    const ucal = Number(muCfg.uc_cal || 0);
    if (urw > 0) {
      ucPct = Math.sqrt(Math.pow(urw, 2) + Math.pow(ub, 2) + Math.pow(ucal, 2));
      uePct = 2.0 * ucPct;
      formulaNote = `uc = √(uRw² + uBias² + uCal²) = √(${urw.toFixed(
        2
      )}² + ${ub.toFixed(2)}² + ${ucal.toFixed(2)}²)`;
      muModeLabel = "Định kỳ IQC (k=2.0)";
    }
  }

  let isPassMu: boolean | null = null;
  if (uePct !== null && targetLimitPct !== null) {
    isPassMu = uePct < targetLimitPct;
  }

  const ucAbs = ucPct !== null ? (ucPct * safeMeanLab) / 100 : null;
  const ueAbs = uePct !== null ? (uePct * safeMeanLab) / 100 : null;

  return {
    meanLab,
    sdLab: rawSdLab,
    cvPct,
    biasPct: Number(usedBiasPct.toFixed(2)),
    biasAbs: Number(usedBiasAbs.toFixed(3)),
    sigma,
    validPointsCount,
    muConfigured: uePct !== null,
    muModeLabel,
    ucPct: ucPct !== null ? Number(ucPct.toFixed(2)) : null,
    uePct: uePct !== null ? Number(uePct.toFixed(2)) : null,
    ucAbs: ucAbs !== null ? Number(ucAbs.toFixed(3)) : null,
    ueAbs: ueAbs !== null ? Number(ueAbs.toFixed(3)) : null,
    targetLimitPct:
      targetLimitPct !== null ? Number(targetLimitPct.toFixed(2)) : null,
    targetLimitAbs:
      targetLimitAbs !== null ? Number(targetLimitAbs.toFixed(3)) : null,
    targetLabel,
    isPassMu,
    formulaNote,
    biasModeUsed,
  };
}

export function formatSDPositionBadge(z: number) {
  const abs = Math.abs(z);
  const sign = z >= 0 ? "+" : "-";
  if (abs <= 1)
    return {
      text: `Đạt · ${sign}1SD (${z >= 0 ? "+" : ""}${z.toFixed(2)}SD)`,
      cls: "bg-emerald-50 text-emerald-700 border-emerald-300",
    };
  if (abs < 2)
    return {
      text: `Đạt · ${sign}1SD đến ${sign}2SD (${z >= 0 ? "+" : ""}${z.toFixed(
        2
      )}SD)`,
      cls: "bg-teal-50 text-teal-700 border-teal-300",
    };
  if (abs < 3)
    return {
      text: `Cảnh báo · ${sign}2SD đến ${sign}3SD (${
        z >= 0 ? "+" : ""
      }${z.toFixed(2)}SD)`,
      cls: "bg-amber-50 text-amber-800 border-amber-400",
    };
  return {
    text: `Vi phạm · Vượt ngoài ${sign}3SD (${z >= 0 ? "+" : ""}${z.toFixed(
      2
    )}SD)`,
    cls: "bg-rose-50 text-rose-700 border-rose-400 animate-pulse",
  };
}

// ============================================================================
// BỘ DỮ LIỆU MẪU ĐÃ ĐƯỢC CẬP NHẬT TRƯỜNG TEA_UNIT & NGOẠI LỆ WESTGARD
// ============================================================================

export const INITIAL_USERS: UserAccount[] = [
  {
    id: "thlong",
    name: "Tô Hoàng Long",
    password: "Longdeptrai",
    role: "ADMIN",
    mustChange: true,
    permissions: [...DEFAULT_ROLE_PERMISSIONS.ADMIN],
  },
  {
    id: "hqsang",
    name: "Huỳnh Quang Sang",
    password: "Longdeptrai",
    role: "QLCM",
    mustChange: true,
    permissions: [...DEFAULT_ROLE_PERMISSIONS.QLCM],
  },
  {
    id: "ktv",
    name: "Nhân viên Test",
    password: "Longdeptrai",
    role: "USER",
    mustChange: true,
    permissions: [],
  },
];

export function makeMockHistory(
  mean: number,
  sd: number,
  lot: string,
  count: number,
  injectFailLevel: boolean
): HistoryPoint[] {
  const pts: HistoryPoint[] = [];
  let dayOffset = 28 - count;
  for (let i = 0; i < count; i++) {
    dayOffset++;
    const dateStr = `2026-10-${String(dayOffset).padStart(2, "0")}`;
    const dm = `${String(dayOffset).padStart(2, "0")}/10`;

    let z = Math.round((Math.random() * 3 - 1.5) * 100) / 100;
    let st: "PASS" | "WARN" | "FAIL" = "PASS";
    let rule = "Đạt (Trong ±2SD)";

    if (injectFailLevel && i === count - 2) {
      z = 3.25;
      st = "FAIL";
      rule = "1-3s";
    }

    pts.push({
      isoDate: dateStr,
      date: dm,
      time: "07h30",
      lot_number: lot,
      val: Number((mean + z * sd).toFixed(2)),
      z,
      operator: "Tô Hoàng Long",
      rule,
      status: st,
    });

    if (injectFailLevel && i === count - 2) {
      pts.push({
        isoDate: dateStr,
        date: dm,
        time: "08h15",
        lot_number: lot,
        val: Number((mean + 0.45 * sd).toFixed(2)),
        z: 0.45,
        operator: "Tô Hoàng Long",
        rule: "Đạt sau kiểm tra lại",
        status: "PASS",
        is_rerun: true,
      });
    }
  }
  return pts;
}

export const INITIAL_REAGENTS: ReagentLotBM16[] = [
  {
    control_id: "CTRL-001",
    section_name: "Sinh Hóa",
    machine_name: "DXC 1",
    control_name: "Serum Control",
    lot_number: "LOT-8841A",
    expiry_date: "2026-12-31",
    is_manual_prep: false,
    prep_date: "2026-10-01",
    prep_by_id: "thlong",
    prep_by_name: "Tô Hoàng Long",
    usage_count: 27,
    used_days_map: {},
    note: "Mở nắp dùng ngay",
  },
  {
    control_id: "CTRL-002",
    section_name: "Huyết học",
    machine_name: "Compact Max",
    control_name: "Dade Ci-Trol 1",
    lot_number: "548567A",
    expiry_date: "2026-12-16",
    is_manual_prep: true,
    prep_date: "2026-10-25",
    use_expiry_date: "2026-10-28",
    prep_by_id: "thlong",
    prep_by_name: "Tô Hoàng Long",
    quantity_prepared: 3,
    usage_count: 2,
    used_days_map: { "2026-10-26": 1, "2026-10-27": 1 },
    note: "Pha bằng 5ml Nước cất 2 lần",
  },
];

export const INITIAL_CONFIGS: TestConfig[] = [
  {
    test_id: "DXC1-GLU",
    section: "Sinh Hóa",
    machine_name: "DXC 1",
    control_name: "Serum Control",
    lot_number: "LOT-8841A",
    expiry_date: "2026-12-31",
    test_name: "Glucose",
    unit: "mmol/L",
    standard_label: "ISO",
    test_type: "QUANTITATIVE",
    levels_count: 2,
    tea: 10,
    tea_unit: "PERCENT",
    order: 1,
    is_exempt_long_rules: false,
    mfg_mean_L1: 5.5,
    mfg_sd_L1: 0.18,
    mfg_mean_L2: 12.0,
    mfg_sd_L2: 0.45,
    mfg_mean_L3: 0,
    mfg_sd_L3: 0,
    mean_L1: 5.52,
    sd_L1: 0.19,
    mean_L2: 12.05,
    sd_L2: 0.46,
    mean_L3: 0,
    sd_L3: 0,
    mu_L1: {
      mu_mode: "PERIODIC_IQC",
      urw_pooled: 3.12,
      uc_cal: 1.5,
      ubias_periodic: 0.45,
    },
    mu_L2: {
      mu_mode: "PERIODIC_IQC",
      urw_pooled: 2.85,
      uc_cal: 1.5,
      ubias_periodic: 0.38,
    },
    range_source: "LAB_OFFICIAL",
    range_applied_date: "2026-10-01",
    range_active_days: 27,
    accumulated_points: 27,
    lot_history: [],
    history_L1: makeMockHistory(5.52, 0.19, "LOT-8841A", 27, true),
    history_L2: makeMockHistory(12.05, 0.46, "LOT-8841A", 27, false),
    history_L3: [],
  },
  {
    test_id: "HH-WBC",
    section: "Huyết học",
    machine_name: "Compact Max",
    control_name: "Dade Ci-Trol 1",
    lot_number: "548567A",
    expiry_date: "2026-12-16",
    test_name: "WBC",
    unit: "10^9/L",
    standard_label: "ISO",
    test_type: "QUANTITATIVE",
    levels_count: 3,
    tea: 15,
    tea_unit: "PERCENT",
    order: 1,
    is_exempt_long_rules: true, // Test Ngoại lệ Huyết học (Bỏ luật 6x, 8x, 10x)
    mfg_mean_L1: 3.5,
    mfg_sd_L1: 0.2,
    mfg_mean_L2: 7.5,
    mfg_sd_L2: 0.4,
    mfg_mean_L3: 15.0,
    mfg_sd_L3: 0.8,
    mean_L1: 3.5,
    sd_L1: 0.2,
    mean_L2: 7.5,
    sd_L2: 0.4,
    mean_L3: 15.0,
    sd_L3: 0.8,
    mu_L1: { mu_mode: "INITIAL_VERIFICATION", verif_cvr: 3.2, verif_bias: 1.1 },
    mu_L2: { mu_mode: "INITIAL_VERIFICATION", verif_cvr: 4.1, verif_bias: 1.3 },
    mu_L3: { mu_mode: "INITIAL_VERIFICATION", verif_cvr: 4.5, verif_bias: 1.5 },
    range_source: "MANUFACTURER",
    range_active_days: 0,
    accumulated_points: 10,
    lot_history: [],
    history_L1: makeMockHistory(3.5, 0.2, "548567A", 10, false),
    history_L2: makeMockHistory(7.5, 0.4, "548567A", 10, false),
    history_L3: makeMockHistory(15.0, 0.8, "548567A", 10, false),
  },
];

export const INITIAL_BM09_LOGS: BM09LogEntry[] = [
  {
    run_id: "RUN-1026",
    test_id: "DXC1-GLU",
    run_date: "2026-10-26",
    run_time: "07h30",
    section: "Sinh Hóa",
    machine_name: "DXC 1",
    control_name: "Serum Control",
    lot_number: "LOT-8841A",
    test_name: "Glucose",
    westgard_mode: "NORMAL",
    val_L1: 6.14,
    z_L1: 3.25,
    val_L2: 12.1,
    z_L2: 0.11,
    status: "FAIL",
    rules_single: "1-3s (Mức 1)",
    rules_cross: "",
    cause: "Bọt khí kim hút mẫu",
    action_taken: "Đuổi bọt khí, bảo dưỡng kim, chạy lại mức 1",
    post_fix_result: "Mức 1: 5.61 (+0.45SD) - Đạt",
    operator_name: "Tô Hoàng Long",
    checker_name: "Huỳnh Quang Sang",
    resolved: true,
    rerun_val: 5.61,
    rerun_level: "L1",
  },
];
