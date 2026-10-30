import React, { useState, useEffect, useRef } from "react";
import {
  TestConfig,
  ReagentLotBM16,
  UserAccount,
  TestCategoryType,
  MuModeType,
  LevelMuConfig,
  RangeSourceType,
  LotArchiveItem,
  getReagentThreshold75,
  isReagentReached75,
  formatDateVN,
  rpcCall,
  computeMuAndSigma,
  calculateWeightedPooledCv,
  COMMON_TEST_NAMES,
  COMMON_UNITS,
  hasPermission,
} from "./types";

// ============================================================================
// FILE 2: src/SetupAndAssistant.tsx (FULL ENTERPRISE EDITION - KHÔNG CẮT GIẢM)
// 1. Khai báo Hóa chất Mở nắp vs Pha tay + Bảng "Danh mục hóa chất QC" (Sửa/Xóa)
// 2. Cấu hình Test kế thừa Lot, chọn đơn vị TEa (% / Abs), MU 3 mức & Cờ Ngoại lệ
// 3. Pooled CV% theo trọng số (n-1) CLSI C24 & Phân luồng Westgard theo Sigma
// ✦ An intellectual product by Handsome Long ✦
// ============================================================================

const Ic = {
  Plus: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Trash: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Edit: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  Grip: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  ),
  Box: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Star: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Search: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  RotateCcw: () => (
    <svg
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
};

// Danh sách 5 chỉ số Huyết học mặc định được miễn trừ quy tắc dài hạn (6x, 8x, 10x)
export const DEFAULT_EXEMPT_HEMATOLOGY_TESTS = [
  "WBC",
  "RBC",
  "HGB",
  "HCT",
  "PLT",
];

export function isDefaultExemptTestName(testName: string): boolean {
  const upper = String(testName || "")
    .trim()
    .toUpperCase();
  return DEFAULT_EXEMPT_HEMATOLOGY_TESTS.some(
    (code) =>
      upper === code ||
      upper.startsWith(`${code} `) ||
      upper.includes(`(${code})`)
  );
}

// ============================================================================
// BỘ LỌC QUY TẮC WESTGARD KHUYẾN NGHỊ THEO SIGMA & DANH SÁCH TEST NGOẠI LỆ
// (Mục 5.2.3 & 5.2.4 Quy trình Nội kiểm XN.QTQL.31 v6.0)
// ============================================================================
export interface RecommendedWestgardRules {
  recommendedRules: string[];
  explanation: string;
  isExemptLongRules: boolean;
}

export function getRecommendedWestgardRules(
  cfg: TestConfig,
  sigmaScore: number | null
): RecommendedWestgardRules {
  const isExempt = Boolean(cfg.is_exempt_long_rules);
  let baseRules: string[] = [];
  let explanation = "";

  if (sigmaScore !== null && sigmaScore >= 6.0) {
    baseRules = ["1-3s"];
    explanation = `Sigma = ${sigmaScore.toFixed(
      2
    )}σ (≥ 6.0σ): Đạt mức 6-Sigma, chỉ cần áp dụng quy tắc 1-3s.`;
  } else if (sigmaScore !== null && sigmaScore >= 5.0) {
    baseRules = ["1-3s", "2-2s", "R-4s"];
    explanation = `Sigma = ${sigmaScore.toFixed(
      2
    )}σ (5.0–5.99σ): Áp dụng bộ 3 quy tắc 1-3s / 2-2s / R-4s.`;
  } else {
    baseRules = ["1-3s", "2-2s", "R-4s", "4-1s", "10x"];
    explanation = `Sigma = ${
      sigmaScore !== null ? `${sigmaScore.toFixed(2)}σ` : "Chưa có"
    } (< 5.0σ): Áp dụng bộ quy tắc Westgard đầy đủ.`;
  }

  if (isExempt) {
    baseRules = baseRules.filter(
      (r) => r !== "6x" && r !== "8x" && r !== "10x"
    );
    explanation += " [Ngoại lệ: Bỏ qua 6x/8x/10x].";
  }

  return {
    recommendedRules: baseRules,
    explanation,
    isExemptLongRules: isExempt,
  };
}

// ============================================================================
// HÀM TÍNH POOLED CV% (u_rw) THEO TRỌNG SỐ BẬC TỰ DO (n_i - 1) CHUẨN CLSI C24
// ============================================================================
export function computeThreeLotPooledStats(
  cfg: TestConfig,
  levelKey: "L1" | "L2" | "L3",
  currentMeanLab: number,
  currentCvPct: number,
  currentValidN?: number
): {
  pooledCvPct: number;
  proposedSdByCv: number;
  lotsCountUsed: number;
  totalDegreesOfFreedom: number;
} {
  const historyLots = (cfg.lot_history || []).slice(0, 3);
  const itemsForPooled: {
    lot_number: string;
    cv_pct: number;
    n_count?: number;
  }[] = [];

  historyLots.forEach((lot) => {
    const lvCv =
      levelKey === "L1"
        ? lot.cv_L1 || (lot.mean_L1 > 0 ? (lot.sd_L1 / lot.mean_L1) * 100 : 0)
        : levelKey === "L2"
        ? lot.cv_L2 || (lot.mean_L2 > 0 ? (lot.sd_L2 / lot.mean_L2) * 100 : 0)
        : lot.cv_L3 || (lot.mean_L3 > 0 ? (lot.sd_L3 / lot.mean_L3) * 100 : 0);
    const lvN =
      levelKey === "L1" ? lot.n_L1 : levelKey === "L2" ? lot.n_L2 : lot.n_L3;

    if (lvCv > 0) {
      itemsForPooled.push({
        lot_number: lot.lot_number,
        cv_pct: lvCv,
        n_count: lvN && lvN > 1 ? lvN : 30, // Mặc định n = 30 nếu lô cũ không lưu N
      });
    }
  });

  if (currentCvPct > 0) {
    itemsForPooled.push({
      lot_number: cfg.lot_number,
      cv_pct: currentCvPct,
      n_count: currentValidN && currentValidN > 1 ? currentValidN : 30,
    });
  }

  if (itemsForPooled.length === 0) {
    const mfgMean =
      levelKey === "L1"
        ? cfg.mfg_mean_L1
        : levelKey === "L2"
        ? cfg.mfg_mean_L2
        : cfg.mfg_mean_L3;
    const mfgSd =
      levelKey === "L1"
        ? cfg.mfg_sd_L1
        : levelKey === "L2"
        ? cfg.mfg_sd_L2
        : cfg.mfg_sd_L3;
    const fallbackCv = mfgMean > 0 ? (mfgSd / mfgMean) * 100 : 2.5;
    return {
      pooledCvPct: Number(fallbackCv.toFixed(2)),
      proposedSdByCv: Number(((currentMeanLab * fallbackCv) / 100).toFixed(3)),
      lotsCountUsed: 1,
      totalDegreesOfFreedom: 29,
    };
  }

  const weighted = calculateWeightedPooledCv(itemsForPooled);
  const proposedSd = (currentMeanLab * weighted.pooledCvPct) / 100;

  return {
    pooledCvPct: weighted.pooledCvPct,
    proposedSdByCv: Number(proposedSd.toFixed(3)),
    lotsCountUsed: itemsForPooled.length,
    totalDegreesOfFreedom: weighted.totalDf,
  };
}

interface LevelMuDraft {
  mu_mode: MuModeType;
  manual_mu: string;
  verif_cvr: string;
  verif_bias: string;
  urw_pooled: string;
  uc_cal: string;
  ubias_periodic: string;
}

const emptyLevelMuDraft = (): LevelMuDraft => ({
  mu_mode: "INITIAL_VERIFICATION",
  manual_mu: "",
  verif_cvr: "",
  verif_bias: "",
  urw_pooled: "",
  uc_cal: "",
  ubias_periodic: "",
});

const levelMuConfigToDraft = (cfg?: LevelMuConfig): LevelMuDraft => ({
  mu_mode: cfg?.mu_mode || "NONE",
  manual_mu: cfg?.manual_mu !== undefined ? String(cfg.manual_mu) : "",
  verif_cvr: cfg?.verif_cvr !== undefined ? String(cfg.verif_cvr) : "",
  verif_bias: cfg?.verif_bias !== undefined ? String(cfg.verif_bias) : "",
  urw_pooled: cfg?.urw_pooled !== undefined ? String(cfg.urw_pooled) : "",
  uc_cal: cfg?.uc_cal !== undefined ? String(cfg.uc_cal) : "",
  ubias_periodic:
    cfg?.ubias_periodic !== undefined ? String(cfg.ubias_periodic) : "",
});

const draftToLevelMuConfig = (d: LevelMuDraft): LevelMuConfig => ({
  mu_mode: d.mu_mode,
  manual_mu: d.manual_mu ? parseFloat(d.manual_mu) : undefined,
  verif_cvr: d.verif_cvr ? parseFloat(d.verif_cvr) : undefined,
  verif_bias: d.verif_bias ? parseFloat(d.verif_bias) : undefined,
  urw_pooled: d.urw_pooled ? parseFloat(d.urw_pooled) : undefined,
  uc_cal: d.uc_cal ? parseFloat(d.uc_cal) : undefined,
  ubias_periodic: d.ubias_periodic ? parseFloat(d.ubias_periodic) : undefined,
});

interface SetupAndAssistantProps {
  apiUrl: string;
  authToken: string;
  currentUser: UserAccount;
  runDate: string;
  sections: string[];
  labMachines: { section: string; machine: string }[];
  configs: TestConfig[];
  setConfigs: React.Dispatch<React.SetStateAction<TestConfig[]>>;
  reagents: ReagentLotBM16[];
  setReagents: React.Dispatch<React.SetStateAction<ReagentLotBM16[]>>;
  users: UserAccount[];
  initialSubTab?: "SETUP" | "ASSISTANT";
  onSubTabChange?: (tab: "SETUP" | "ASSISTANT") => void;
}

export default function SetupAndAssistant({
  apiUrl,
  authToken,
  currentUser,
  runDate,
  sections,
  labMachines,
  configs,
  setConfigs,
  reagents,
  setReagents,
  users,
  initialSubTab,
  onSubTabChange,
}: SetupAndAssistantProps) {
  // =========================================================================
  // 1. CÁC HÀM TRỢ GIÚP LỌC DỮ LIỆU
  // =========================================================================
  const getMachinesForSection = (sec: string) =>
    labMachines.filter((m) => m.section === sec).map((m) => m.machine);

  const getControlsForMachine = (m: string) => {
    const fromReagents = reagents
      .filter((r) => r.machine_name === m)
      .map((r) => r.control_name);
    const fromConfigs = configs
      .filter((c) => c.machine_name === m)
      .map((c) => c.control_name);
    return Array.from(new Set([...fromReagents, ...fromConfigs]));
  };

  const getTestsForControl = (m: string, ctrl: string) =>
    configs
      .filter((c) => c.machine_name === m && c.control_name === ctrl)
      .sort((a, b) => a.order - b.order);

  const getActiveReagentLot = (
    m: string,
    ctrl: string
  ): ReagentLotBM16 | undefined => {
    const matches = reagents.filter(
      (r) => r.machine_name === m && r.control_name === ctrl
    );
    return matches[matches.length - 1];
  };

  const canManageCatalog =
    currentUser.role === "ADMIN" ||
    currentUser.role === "QLCM" ||
    hasPermission(currentUser, "MANAGE_CATALOG");

  const canReorderOrDelete =
    currentUser.role === "ADMIN" ||
    hasPermission(currentUser, "MANAGE_CATALOG");

  const canApproveRangeMu =
    currentUser.role === "ADMIN" ||
    currentUser.role === "QLCM" ||
    hasPermission(currentUser, "APPROVE_RANGE_MU");

  // =========================================================================
  // 2. STATE QUẢN LÝ TAB ("SETUP" vs "ASSISTANT")
  // =========================================================================
  const [mainTab, setMainTab] = useState<"SETUP" | "ASSISTANT">(
    initialSubTab || "SETUP"
  );

  useEffect(() => {
    if (initialSubTab) setMainTab(initialSubTab);
  }, [initialSubTab]);

  const handleSwitchMainTab = (tab: "SETUP" | "ASSISTANT") => {
    setMainTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // =========================================================================
  // 3. STATE QUẢN TRỊ HÓA CHẤT QC (MỞ NẮP & PHA TAY) + DANH MỤC HÓA CHẤT QC
  // =========================================================================
  const defaultSec = sections[0] || "Sinh Hóa";
  const defaultMac = getMachinesForSection(defaultSec)[0] || "";
  const defaultCtrl = getControlsForMachine(defaultMac)[0] || "";

  const [setupSection, setSetupSection] = useState<string>(defaultSec);
  const [setupMachine, setSetupMachine] = useState<string>(defaultMac);
  const [setupControl, setSetupControl] = useState<string>(defaultCtrl);

  const [editingReagentId, setEditingReagentId] = useState<string | null>(null);
  const [isReagentFormDimmed, setIsReagentFormDimmed] =
    useState<boolean>(false);

  const [reagentForm, setReagentForm] = useState({
    section_name: defaultSec,
    machine_name: defaultMac,
    control_name: "",
    lot_number: "",
    expiry_date: "",
    is_manual_prep: false,
    prep_date: runDate,
    prep_by_id: currentUser.id,
    prep_by_pw: "",
    quantity_prepared: "3",
    note: "",
  });
  const [reagentMsg, setReagentMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [catalogLabFilter, setCatalogLabFilter] = useState<string>("Tất cả");
  const [catalogMachineFilter, setCatalogMachineFilter] =
    useState<string>("Tất cả");

  // =========================================================================
  // 4. STATE CẤU HÌNH XÉT NGHIỆM & HỒ SƠ MU 3 MỨC (CÓ TEA_UNIT & CỜ NGOẠI LỆ)
  // =========================================================================
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [activeMuTab, setActiveMuTab] = useState<"L1" | "L2" | "L3">("L1");

  const [newTestForm, setNewTestForm] = useState({
    test_name: "",
    unit: "mmol/L",
    standard_label: "ISO" as "ISO" | "THUONG",
    test_type: "QUANTITATIVE" as TestCategoryType,
    levels_count: 2 as 1 | 2 | 3,
    tea: "10",
    tea_unit: "PERCENT" as "PERCENT" | "ABSOLUTE",
    is_exempt_long_rules: false,
    mean_L1: "",
    sd_L1: "",
    mean_L2: "",
    sd_L2: "",
    mean_L3: "",
    sd_L3: "",
    expected_qual_L1: "ÂM TÍNH" as "ÂM TÍNH" | "DƯƠNG TÍNH",
    expected_qual_L2: "DƯƠNG TÍNH" as "ÂM TÍNH" | "DƯƠNG TÍNH",
    expected_qual_L3: "DƯƠNG TÍNH" as "ÂM TÍNH" | "DƯƠNG TÍNH",
    mu_L1: emptyLevelMuDraft(),
    mu_L2: emptyLevelMuDraft(),
    mu_L3: emptyLevelMuDraft(),
  });
  const [testDropdownOpen, setTestDropdownOpen] = useState(false);
  const [configMsg, setConfigMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // =========================================================================
  // 5. STATE KÉO THẢ SẮP XẾP & POPUP XEM 3 LOT GẦN NHẤT
  // =========================================================================
  const [draggedTestId, setDraggedTestId] = useState<string | null>(null);
  const [activeInfoTestId, setActiveInfoTestId] = useState<string | null>(null);

  // =========================================================================
  // 6. STATE TRỢ LÝ DẢI CHUẨN & MU (TÍCH HỢP DEEP LINK SMART ROUTING)
  // =========================================================================
  const [statViewMode, setStatViewMode] = useState<"RANGE" | "QUALITY">(
    "RANGE"
  );
  const [statSection, setStatSection] = useState<string>(defaultSec);
  const [statMachine, setStatMachine] = useState<string>("Tất cả");
  const [statStdFilter, setStatStdFilter] = useState<"ALL" | "ISO" | "THUONG">(
    "ALL"
  );
  const [statLevelFilter, setStatLevelFilter] = useState<
    "ALL" | "L1" | "L2" | "L3"
  >("ALL");
  const [statTestFilter, setStatTestFilter] = useState<string>("ALL");
  const [statSearchQuery, setStatSearchQuery] = useState<string>("");
  const [deepLinkedTestId, setDeepLinkedTestId] = useState<string | null>(null);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const reagentFormRef = useRef<HTMLDivElement | null>(null);
  const testFormRef = useRef<HTMLDivElement | null>(null);

  // --- LẮNG NGHE DEEP LINK TỪ DASHBOARD ---
  useEffect(() => {
    const rawLink = sessionStorage.getItem("DEEP_LINK_TEST");
    if (!rawLink) return;
    try {
      const payload = JSON.parse(rawLink);
      handleSwitchMainTab("ASSISTANT");
      if (payload.viewMode === "QUALITY" || payload.viewMode === "RANGE") {
        setStatViewMode(payload.viewMode);
      }
      if (payload.section) setStatSection(payload.section);
      setStatMachine(payload.machine || "Tất cả");
      setStatStdFilter("ALL");

      if (payload.test_id) {
        setStatTestFilter(payload.test_id);
        setDeepLinkedTestId(payload.test_id);
        setTimeout(() => {
          const rowEl = rowRefs.current[payload.test_id];
          if (rowEl)
            rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 180);
      } else {
        setStatTestFilter("ALL");
        setDeepLinkedTestId(null);
      }
    } catch {}
    sessionStorage.removeItem("DEEP_LINK_TEST");
  }, [initialSubTab]);

  // =========================================================================
  // XỬ LÝ KHAI BÁO / SỬA / XÓA HÓA CHẤT QC (MỞ NẮP & PHA TAY)
  // =========================================================================
  const handleSaveReagentLot = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      section_name,
      machine_name,
      control_name,
      lot_number,
      expiry_date,
      is_manual_prep,
      prep_date,
      prep_by_id,
      prep_by_pw,
      quantity_prepared,
      note,
    } = reagentForm;

    if (
      !control_name.trim() ||
      !lot_number.trim() ||
      !expiry_date ||
      !prep_date ||
      !prep_by_id.trim()
    ) {
      setReagentMsg({
        type: "err",
        text: "Vui lòng điền đầy đủ các trường bắt buộc (*)!",
      });
      return;
    }

    const verifier = users.find(
      (u) =>
        (u.id.toLowerCase() === prep_by_id.trim().toLowerCase() ||
          u.name.toLowerCase() === prep_by_id.trim().toLowerCase()) &&
        u.password === prep_by_pw
    );
    if (!verifier) {
      setReagentMsg({
        type: "err",
        text: `Xác thực ${
          is_manual_prep ? "Người pha" : "Người mở nắp"
        } thất bại! Sai ID hoặc Mật khẩu.`,
      });
      return;
    }

    const qtyNum = is_manual_prep
      ? Math.max(1, parseInt(quantity_prepared, 10) || 3)
      : undefined;
    const cleanCtrlName = control_name.trim();
    const cleanLot = lot_number.trim();

    if (editingReagentId) {
      let updatedLotObj: ReagentLotBM16 | null = null;
      setReagents((prev) =>
        prev.map((r) => {
          if (r.control_id !== editingReagentId) return r;
          const nextR: ReagentLotBM16 = {
            ...r,
            section_name,
            machine_name,
            control_name: cleanCtrlName,
            lot_number: cleanLot,
            expiry_date,
            is_manual_prep,
            prep_date,
            prep_by_id: verifier.id,
            prep_by_name: verifier.name,
            quantity_prepared: qtyNum,
            note: is_manual_prep ? note : "Mở nắp dùng ngay",
          };
          updatedLotObj = nextR;
          return nextR;
        })
      );

      // Tự động cập nhật Số Lô & lưu trữ Lot cũ vào lot_history (với n_L1/L2/L3 chuẩn)
      setConfigs((prev) =>
        prev.map((c) => {
          if (
            c.machine_name === machine_name &&
            c.control_name === cleanCtrlName
          ) {
            const isNewLot = c.lot_number !== cleanLot;
            const prevArchive: LotArchiveItem[] = Array.isArray(c.lot_history)
              ? [...c.lot_history]
              : [];
            if (isNewLot && c.lot_number) {
              const mu1 = computeMuAndSigma(c, "L1");
              const mu2 = computeMuAndSigma(c, "L2");
              const mu3 = computeMuAndSigma(c, "L3");
              prevArchive.unshift({
                lot_number: c.lot_number,
                expiry_date: c.expiry_date,
                range_source: c.range_source,
                mean_L1: c.mean_L1,
                sd_L1: c.sd_L1,
                cv_L1: mu1.cvPct,
                n_L1: mu1.validPointsCount > 1 ? mu1.validPointsCount : 30,
                mean_L2: c.mean_L2,
                sd_L2: c.sd_L2,
                cv_L2: mu2.cvPct,
                n_L2: mu2.validPointsCount > 1 ? mu2.validPointsCount : 30,
                mean_L3: c.mean_L3,
                sd_L3: c.sd_L3,
                cv_L3: mu3.cvPct,
                n_L3: mu3.validPointsCount > 1 ? mu3.validPointsCount : 30,
                archived_at: runDate,
              });
            }
            return {
              ...c,
              lot_number: cleanLot,
              expiry_date,
              lot_history: prevArchive.slice(0, 3),
            };
          }
          return c;
        })
      );

      setEditingReagentId(null);
      setIsReagentFormDimmed(true);
      setReagentMsg({
        type: "ok",
        text: `Đã cập nhật hóa chất "${cleanCtrlName}" (Lô ${cleanLot}) trong Danh mục hóa chất QC!`,
      });
      setReagentForm((prev) => ({
        ...prev,
        control_name: "",
        lot_number: "",
        expiry_date: "",
        prep_by_pw: "",
        note: "",
      }));
      if (updatedLotObj)
        await rpcCall(apiUrl, "save_control", updatedLotObj, authToken);
      return;
    }

    const newLot: ReagentLotBM16 = {
      control_id: `CTRL-${Date.now().toString().slice(-4)}`,
      section_name,
      machine_name,
      control_name: cleanCtrlName,
      lot_number: cleanLot,
      expiry_date,
      is_manual_prep,
      prep_date,
      prep_by_id: verifier.id,
      prep_by_name: verifier.name,
      quantity_prepared: qtyNum,
      usage_count: 0,
      used_days_map: {},
      note: is_manual_prep ? note : "Mở nắp dùng ngay",
    };

    setReagents((prev) => [...prev, newLot]);
    setConfigs((prev) =>
      prev.map((c) =>
        c.machine_name === machine_name && c.control_name === cleanCtrlName
          ? { ...c, lot_number: cleanLot, expiry_date }
          : c
      )
    );

    setSetupSection(section_name);
    setSetupMachine(machine_name);
    setSetupControl(newLot.control_name);
    setIsReagentFormDimmed(true);
    setReagentMsg({
      type: "ok",
      text: is_manual_prep
        ? `Đã lưu Hóa chất tự pha "${newLot.control_name}" (Lô ${
            newLot.lot_number
          }, SL pha: ${qtyNum} — Cảnh báo BM.16 khi dùng ≥ ${getReagentThreshold75(
            qtyNum
          )} lần).`
        : `Đã lưu Hóa chất mở nắp "${newLot.control_name}" (Lô ${newLot.lot_number}) vào Danh mục hóa chất QC (Không đưa vào BM.16).`,
    });
    setReagentForm((prev) => ({
      ...prev,
      control_name: "",
      lot_number: "",
      expiry_date: "",
      prep_by_pw: "",
      note: "",
    }));
    await rpcCall(apiUrl, "save_control", newLot, authToken);
  };

  const handleEditReagentFromTable = (r: ReagentLotBM16) => {
    setEditingReagentId(r.control_id);
    setIsReagentFormDimmed(false);
    setReagentMsg(null);
    setReagentForm({
      section_name: r.section_name,
      machine_name: r.machine_name,
      control_name: r.control_name,
      lot_number: r.lot_number,
      expiry_date: r.expiry_date,
      is_manual_prep: r.is_manual_prep,
      prep_date: r.prep_date,
      prep_by_id: r.prep_by_id || currentUser.id,
      prep_by_pw: "",
      quantity_prepared: String(r.quantity_prepared || 3),
      note: r.note || "",
    });
    setTimeout(() => {
      reagentFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handleDeleteReagentFromTable = async (r: ReagentLotBM16) => {
    if (!canReorderOrDelete) return;
    if (
      !window.confirm(
        `Xác nhận xóa lô hóa chất "${r.control_name}" (Số lô: ${r.lot_number} · Máy: ${r.machine_name}) khỏi Danh mục hóa chất QC?`
      )
    )
      return;
    setReagents((prev) =>
      prev.filter((item) => item.control_id !== r.control_id)
    );
    await rpcCall(
      apiUrl,
      "admin_delete_control",
      { control_id: r.control_id },
      authToken
    );
  };

  // =========================================================================
  // XỬ LÝ THÊM / SỬA XÉT NGHIỆM & HỒ SƠ MU 3 MỨC (TỰ KẾ THỪA LOT, CÓ TEA_UNIT)
  // =========================================================================
  const handleLoadTestToEdit = (t: TestConfig) => {
    setSetupSection(t.section);
    setSetupMachine(t.machine_name);
    setSetupControl(t.control_name);
    setEditingTestId(t.test_id);
    setActiveMuTab("L1");
    setNewTestForm({
      test_name: t.test_name,
      unit: t.unit,
      standard_label: t.standard_label,
      test_type: t.test_type,
      levels_count: t.levels_count,
      tea: t.tea !== undefined ? String(t.tea) : "",
      tea_unit: t.tea_unit || "PERCENT",
      is_exempt_long_rules: Boolean(t.is_exempt_long_rules),
      mean_L1: String(t.mfg_mean_L1 || t.mean_L1),
      sd_L1: String(t.mfg_sd_L1 || t.sd_L1),
      mean_L2: String(t.mfg_mean_L2 || t.mean_L2),
      sd_L2: String(t.mfg_sd_L2 || t.sd_L2),
      mean_L3: String(t.mfg_mean_L3 || t.mean_L3),
      sd_L3: String(t.mfg_sd_L3 || t.sd_L3),
      expected_qual_L1: t.expected_qual_L1 || "ÂM TÍNH",
      expected_qual_L2: t.expected_qual_L2 || "DƯƠNG TÍNH",
      expected_qual_L3: t.expected_qual_L3 || "DƯƠNG TÍNH",
      mu_L1: levelMuConfigToDraft(t.mu_L1),
      mu_L2: levelMuConfigToDraft(t.mu_L2),
      mu_L3: levelMuConfigToDraft(t.mu_L3),
    });
    setActiveInfoTestId(null);
    handleSwitchMainTab("SETUP");
    setTimeout(() => {
      testFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const resetTestForm = () => {
    setEditingTestId(null);
    setActiveMuTab("L1");
    setNewTestForm({
      test_name: "",
      unit: "mmol/L",
      standard_label: "ISO",
      test_type: "QUANTITATIVE",
      levels_count: 2,
      tea: "10",
      tea_unit: "PERCENT",
      is_exempt_long_rules: false,
      mean_L1: "",
      sd_L1: "",
      mean_L2: "",
      sd_L2: "",
      mean_L3: "",
      sd_L3: "",
      expected_qual_L1: "ÂM TÍNH",
      expected_qual_L2: "DƯƠNG TÍNH",
      expected_qual_L3: "DƯƠNG TÍNH",
      mu_L1: emptyLevelMuDraft(),
      mu_L2: emptyLevelMuDraft(),
      mu_L3: emptyLevelMuDraft(),
    });
  };

  const handleSaveOrUpdateTestConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestForm.test_name.trim()) return;
    if (!setupControl) {
      setConfigMsg({
        type: "err",
        text: "Vui lòng khai báo hoặc chọn Hóa chất QC trước khi tạo xét nghiệm!",
      });
      return;
    }

    const isNumeric = newTestForm.test_type !== "QUALITATIVE";
    if (isNumeric && (!newTestForm.mean_L1 || !newTestForm.sd_L1)) {
      setConfigMsg({
        type: "err",
        text: "Vui lòng nhập đầy đủ Mean và SD của Mức 1 (L1)!",
      });
      return;
    }

    const matchedReagent = getActiveReagentLot(setupMachine, setupControl);
    const inheritedLot = matchedReagent?.lot_number || "CHUA-CO-LOT";
    const inheritedExpiry = matchedReagent?.expiry_date || "2026-12-31";
    const siblings = getTestsForControl(setupMachine, setupControl);

    const m1 = isNumeric ? parseFloat(newTestForm.mean_L1) || 1.0 : 0;
    const s1 = isNumeric ? parseFloat(newTestForm.sd_L1) || 0.1 : 0;
    const m2 =
      isNumeric && newTestForm.levels_count >= 2
        ? parseFloat(newTestForm.mean_L2) || Number((m1 * 2).toFixed(2))
        : 0;
    const s2 =
      isNumeric && newTestForm.levels_count >= 2
        ? parseFloat(newTestForm.sd_L2) || Number((s1 * 2).toFixed(2))
        : 0;
    const m3 =
      isNumeric && newTestForm.levels_count === 3
        ? parseFloat(newTestForm.mean_L3) || Number((m1 * 3).toFixed(2))
        : 0;
    const s3 =
      isNumeric && newTestForm.levels_count === 3
        ? parseFloat(newTestForm.sd_L3) || Number((s1 * 3).toFixed(2))
        : 0;

    const muL1Obj = draftToLevelMuConfig(newTestForm.mu_L1);
    const muL2Obj =
      newTestForm.levels_count >= 2
        ? draftToLevelMuConfig(newTestForm.mu_L2)
        : undefined;
    const muL3Obj =
      newTestForm.levels_count === 3
        ? draftToLevelMuConfig(newTestForm.mu_L3)
        : undefined;

    if (editingTestId) {
      let updatedRecord: TestConfig | null = null;
      setConfigs((prev) =>
        prev.map((c) => {
          if (c.test_id !== editingTestId) return c;
          const isStillMfgRange = c.range_source === "MANUFACTURER";
          const nextObj: TestConfig = {
            ...c,
            section: setupSection,
            machine_name: setupMachine,
            control_name: setupControl,
            lot_number: inheritedLot,
            expiry_date: inheritedExpiry,
            test_name: newTestForm.test_name.trim(),
            unit: newTestForm.unit.trim() || "Không đơn vị",
            standard_label: newTestForm.standard_label,
            test_type: newTestForm.test_type,
            levels_count: newTestForm.levels_count,
            tea: newTestForm.tea ? parseFloat(newTestForm.tea) : undefined,
            tea_unit: newTestForm.tea_unit,
            is_exempt_long_rules: newTestForm.is_exempt_long_rules,
            mfg_mean_L1: m1,
            mfg_sd_L1: s1,
            mfg_mean_L2: m2,
            mfg_sd_L2: s2,
            mfg_mean_L3: m3,
            mfg_sd_L3: s3,
            mean_L1: isStillMfgRange ? m1 : c.mean_L1,
            sd_L1: isStillMfgRange ? s1 : c.sd_L1,
            mean_L2: isStillMfgRange ? m2 : c.mean_L2,
            sd_L2: isStillMfgRange ? s2 : c.sd_L2,
            mean_L3: isStillMfgRange ? m3 : c.mean_L3,
            sd_L3: isStillMfgRange ? s3 : c.sd_L3,
            expected_qual_L1: newTestForm.expected_qual_L1,
            expected_qual_L2: newTestForm.expected_qual_L2,
            expected_qual_L3: newTestForm.expected_qual_L3,
            mu_L1: muL1Obj,
            mu_L2: muL2Obj,
            mu_L3: muL3Obj,
          };
          updatedRecord = nextObj;
          return nextObj;
        })
      );
      setConfigMsg({
        type: "ok",
        text: `Đã cập nhật xét nghiệm "${newTestForm.test_name.trim()}" (Kế thừa Lô ${inheritedLot}) & Hồ sơ MU đa mức!`,
      });
      resetTestForm();
      if (updatedRecord)
        await rpcCall(apiUrl, "save_config", updatedRecord, authToken);
      return;
    }

    const newCfg: TestConfig = {
      test_id: `T-${Date.now().toString().slice(-5)}`,
      section: setupSection,
      machine_name: setupMachine,
      control_name: setupControl,
      lot_number: inheritedLot,
      expiry_date: inheritedExpiry,
      test_name: newTestForm.test_name.trim(),
      unit: newTestForm.unit.trim() || "Không đơn vị",
      standard_label: newTestForm.standard_label,
      test_type: newTestForm.test_type,
      levels_count: newTestForm.levels_count,
      tea: newTestForm.tea ? parseFloat(newTestForm.tea) : undefined,
      tea_unit: newTestForm.tea_unit,
      is_exempt_long_rules: newTestForm.is_exempt_long_rules,
      order: siblings.length + 1,
      mfg_mean_L1: m1,
      mfg_sd_L1: s1,
      mfg_mean_L2: m2,
      mfg_sd_L2: s2,
      mfg_mean_L3: m3,
      mfg_sd_L3: s3,
      mean_L1: m1,
      sd_L1: s1,
      mean_L2: m2,
      sd_L2: s2,
      mean_L3: m3,
      sd_L3: s3,
      expected_qual_L1: newTestForm.expected_qual_L1,
      expected_qual_L2: newTestForm.expected_qual_L2,
      expected_qual_L3: newTestForm.expected_qual_L3,
      mu_L1: muL1Obj,
      mu_L2: muL2Obj,
      mu_L3: muL3Obj,
      range_source: "MANUFACTURER",
      range_active_days: 0,
      accumulated_points: 0,
      lot_history: [],
      history_L1: [],
      history_L2: [],
      history_L3: [],
    };

    setConfigs((prev) => [...prev, newCfg]);
    setConfigMsg({
      type: "ok",
      text: `Đã thêm xét nghiệm "${newCfg.test_name}" (Kế thừa Lô ${inheritedLot} từ ${setupControl}) kèm Hồ sơ MU!`,
    });
    resetTestForm();
    await rpcCall(apiUrl, "save_config", newCfg, authToken);
  };

  // --- KÉO THẢ SẮP XẾP & XÓA XÉT NGHIỆM ---
  const handleDropTest = async (targetTestId: string) => {
    if (!canReorderOrDelete || !draggedTestId || draggedTestId === targetTestId)
      return;
    const list = getTestsForControl(setupMachine, setupControl);
    const dragIdx = list.findIndex((t) => t.test_id === draggedTestId);
    const dropIdx = list.findIndex((t) => t.test_id === targetTestId);
    if (dragIdx < 0 || dropIdx < 0) return;

    const reordered = [...list];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    const orderMap: Record<string, number> = {};
    reordered.forEach((t, idx) => {
      orderMap[t.test_id] = idx + 1;
    });

    setConfigs((prev) =>
      prev.map((c) =>
        orderMap[c.test_id] ? { ...c, order: orderMap[c.test_id] } : c
      )
    );
    setDraggedTestId(null);
    await rpcCall(
      apiUrl,
      "admin_reorder_configs",
      { order_map: orderMap },
      authToken
    );
  };

  const handleDeleteTest = async (testId: string) => {
    if (!canReorderOrDelete) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa xét nghiệm này?")) return;
    setConfigs((prev) => prev.filter((c) => c.test_id !== testId));
    await rpcCall(
      apiUrl,
      "admin_delete_config",
      { test_id: testId },
      authToken
    );
  };

  // =========================================================================
  // CHỐT RANGE PHÒNG XÉT NGHIỆM (THEO POOLED CV% TRỌNG SỐ n-1 HOẶC SD LÔ MỚI)
  // =========================================================================
  const applyLabRange = async (
    testObj: TestConfig,
    method: "POOLED_3LOT_CV" | "CURRENT_LOT_SD" | "RESTORE_MFG"
  ) => {
    if (!canApproveRangeMu) {
      window.alert(
        "Tài khoản của bạn chưa được cấp quyền Chốt Dải chuẩn (Range Phòng)!"
      );
      return;
    }

    if (method === "RESTORE_MFG") {
      if (
        !window.confirm(
          `Khôi phục dải chuẩn gốc của Hãng sản xuất cho xét nghiệm "${testObj.test_name}"?`
        )
      )
        return;
      setConfigs((prev) =>
        prev.map((c) =>
          c.test_id === testObj.test_id
            ? {
                ...c,
                mean_L1: c.mfg_mean_L1,
                sd_L1: c.mfg_sd_L1,
                mean_L2: c.mfg_mean_L2,
                sd_L2: c.mfg_sd_L2,
                mean_L3: c.mfg_mean_L3,
                sd_L3: c.mfg_sd_L3,
                range_source: "MANUFACTURER",
                range_active_days: 0,
              }
            : c
        )
      );
      return;
    }

    const muL1 = computeMuAndSigma(testObj, "L1");
    const muL2 = computeMuAndSigma(testObj, "L2");
    const muL3 = computeMuAndSigma(testObj, "L3");

    const pool1 = computeThreeLotPooledStats(
      testObj,
      "L1",
      muL1.meanLab,
      muL1.cvPct,
      muL1.validPointsCount
    );
    const pool2 = computeThreeLotPooledStats(
      testObj,
      "L2",
      muL2.meanLab,
      muL2.cvPct,
      muL2.validPointsCount
    );
    const pool3 = computeThreeLotPooledStats(
      testObj,
      "L3",
      muL3.meanLab,
      muL3.cvPct,
      muL3.validPointsCount
    );

    const pts = muL1.validPointsCount;
    const sourceType: RangeSourceType = pts >= 20 ? "LAB_OFFICIAL" : "LAB_TEMP";

    const nextM1 = Number(muL1.meanLab.toFixed(2));
    const nextS1 =
      method === "POOLED_3LOT_CV"
        ? pool1.proposedSdByCv
        : Number(Math.max(muL1.sdLab, 0.001).toFixed(3));

    const nextM2 =
      testObj.levels_count >= 2
        ? Number(muL2.meanLab.toFixed(2))
        : testObj.mean_L2;
    const nextS2 =
      testObj.levels_count >= 2
        ? method === "POOLED_3LOT_CV"
          ? pool2.proposedSdByCv
          : Number(Math.max(muL2.sdLab, 0.001).toFixed(3))
        : testObj.sd_L2;

    const nextM3 =
      testObj.levels_count === 3
        ? Number(muL3.meanLab.toFixed(2))
        : testObj.mean_L3;
    const nextS3 =
      testObj.levels_count === 3
        ? method === "POOLED_3LOT_CV"
          ? pool3.proposedSdByCv
          : Number(Math.max(muL3.sdLab, 0.001).toFixed(3))
        : testObj.sd_L3;

    const archiveEntry: LotArchiveItem = {
      lot_number: testObj.lot_number,
      expiry_date: testObj.expiry_date,
      range_source: sourceType,
      mean_L1: nextM1,
      sd_L1: nextS1,
      cv_L1: muL1.cvPct,
      n_L1: muL1.validPointsCount > 1 ? muL1.validPointsCount : 30,
      mean_L2: nextM2,
      sd_L2: nextS2,
      cv_L2: muL2.cvPct,
      n_L2: muL2.validPointsCount > 1 ? muL2.validPointsCount : 30,
      mean_L3: nextM3,
      sd_L3: nextS3,
      cv_L3: muL3.cvPct,
      n_L3: muL3.validPointsCount > 1 ? muL3.validPointsCount : 30,
      archived_at: runDate,
    };

    setConfigs((prev) =>
      prev.map((c) => {
        if (c.test_id !== testObj.test_id) return c;
        const otherLots = (c.lot_history || []).filter(
          (h) => h.lot_number !== testObj.lot_number
        );
        return {
          ...c,
          mean_L1: nextM1,
          sd_L1: nextS1,
          mean_L2: nextM2,
          sd_L2: nextS2,
          mean_L3: nextM3,
          sd_L3: nextS3,
          range_source: sourceType,
          range_applied_date: runDate,
          range_active_days: 1,
          lot_history: [archiveEntry, ...otherLots].slice(0, 3),
        };
      })
    );

    await rpcCall(
      apiUrl,
      "apply_lab_range",
      {
        test_id: testObj.test_id,
        range_source: sourceType,
        applied_date: runDate,
        mean_L1: nextM1,
        sd_L1: nextS1,
        mean_L2: nextM2,
        sd_L2: nextS2,
        mean_L3: nextM3,
        sd_L3: nextS3,
      },
      authToken
    );
  };

  // --- LỌC DANH SÁCH TRỢ LÝ DẢI CHUẨN & MU ---
  const testsInStatSection = configs.filter(
    (c) =>
      c.section === statSection &&
      (statMachine === "Tất cả" || c.machine_name === statMachine) &&
      c.test_type !== "QUALITATIVE"
  );

  const statFilteredConfigs = testsInStatSection.filter((c) => {
    if (statStdFilter !== "ALL" && c.standard_label !== statStdFilter)
      return false;
    if (statTestFilter !== "ALL" && c.test_id !== statTestFilter) return false;
    if (
      statSearchQuery.trim() !== "" &&
      !c.test_name.toLowerCase().includes(statSearchQuery.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const activeDeepLinkedTest = configs.find(
    (c) => c.test_id === deepLinkedTestId
  );
  const currentActiveReagentForTestForm = getActiveReagentLot(
    setupMachine,
    setupControl
  );

  // Hàm render khối cấu hình MU theo mức đang chọn trong Form
  const renderLevelMuEditor = (lvKey: "L1" | "L2" | "L3") => {
    const fieldKey =
      lvKey === "L1" ? "mu_L1" : lvKey === "L2" ? "mu_L2" : "mu_L3";
    const draft = newTestForm[fieldKey];
    const meanStr =
      lvKey === "L1"
        ? newTestForm.mean_L1
        : lvKey === "L2"
        ? newTestForm.mean_L2
        : newTestForm.mean_L3;
    const meanVal = parseFloat(meanStr) || 0;
    const teaNum = parseFloat(newTestForm.tea) || 0;
    const isAbsTea = newTestForm.tea_unit === "ABSOLUTE";

    const limit075Pct =
      teaNum > 0
        ? isAbsTea
          ? meanVal > 0
            ? Number((((0.75 * teaNum) / meanVal) * 100).toFixed(2))
            : null
          : Number((0.75 * teaNum).toFixed(2))
        : null;

    let previewUc: number | null = null;
    let previewUe: number | null = null;
    if (draft.mu_mode === "INITIAL_VERIFICATION") {
      const ur = parseFloat(draft.verif_cvr) || 0;
      const ub = parseFloat(draft.verif_bias) || 0;
      if (ur > 0 || ub > 0) {
        previewUc = Number(Math.sqrt(ur * ur + ub * ub).toFixed(2));
        previewUe = Number((1.96 * previewUc).toFixed(2));
      }
    } else if (draft.mu_mode === "PERIODIC_IQC") {
      const urw = parseFloat(draft.urw_pooled) || 0;
      const ubias = parseFloat(draft.ubias_periodic) || 0;
      const ucal = parseFloat(draft.uc_cal) || 0;
      if (urw > 0 || ubias > 0 || ucal > 0) {
        previewUc = Number(
          Math.sqrt(urw * urw + ubias * ubias + ucal * ucal).toFixed(2)
        );
        previewUe = Number((2 * previewUc).toFixed(2));
      }
    } else if (draft.mu_mode === "MANUAL") {
      const m = parseFloat(draft.manual_mu) || 0;
      if (m > 0) {
        previewUc = Number((m / 2).toFixed(2));
        previewUe = Number(m.toFixed(2));
      }
    }

    const updateDraft = (patch: Partial<LevelMuDraft>) => {
      setNewTestForm((prev) => ({
        ...prev,
        [fieldKey]: { ...prev[fieldKey], ...patch },
      }));
    };

    const editingCfgObj = editingTestId
      ? configs.find((c) => c.test_id === editingTestId)
      : undefined;

    return (
      <div className="bg-white/95 p-3 rounded-xl border border-indigo-200 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-black text-indigo-950 text-xs">
            Thiết lập ĐKBĐĐ cho {lvKey} (Nồng độ đích: {meanVal || "—"}{" "}
            {newTestForm.unit})
          </span>
          <select
            value={draft.mu_mode}
            onChange={(e) =>
              updateDraft({ mu_mode: e.target.value as MuModeType })
            }
            className="bg-indigo-50 border border-indigo-300 rounded-lg px-2.5 py-1 font-bold text-indigo-900 text-xs"
          >
            <option value="INITIAL_VERIFICATION">
              1. Thẩm định ban đầu (uR%, uB% · k=1.96)
            </option>
            <option value="PERIODIC_IQC">
              2. Định kỳ hàng năm (uRw%, uBias%, Ucal% · k=2.0)
            </option>
            <option value="MANUAL">3. Nhập tay trực tiếp Ue (%)</option>
            <option value="NONE">Chưa thiết lập ở mức này</option>
          </select>
        </div>

        {draft.mu_mode === "INITIAL_VERIFICATION" && (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-600 block mb-1">
                1. ĐKBĐĐ của độ tái lặp uR (%)
              </label>
              <input
                type="number"
                step="any"
                placeholder="VD: 8.0 (Trống = tự lấy CV%)"
                value={draft.verif_cvr}
                onChange={(e) => updateDraft({ verif_cvr: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">
                2. ĐKBĐĐ của độ chệch uB (%) [EQA / Peer]
              </label>
              <input
                type="number"
                step="any"
                placeholder="VD: 1.11 (Ưu tiên giữ số này)"
                value={draft.verif_bias}
                onChange={(e) => updateDraft({ verif_bias: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold"
              />
            </div>
          </div>
        )}

        {draft.mu_mode === "PERIODIC_IQC" && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-bold text-slate-600 block mb-1">
                  uRw (%) — Pooled CV%
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Trống = tự lấy CV%"
                  value={draft.urw_pooled}
                  onChange={(e) => updateDraft({ urw_pooled: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">
                  uBias (%) — Ngoại kiểm
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 0.45 (Ưu tiên EQA)"
                  value={draft.ubias_periodic}
                  onChange={(e) =>
                    updateDraft({ ubias_periodic: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">
                  Ucal (%) — Chất chuẩn
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="VD: 1.5"
                  value={draft.uc_cal}
                  onChange={(e) => updateDraft({ uc_cal: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                />
              </div>
            </div>

            {editingCfgObj && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const muNow = computeMuAndSigma(editingCfgObj, lvKey);
                    const poolNow = computeThreeLotPooledStats(
                      editingCfgObj,
                      lvKey,
                      muNow.meanLab,
                      muNow.cvPct,
                      muNow.validPointsCount
                    );
                    updateDraft({ urw_pooled: String(poolNow.pooledCvPct) });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold text-[10.5px] transition"
                >
                  ⚡ Điền nhanh uRw% từ Pooled CV% 3 Lô (Trọng số bậc tự do n-1)
                </button>
              </div>
            )}
          </div>
        )}

        {draft.mu_mode === "MANUAL" && (
          <div>
            <label className="font-bold text-slate-600 block mb-1">
              Nhập trực tiếp ĐKBĐĐ mở rộng Ue (%):
            </label>
            <input
              type="number"
              step="any"
              placeholder="VD: 15.83"
              value={draft.manual_mu}
              onChange={(e) => updateDraft({ manual_mu: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold"
            />
          </div>
        )}

        {previewUe !== null && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2">
            <div>
              <span>
                ĐKBĐĐ tổng hợp (uc): <b className="font-mono">{previewUc}%</b>
              </span>
              <span className="mx-2">·</span>
              <span>
                ĐKBĐĐ mở rộng (Ue):{" "}
                <b className="font-mono text-rose-700">{previewUe}%</b>
              </span>
              {limit075Pct !== null && (
                <>
                  <span className="mx-2">·</span>
                  <span>
                    Tiêu chuẩn (0.75×TEa):{" "}
                    <b className="font-mono">{limit075Pct}%</b> (
                    <b
                      className={
                        previewUe < limit075Pct
                          ? "text-emerald-700"
                          : "text-rose-600"
                      }
                    >
                      {previewUe < limit075Pct ? "Đạt" : "Không đạt"}
                    </b>
                    )
                  </span>
                </>
              )}
            </div>
            {meanVal > 0 && (
              <div className="font-mono font-black text-indigo-950 bg-white px-2 py-0.5 rounded border border-emerald-300">
                KQ ước tính: {meanVal} ± {previewUe}%
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* THANH CHUYỂN ĐỔI 2 TAB CHUYÊN BIỆT                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchMainTab("SETUP")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              mainTab === "SETUP"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-[1.01]"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Ic.Box />
            <span>
              Tab 1: Quản Lý Hóa Chất QC & Quản Trị Danh Mục Xét Nghiệm
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMainTab("ASSISTANT")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              mainTab === "ASSISTANT"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md scale-[1.01]"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Ic.Star />
            <span>
              Tab 2: Trợ Lý Chốt Range (Pooled CV% n-1) & ĐKBĐĐ (BM.01 ISO
              15189)
            </span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-500 px-2">
          {mainTab === "SETUP"
            ? "Phân luồng Hóa chất Mở nắp / Pha tay (BM.16), tự động kế thừa Lot & cấu hình TEa (% / Abs)"
            : "Chốt Range theo Pooled CV% (bậc tự do n-1) & Đánh giá Six Sigma / MU theo Quy trình 30 & 31"}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUẢN LÝ HÓA CHẤT QC, DANH MỤC HÓA CHẤT & CẤU HÌNH XÉT NGHIỆM       */}
      {/* ========================================================================= */}
      {mainTab === "SETUP" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KHỐI 1: KHAI BÁO LÔ HÓA CHẤT QC MỚI (MỞ NẮP HOẶC TỰ PHA CHẾ BM.16) */}
            <div
              ref={reagentFormRef}
              onClick={() => {
                if (isReagentFormDimmed) setIsReagentFormDimmed(false);
              }}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative transition-all"
            >
              <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between gap-2">
                <div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      editingReagentId
                        ? "bg-amber-100 text-amber-800"
                        : reagentForm.is_manual_prep
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {editingReagentId
                      ? "Đang Chỉnh Sửa Hóa Chất QC"
                      : reagentForm.is_manual_prep
                      ? "Hóa chất Tự pha chế (Lưu vào BM.16)"
                      : "Hóa chất Mở nắp dùng ngay (Không lưu BM.16)"}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {editingReagentId
                      ? `Cập Nhật Lô Hóa Chất: ${reagentForm.control_name}`
                      : "Khai Báo Lô Hóa Chất QC Mới"}
                  </h3>
                </div>

                {editingReagentId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReagentId(null);
                      setReagentForm((prev) => ({
                        ...prev,
                        control_name: "",
                        lot_number: "",
                        expiry_date: "",
                        prep_by_pw: "",
                        note: "",
                      }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    ✕ Hủy sửa
                  </button>
                )}
              </div>

              {isReagentFormDimmed && (
                <div className="mb-3 bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>
                    ✓ Đã lưu hóa chất xuống bảng <b>"Danh mục hóa chất QC"</b>{" "}
                    bên dưới. Form đã được làm mờ hoàn tất lệnh.
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsReagentFormDimmed(false);
                      setReagentMsg(null);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-black text-[11px] shrink-0 ml-2"
                  >
                    + Khai báo lô tiếp theo
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSaveReagentLot}
                className={`grid grid-cols-2 gap-3.5 text-xs transition-opacity duration-300 ${
                  isReagentFormDimmed
                    ? "opacity-40 pointer-events-none select-none"
                    : "opacity-100"
                }`}
              >
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Lab chuyên môn *
                  </label>
                  <select
                    value={reagentForm.section_name}
                    onChange={(e) => {
                      const sec = e.target.value;
                      const firstM = getMachinesForSection(sec)[0] || "";
                      setReagentForm({
                        ...reagentForm,
                        section_name: sec,
                        machine_name: firstM,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                  >
                    {sections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Thiết bị chạy QC *
                  </label>
                  <select
                    value={reagentForm.machine_name}
                    onChange={(e) =>
                      setReagentForm({
                        ...reagentForm,
                        machine_name: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                  >
                    {getMachinesForSection(reagentForm.section_name).map(
                      (m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Tên Hóa Chất QC *
                  </label>
                  <input
                    required
                    value={reagentForm.control_name}
                    onChange={(e) =>
                      setReagentForm({
                        ...reagentForm,
                        control_name: e.target.value,
                      })
                    }
                    placeholder="VD: Serum Control, Dade Ci-Trol 1, Ita Control..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Số Lô (Lot) *
                  </label>
                  <input
                    required
                    value={reagentForm.lot_number}
                    onChange={(e) =>
                      setReagentForm({
                        ...reagentForm,
                        lot_number: e.target.value,
                      })
                    }
                    placeholder="VD: LOT-8841A"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Hạn sử dụng Lô (Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={reagentForm.expiry_date}
                    onChange={(e) =>
                      setReagentForm({
                        ...reagentForm,
                        expiry_date: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>

                <div className="col-span-2 bg-amber-50/80 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer font-bold text-amber-950">
                    <input
                      type="checkbox"
                      checked={reagentForm.is_manual_prep}
                      onChange={(e) =>
                        setReagentForm({
                          ...reagentForm,
                          is_manual_prep: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-amber-600 rounded"
                    />
                    <span>
                      Tick chọn nếu là Hóa chất tự pha chế (Đưa vào sổ BM.16 &
                      cảnh báo ≥ 75% SL pha)
                    </span>
                  </label>
                </div>

                <div className={reagentForm.is_manual_prep ? "" : "col-span-2"}>
                  <label className="font-bold text-slate-700 block mb-1">
                    {reagentForm.is_manual_prep
                      ? "Ngày pha *"
                      : "Ngày mở nắp *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={reagentForm.prep_date}
                    onChange={(e) =>
                      setReagentForm({
                        ...reagentForm,
                        prep_date: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>

                {reagentForm.is_manual_prep && (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Số lượng đã pha * (Cảnh báo ≥{" "}
                        {getReagentThreshold75(
                          parseInt(reagentForm.quantity_prepared, 10) || 3
                        )}{" "}
                        lần)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={reagentForm.quantity_prepared}
                        onChange={(e) =>
                          setReagentForm({
                            ...reagentForm,
                            quantity_prepared: e.target.value,
                          })
                        }
                        placeholder="VD: 3"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="font-bold text-slate-700 block mb-1">
                        Ghi chú (BM.16)
                      </label>
                      <input
                        value={reagentForm.note}
                        onChange={(e) =>
                          setReagentForm({
                            ...reagentForm,
                            note: e.target.value,
                          })
                        }
                        placeholder="VD: Hoàn nguyên bằng 5ml nước cất 2 lần, trữ 2-8 độ C..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="font-bold text-indigo-700 block mb-1">
                    {reagentForm.is_manual_prep
                      ? "ID Người pha *"
                      : "ID người mở nắp *"}
                  </label>
                  <input
                    required
                    value={reagentForm.prep_by_id}
                    onChange={(e) =>
                      setReagentForm({
                        ...reagentForm,
                        prep_by_id: e.target.value,
                      })
                    }
                    className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-indigo-700 block mb-1">
                    Mật khẩu xác nhận *
                  </label>
                  <input
                    type="password"
                    required
                    value={reagentForm.prep_by_pw}
                    onChange={(e) =>
                      setReagentForm({
                        ...reagentForm,
                        prep_by_pw: e.target.value,
                      })
                    }
                    placeholder={
                      reagentForm.is_manual_prep
                        ? "Nhập mật khẩu người pha..."
                        : "Nhập mật khẩu người mở nắp..."
                    }
                    className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl px-3 py-2 font-mono font-bold"
                  />
                </div>

                {reagentMsg && (
                  <div
                    className={`col-span-2 p-2.5 rounded-xl font-bold ${
                      reagentMsg.type === "ok"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {reagentMsg.text}
                  </div>
                )}

                <div className="col-span-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl font-black uppercase bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:brightness-105 transition"
                  >
                    {editingReagentId
                      ? "✓ Lưu Cập Nhật Hóa Chất QC"
                      : reagentForm.is_manual_prep
                      ? "Xác Nhận & Lưu Hóa Chất Tự Pha (BM.16)"
                      : "Xác Nhận & Lưu Hóa Chất Mở Nắp"}
                  </button>
                </div>
              </form>
            </div>

            {/* KHỐI 2: CẤU HÌNH XÉT NGHIỆM & HỒ SƠ MU 3 MỨC (CÓ TEA_UNIT & NGOẠI LỆ) */}
            <div
              ref={testFormRef}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
            >
              <div className="border-b border-slate-100 pb-3 mb-4 flex items-center justify-between gap-2">
                <div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      editingTestId
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {editingTestId
                      ? "Đang Chỉnh Sửa Cấu Hình & MU"
                      : "Quản trị Danh mục"}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    {editingTestId
                      ? `Cập Nhật: ${newTestForm.test_name}`
                      : "Cấu Hình Xét Nghiệm & Hồ Sơ MU"}
                  </h3>
                </div>
                {editingTestId && (
                  <button
                    type="button"
                    onClick={resetTestForm}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    ✕ Hủy sửa (Tạo mới)
                  </button>
                )}
              </div>

              <form
                onSubmit={handleSaveOrUpdateTestConfig}
                className="grid grid-cols-2 gap-3 text-xs max-h-[560px] overflow-y-auto pr-2"
              >
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Chọn Thiết bị *
                  </label>
                  <select
                    value={setupMachine}
                    onChange={(e) => {
                      const m = e.target.value;
                      const secObj = labMachines.find((x) => x.machine === m);
                      if (secObj) setSetupSection(secObj.section);
                      setSetupMachine(m);
                      setSetupControl(getControlsForMachine(m)[0] || "");
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-blue-700"
                  >
                    {labMachines.map((x) => (
                      <option key={x.machine} value={x.machine}>
                        {x.machine} ({x.section})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Chọn Hóa chất QC *
                  </label>
                  <select
                    value={setupControl}
                    onChange={(e) => setSetupControl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-purple-700"
                  >
                    {getControlsForMachine(setupMachine).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 bg-sky-50/80 border border-sky-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-sky-900">
                    🔗 Tự động kế thừa Số Lô & HSD từ Hóa chất QC (
                    {setupControl || "Chưa chọn"}):
                  </span>
                  {currentActiveReagentForTestForm ? (
                    <span className="font-mono font-black text-blue-800 bg-white px-2.5 py-0.5 rounded-lg border border-sky-300">
                      Lot: {currentActiveReagentForTestForm.lot_number} · HSD:{" "}
                      {formatDateVN(
                        currentActiveReagentForTestForm.expiry_date
                      )}
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold">
                      Chưa có lô hóa chất cho máy này
                    </span>
                  )}
                </div>

                <div className="relative col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Tên xét nghiệm (Gõ tìm hoặc nhập mới) *
                  </label>
                  <input
                    required
                    value={newTestForm.test_name}
                    onFocus={() => setTestDropdownOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setTestDropdownOpen(false), 200)
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTestForm((prev) => ({
                        ...prev,
                        test_name: val,
                        is_exempt_long_rules: editingTestId
                          ? prev.is_exempt_long_rules
                          : isDefaultExemptTestName(val),
                      }));
                    }}
                    placeholder="VD: Glucose, Đông máu (PT), WBC, RBC, HGB, HCT, PLT..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                  {testDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                      {COMMON_TEST_NAMES.filter((n) =>
                        n
                          .toLowerCase()
                          .includes(newTestForm.test_name.toLowerCase())
                      ).map((n) => (
                        <button
                          type="button"
                          key={n}
                          onMouseDown={() => {
                            setNewTestForm((prev) => ({
                              ...prev,
                              test_name: n,
                              is_exempt_long_rules: editingTestId
                                ? prev.is_exempt_long_rules
                                : isDefaultExemptTestName(n),
                            }));
                            setTestDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-blue-50 font-semibold text-slate-700 flex items-center justify-between"
                        >
                          <span>{n}</span>
                          {isDefaultExemptTestName(n) && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              Ngoại lệ 6x/8x/10x
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Đơn vị đo (Có gợi ý Huyết học) *
                  </label>
                  <input
                    list="common-units-datalist"
                    required
                    value={newTestForm.unit}
                    onChange={(e) =>
                      setNewTestForm({ ...newTestForm, unit: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                  <datalist id="common-units-datalist">
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nhãn tiêu chuẩn *
                  </label>
                  <select
                    value={newTestForm.standard_label}
                    onChange={(e) =>
                      setNewTestForm({
                        ...newTestForm,
                        standard_label: e.target.value as "ISO" | "THUONG",
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
                  >
                    <option value="ISO">ISO 15189</option>
                    <option value="THUONG">Test thường</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-indigo-700 block mb-1">
                    Phân loại xét nghiệm *
                  </label>
                  <select
                    value={newTestForm.test_type}
                    onChange={(e) => {
                      const t = e.target.value as TestCategoryType;
                      setNewTestForm({
                        ...newTestForm,
                        test_type: t,
                        unit:
                          t === "SEMI_QUANTITATIVE"
                            ? "COI"
                            : t === "QUALITATIVE"
                            ? "Không đơn vị"
                            : newTestForm.unit,
                      });
                    }}
                    className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 font-extrabold text-indigo-900"
                  >
                    <option value="QUANTITATIVE">Định lượng (Mean & SD)</option>
                    <option value="SEMI_QUANTITATIVE">
                      Bán định lượng (S/Co, COI...)
                    </option>
                    <option value="QUALITATIVE">
                      Định tính (Chứng Âm / Dương)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-indigo-700 block mb-1">
                    Số mức nồng độ QC *
                  </label>
                  <select
                    value={newTestForm.levels_count}
                    onChange={(e) =>
                      setNewTestForm({
                        ...newTestForm,
                        levels_count: Number(e.target.value) as 1 | 2 | 3,
                      })
                    }
                    className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 font-extrabold text-indigo-900"
                  >
                    <option value={1}>1 Mức (Chỉ L1)</option>
                    <option value={2}>2 Mức (L1, L2)</option>
                    <option value={3}>3 Mức (L1, L2, L3)</option>
                  </select>
                </div>

                {/* NHẬP MEAN & SD GỐC CỦA HÃNG CHO TỪNG MỨC */}
                <div className="col-span-2 pt-1">
                  {newTestForm.test_type !== "QUALITATIVE" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-sky-50/70 border border-sky-200 p-2.5 rounded-xl">
                        <label className="font-black text-sky-800 block mb-1">
                          Mức 1 - L1 (Mean & SD Hãng) *
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="Mean L1"
                            value={newTestForm.mean_L1}
                            onChange={(e) =>
                              setNewTestForm({
                                ...newTestForm,
                                mean_L1: e.target.value,
                              })
                            }
                            className="w-1/2 bg-white border border-sky-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                          />
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="SD L1"
                            value={newTestForm.sd_L1}
                            onChange={(e) =>
                              setNewTestForm({
                                ...newTestForm,
                                sd_L1: e.target.value,
                              })
                            }
                            className="w-1/2 bg-white border border-sky-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                          />
                        </div>
                      </div>

                      {newTestForm.levels_count >= 2 && (
                        <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded-xl">
                          <label className="font-black text-purple-800 block mb-1">
                            Mức 2 - L2 (Mean & SD Hãng) *
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="Mean L2"
                              value={newTestForm.mean_L2}
                              onChange={(e) =>
                                setNewTestForm({
                                  ...newTestForm,
                                  mean_L2: e.target.value,
                                })
                              }
                              className="w-1/2 bg-white border border-purple-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                            />
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="SD L2"
                              value={newTestForm.sd_L2}
                              onChange={(e) =>
                                setNewTestForm({
                                  ...newTestForm,
                                  sd_L2: e.target.value,
                                })
                              }
                              className="w-1/2 bg-white border border-purple-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {newTestForm.levels_count === 3 && (
                        <div className="sm:col-span-2 bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl">
                          <label className="font-black text-amber-900 block mb-1">
                            Mức 3 - L3 (Mean & SD Hãng) *
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="Mean L3"
                              value={newTestForm.mean_L3}
                              onChange={(e) =>
                                setNewTestForm({
                                  ...newTestForm,
                                  mean_L3: e.target.value,
                                })
                              }
                              className="w-1/2 bg-white border border-amber-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                            />
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="SD L3"
                              value={newTestForm.sd_L3}
                              onChange={(e) =>
                                setNewTestForm({
                                  ...newTestForm,
                                  sd_L3: e.target.value,
                                })
                              }
                              className="w-1/2 bg-white border border-amber-300 rounded-lg px-2 py-1.5 font-mono font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <div>
                        <label className="font-bold text-emerald-900 block mb-1">
                          Chứng Mức 1
                        </label>
                        <select
                          value={newTestForm.expected_qual_L1}
                          onChange={(e) =>
                            setNewTestForm({
                              ...newTestForm,
                              expected_qual_L1: e.target.value as
                                | "ÂM TÍNH"
                                | "DƯƠNG TÍNH",
                            })
                          }
                          className="w-full bg-white border border-emerald-300 rounded-lg px-1.5 py-1 text-[10.5px] font-bold"
                        >
                          <option value="ÂM TÍNH">ÂM TÍNH</option>
                          <option value="DƯƠNG TÍNH">DƯƠNG TÍNH</option>
                        </select>
                      </div>
                      {newTestForm.levels_count >= 2 && (
                        <div>
                          <label className="font-bold text-emerald-900 block mb-1">
                            Chứng Mức 2
                          </label>
                          <select
                            value={newTestForm.expected_qual_L2}
                            onChange={(e) =>
                              setNewTestForm({
                                ...newTestForm,
                                expected_qual_L2: e.target.value as
                                  | "ÂM TÍNH"
                                  | "DƯƠNG TÍNH",
                              })
                            }
                            className="w-full bg-white border border-emerald-300 rounded-lg px-1.5 py-1 text-[10.5px] font-bold"
                          >
                            <option value="DƯƠNG TÍNH">DƯƠNG TÍNH</option>
                            <option value="ÂM TÍNH">ÂM TÍNH</option>
                          </select>
                        </div>
                      )}
                      {newTestForm.levels_count === 3 && (
                        <div>
                          <label className="font-bold text-emerald-900 block mb-1">
                            Chứng Mức 3
                          </label>
                          <select
                            value={newTestForm.expected_qual_L3}
                            onChange={(e) =>
                              setNewTestForm({
                                ...newTestForm,
                                expected_qual_L3: e.target.value as
                                  | "ÂM TÍNH"
                                  | "DƯƠNG TÍNH",
                              })
                            }
                            className="w-full bg-white border border-emerald-300 rounded-lg px-1.5 py-1 text-[10.5px] font-bold"
                          >
                            <option value="DƯƠNG TÍNH">DƯƠNG TÍNH</option>
                            <option value="ÂM TÍNH">ÂM TÍNH</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CẤU HÌNH TEa (% HOẶC GIÁ TRỊ TUYỆT ĐỐI) & HỒ SƠ ĐKBĐĐ (MU) THEO TỪNG MỨC */}
                {newTestForm.test_type !== "QUALITATIVE" && (
                  <div className="col-span-2 bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200 mt-1 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="font-black text-indigo-950">
                          TEa (Tổng sai số cho phép):
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="VD: 15"
                          value={newTestForm.tea}
                          onChange={(e) =>
                            setNewTestForm({
                              ...newTestForm,
                              tea: e.target.value,
                            })
                          }
                          className="w-20 bg-white border border-indigo-300 rounded-lg px-2 py-1 font-mono font-black text-indigo-900"
                        />
                        <select
                          value={newTestForm.tea_unit}
                          onChange={(e) =>
                            setNewTestForm({
                              ...newTestForm,
                              tea_unit: e.target.value as
                                | "PERCENT"
                                | "ABSOLUTE",
                            })
                          }
                          className="bg-white border border-indigo-300 rounded-lg px-2 py-1 font-bold text-indigo-900 text-[11px]"
                        >
                          <option value="PERCENT">% (Tương đối)</option>
                          <option value="ABSOLUTE">
                            Số tuyệt đối ({newTestForm.unit || "Đơn vị đo"})
                          </option>
                        </select>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 font-mono font-bold text-[11px] text-emerald-800">
                        Tiêu chuẩn (0.75 × TEa) ={" "}
                        {newTestForm.tea
                          ? newTestForm.tea_unit === "PERCENT"
                            ? `${(
                                0.75 * (parseFloat(newTestForm.tea) || 0)
                              ).toFixed(2)}%`
                            : `${(
                                0.75 * (parseFloat(newTestForm.tea) || 0)
                              ).toFixed(3)} ${newTestForm.unit}`
                          : "—"}
                      </span>
                    </div>

                    {/* TRẠNG THÁI NGOẠI LỆ WESTGARD (6x, 8x, 10x) */}
                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950">
                        <input
                          type="checkbox"
                          checked={newTestForm.is_exempt_long_rules}
                          onChange={(e) =>
                            setNewTestForm({
                              ...newTestForm,
                              is_exempt_long_rules: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-amber-600 rounded"
                        />
                        <span>
                          Thuộc nhóm Test Ngoại lệ (Không xét quy tắc dài hạn
                          6x, 8x, 10x — Mặc định cho WBC, RBC, HGB, HCT, PLT)
                        </span>
                      </label>
                    </div>

                    {/* 3 TAB CHỌN MỨC ĐỂ NHẬP MU RIÊNG BIỆT */}
                    <div className="flex items-center gap-1.5 border-b border-indigo-200 pb-2">
                      <span className="font-black text-indigo-900 text-[11px] mr-1">
                        Hồ sơ MU từng mức (BM.01.XN.QTQL.30):
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveMuTab("L1")}
                        className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition ${
                          activeMuTab === "L1"
                            ? "bg-sky-600 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-300"
                        }`}
                      >
                        Mức 1 (L1)
                      </button>
                      {newTestForm.levels_count >= 2 && (
                        <button
                          type="button"
                          onClick={() => setActiveMuTab("L2")}
                          className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition ${
                            activeMuTab === "L2"
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-300"
                          }`}
                        >
                          Mức 2 (L2)
                        </button>
                      )}
                      {newTestForm.levels_count === 3 && (
                        <button
                          type="button"
                          onClick={() => setActiveMuTab("L3")}
                          className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition ${
                            activeMuTab === "L3"
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-300"
                          }`}
                        >
                          Mức 3 (L3)
                        </button>
                      )}
                    </div>

                    {renderLevelMuEditor(activeMuTab)}
                  </div>
                )}

                {configMsg && (
                  <div
                    className={`col-span-2 p-2.5 rounded-xl font-bold ${
                      configMsg.type === "ok"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {configMsg.text}
                  </div>
                )}

                <div className="col-span-2 pt-2">
                  <button
                    type="submit"
                    className={`w-full py-2.5 rounded-xl font-black uppercase text-white shadow-md transition ${
                      editingTestId
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-105"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {editingTestId
                      ? "✓ Lưu Cập Nhật Xét Nghiệm & Hồ Sơ MU Đa Mức"
                      : "+ Lưu Xét Nghiệm Mới & Hồ Sơ MU Đa Mức"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* KHỐI 2.5: BẢNG "DANH MỤC HÓA CHẤT QC" (CÓ PHÂN LAB, PHÂN MÁY, SỬA/XÓA) */}
          {/* ===================================================================== */}
          <div className="bg-white border-2 border-blue-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white">
                  Quản lý tập trung Lot QC
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase mt-1">
                  Danh Mục Hóa Chất QC (Hóa Chất Mở Nắp & Hóa Chất Tự Pha Chế)
                </h3>
                <p className="text-xs text-slate-500">
                  Quản lý toàn bộ thông tin hóa chất mở nắp và hóa chất pha tay.
                  Khi bạn chỉnh sửa Số Lô hoặc Hạn dùng tại đây, các xét nghiệm
                  đi kèm sẽ tự động cập nhật theo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-extrabold text-slate-600">Lọc Lab:</span>
                <select
                  value={catalogLabFilter}
                  onChange={(e) => {
                    setCatalogLabFilter(e.target.value);
                    setCatalogMachineFilter("Tất cả");
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900"
                >
                  <option value="Tất cả">Tất cả Lab ({reagents.length})</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <span className="font-extrabold text-slate-600">Lọc Máy:</span>
                <select
                  value={catalogMachineFilter}
                  onChange={(e) => setCatalogMachineFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-blue-700"
                >
                  <option value="Tất cả">Tất cả thiết bị</option>
                  {labMachines
                    .filter(
                      (m) =>
                        catalogLabFilter === "Tất cả" ||
                        m.section === catalogLabFilter
                    )
                    .map((m) => (
                      <option key={m.machine} value={m.machine}>
                        {m.machine} ({m.section})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10.5px]">
                    <th className="py-2.5 px-3 rounded-tl-xl w-10 text-center">
                      STT
                    </th>
                    <th className="py-2.5 px-3">Lab / Thiết bị</th>
                    <th className="py-2.5 px-3">Tên hóa chất QC</th>
                    <th className="py-2.5 px-3">Số Lô (Lot)</th>
                    <th className="py-2.5 px-3">HSD Lô</th>
                    <th className="py-2.5 px-3 text-center">Phân loại</th>
                    <th className="py-2.5 px-3">Ngày mở nắp / Ngày pha</th>
                    <th className="py-2.5 px-3">Người thực hiện</th>
                    <th className="py-2.5 px-3 text-center">
                      Theo dõi sử dụng
                    </th>
                    <th className="py-2.5 px-3 text-right rounded-tr-xl">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reagents
                    .filter((r) => {
                      if (
                        catalogLabFilter !== "Tất cả" &&
                        r.section_name !== catalogLabFilter
                      )
                        return false;
                      if (
                        catalogMachineFilter !== "Tất cả" &&
                        r.machine_name !== catalogMachineFilter
                      )
                        return false;
                      return true;
                    })
                    .map((r, idx) => {
                      const reached75 = isReagentReached75(r);
                      return (
                        <tr
                          key={r.control_id}
                          className="hover:bg-sky-50/50 transition"
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {r.section_name} ·{" "}
                            <span className="text-blue-700">
                              {r.machine_name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-black text-slate-900">
                            <button
                              type="button"
                              onClick={() => {
                                setSetupSection(r.section_name);
                                setSetupMachine(r.machine_name);
                                setSetupControl(r.control_name);
                              }}
                              className="hover:underline text-left text-indigo-950"
                            >
                              {r.control_name}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-black text-blue-700">
                            {r.lot_number}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                            {formatDateVN(r.expiry_date)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {r.is_manual_prep ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                                Tự pha chế (BM.16)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-100 text-sky-900 border border-sky-300 whitespace-nowrap">
                                Mở nắp dùng ngay
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            <span className="text-[10.5px] font-sans font-bold text-slate-500 mr-1">
                              {r.is_manual_prep ? "Pha:" : "Mở nắp:"}
                            </span>
                            <b>{formatDateVN(r.prep_date)}</b>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            {r.prep_by_name}{" "}
                            <span className="text-[10.5px] font-mono text-slate-400">
                              ({r.prep_by_id})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {r.is_manual_prep ? (
                              <span
                                className={`px-2.5 py-0.5 rounded-lg font-mono text-[11px] font-black ${
                                  reached75
                                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                }`}
                              >
                                {r.usage_count}/{r.quantity_prepared} lần (75%:{" "}
                                {getReagentThreshold75(r.quantity_prepared)})
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 font-semibold">
                                Đã chạy {r.usage_count} lần
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canManageCatalog && (
                                <button
                                  type="button"
                                  title="Chỉnh sửa hóa chất QC"
                                  onClick={() => handleEditReagentFromTable(r)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] flex items-center gap-1"
                                >
                                  <Ic.Edit /> Sửa
                                </button>
                              )}
                              {canReorderOrDelete && (
                                <button
                                  type="button"
                                  title="Xóa hóa chất QC"
                                  onClick={() =>
                                    handleDeleteReagentFromTable(r)
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1"
                                >
                                  <Ic.Trash /> Xóa
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* KHỐI 3: SẮP XẾP & QUẢN LÝ DANH MỤC XÉT NGHIỆM (KÉO THẢ + 3 LOT)      */}
          {/* ===================================================================== */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  Sắp Xếp & Quản Lý Danh Mục Xét Nghiệm ({setupMachine} ·{" "}
                  {setupControl})
                </h3>
                <p className="text-xs text-slate-500">
                  Nhấp vào tên xét nghiệm để xem{" "}
                  <b>Chi tiết cấu hình, Lịch sử CV%/SD của 3 Lot gần nhất</b>{" "}
                  hoặc bấm <b>Sửa cấu hình & MU</b>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {getTestsForControl(setupMachine, setupControl).map((t, i) => (
                <div key={t.test_id} className="relative group">
                  <div
                    draggable={canReorderOrDelete}
                    onDragStart={() => setDraggedTestId(t.test_id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropTest(t.test_id)}
                    onClick={() =>
                      setActiveInfoTestId(
                        activeInfoTestId === t.test_id ? null : t.test_id
                      )
                    }
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                      activeInfoTestId === t.test_id
                        ? "bg-sky-100 border-sky-400 ring-2 ring-sky-200"
                        : "bg-sky-50/70 border-sky-200 hover:border-blue-400"
                    }`}
                  >
                    <span
                      className={`text-slate-400 hover:text-slate-700 ${
                        canReorderOrDelete ? "cursor-grab" : ""
                      }`}
                    >
                      <Ic.Grip />
                    </span>
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-mono text-[11px] flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-slate-900">{t.test_name}</span>
                    {t.standard_label === "ISO" && (
                      <span className="rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase whitespace-nowrap bg-blue-600 text-white shadow-sm">
                        ISO 15189
                      </span>
                    )}
                    {t.is_exempt_long_rules && (
                      <span className="rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase whitespace-nowrap bg-amber-500 text-white shadow-sm">
                        Ngoại lệ 6x/8x/10x
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      {t.levels_count} mức
                    </span>
                    {canManageCatalog && (
                      <button
                        type="button"
                        title="Sửa cấu hình & MU"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadTestToEdit(t);
                        }}
                        className="ml-0.5 text-slate-400 hover:text-blue-600"
                      >
                        <Ic.Edit />
                      </button>
                    )}
                    {canReorderOrDelete && (
                      <button
                        type="button"
                        title="Xóa xét nghiệm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTest(t.test_id);
                        }}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Ic.Trash />
                      </button>
                    )}
                  </div>

                  {/* POPUP XEM CHI TIẾT & LỊCH SỬ CV% 3 LOT GẦN NHẤT */}
                  {activeInfoTestId === t.test_id && (
                    <div className="absolute z-30 top-full mt-2 left-0 w-80 sm:w-96 bg-white border-2 border-indigo-200 rounded-2xl shadow-2xl p-4">
                      <div className="flex items-center justify-between mb-2.5 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black uppercase text-indigo-950">
                            {t.test_name} ({t.unit})
                          </span>
                          {t.standard_label === "ISO" && (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase whitespace-nowrap bg-blue-600 text-white">
                              ISO 15189
                            </span>
                          )}
                          {t.is_exempt_long_rules && (
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase whitespace-nowrap bg-amber-500 text-white">
                              Bỏ 6x/8x/10x
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveInfoTestId(null)}
                          className="text-slate-400 hover:text-slate-700 font-bold text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div>
                          Lot kế thừa đang dùng:{" "}
                          <b className="font-mono text-blue-700">
                            {t.lot_number}
                          </b>{" "}
                          (HSD: {formatDateVN(t.expiry_date)})
                        </div>
                        <div>
                          TEa áp dụng:{" "}
                          <b className="font-mono text-indigo-800">
                            {t.tea !== undefined
                              ? `${t.tea} ${
                                  t.tea_unit === "ABSOLUTE" ? t.unit : "%"
                                }`
                              : "Chưa nhập"}
                          </b>
                        </div>
                        <div>
                          Range Hãng SX gốc:{" "}
                          <span className="font-mono font-bold text-slate-700">
                            L1: {t.mfg_mean_L1}±{t.mfg_sd_L1}
                            {t.levels_count >= 2
                              ? ` | L2: ${t.mfg_mean_L2}±${t.mfg_sd_L2}`
                              : ""}
                            {t.levels_count === 3
                              ? ` | L3: ${t.mfg_mean_L3}±${t.mfg_sd_L3}`
                              : ""}
                          </span>
                        </div>
                        <div>
                          Range đang áp dụng:{" "}
                          <span className="font-mono font-black text-purple-800">
                            L1: {t.mean_L1}±{t.sd_L1}
                            {t.levels_count >= 2
                              ? ` | L2: ${t.mean_L2}±{t.sd_L2}`
                              : ""}
                            {t.levels_count === 3
                              ? ` | L3: ${t.mean_L3}±{t.sd_L3}`
                              : ""}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <span className="font-extrabold text-slate-700 block mb-1">
                            Lịch sử tối đa 3 Lot gần nhất (Trọng số bậc tự do
                            n-1):
                          </span>
                          <div className="space-y-1.5">
                            {t.lot_history && t.lot_history.length > 0 ? (
                              t.lot_history.slice(0, 3).map((lot, idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-[10.5px]"
                                >
                                  <div className="flex justify-between">
                                    <span>
                                      Lot:{" "}
                                      <b className="font-mono text-sky-700">
                                        {lot.lot_number}
                                      </b>{" "}
                                      (N=
                                      {lot.n_L1 || 30})
                                    </span>
                                    <span className="text-slate-500">
                                      Lưu: {formatDateVN(lot.archived_at)}
                                    </span>
                                  </div>
                                  <div className="font-mono mt-0.5 text-slate-700">
                                    L1: {lot.mean_L1}±{lot.sd_L1} (CV:{" "}
                                    {lot.cv_L1}%)
                                    {t.levels_count >= 2
                                      ? ` | L2: ${lot.mean_L2}±${lot.sd_L2} (CV: ${lot.cv_L2}%)`
                                      : ""}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-slate-400 italic text-[11px]">
                                Chưa có lịch sử Lot cũ (Tự động lưu khi đổi Lot
                                hóa chất hoặc chốt Range).
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadTestToEdit(t)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] shadow-sm"
                          >
                            Nạp vào Form để Sửa Cấu Hình & MU
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRỢ LÝ DẢI CHUẨN (POOLED CV% n-1) & CHẤT LƯỢNG ĐKBĐĐ (BM.01)        */}
      {/* ========================================================================= */}
      {mainTab === "ASSISTANT" && (
        <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 shadow-md space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 p-4 rounded-2xl border border-indigo-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white">
                ISO 15189:2022 · Quy Trình XN.QTQL.30 & XN.QTQL.31
              </span>
              <h3 className="text-lg font-black text-indigo-950 uppercase tracking-wide mt-1">
                Trợ Lý Chốt Range (Pooled CV% Bậc Tự Do n-1) & Đánh Giá ĐKBĐĐ
                (BM.01)
              </h3>
            </div>

            <div className="flex bg-white p-1 rounded-xl border border-indigo-200 shadow-sm">
              <button
                type="button"
                onClick={() => setStatViewMode("RANGE")}
                className={`px-4 py-2 rounded-lg text-xs font-black transition ${
                  statViewMode === "RANGE"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-indigo-700 hover:bg-indigo-50"
                }`}
              >
                1. Phân tích & Chốt Range (CLSI C24 n-1)
              </button>
              <button
                type="button"
                onClick={() => setStatViewMode("QUALITY")}
                className={`px-4 py-2 rounded-lg text-xs font-black transition ${
                  statViewMode === "QUALITY"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                2. Đánh giá Six Sigma, Luật Westgard & MU (BM.01)
              </button>
            </div>
          </div>

          {statTestFilter !== "ALL" && activeDeepLinkedTest && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-black uppercase text-[10.5px]">
                  Điều hướng thông minh
                </span>
                <span>
                  Đang lọc đích danh xét nghiệm:{" "}
                  <b className="text-indigo-900 underline">
                    {activeDeepLinkedTest.test_name}
                  </b>{" "}
                  ({activeDeepLinkedTest.section} ·{" "}
                  {activeDeepLinkedTest.machine_name})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatTestFilter("ALL");
                  setDeepLinkedTestId(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition"
              >
                Hiển thị tất cả xét nghiệm của {statSection} →
              </button>
            </div>
          )}

          {/* BỘ LỌC BẢNG TRỢ LÝ */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-600">Lab:</span>
                <select
                  value={statSection}
                  onChange={(e) => {
                    setStatSection(e.target.value);
                    setStatMachine("Tất cả");
                    setStatTestFilter("ALL");
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
                >
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-600">Máy:</span>
                <select
                  value={statMachine}
                  onChange={(e) => {
                    setStatMachine(e.target.value);
                    setStatTestFilter("ALL");
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-blue-700"
                >
                  <option value="Tất cả">Tất cả thiết bị</option>
                  {getMachinesForSection(statSection).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-600">
                  Xét nghiệm:
                </span>
                <select
                  value={statTestFilter}
                  onChange={(e) => {
                    setStatTestFilter(e.target.value);
                    setDeepLinkedTestId(
                      e.target.value === "ALL" ? null : e.target.value
                    );
                  }}
                  className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 font-bold text-indigo-900"
                >
                  <option value="ALL">
                    Tất cả ({testsInStatSection.length} xét nghiệm)
                  </option>
                  {testsInStatSection.map((t) => (
                    <option key={t.test_id} value={t.test_id}>
                      {t.test_name} ({t.machine_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400">
                  <Ic.Search />
                </span>
                <input
                  type="text"
                  value={statSearchQuery}
                  onChange={(e) => setStatSearchQuery(e.target.value)}
                  placeholder="Tìm nhanh tên test..."
                  className="bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1 text-xs font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="font-extrabold text-slate-600 mr-1">Mức:</span>
                {(["ALL", "L1", "L2", "L3"] as const).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setStatLevelFilter(lv)}
                    className={`px-2.5 py-1 rounded-lg font-extrabold transition ${
                      statLevelFilter === lv
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {lv === "ALL" ? "Tất cả mức" : lv}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* BẢNG TRỢ LÝ DẢI CHUẨN & ĐÁNH GIÁ MU TỪNG MỨC */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-indigo-950 text-white uppercase text-[10.5px]">
                  <th className="py-3 px-3 rounded-tl-xl">
                    Xét nghiệm (Máy · Lô)
                  </th>
                  <th className="py-3 px-3 text-center">Mức</th>

                  {statViewMode === "RANGE" ? (
                    <>
                      <th className="py-3 px-3 text-right">
                        Range Hãng SX (Cố định)
                      </th>
                      <th className="py-3 px-3 text-right">
                        Range Đang Áp Dụng
                      </th>
                      <th className="py-3 px-3 text-right">
                        Mean ± SD Lô Hiện Tại (Đã lọc lỗi)
                      </th>
                      <th className="py-3 px-3 text-right">
                        Đề Xuất Theo Pooled CV% (Trọng số n-1)
                      </th>
                      <th className="py-3 px-3 text-right rounded-tr-xl">
                        Thao Tác Chốt Range Phòng
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-3 text-right">
                        CV% · Bias% (Nguồn)
                      </th>
                      <th className="py-3 px-3 text-center">
                        Six Sigma & Luật QC (SOP 31)
                      </th>
                      <th className="py-3 px-3 text-right">
                        ĐKBĐĐ Tổng hợp (uc)
                      </th>
                      <th className="py-3 px-3 text-right">
                        ĐKBĐĐ Mở rộng (Ue)
                      </th>
                      <th className="py-3 px-3 text-center">
                        Tiêu chuẩn (0.75×TEa)
                      </th>
                      <th className="py-3 px-3 text-right rounded-tr-xl">
                        Kết quả ước tính (BM.01)
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[12px]">
                {statFilteredConfigs.map((c) => {
                  const maxLevels: ("L1" | "L2" | "L3")[] =
                    c.levels_count === 3
                      ? ["L1", "L2", "L3"]
                      : c.levels_count === 2
                      ? ["L1", "L2"]
                      : ["L1"];
                  const levelsToShow: ("L1" | "L2" | "L3")[] =
                    statLevelFilter === "ALL"
                      ? maxLevels
                      : maxLevels.includes(statLevelFilter)
                      ? [statLevelFilter]
                      : ["L1"];

                  return levelsToShow.map((lvKey, lvIdx) => {
                    const muRes = computeMuAndSigma(c, lvKey);
                    const poolStats = computeThreeLotPooledStats(
                      c,
                      lvKey,
                      muRes.meanLab,
                      muRes.cvPct,
                      muRes.validPointsCount
                    );
                    const recRules = getRecommendedWestgardRules(
                      c,
                      muRes.sigma
                    );
                    const isLabRange = c.range_source !== "MANUFACTURER";
                    const isHighlighted = deepLinkedTestId === c.test_id;

                    const mfgMean =
                      lvKey === "L1"
                        ? c.mfg_mean_L1
                        : lvKey === "L2"
                        ? c.mfg_mean_L2
                        : c.mfg_mean_L3;
                    const mfgSd =
                      lvKey === "L1"
                        ? c.mfg_sd_L1
                        : lvKey === "L2"
                        ? c.mfg_sd_L2
                        : c.mfg_sd_L3;
                    const curMean =
                      lvKey === "L1"
                        ? c.mean_L1
                        : lvKey === "L2"
                        ? c.mean_L2
                        : c.mean_L3;
                    const curSd =
                      lvKey === "L1"
                        ? c.sd_L1
                        : lvKey === "L2"
                        ? c.sd_L2
                        : c.sd_L3;

                    return (
                      <tr
                        key={`${c.test_id}-${lvKey}`}
                        ref={(el) => {
                          if (lvIdx === 0) rowRefs.current[c.test_id] = el;
                        }}
                        className={`font-semibold transition ${
                          isHighlighted
                            ? "bg-amber-50/90 ring-2 ring-amber-400"
                            : "hover:bg-indigo-50/40"
                        }`}
                      >
                        <td className="py-3 px-3 font-black text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{c.test_name}</span>
                            {c.standard_label === "ISO" && (
                              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap bg-blue-600 text-white inline-flex items-center justify-center tracking-wider shadow-sm">
                                ISO 15189
                              </span>
                            )}
                            {c.is_exempt_long_rules && (
                              <span className="rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase whitespace-nowrap bg-amber-500 text-white">
                                Ngoại lệ 6x/8x/10x
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                            Máy:{" "}
                            <b className="text-slate-700">{c.machine_name}</b> ·
                            Lot:{" "}
                            <span className="font-mono">{c.lot_number}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-extrabold ${
                              lvKey === "L1"
                                ? "bg-sky-100 text-sky-900"
                                : lvKey === "L2"
                                ? "bg-purple-100 text-purple-900"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {lvKey}
                          </span>
                        </td>

                        {statViewMode === "RANGE" ? (
                          <>
                            <td className="py-3 px-3 text-right font-mono whitespace-nowrap text-slate-700">
                              <span className="px-2.5 py-1 rounded-lg bg-lime-50 border border-lime-300 font-bold">
                                {mfgMean} ± {mfgSd}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-lg font-black inline-block shadow-sm ${
                                  isLabRange
                                    ? "neon-purple-range"
                                    : "neon-lime-range"
                                }`}
                              >
                                {curMean} ± {curSd}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 font-black inline-block">
                                {muRes.meanLab.toFixed(2)} ±{" "}
                                {muRes.sdLab.toFixed(2)}
                              </span>
                              <div className="text-[10px] font-sans font-bold text-emerald-700 mt-0.5">
                                N = {muRes.validPointsCount} điểm hợp lệ · CV:{" "}
                                {muRes.cvPct}%
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-300 text-indigo-950 font-black inline-block">
                                {muRes.meanLab.toFixed(2)} ±{" "}
                                {poolStats.proposedSdByCv}
                              </span>
                              <div className="text-[10px] font-sans font-bold text-indigo-700 mt-0.5">
                                uRw ({poolStats.lotsCountUsed} lô, df=
                                {poolStats.totalDegreesOfFreedom}
                                ): {poolStats.pooledCvPct}%
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {lvIdx === 0 && (
                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    title="Chốt Mean lô mới kết hợp SD tính từ Pooled CV% theo bậc tự do n-1 (CLSI C24)"
                                    onClick={() =>
                                      applyLabRange(c, "POOLED_3LOT_CV")
                                    }
                                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-105 text-white text-[11px] font-black shadow-sm transition"
                                  >
                                    Chốt theo Pooled CV%
                                  </button>
                                  <button
                                    type="button"
                                    title="Chốt trực tiếp theo Mean & SD của lô hiện tại"
                                    onClick={() =>
                                      applyLabRange(c, "CURRENT_LOT_SD")
                                    }
                                    className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold shadow-sm transition"
                                  >
                                    Chốt SD Lô hiện tại
                                  </button>
                                  {isLabRange && (
                                    <button
                                      type="button"
                                      title="Khôi phục về Range Hãng SX"
                                      onClick={() =>
                                        applyLabRange(c, "RESTORE_MFG")
                                      }
                                      className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition"
                                    >
                                      <Ic.RotateCcw />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    title="Sửa cấu hình & MU"
                                    onClick={() => handleLoadTestToEdit(c)}
                                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 border border-slate-200 transition"
                                  >
                                    <Ic.Edit />
                                  </button>
                                </div>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            {/* VIEW 2: ĐÁNH GIÁ SIX SIGMA, LUẬT WESTGARD & MU (BM.01) */}
                            <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                              <div className="text-emerald-700 font-black">
                                CV: {muRes.cvPct.toFixed(2)}%
                              </div>
                              <div className="text-indigo-700 font-bold text-[11px]">
                                Bias: {muRes.biasPct.toFixed(2)}%{" "}
                                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-sans">
                                  {muRes.biasModeUsed === "PEER_GROUP_EQA"
                                    ? "EQA"
                                    : "Hãng"}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {muRes.sigma !== null ? (
                                <div className="space-y-1">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full font-mono font-black text-xs shadow-sm inline-block ${
                                      muRes.sigma >= 6
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : muRes.sigma >= 5
                                        ? "bg-sky-100 text-sky-800 border border-sky-300"
                                        : "bg-amber-100 text-amber-800 border border-amber-300"
                                    }`}
                                  >
                                    {muRes.sigma.toFixed(2)}σ
                                  </span>
                                  <div
                                    title={recRules.explanation}
                                    className="text-[10px] font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5"
                                  >
                                    Luật:{" "}
                                    {recRules.recommendedRules.join(" / ")}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              {muRes.muConfigured && muRes.ucPct !== null ? (
                                <>
                                  <div className="font-mono font-black text-slate-900">
                                    {muRes.ucPct.toFixed(2)}%
                                    {c.tea_unit === "ABSOLUTE" &&
                                      muRes.ucAbs !== null && (
                                        <span className="text-[10.5px] text-slate-500 ml-1">
                                          ({muRes.ucAbs} {c.unit})
                                        </span>
                                      )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {muRes.formulaNote}
                                  </div>
                                </>
                              ) : (
                                <span className="text-slate-400 text-xs">
                                  Chưa cấu hình
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              {muRes.muConfigured && muRes.uePct !== null ? (
                                <div>
                                  <span className="font-mono font-black text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg inline-block">
                                    {muRes.uePct.toFixed(2)}%
                                    {c.tea_unit === "ABSOLUTE" &&
                                    muRes.ueAbs !== null
                                      ? ` (${muRes.ueAbs} ${c.unit})`
                                      : ""}
                                  </span>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    {muRes.muModeLabel}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleLoadTestToEdit(c)}
                                  className="text-[10.5px] bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 px-2.5 py-1 rounded-lg font-bold transition"
                                >
                                  + Thiết lập MU {lvKey}
                                </button>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {muRes.isPassMu === true ? (
                                <span className="px-2.5 py-1 bg-emerald-600 text-white font-black rounded-lg text-[10.5px] shadow-sm inline-block">
                                  ĐẠT &lt; {muRes.targetLabel}
                                </span>
                              ) : muRes.isPassMu === false ? (
                                <span className="px-2.5 py-1 bg-rose-600 text-white font-black rounded-lg text-[10.5px] shadow-sm inline-block">
                                  KĐ ≥ {muRes.targetLabel}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono text-xs">
                                  {muRes.targetLabel}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-black text-indigo-950 whitespace-nowrap">
                              {muRes.muConfigured && muRes.uePct !== null ? (
                                <span className="bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                                  {c.tea_unit === "ABSOLUTE" &&
                                  muRes.ueAbs !== null
                                    ? `${curMean} ± ${muRes.ueAbs} ${c.unit}`
                                    : `${curMean} ± ${muRes.uePct.toFixed(2)}%`}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
