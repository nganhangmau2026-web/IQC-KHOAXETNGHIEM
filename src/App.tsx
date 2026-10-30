import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  DEFAULT_SCRIPT_URL,
  STORAGE_KEYS,
  usePersistentState,
  rpcCall,
  SUGGESTED_CAUSES,
  SUGGESTED_ACTIONS,
  UserAccount,
  SectionLock,
  ReagentLotBM16,
  HistoryPoint,
  TestConfig,
  EvalRow,
  BM09LogEntry,
  formatDateVN,
  getReagentThreshold75,
  isReagentReached75,
  formatSDPositionBadge,
  computeMuAndSigma,
  hasPermission,
  INITIAL_USERS,
  INITIAL_REAGENTS,
  INITIAL_CONFIGS,
  INITIAL_BM09_LOGS,
} from "./types";
import SetupAndAssistant from "./SetupAndAssistant";
import IsoReports, { Luminous3DLJChart } from "./ChartsAndReports";
import AdminPanel from "./AdminPanel";

// ============================================================================
// FILE 5: src/App.tsx (FULL ENTERPRISE EDITION - ĐỒNG BỘ 100% QUY TRÌNH 30 & 31)
// - Phân luồng tự động Westgard Sigma (>=6.0: 1-3s | 5.0-5.99: 1-3s/2-2s/R-4s | <5.0: Đầy đủ)
// - Liên thông Cửa sổ Test Ngoại lệ (Tự động bỏ qua 6x, 8x, 10x khi is_exempt_long_rules = true)
// - Tự động khóa cứng Mức bị lỗi trong Modal khắc phục & Đẩy điểm is_rerun lên L-J / Dashboard
// ✦ An intellectual product by Handsome Long ✦
// ============================================================================

// --- LOGO THƯƠNG HIỆU ORIO - HANDSOME LONG ---
const OrioBrandLogo = ({ size = 48 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0 select-none"
  >
    <defs>
      <linearGradient
        id="orioBg"
        x1="0"
        y1="0"
        x2="120"
        y2="120"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
      <linearGradient
        id="orioRim"
        x1="0"
        y1="0"
        x2="120"
        y2="120"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#818cf8" />
      </linearGradient>
      <linearGradient
        id="goldSign"
        x1="0"
        y1="0"
        x2="120"
        y2="0"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <rect
      x="4"
      y="4"
      width="112"
      height="112"
      rx="28"
      fill="url(#orioBg)"
      stroke="url(#orioRim)"
      strokeWidth="3.5"
    />
    <path
      d="M16 14C35 8 85 8 104 14C108 26 95 36 60 36C25 36 12 26 16 14Z"
      fill="white"
      fillOpacity="0.16"
    />
    <circle cx="31" cy="54" r="14" stroke="#e0f2fe" strokeWidth="4.2" />
    <path
      d="M52 68V40H63C68 40 71 43 71 48C71 53 68 56 63 56H52M61 56L71 68"
      stroke="#e0f2fe"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="79"
      y1="40"
      x2="79"
      y2="68"
      stroke="#e0f2fe"
      strokeWidth="4.2"
      strokeLinecap="round"
    />
    <circle cx="97" cy="54" r="12" stroke="#e0f2fe" strokeWidth="4.2" />
    <path
      d="M9 54H21L25 43L31 65L36 48L40 54H58"
      stroke="#67e8f9"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <text
      x="60"
      y="95"
      textAnchor="middle"
      fill="url(#goldSign)"
      fontSize="13.5"
      fontWeight="800"
      fontStyle="italic"
      fontFamily="Georgia, serif"
      letterSpacing="0.4"
    >
      Handsome Long
    </text>
  </svg>
);

// --- BỘ ICON VECTOR ---
const Ic = {
  Lock: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Unlock: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ),
  User: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Cpu: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  ),
  Flask: () => (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M9 3h6M10 3v5.5L4.7 17a2 2 0 0 0 1.8 3h11a2 2 0 0 0 1.8-3L14 8.5V3M7 14h10" />
    </svg>
  ),
  Check: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Warn: () => (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Search: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Back: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Logout: () => (
    <svg
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
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
  Clock: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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
  Sync: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Grid: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
};

// --- HÀM KIỂM TRA CÁC QUY TẮC CHUỖI DÀI HẠN (4-1s, 6x, 8x, 10x) ---
function checkSequentialLongRules(
  currentZ: number,
  historyArr: HistoryPoint[] | undefined,
  currentLot: string,
  levelLabel: string,
  isExemptLongRules: boolean
): string[] {
  const triggered: string[] = [];
  const validSameLot = (historyArr || []).filter(
    (p) => p.lot_number === currentLot && p.status !== "FAIL"
  );
  const seqZ = [...validSameLot.map((p) => p.z), currentZ];

  // Quy tắc 4-1s: 4 điểm liên tiếp cùng vượt +1SD hoặc cùng vượt -1SD
  if (seqZ.length >= 4) {
    const last4 = seqZ.slice(-4);
    if (last4.every((z) => z > 1) || last4.every((z) => z < -1)) {
      triggered.push(`4-1s (${levelLabel})`);
    }
  }

  // Nếu xét nghiệm nằm trong Cửa sổ Ngoại lệ (WBC, RBC, HGB, HCT, PLT...) -> Bỏ qua 6x, 8x, 10x
  if (isExemptLongRules) {
    return triggered;
  }

  if (seqZ.length >= 10) {
    const last10 = seqZ.slice(-10);
    if (last10.every((z) => z > 0) || last10.every((z) => z < 0)) {
      triggered.push(`10x (${levelLabel})`);
      return triggered;
    }
  }
  if (seqZ.length >= 8) {
    const last8 = seqZ.slice(-8);
    if (last8.every((z) => z > 0) || last8.every((z) => z < 0)) {
      triggered.push(`8x (${levelLabel})`);
      return triggered;
    }
  }
  if (seqZ.length >= 6) {
    const last6 = seqZ.slice(-6);
    if (last6.every((z) => z > 0) || last6.every((z) => z < 0)) {
      triggered.push(`6x (${levelLabel})`);
      return triggered;
    }
  }

  return triggered;
}

// ============================================================================
// BỘ MÁY PHÂN TÍCH WESTGARD ĐA MỨC (PHÂN LUỒNG SIGMA & MIỄN TRỪ NGOẠI LỆ)
// ============================================================================
function executeWestgardAnalysis(
  mode: "NORMAL" | "SIGMA",
  selSection: string,
  selMachine: string,
  selControl: string,
  sectionEpoch: string,
  configs: TestConfig[],
  savedValues: Record<string, { L1?: string; L2?: string; L3?: string }>,
  runDate: string,
  liveTime: string,
  currentUser: UserAccount,
  useTimesIncrement: number,
  apiUrl: string,
  authToken: string,
  setIsAnalyzing: (v: boolean) => void,
  setLastWestgardMode: (m: "NORMAL" | "SIGMA") => void,
  setConfigs: React.Dispatch<React.SetStateAction<TestConfig[]>>,
  setReagents: React.Dispatch<React.SetStateAction<ReagentLotBM16[]>>,
  setBm09Logs: React.Dispatch<React.SetStateAction<BM09LogEntry[]>>,
  setWestgardReport: React.Dispatch<
    React.SetStateAction<Record<string, EvalRow[]>>
  >
) {
  setLastWestgardMode(mode);
  setIsAnalyzing(true);

  setTimeout(async () => {
    const tests = configs
      .filter(
        (c) => c.machine_name === selMachine && c.control_name === selControl
      )
      .sort((a, b) => a.order - b.order);
    const rows: EvalRow[] = [];
    const newBM09Entries: BM09LogEntry[] = [];
    const shortDate = runDate.slice(8, 10) + "/" + runDate.slice(5, 7);
    const formattedTime = liveTime.slice(0, 2) + "h" + liveTime.slice(3, 5);

    tests.forEach((t) => {
      const r1 = savedValues[t.test_id]?.L1;
      const r2 = savedValues[t.test_id]?.L2;
      const r3 = savedValues[t.test_id]?.L3;

      if (t.test_type === "QUALITATIVE") {
        const q1 = r1 || t.expected_qual_L1 || "ÂM TÍNH";
        const q2 =
          t.levels_count >= 2
            ? r2 || t.expected_qual_L2 || "DƯƠNG TÍNH"
            : undefined;
        const q3 =
          t.levels_count === 3
            ? r3 || t.expected_qual_L3 || "DƯƠNG TÍNH"
            : undefined;

        const pass1 = q1 === (t.expected_qual_L1 || "ÂM TÍNH");
        const pass2 =
          t.levels_count >= 2
            ? q2 === (t.expected_qual_L2 || "DƯƠNG TÍNH")
            : true;
        const pass3 =
          t.levels_count === 3
            ? q3 === (t.expected_qual_L3 || "DƯƠNG TÍNH")
            : true;
        const allPass = pass1 && pass2 && pass3;

        const failedLvls: string[] = [];
        if (!pass1) failedLvls.push("Mức 1");
        if (!pass2) failedLvls.push("Mức 2");
        if (!pass3) failedLvls.push("Mức 3");

        rows.push({
          test: t,
          valL1: null,
          qualL1: q1,
          zL1: null,
          lvl1Status: pass1 ? "PASS" : "FAIL",
          valL2: null,
          qualL2: q2,
          zL2: null,
          lvl2Status: t.levels_count >= 2 ? (pass2 ? "PASS" : "FAIL") : "SKIP",
          valL3: null,
          qualL3: q3,
          zL3: null,
          lvl3Status: t.levels_count === 3 ? (pass3 ? "PASS" : "FAIL") : "SKIP",
          status: allPass ? "PASS" : "FAIL",
          singleLevelRules: allPass
            ? []
            : [`Sai lệch chứng Định tính (${failedLvls.join(", ")})`],
          crossLevelRules: [],
          errorType: allPass
            ? "Đạt chuẩn Định tính"
            : "Không khớp chứng Định tính",
          suggestion: allPass
            ? "Chứng Âm/Dương đạt chuẩn."
            : "Kiểm tra lại thuốc thử và thực hiện kiểm tra lại chứng Định tính.",
          cause: "",
          actionTaken: "",
          postFixResult: allPass ? "" : "Đang chờ kiểm tra lại",
        });

        newBM09Entries.push({
          run_id: `RUN-${Date.now().toString().slice(-4)}-${Math.random()
            .toString(36)
            .slice(2, 5)}`,
          test_id: t.test_id,
          run_date: runDate,
          run_time: formattedTime,
          section: t.section,
          machine_name: t.machine_name,
          control_name: t.control_name,
          lot_number: t.lot_number,
          test_name: t.test_name,
          westgard_mode: mode,
          val_L1: null,
          z_L1: null,
          val_L2: null,
          z_L2: null,
          val_L3: null,
          z_L3: null,
          qual_L1: q1,
          qual_L2: q2,
          qual_L3: q3,
          status: allPass ? "PASS" : "FAIL",
          rules_single: allPass
            ? ""
            : `Sai lệch chứng Định tính (${failedLvls.join(", ")})`,
          rules_cross: "",
          cause: "",
          action_taken: "",
          post_fix_result: allPass ? "" : "Đang chờ kiểm tra lại",
          operator_name: currentUser.name,
          checker_name: "",
          resolved: allPass,
        });
        return;
      }

      const v1 = r1 !== undefined && r1 !== "" ? parseFloat(r1) : null;
      const v2 = r2 !== undefined && r2 !== "" ? parseFloat(r2) : null;
      const v3 = r3 !== undefined && r3 !== "" ? parseFloat(r3) : null;

      if (v1 === null && v2 === null && v3 === null) {
        rows.push({
          test: t,
          valL1: null,
          zL1: null,
          lvl1Status: "SKIP",
          valL2: null,
          zL2: null,
          lvl2Status: "SKIP",
          valL3: null,
          zL3: null,
          lvl3Status: "SKIP",
          status: "SKIP",
          singleLevelRules: [],
          crossLevelRules: [],
          errorType: "Bỏ trống",
          suggestion: "Chưa nhập kết quả.",
          cause: "",
          actionTaken: "",
          postFixResult: "",
        });
        return;
      }

      const z1 = v1 !== null && t.sd_L1 > 0 ? (v1 - t.mean_L1) / t.sd_L1 : null;
      const z2 = v2 !== null && t.sd_L2 > 0 ? (v2 - t.mean_L2) / t.sd_L2 : null;
      const z3 = v3 !== null && t.sd_L3 > 0 ? (v3 - t.mean_L3) / t.sd_L3 : null;

      const muStat = computeMuAndSigma(t, "L1");
      const sigmaVal = muStat.sigma ?? 4.5;
      const isExemptLong = Boolean(t.is_exempt_long_rules);

      const singleRules: string[] = [];
      const crossRules: string[] = [];
      let lvl1Status: EvalRow["lvl1Status"] = v1 !== null ? "PASS" : "SKIP";
      let lvl2Status: EvalRow["lvl2Status"] = v2 !== null ? "PASS" : "SKIP";
      let lvl3Status: EvalRow["lvl3Status"] = v3 !== null ? "PASS" : "SKIP";
      let status: EvalRow["status"] = "PASS";
      let errType = "Đạt chuẩn";
      let fix = "Hệ thống ổn định, cho phép trả kết quả bệnh nhân.";

      // 1. QUY TẮC 1-3s: LUÔN ÁP DỤNG CHO MỌI MỨC SIGMA (KỂ CẢ SIGMA >= 6.0)
      if (z1 !== null && Math.abs(z1) >= 3) {
        singleRules.push("1-3s (Mức 1)");
        lvl1Status = "FAIL";
        status = "FAIL";
        errType = "Sai số RE/SE lớn";
        fix =
          "Dừng trả kết quả. Kiểm tra bọt khí, kim hút, chuẩn lại và kiểm tra lại.";
      }
      if (z2 !== null && Math.abs(z2) >= 3) {
        singleRules.push("1-3s (Mức 2)");
        lvl2Status = "FAIL";
        status = "FAIL";
        errType = "Sai số RE/SE lớn";
        fix =
          "Dừng trả kết quả. Kiểm tra bọt khí, kim hút, chuẩn lại và kiểm tra lại.";
      }
      if (z3 !== null && Math.abs(z3) >= 3) {
        singleRules.push("1-3s (Mức 3)");
        lvl3Status = "FAIL";
        status = "FAIL";
        errType = "Sai số RE/SE lớn";
        fix =
          "Dừng trả kết quả. Kiểm tra bọt khí, kim hút, chuẩn lại và kiểm tra lại.";
      }

      // 2. BỘ 3 QUY TẮC (1-3s / 2-2s / R-4s): ÁP DỤNG KHI MODE = NORMAL HOẶC SIGMA < 6.0
      const enableThreeRules = mode === "NORMAL" || sigmaVal < 6.0;

      if (enableThreeRules) {
        const activeLevels: {
          key: "L1" | "L2" | "L3";
          z: number;
          markFail: () => void;
        }[] = [];

        if (z1 !== null) {
          activeLevels.push({
            key: "L1",
            z: z1,
            markFail: () => {
              lvl1Status = "FAIL";
            },
          });
        }
        if (z2 !== null) {
          activeLevels.push({
            key: "L2",
            z: z2,
            markFail: () => {
              lvl2Status = "FAIL";
            },
          });
        }
        if (z3 !== null) {
          activeLevels.push({
            key: "L3",
            z: z3,
            markFail: () => {
              lvl3Status = "FAIL";
            },
          });
        }

        // Bảo vệ an toàn: Chỉ xét quy tắc chéo khi có từ 2 mức trở lên
        if (activeLevels.length >= 2) {
          if (activeLevels.length === 3) {
            const allPos2 = activeLevels.every((item) => item.z >= 2);
            const allNeg2 = activeLevels.every((item) => item.z <= -2);
            if (allPos2 || allNeg2) {
              crossRules.push("2-2s (Cả 3 mức L1, L2, L3)");
              activeLevels.forEach((item) => item.markFail());
              status = "FAIL";
              errType = "Sai số Hệ thống nghiêm trọng (SE)";
              fix =
                "Cả 3 mức nồng độ lệch cùng chiều >2SD. Hiệu chuẩn (Calib) lại toàn bộ.";
            }
          }

          for (let i = 0; i < activeLevels.length; i++) {
            for (let j = i + 1; j < activeLevels.length; j++) {
              const a = activeLevels[i];
              const b = activeLevels[j];
              if ((a.z >= 2 && b.z >= 2) || (a.z <= -2 && b.z <= -2)) {
                const ruleLabel = `2-2s (${a.key} và ${b.key})`;
                if (!crossRules.includes(ruleLabel)) crossRules.push(ruleLabel);
                a.markFail();
                b.markFail();
                status = "FAIL";
                errType = "Sai số Hệ thống (SE)";
                fix = `Hai mức ${a.key} và ${b.key} lệch cùng chiều >2SD. Hiệu chuẩn (Calib) lại.`;
              }

              if (Math.abs(a.z - b.z) >= 4) {
                const r4sLabel = `R-4s (${a.key} và ${b.key})`;
                if (!crossRules.includes(r4sLabel)) crossRules.push(r4sLabel);
                a.markFail();
                b.markFail();
                status = "FAIL";
                errType = "Sai số Ngẫu nhiên (RE)";
                fix = `Chênh lệch giữa ${a.key} và ${b.key} ≥ 4SD. Kiểm tra bọt khí, kim hút, nguồn điện.`;
              }
            }
          }
        }

        const prevZ1 = t.history_L1[t.history_L1.length - 1]?.z ?? 0;
        const prevZ2 = t.history_L2[t.history_L2.length - 1]?.z ?? 0;
        const prevZ3 = t.history_L3?.[t.history_L3.length - 1]?.z ?? 0;

        if (
          z1 !== null &&
          ((z1 >= 2 && prevZ1 >= 2) || (z1 <= -2 && prevZ1 <= -2))
        ) {
          singleRules.push("2-2s Liên tiếp (Mức 1)");
          lvl1Status = "FAIL";
          status = "FAIL";
          errType = "Sai số Hệ thống (SE)";
          fix =
            "Mức 1 vượt 2SD cùng chiều 2 lần liên tiếp. Cần hiệu chuẩn lại.";
        }
        if (
          z2 !== null &&
          ((z2 >= 2 && prevZ2 >= 2) || (z2 <= -2 && prevZ2 <= -2))
        ) {
          singleRules.push("2-2s Liên tiếp (Mức 2)");
          lvl2Status = "FAIL";
          status = "FAIL";
          errType = "Sai số Hệ thống (SE)";
          fix =
            "Mức 2 vượt 2SD cùng chiều 2 lần liên tiếp. Cần hiệu chuẩn lại.";
        }
        if (
          z3 !== null &&
          ((z3 >= 2 && prevZ3 >= 2) || (z3 <= -2 && prevZ3 <= -2))
        ) {
          singleRules.push("2-2s Liên tiếp (Mức 3)");
          lvl3Status = "FAIL";
          status = "FAIL";
          errType = "Sai số Hệ thống (SE)";
          fix =
            "Mức 3 vượt 2SD cùng chiều 2 lần liên tiếp. Cần hiệu chuẩn lại.";
        }
      }

      // 3. BỘ QUY TẮC ĐẦY ĐỦ (4-1s, 6x, 8x, 10x): ÁP DỤNG KHI MODE = NORMAL HOẶC SIGMA < 5.0
      // (Tự động bỏ qua 6x, 8x, 10x nếu xét nghiệm nằm trong Cửa sổ Test Ngoại lệ)
      const enableFullLongRules = mode === "NORMAL" || sigmaVal < 5.0;
      if (enableFullLongRules) {
        if (z1 !== null) {
          const seq1 = checkSequentialLongRules(
            z1,
            t.history_L1,
            t.lot_number,
            "Mức 1",
            isExemptLong
          );
          if (seq1.length > 0) {
            singleRules.push(...seq1);
            lvl1Status = "FAIL";
            status = "FAIL";
            errType = "Sai số Hệ thống kéo dài (SE)";
            fix =
              "Chuỗi điểm QC lệch cùng một phía đường Mean. Cần kiểm tra đường chuẩn (Calib).";
          }
        }
        if (z2 !== null) {
          const seq2 = checkSequentialLongRules(
            z2,
            t.history_L2,
            t.lot_number,
            "Mức 2",
            isExemptLong
          );
          if (seq2.length > 0) {
            singleRules.push(...seq2);
            lvl2Status = "FAIL";
            status = "FAIL";
            errType = "Sai số Hệ thống kéo dài (SE)";
            fix =
              "Chuỗi điểm QC lệch cùng một phía đường Mean. Cần kiểm tra đường chuẩn (Calib).";
          }
        }
        if (z3 !== null) {
          const seq3 = checkSequentialLongRules(
            z3,
            t.history_L3,
            t.lot_number,
            "Mức 3",
            isExemptLong
          );
          if (seq3.length > 0) {
            singleRules.push(...seq3);
            lvl3Status = "FAIL";
            status = "FAIL";
            errType = "Sai số Hệ thống kéo dài (SE)";
            fix =
              "Chuỗi điểm QC lệch cùng một phía đường Mean. Cần kiểm tra đường chuẩn (Calib).";
          }
        }
      }

      // Cảnh báo 1-2s ở chế độ Thông thường
      if (mode === "NORMAL") {
        if (z1 !== null && Math.abs(z1) >= 2 && lvl1Status === "PASS") {
          singleRules.push("1-2s (Mức 1)");
          lvl1Status = "WARN";
          if (status === "PASS") status = "WARN";
        }
        if (z2 !== null && Math.abs(z2) >= 2 && lvl2Status === "PASS") {
          singleRules.push("1-2s (Mức 2)");
          lvl2Status = "WARN";
          if (status === "PASS") status = "WARN";
        }
        if (z3 !== null && Math.abs(z3) >= 2 && lvl3Status === "PASS") {
          singleRules.push("1-2s (Mức 3)");
          lvl3Status = "WARN";
          if (status === "PASS") status = "WARN";
        }
      }

      rows.push({
        test: t,
        valL1: v1,
        zL1: z1,
        lvl1Status,
        valL2: v2,
        zL2: z2,
        lvl2Status,
        valL3: v3,
        zL3: z3,
        lvl3Status,
        status,
        singleLevelRules: singleRules,
        crossLevelRules: crossRules,
        errorType: errType,
        suggestion: fix,
        cause: "",
        actionTaken: "",
        postFixResult: status === "FAIL" ? "Đang chờ kiểm tra lại" : "",
      });

      newBM09Entries.push({
        run_id: `RUN-${Date.now().toString().slice(-4)}-${Math.random()
          .toString(36)
          .slice(2, 5)}`,
        test_id: t.test_id,
        run_date: runDate,
        run_time: formattedTime,
        section: t.section,
        machine_name: t.machine_name,
        control_name: t.control_name,
        lot_number: t.lot_number,
        test_name: t.test_name,
        westgard_mode: mode,
        val_L1: v1,
        z_L1: z1 !== null ? Number(z1.toFixed(2)) : null,
        val_L2: v2,
        z_L2: z2 !== null ? Number(z2.toFixed(2)) : null,
        val_L3: v3,
        z_L3: z3 !== null ? Number(z3.toFixed(2)) : null,
        status: status === "SKIP" ? "PASS" : status,
        rules_single: singleRules.join(", "),
        rules_cross: crossRules.join(", "),
        cause: "",
        action_taken: "",
        post_fix_result: status === "FAIL" ? "Đang chờ kiểm tra lại" : "",
        operator_name: currentUser.name,
        checker_name: "",
        resolved: status === "PASS" || status === "WARN",
      });
    });

    setConfigs((prev) =>
      prev.map((c) => {
        if (c.test_type === "QUALITATIVE") return c;
        const found = rows.find((r) => r.test.test_id === c.test_id);
        if (!found || found.status === "SKIP") return c;
        const ruleText =
          [...found.singleLevelRules, ...found.crossLevelRules].join(" · ") ||
          "Đạt chuẩn (Trong ±2SD)";

        const nextL1: HistoryPoint[] =
          found.valL1 !== null && found.zL1 !== null
            ? [
                ...c.history_L1,
                {
                  isoDate: runDate,
                  date: shortDate,
                  time: formattedTime,
                  lot_number: c.lot_number,
                  val: found.valL1,
                  z: Number(found.zL1.toFixed(2)),
                  operator: currentUser.name,
                  rule: ruleText,
                  status:
                    found.lvl1Status === "SKIP" ? "PASS" : found.lvl1Status,
                },
              ]
            : c.history_L1;

        const nextL2: HistoryPoint[] =
          found.valL2 !== null && found.zL2 !== null
            ? [
                ...c.history_L2,
                {
                  isoDate: runDate,
                  date: shortDate,
                  time: formattedTime,
                  lot_number: c.lot_number,
                  val: found.valL2,
                  z: Number(found.zL2.toFixed(2)),
                  operator: currentUser.name,
                  rule: ruleText,
                  status:
                    found.lvl2Status === "SKIP" ? "PASS" : found.lvl2Status,
                },
              ]
            : c.history_L2;

        const nextL3: HistoryPoint[] =
          found.valL3 !== null && found.zL3 !== null
            ? [
                ...(c.history_L3 || []),
                {
                  isoDate: runDate,
                  date: shortDate,
                  time: formattedTime,
                  lot_number: c.lot_number,
                  val: found.valL3,
                  z: Number(found.zL3.toFixed(2)),
                  operator: currentUser.name,
                  rule: ruleText,
                  status:
                    found.lvl3Status === "SKIP" ? "PASS" : found.lvl3Status,
                },
              ]
            : c.history_L3 || [];

        return {
          ...c,
          accumulated_points: c.accumulated_points + 1,
          range_active_days:
            c.range_source !== "MANUFACTURER"
              ? Math.min(30, c.range_active_days + 1)
              : c.range_active_days,
          history_L1: nextL1,
          history_L2: nextL2,
          history_L3: nextL3,
        };
      })
    );

    setReagents((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (
          copy[i].machine_name === selMachine &&
          copy[i].control_name === selControl
        ) {
          const curMap = { ...(copy[i].used_days_map || {}) };
          curMap[runDate] = (Number(curMap[runDate]) || 0) + useTimesIncrement;
          copy[i] = {
            ...copy[i],
            usage_count: Number(copy[i].usage_count || 0) + useTimesIncrement,
            used_days_map: curMap,
          };
          break;
        }
      }
      return copy;
    });

    setBm09Logs((prev) => [...newBM09Entries, ...prev]);
    setWestgardReport((prev) => ({
      ...prev,
      [`${selMachine}__${selControl}`]: rows,
    }));
    setIsAnalyzing(false);

    await rpcCall(
      apiUrl,
      "save_batch",
      {
        section: selSection,
        section_epoch: sectionEpoch,
        run_date: runDate,
        run_time: formattedTime,
        machine_name: selMachine,
        control_name: selControl,
        westgard_mode: mode,
        operator_name: currentUser.name,
        use_times_increment: useTimesIncrement,
        items: newBM09Entries,
      },
      authToken
    );
  }, 400);
}

// --- HÀM TỰ ĐỘNG PHÁT HIỆN MỨC BỊ LỖI TỪ NHẬT KÝ ĐỂ KHÓA CỨNG (KHÔNG BẮT CHỌN LẠI) ---
function detectViolatedLevelsFromLog(
  log: BM09LogEntry,
  cfg?: TestConfig
): ("L1" | "L2" | "L3")[] {
  const res: ("L1" | "L2" | "L3")[] = [];
  const rulesText = `${log.rules_single || ""} ${log.rules_cross || ""}`;

  if (
    rulesText.includes("Mức 1") ||
    rulesText.includes("L1") ||
    (log.z_L1 !== null && log.z_L1 !== undefined && Math.abs(log.z_L1) >= 2)
  ) {
    res.push("L1");
  }
  if (
    rulesText.includes("Mức 2") ||
    rulesText.includes("L2") ||
    (log.z_L2 !== null && log.z_L2 !== undefined && Math.abs(log.z_L2) >= 2)
  ) {
    res.push("L2");
  }
  if (
    rulesText.includes("Mức 3") ||
    rulesText.includes("L3") ||
    (log.z_L3 !== null && log.z_L3 !== undefined && Math.abs(log.z_L3) >= 2)
  ) {
    res.push("L3");
  }

  if (res.length === 0) {
    res.push("L1");
  }
  if (cfg) {
    return res.filter((lv) =>
      lv === "L1"
        ? true
        : lv === "L2"
        ? cfg.levels_count >= 2
        : cfg.levels_count === 3
    );
  }
  return res;
}

// ============================================================================
// COMPONENT Ô NHẬP LIỆU ĐỘC LẬP TRONG GRID MODE (CHỐNG GIẬT LAG 60FPS)
// ============================================================================
const GridLevelCell = React.memo(function GridLevelCell({
  test,
  lvl,
  initialValue,
  inputRefCallback,
  onNavigateRow,
  onCommitValue,
}: {
  test: TestConfig;
  lvl: "L1" | "L2" | "L3";
  initialValue: string;
  inputRefCallback: (el: HTMLInputElement | null) => void;
  onNavigateRow: (delta: number) => void;
  onCommitValue: (testId: string, lvl: "L1" | "L2" | "L3", val: string) => void;
}) {
  const [localVal, setLocalVal] = useState<string>(initialValue);
  useEffect(() => {
    setLocalVal(initialValue);
  }, [initialValue]);

  if (lvl === "L3" && test.levels_count < 3) {
    return <td className="py-2 px-3 text-right text-slate-300 font-mono">—</td>;
  }
  if (lvl === "L2" && test.levels_count < 2) {
    return <td className="py-2 px-3 text-right text-slate-300 font-mono">—</td>;
  }

  const mean =
    lvl === "L1" ? test.mean_L1 : lvl === "L2" ? test.mean_L2 : test.mean_L3;
  const sd = lvl === "L1" ? test.sd_L1 : lvl === "L2" ? test.sd_L2 : test.sd_L3;
  const expQual =
    lvl === "L1"
      ? test.expected_qual_L1 || "ÂM TÍNH"
      : lvl === "L2"
      ? test.expected_qual_L2 || "DƯƠNG TÍNH"
      : test.expected_qual_L3 || "DƯƠNG TÍNH";

  if (test.test_type === "QUALITATIVE") {
    const currentQual = localVal || expQual;
    const isMatch = currentQual === expQual;
    return (
      <td className="py-2 px-3 text-right">
        <div className="inline-flex items-center gap-2">
          <span className="text-[10.5px] font-bold text-slate-500">
            Chứng: {expQual}
          </span>
          <select
            value={currentQual}
            onChange={(e) => {
              const v = e.target.value;
              setLocalVal(v);
              onCommitValue(test.test_id, lvl, v);
            }}
            className={`px-2.5 py-1.5 rounded-lg border-2 font-black text-xs ${
              isMatch
                ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                : "bg-rose-50 border-rose-400 text-rose-800"
            }`}
          >
            <option value="ÂM TÍNH">ÂM TÍNH</option>
            <option value="DƯƠNG TÍNH">DƯƠNG TÍNH</option>
          </select>
        </div>
      </td>
    );
  }

  const num = localVal !== "" ? parseFloat(localVal) : null;
  const z = num !== null && !isNaN(num) && sd > 0 ? (num - mean) / sd : null;
  const absZ = z !== null ? Math.abs(z) : null;
  const borderCls =
    absZ === null
      ? "border-slate-300 bg-slate-50"
      : absZ >= 3
      ? "border-rose-500 bg-rose-50 text-rose-900"
      : absZ >= 2
      ? "border-amber-500 bg-amber-50 text-amber-900"
      : "border-emerald-500 bg-emerald-50/50 text-emerald-950";

  return (
    <td className="py-2 px-3 text-right whitespace-nowrap">
      <div className="inline-flex items-center justify-end gap-2">
        <div className="text-right">
          <div className="text-[10.5px] font-mono font-bold text-slate-500">
            {mean} ± {sd}
          </div>
          {z !== null && (
            <div
              className={`text-[10px] font-mono font-black ${
                absZ! >= 3
                  ? "text-rose-600"
                  : absZ! >= 2
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {z >= 0 ? "+" : ""}
              {z.toFixed(2)}SD
            </div>
          )}
        </div>
        <input
          ref={inputRefCallback}
          type="number"
          step="any"
          value={localVal}
          placeholder={lvl}
          onChange={(e) => {
            const v = e.target.value;
            setLocalVal(v);
            onCommitValue(test.test_id, lvl, v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "ArrowDown") {
              e.preventDefault();
              onNavigateRow(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              onNavigateRow(-1);
            }
          }}
          className={`w-24 border-2 rounded-xl px-2.5 py-1.5 font-mono font-black text-xs text-right outline-none transition ${borderCls}`}
        />
      </div>
    </td>
  );
});

type NavTab =
  | "DASHBOARD"
  | "KIOSK"
  | "CHARTS_LJ"
  | "CATALOG_SETUP"
  | "ASSISTANT_ISO"
  | "ISO_REPORTS"
  | "ACCOUNTS";

type KioskStep =
  | "SELECT_MACHINE"
  | "SELECT_CONTROL"
  | "SELECT_LEVEL"
  | "ENTER_RESULTS";

export default function App() {
  const [apiUrl, setApiUrl] = usePersistentState<string>(
    STORAGE_KEYS.API_URL,
    DEFAULT_SCRIPT_URL
  );
  const [authToken, setAuthToken] = usePersistentState<string>(
    STORAGE_KEYS.TOKEN,
    ""
  );
  const [users, setUsers] = usePersistentState<UserAccount[]>(
    STORAGE_KEYS.USERS,
    INITIAL_USERS
  );
  const [currentUser, setCurrentUser] = usePersistentState<UserAccount | null>(
    STORAGE_KEYS.AUTH,
    null
  );

  useEffect(() => {
    if (!currentUser) return;
    const latest = users.find(
      (u) => u.id.toLowerCase() === currentUser.id.toLowerCase()
    );
    if (
      latest &&
      (latest.role !== currentUser.role ||
        JSON.stringify(latest.permissions) !==
          JSON.stringify(currentUser.permissions))
    ) {
      setCurrentUser(latest);
    }
  }, [users, currentUser, setCurrentUser]);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [syncBadge, setSyncBadge] = useState<string>("Đã lưu bền vững");
  const [pendingForceUser, setPendingForceUser] = useState<UserAccount | null>(
    null
  );
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [pwChangeErr, setPwChangeErr] = useState("");

  const todayIso = "2026-10-27";
  const [runDate, setRunDate] = useState<string>(todayIso);
  const [liveTime, setLiveTime] = useState<string>(() =>
    new Date().toLocaleTimeString("vi-VN", { hour12: false })
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString("vi-VN", { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [sections, setSections] = usePersistentState<string[]>(
    STORAGE_KEYS.SECTIONS,
    ["Sinh Hóa", "Huyết học", "Miễn dịch"]
  );
  const [labMachines, setLabMachines] = usePersistentState<
    { section: string; machine: string }[]
  >(STORAGE_KEYS.MACHINES, [
    { section: "Sinh Hóa", machine: "DXC 1" },
    { section: "Sinh Hóa", machine: "DXC 2" },
    { section: "Sinh Hóa", machine: "Ion đồ" },
    { section: "Huyết học", machine: "Compact Max" },
    { section: "Miễn dịch", machine: "Cobas e411" },
  ]);
  const [reagents, setReagents] = usePersistentState<ReagentLotBM16[]>(
    STORAGE_KEYS.REAGENTS,
    INITIAL_REAGENTS
  );
  const [configs, setConfigs] = usePersistentState<TestConfig[]>(
    STORAGE_KEYS.CONFIGS,
    INITIAL_CONFIGS
  );
  const [bm09Logs, setBm09Logs] = usePersistentState<BM09LogEntry[]>(
    STORAGE_KEYS.BM09,
    INITIAL_BM09_LOGS
  );
  const [sectionLocks, setSectionLocks] = usePersistentState<SectionLock[]>(
    STORAGE_KEYS.LOCKS,
    []
  );
  const [mySectionEpoch, setMySectionEpoch] = useState<string>("");
  const [kioskInputMode, setKioskInputMode] = usePersistentState<
    "CARD" | "GRID"
  >(STORAGE_KEYS.INPUT_MODE, "CARD");
  const [useTimesIncrement, setUseTimesIncrement] = useState<number>(1);

  const [activeTab, setActiveTab] = useState<NavTab>("DASHBOARD");
  const [expandedMetric, setExpandedMetric] = useState<1 | 2 | 3 | 4 | null>(1);
  const [m2Section, setM2Section] = useState<string>("Sinh Hóa");
  const [m2Machine, setM2Machine] = useState<string>("Tất cả");
  const [m2CheckedTests, setM2CheckedTests] = useState<string[]>([]);

  // MODAL KHẮC PHỤC SỰ CỐ: TỰ ĐỘNG KHÓA CỨNG CÁC MỨC BỊ LỖI (violatedLevels)
  const [correctiveModal, setCorrectiveModal] = useState<{
    open: boolean;
    logIndex: number;
    runId: string;
    testId: string;
    testName: string;
    rulesText: string;
    cause: string;
    action: string;
    violatedLevels: ("L1" | "L2" | "L3")[];
    reRunInputs: { L1: string; L2: string; L3: string };
    postFixResultText: string;
    adminStatusOverride: "PASS" | "WARN" | "FAIL";
    adminResolvedOverride: boolean;
  } | null>(null);

  const [selSection, setSelSection] = useState<string>("Sinh Hóa");
  const [step, setStep] = useState<KioskStep>("SELECT_MACHINE");
  const [selMachine, setSelMachine] = useState<string | null>(null);
  const [selControl, setSelControl] = useState<string | null>(null);
  const [selLevel, setSelLevel] = useState<"L1" | "L2" | "L3">("L1");

  const [savedValues, setSavedValues] = useState<
    Record<string, { L1?: string; L2?: string; L3?: string }>
  >({});
  const [tempInputs, setTempInputs] = useState<Record<string, string>>({});
  const [savedLevels, setSavedLevels] = useState<
    Record<string, { L1: boolean; L2: boolean; L3: boolean }>
  >({});
  const [reagentExpiryModal, setReagentExpiryModal] = useState<{
    open: boolean;
    reagent: ReagentLotBM16;
  } | null>(null);
  const [warningModal, setWarningModal] = useState<{
    open: boolean;
    type: "LEVEL" | "MACHINE";
    machine: string;
    control: string;
    level: "L1" | "L2" | "L3";
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastWestgardMode, setLastWestgardMode] = useState<"NORMAL" | "SIGMA">(
    "NORMAL"
  );
  const [westgardReport, setWestgardReport] = useState<
    Record<string, EvalRow[]>
  >({});

  // --- STATE BIỂU ĐỒ L-J ---
  const [chartSection, setChartSection] = useState<string>("Sinh Hóa");
  const [chartMachine, setChartMachine] = useState<string>("DXC 1");
  const [chartTestId, setChartTestId] = useState<string>("DXC1-GLU");
  const [chartIsoOnlyFilter, setChartIsoOnlyFilter] = useState<boolean>(false);
  const [chartLevelMode, setChartLevelMode] = useState<
    "L1" | "L2" | "L3" | "COMBINED"
  >("COMBINED");
  const [compareOldLot, setCompareOldLot] = useState<boolean>(false);
  const [hideFailsOnChart, setHideFailsOnChart] = useState<boolean>(false);
  const [chartFilterMode, setChartFilterMode] = useState<
    "DATE_RANGE" | "BY_LOT"
  >("DATE_RANGE");
  const [chartLotFilter, setChartLotFilter] = useState<string>("ALL");
  const [chartFromDate, setChartFromDate] = useState<string>("2026-09-26");
  const [chartToDate, setChartToDate] = useState<string>("2026-10-27");
  const [selectedPointInfo, setSelectedPointInfo] = useState<{
    levelKey: "L1" | "L2" | "L3";
    levelLabel: string;
    point: HistoryPoint;
    testId: string;
    testName: string;
    unit: string;
  } | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const syncFromCloud = useCallback(async () => {
    setSyncBadge("Đang đồng bộ...");
    const res = await rpcCall(apiUrl, "get_bootstrap", {}, authToken);
    if (res.net && res.body?.status === "success" && res.body?.data) {
      const d = res.body.data;
      if (Array.isArray(d.section_locks)) setSectionLocks(d.section_locks);
      if (Array.isArray(d.users) && d.users.length > 0) {
        setUsers((prev) =>
          prev.map((u) => {
            const remote = d.users.find(
              (ru: any) =>
                String(ru.id || "").toLowerCase() === u.id.toLowerCase()
            );
            if (!u.mustChange && u.password !== "Longdeptrai") return u;
            return remote
              ? {
                  ...u,
                  role: remote.role || u.role,
                  mustChange: Boolean(remote.mustChange),
                  permissions: Array.isArray(remote.permissions)
                    ? remote.permissions
                    : u.permissions,
                }
              : u;
          })
        );
      }
      setSyncBadge("Đã đồng bộ G.Sheets");
    } else {
      setSyncBadge("Đã lưu bền vững (Local)");
    }
  }, [apiUrl, authToken, setSectionLocks, setUsers]);

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

  const ctrlKey = (m: string, ctrl: string) => `${m}__${ctrl}`;
  const isLevelSaved = (m: string, ctrl: string, lvl: "L1" | "L2" | "L3") =>
    !!savedLevels[ctrlKey(m, ctrl)]?.[lvl];
  const isControlCompleted = (m: string, ctrl: string) => {
    const tList = getTestsForControl(m, ctrl);
    const maxLv = Math.max(1, ...tList.map((t) => t.levels_count || 2));
    if (maxLv === 3) {
      return (
        isLevelSaved(m, ctrl, "L1") &&
        isLevelSaved(m, ctrl, "L2") &&
        isLevelSaved(m, ctrl, "L3")
      );
    }
    if (maxLv === 2) {
      return isLevelSaved(m, ctrl, "L1") && isLevelSaved(m, ctrl, "L2");
    }
    return isLevelSaved(m, ctrl, "L1");
  };
  const isMachineCompleted = (m: string) => {
    const ctrls = getControlsForMachine(m);
    return ctrls.length > 0 && ctrls.every((c) => isControlCompleted(m, c));
  };
  const isMachinePartial = (m: string) => {
    const ctrls = getControlsForMachine(m);
    return ctrls.some(
      (c) =>
        isLevelSaved(m, c, "L1") ||
        isLevelSaved(m, c, "L2") ||
        isLevelSaved(m, c, "L3")
    );
  };

  const getActiveLockForSection = (sec: string): SectionLock | undefined => {
    const now = Date.now();
    return sectionLocks.find(
      (l) => l.section_name === sec && now - l.locked_at_ms < 5 * 60 * 1000
    );
  };

  const handleSelectSectionInKiosk = async (sec: string) => {
    if (!currentUser) return;
    const lock = getActiveLockForSection(sec);
    if (lock && lock.user_id.toLowerCase() !== currentUser.id.toLowerCase()) {
      window.alert(
        `Lab chuyên môn [${sec}] hiện đang được nhập bởi [${lock.user_name}]. Vui lòng chọn Lab chuyên môn còn lại!`
      );
      return;
    }
    const localEpoch = Math.random().toString(36).slice(2, 10);
    setMySectionEpoch(localEpoch);
    const newLock: SectionLock = {
      section_name: sec,
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      locked_at_ms: Date.now(),
      epoch: localEpoch,
    };
    setSectionLocks((prev) => [
      ...prev.filter(
        (l) =>
          l.user_id.toLowerCase() !== currentUser.id.toLowerCase() &&
          l.section_name !== sec
      ),
      newLock,
    ]);
    setSelSection(sec);
    setSelMachine(null);
    setSelControl(null);
    setStep("SELECT_MACHINE");
    const res = await rpcCall(
      apiUrl,
      "acquire_section_lock",
      { section_name: sec },
      authToken
    );
    if (res.net && res.body?.data?.epoch)
      setMySectionEpoch(res.body.data.epoch);
  };

  const handleForceUnlockSection = async (sec: string) => {
    if (!currentUser || !hasPermission(currentUser, "FORCE_UNLOCK_LAB")) return;
    const lock = getActiveLockForSection(sec);
    if (!lock) return;
    if (
      !window.confirm(
        `Bạn muốn MỞ KHÓA ÉP BUỘC Lab [${sec}] đang được giữ bởi [${lock.user_name}] để người khác vào làm việc?`
      )
    )
      return;
    setSectionLocks((prev) => prev.filter((l) => l.section_name !== sec));
    await rpcCall(
      apiUrl,
      "force_unlock_section",
      { section_name: sec },
      authToken
    );
  };

  const handleRunDateChange = (nextDate: string) => {
    if (nextDate < todayIso && !hasPermission(currentUser, "EDIT_PAST_DATE")) {
      window.alert(
        "Tài khoản của bạn chưa được cấp quyền quay lại ngày trước để xem/sửa kết quả QC!"
      );
      return;
    }
    setRunDate(nextDate);
  };

  const validatePasswordRules = (pw: string): string => {
    if (pw.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
    if (!/[A-Z]/.test(pw))
      return "Mật khẩu bắt buộc phải có ít nhất 1 chữ IN HOA.";
    if (!/[^A-Za-z0-9]/.test(pw)) {
      return "Mật khẩu bắt buộc phải có ít nhất 1 ký tự đặc biệt (VD: @, #, !, *, $...).";
    }
    for (const seq of ["1234", "2468", "3579"]) {
      if (pw.includes(seq)) {
        return `Mật khẩu không được chứa chuỗi số theo thứ tự cấm (${seq}).`;
      }
    }
    if (pw.toLowerCase() === "longdeptrai") {
      return "Không được sử dụng lại mật khẩu mặc định Longdeptrai.";
    }
    return "";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = loginUser.trim().toLowerCase();
    const found = users.find(
      (u) =>
        (u.id.toLowerCase() === uid || u.name.toLowerCase() === uid) &&
        u.password === loginPass
    );
    if (!found) {
      setLoginErr("Sai Tài khoản đăng nhập hoặc Mật khẩu!");
      return;
    }
    rpcCall(apiUrl, "login", { id: found.id, password: loginPass }).then(
      (res) => {
        if (res.net && res.body?.data?.token) setAuthToken(res.body.data.token);
      }
    );
    if (loginPass === "Longdeptrai" || found.mustChange) {
      setPendingForceUser(found);
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      setPwChangeErr("");
      setLoginErr("");
      return;
    }
    setCurrentUser(found);
    setLoginErr("");
    setActiveTab("DASHBOARD");
  };

  const handleCompleteForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingForceUser) return;
    const ruleErr = validatePasswordRules(newPasswordInput);
    if (ruleErr) {
      setPwChangeErr(ruleErr);
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPwChangeErr("Mật khẩu xác nhận không khớp với mật khẩu mới!");
      return;
    }
    const updatedUser: UserAccount = {
      ...pendingForceUser,
      password: newPasswordInput,
      mustChange: false,
    };
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setPendingForceUser(null);
    setCurrentUser(updatedUser);
    setActiveTab("DASHBOARD");
    const res = await rpcCall(
      apiUrl,
      "change_password",
      {
        id: updatedUser.id,
        oldPassword: pendingForceUser.password,
        newPassword: newPasswordInput,
      },
      authToken
    );
    if (res.net && res.body?.data?.token) {
      setAuthToken(res.body.data.token);
      setSyncBadge("Đã lưu mật khẩu lên G.Sheets");
    }
  };

  const handleAddSection = async () => {
    if (!hasPermission(currentUser, "MANAGE_CATALOG")) return;
    const name = window.prompt(
      "Nhập tên Lab chuyên môn mới (VD: Vi sinh, Sinh học phân tử):"
    );
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (!sections.includes(trimmed)) {
      setSections((prev) => [...prev, trimmed]);
      setSelSection(trimmed);
      await rpcCall(
        apiUrl,
        "admin_add_lab_machine",
        { section_name: trimmed },
        authToken
      );
    }
  };

  const handleAddMachine = async () => {
    if (!hasPermission(currentUser, "MANAGE_CATALOG")) return;
    const mName = window.prompt(`Nhập tên Thiết bị mới cho Lab ${selSection}:`);
    if (!mName || !mName.trim()) return;
    const trimmed = mName.trim();
    if (
      !labMachines.some(
        (x) => x.section === selSection && x.machine === trimmed
      )
    ) {
      setLabMachines((prev) => [
        ...prev,
        { section: selSection, machine: trimmed },
      ]);
      await rpcCall(
        apiUrl,
        "admin_add_lab_machine",
        { section_name: selSection, machine_name: trimmed },
        authToken
      );
    }
  };

  const handleCommitGridValue = useCallback(
    (testId: string, lvl: "L1" | "L2" | "L3", val: string) => {
      setSavedValues((prev) => ({
        ...prev,
        [testId]: { ...(prev[testId] || {}), [lvl]: val },
      }));
      if (selMachine && selControl) {
        const key = `${selMachine}__${selControl}`;
        setSavedLevels((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || { L1: false, L2: false, L3: false }),
            [lvl]: true,
          },
        }));
      }
    },
    [selMachine, selControl]
  );

  // --- MỞ MODAL KHẮC PHỤC SỰ CỐ: TỰ ĐỘNG KHÓA ĐÚNG MỨC BỊ LỖI ---
  const openSmartCorrectiveModalFromLog = (log: BM09LogEntry, idx: number) => {
    const cfg = configs.find((c) => c.test_id === log.test_id);
    const vLevels = detectViolatedLevelsFromLog(log, cfg);
    setCorrectiveModal({
      open: true,
      logIndex: idx,
      runId: log.run_id,
      testId: log.test_id,
      testName: log.test_name,
      rulesText:
        [log.rules_single, log.rules_cross].filter(Boolean).join(" · ") ||
        "Vi phạm QC",
      cause: log.cause,
      action: log.action_taken,
      violatedLevels: vLevels,
      reRunInputs: {
        L1:
          log.rerun_level === "L1" && log.rerun_val !== undefined
            ? String(log.rerun_val)
            : "",
        L2:
          log.rerun_level === "L2" && log.rerun_val !== undefined
            ? String(log.rerun_val)
            : "",
        L3:
          log.rerun_level === "L3" && log.rerun_val !== undefined
            ? String(log.rerun_val)
            : "",
      },
      postFixResultText: log.post_fix_result,
      adminStatusOverride: log.status,
      adminResolvedOverride: log.resolved,
    });
  };

  // --- LƯU HÀNH ĐỘNG KHẮC PHỤC & ĐẨY ĐIỂM IS_RERUN LÊN DASHBOARD + BIỂU ĐỒ L-J ---
  const handleSaveCorrectiveAction = async () => {
    if (!correctiveModal) return;
    const {
      logIndex,
      runId,
      testId,
      cause,
      action,
      violatedLevels,
      reRunInputs,
      postFixResultText,
      adminStatusOverride,
      adminResolvedOverride,
    } = correctiveModal;

    const targetCfg = configs.find((c) => c.test_id === testId);
    const currentLog = bm09Logs[logIndex];
    const canOverride = hasPermission(currentUser, "OVERRIDE_RESOLUTION");

    let finalPostFix = postFixResultText || currentLog?.post_fix_result || "";
    let finalResolved = canOverride
      ? adminResolvedOverride
      : currentLog?.resolved || false;
    let finalStatus = canOverride
      ? adminStatusOverride
      : currentLog?.status || "FAIL";
    let firstRerunVal: number | undefined = currentLog?.rerun_val;
    let firstRerunLvl: string | undefined = currentLog?.rerun_level;

    if (targetCfg && targetCfg.test_type !== "QUALITATIVE") {
      const summaryParts: string[] = [];
      let allEnteredPass = true;
      let anyEntered = false;

      const newPtsByLevel: Partial<Record<"L1" | "L2" | "L3", HistoryPoint>> =
        {};
      const logDate = currentLog?.run_date || runDate;
      const shortDate = logDate.slice(8, 10) + "/" + logDate.slice(5, 7);

      violatedLevels.forEach((lv) => {
        const rawStr = (reRunInputs[lv] || "").trim();
        if (rawStr === "") return;
        const num = parseFloat(rawStr);
        const meanRef =
          lv === "L1"
            ? targetCfg.mean_L1
            : lv === "L2"
            ? targetCfg.mean_L2
            : targetCfg.mean_L3;
        const sdRef =
          lv === "L1"
            ? targetCfg.sd_L1
            : lv === "L2"
            ? targetCfg.sd_L2
            : targetCfg.sd_L3;

        if (!isNaN(num) && sdRef > 0) {
          anyEntered = true;
          const zNew = (num - meanRef) / sdRef;
          const isPass = Math.abs(zNew) < 2;
          if (!isPass) allEnteredPass = false;

          const lvLabel =
            lv === "L1" ? "Mức 1" : lv === "L2" ? "Mức 2" : "Mức 3";
          summaryParts.push(
            `${lvLabel}: ${num} (${zNew >= 0 ? "+" : ""}${zNew.toFixed(
              2
            )}SD) - ${isPass ? "Đạt" : "Chưa đạt"}`
          );

          if (firstRerunVal === undefined) {
            firstRerunVal = num;
            firstRerunLvl = lv;
          }

          newPtsByLevel[lv] = {
            isoDate: logDate,
            date: shortDate,
            time: liveTime.slice(0, 5),
            lot_number: targetCfg.lot_number,
            val: num,
            z: Number(zNew.toFixed(2)),
            operator: currentUser?.name || "KTV",
            rule: isPass
              ? "Đạt sau kiểm tra lại"
              : `Kiểm tra lại chưa đạt (${zNew.toFixed(2)}SD)`,
            status: isPass ? "PASS" : Math.abs(zNew) >= 3 ? "FAIL" : "WARN",
            is_rerun: true,
          };
        }
      });

      if (anyEntered) {
        finalPostFix = summaryParts.join(" · ");
        if (allEnteredPass) {
          finalResolved = true;
        }
        setConfigs((prev) =>
          prev.map((c) => {
            if (c.test_id !== testId) return c;
            return {
              ...c,
              accumulated_points: c.accumulated_points + 1,
              history_L1: newPtsByLevel.L1
                ? [...c.history_L1, newPtsByLevel.L1]
                : c.history_L1,
              history_L2: newPtsByLevel.L2
                ? [...c.history_L2, newPtsByLevel.L2]
                : c.history_L2,
              history_L3: newPtsByLevel.L3
                ? [...(c.history_L3 || []), newPtsByLevel.L3]
                : c.history_L3 || [],
            };
          })
        );
      }
    }

    setBm09Logs((prev) =>
      prev.map((item, idx) =>
        idx === logIndex ||
        (runId && item.run_id === runId && item.test_id === testId)
          ? {
              ...item,
              cause,
              action_taken: action,
              post_fix_result: finalPostFix,
              status: finalStatus,
              resolved: finalResolved,
              rerun_val: firstRerunVal,
              rerun_level: firstRerunLvl,
            }
          : item
      )
    );

    if (targetCfg) {
      const key = `${targetCfg.machine_name}__${targetCfg.control_name}`;
      setWestgardReport((prev) => {
        if (!prev[key]) return prev;
        return {
          ...prev,
          [key]: prev[key].map((r) =>
            r.test.test_id === testId
              ? {
                  ...r,
                  cause,
                  actionTaken: action,
                  postFixResult: finalPostFix,
                }
              : r
          ),
        };
      });
    }

    setCorrectiveModal(null);
    if (currentLog) {
      await rpcCall(
        apiUrl,
        "update_corrective_action",
        {
          run_id: currentLog.run_id,
          test_id: currentLog.test_id,
          cause,
          action_taken: action,
          post_fix_result: finalPostFix,
          status: finalStatus,
          resolved: finalResolved,
          rerun_val: firstRerunVal,
          rerun_level: firstRerunLvl,
        },
        authToken
      );
    }
  };

  // --- ĐIỀU HƯỚNG SÂU (SMART ROUTING / DEEP LINK) TỪ DASHBOARD ---
  const jumpToAssistantWithFilter = (payload: {
    section: string;
    machine?: string;
    test_id?: string;
    viewMode?: "RANGE" | "QUALITY";
  }) => {
    sessionStorage.setItem("DEEP_LINK_TEST", JSON.stringify(payload));
    setActiveTab("ASSISTANT_ISO");
  };

  const jumpToLJChart = (testId: string, isoOnly = false) => {
    const target = configs.find((c) => c.test_id === testId);
    if (!target) return;
    setChartSection(target.section);
    setChartMachine(target.machine_name);
    setChartTestId(target.test_id);
    setChartIsoOnlyFilter(isoOnly);
    setSelectedPointInfo(null);
    setActiveTab("CHARTS_LJ");
  };

  const jumpFromMetric1Section = (sec: string) => {
    const isoTests = configs.filter(
      (c) =>
        c.section === sec &&
        c.standard_label === "ISO" &&
        c.test_type !== "QUALITATIVE"
    );
    if (isoTests.length === 0) return;
    const first = isoTests[0];
    setChartSection(sec);
    setChartMachine(first.machine_name);
    setChartTestId(first.test_id);
    setChartIsoOnlyFilter(true);
    setSelectedPointInfo(null);
    setActiveTab("CHARTS_LJ");
  };

  // ===========================================================================
  // MÀN HÌNH ĐĂNG NHẬP & BẮT BUỘC ĐỔI MẬT KHẨU LẦN ĐẦU
  // ===========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-indigo-100 text-slate-800 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <style>{`
          @keyframes goldShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
          .gold-shimmer-text { background: linear-gradient(90deg, #b45309 0%, #d97706 25%, #f59e0b 50%, #d97706 75%, #b45309 100%); background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; animation: goldShimmer 4.5s linear infinite; }
        `}</style>
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-sky-200/80 rounded-3xl p-8 shadow-[0_24px_60px_rgba(37,99,235,0.16)] relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <OrioBrandLogo size={64} />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                MEDLAB <span className="text-blue-600">IQC- ORIO</span>
              </h1>
              <p className="text-xs font-extrabold italic gold-shimmer-text tracking-wide mt-0.5">
                ✦ An intellectual product by Handsome Long ✦
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Hệ thống Quản trị Nội kiểm ISO 15189:2022 & QĐ 2429
              </p>
            </div>
          </div>

          {pendingForceUser ? (
            <form
              onSubmit={handleCompleteForcePasswordChange}
              className="space-y-4"
            >
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-950">
                <div className="font-black uppercase text-amber-800 mb-1">
                  Đổi Mật Khẩu Mặc Định Lần Đầu
                </div>
                Xin chào <b>{pendingForceUser.name}</b> ({pendingForceUser.role}
                ). Mật khẩu mới sẽ được lưu bền vững vào hệ thống.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Ít nhất 8 ký tự, 1 chữ HOA, 1 ký tự đặc biệt..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none"
                />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">
                  Quy tắc mật khẩu bắt buộc:
                </div>
                <div>
                  • Tối thiểu <b>8 ký tự</b>, ít nhất <b>1 chữ IN HOA</b> và{" "}
                  <b>1 ký tự đặc biệt</b>.
                </div>
                <div>
                  • Không chứa các chuỗi số thứ tự: <b>1234</b>, <b>2468</b>,{" "}
                  <b>3579</b>.
                </div>
              </div>
              {pwChangeErr && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                  {pwChangeErr}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingForceUser(null)}
                  className="w-1/3 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:brightness-105"
                >
                  Lưu Vĩnh Viễn
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tài khoản đăng nhập
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <Ic.User />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="Nhập ID (VD: thlong, hqsang...)"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400">
                    <Ic.Lock />
                  </span>
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none transition"
                  />
                </div>
              </div>
              {loginErr && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                  {loginErr}
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:brightness-105 active:translate-y-0.5 transition"
              >
                Đăng Nhập Hệ Thống
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const isoConfigs = configs.filter((c) => c.standard_label === "ISO");
  const sectionsWithIso = sections.filter((sec) =>
    isoConfigs.some((c) => c.section === sec && c.test_type !== "QUALITATIVE")
  );
  const labRangeConfigs = configs.filter(
    (c) => c.range_source !== "MANUFACTURER"
  );
  const expiringManualReagents = reagents.filter(
    (r) => r.is_manual_prep && isReagentReached75(r)
  );
  const accumulated15Configs = configs.filter((c) => {
    const mu1 = computeMuAndSigma(c, "L1");
    return mu1.validPointsCount >= 15 || c.accumulated_points >= 15;
  });

  const canAccessCatalog =
    currentUser.role === "ADMIN" ||
    currentUser.role === "QLCM" ||
    hasPermission(currentUser, "MANAGE_CATALOG");
  const canAccessAssistant =
    currentUser.role === "ADMIN" ||
    currentUser.role === "QLCM" ||
    hasPermission(currentUser, "APPROVE_RANGE_MU") ||
    hasPermission(currentUser, "MANAGE_CATALOG");
  const canAccessAdminPanel =
    currentUser.role === "ADMIN" ||
    hasPermission(currentUser, "MANAGE_ACCOUNTS");

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 font-sans text-[12.5px]">
      <style>{`
        @keyframes goldShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .gold-shimmer { background: linear-gradient(90deg, #b45309 0%, #d97706 25%, #f59e0b 50%, #d97706 75%, #b45309 100%); background-size: 200% auto; color: transparent; -webkit-background-clip: text; background-clip: text; animation: goldShimmer 4s linear infinite; }
        .neon-lime-range { background: linear-gradient(135deg, #ecfccb 0%, #bef264 100%); color: #1a2e05; border: 1.5px solid #65a30d; box-shadow: 0 0 10px rgba(132, 204, 22, 0.4); }
        .neon-purple-range { background: linear-gradient(135deg, #f3e8ff 0%, #d8b4fe 50%, #c084fc 100%); color: #3b0764; border: 1.5px solid #9333ea; box-shadow: 0 0 12px rgba(168, 85, 247, 0.45); }
        @keyframes policeSiren { 0%, 100% { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 0 16px rgba(239,68,68,0.75), inset 0 1px 2px rgba(255,255,255,0.6); transform: scale(1.02); } 50% { background: linear-gradient(135deg, #991b1b, #e11d48); box-shadow: 0 0 6px rgba(225,29,72,0.4); transform: scale(1); } }
        .police-flash { animation: policeSiren 0.85s ease-in-out infinite; color: #ffffff !important; border-color: #fecdd3 !important; }
        .crystal-pass { background: linear-gradient(135deg, #10b981 0%, #059669 55%, #047857 100%); box-shadow: 0 4px 12px rgba(16,185,129,0.3), inset 0 1px 2px rgba(255,255,255,0.65); color: #ffffff; border-color: #6ee7b7; }
        .matte-warn { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; border-color: #f59e0b; }
      `}</style>

      {/* HEADER ĐIỀU HƯỚNG CHÍNH */}
      <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-3">
          <OrioBrandLogo size={42} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-black text-base tracking-tight">
                MEDLAB <span className="text-blue-600">IQC- ORIO</span>
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap bg-blue-600 text-white inline-flex items-center justify-center tracking-wider shadow-sm">
                ISO 15189:2022 · QĐ 2429
              </span>
            </div>
            <div className="text-[10.5px] font-bold italic gold-shimmer">
              ✦ An intellectual product by Handsome Long ✦
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Ngày TH:</span>
            <input
              type="date"
              value={runDate}
              min={
                hasPermission(currentUser, "EDIT_PAST_DATE")
                  ? undefined
                  : todayIso
              }
              onChange={(e) => handleRunDateChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-md px-2 py-0.5 text-blue-700 font-mono font-bold outline-none"
            />
          </div>
          <div className="flex items-center gap-1 text-emerald-700 font-mono font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <Ic.Clock />
            <span>{liveTime}</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="text-slate-600">
            <b className="text-slate-900">{currentUser.name}</b>{" "}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              {currentUser.role}
            </span>
          </div>
          <button
            type="button"
            onClick={syncFromCloud}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10.5px] font-bold transition"
          >
            <Ic.Sync /> {syncBadge}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <nav className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            {[
              { id: "DASHBOARD", label: "Dashboard", show: true },
              { id: "KIOSK", label: "Nhập Kết quả QC", show: true },
              { id: "CHARTS_LJ", label: "Biểu đồ L-J", show: true },
              {
                id: "CATALOG_SETUP",
                label: "Danh mục & Vật tư",
                show: canAccessCatalog,
              },
              {
                id: "ASSISTANT_ISO",
                label: "Trợ lý Range & MU",
                show: canAccessAssistant,
              },
              { id: "ISO_REPORTS", label: "Hồ sơ & In ISO", show: true },
              {
                id: "ACCOUNTS",
                label: "Quản lý Admin",
                show: canAccessAdminPanel,
              },
            ]
              .filter((t) => t.show)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as NavTab)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap ${
                    activeTab === t.id
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.28)] scale-[1.02]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
          </nav>
          <button
            onClick={() => {
              if (currentUser) {
                setSectionLocks((prev) =>
                  prev.filter(
                    (l) =>
                      l.user_id.toLowerCase() !== currentUser.id.toLowerCase()
                  )
                );
                rpcCall(apiUrl, "release_section_lock", {}, authToken);
              }
              setCurrentUser(null);
            }}
            title="Đăng xuất"
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-all shadow-sm"
          >
            <Ic.Logout />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-5">
        {/* ------------------------------------------------------------------- */}
        {/* 1. DASHBOARD TỔNG QUAN & BẢNG GIÁM SÁT KHẮC PHỤC SỰ CỐ              */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "DASHBOARD" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() =>
                  setExpandedMetric(expandedMetric === 1 ? null : 1)
                }
                className={`text-left rounded-2xl p-4 border-2 transition-all ${
                  expandedMetric === 1
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-800 shadow-lg scale-[1.01]"
                    : "bg-white text-slate-800 border-blue-200 hover:border-blue-400 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      expandedMetric === 1
                        ? "bg-white/20 text-white"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    IQC - ISO TEST
                  </span>
                  <Ic.Cpu />
                </div>
                <div className="text-2xl font-black mt-2">
                  {isoConfigs.length} Chỉ số ISO
                </div>
                <div
                  className={`text-[11px] mt-1 font-semibold ${
                    expandedMetric === 1 ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  Có tại: {sectionsWithIso.join(", ") || "Chưa có"} · Nhấp mở
                  L-J
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setExpandedMetric(expandedMetric === 2 ? null : 2)
                }
                className={`text-left rounded-2xl p-4 border-2 transition-all ${
                  expandedMetric === 2
                    ? "bg-gradient-to-br from-purple-600 to-fuchsia-700 text-white border-purple-800 shadow-lg scale-[1.01]"
                    : "bg-white text-slate-800 border-purple-200 hover:border-purple-400 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      expandedMetric === 2
                        ? "bg-white/20 text-white"
                        : "bg-purple-50 text-purple-700"
                    }`}
                  >
                    LAB - RANGE - TEST
                  </span>
                  <Ic.Check />
                </div>
                <div className="text-2xl font-black mt-2">
                  {labRangeConfigs.length} Test Range Phòng
                </div>
                <div
                  className={`text-[11px] mt-1 font-semibold ${
                    expandedMetric === 2 ? "text-purple-100" : "text-slate-500"
                  }`}
                >
                  Đang chạy Range Phòng (Tím Neon) · Nhấp lọc sâu
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setExpandedMetric(expandedMetric === 3 ? null : 3)
                }
                className={`text-left rounded-2xl p-4 border-2 transition-all ${
                  expandedMetric === 3
                    ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-700 shadow-lg scale-[1.01]"
                    : "bg-white text-slate-800 border-amber-200 hover:border-amber-400 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      expandedMetric === 3
                        ? "bg-white/20 text-white"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    HÓA CHẤT QC PHA TAY SẮP HẾT
                  </span>
                  <Ic.Flask />
                </div>
                <div className="text-2xl font-black mt-2">
                  {expiringManualReagents.length} Lô chạm ≥ 75%
                </div>
                <div
                  className={`text-[11px] mt-1 font-semibold ${
                    expandedMetric === 3 ? "text-amber-50" : "text-slate-500"
                  }`}
                >
                  Chỉ tính Hóa chất tự pha (BM.16)
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setExpandedMetric(expandedMetric === 4 ? null : 4)
                }
                className={`text-left rounded-2xl p-4 border-2 transition-all ${
                  expandedMetric === 4
                    ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-800 shadow-lg scale-[1.01]"
                    : "bg-white text-slate-800 border-emerald-200 hover:border-emerald-400 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      expandedMetric === 4
                        ? "bg-white/20 text-white"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    IQC TÍCH LŨY (≥ 15 ĐIỂM ĐO)
                  </span>
                  <Ic.Clock />
                </div>
                <div className="text-2xl font-black mt-2">
                  {accumulated15Configs.length} Xét nghiệm
                </div>
                <div
                  className={`text-[11px] mt-1 font-semibold ${
                    expandedMetric === 4 ? "text-emerald-50" : "text-slate-500"
                  }`}
                >
                  Đủ điểm xét Chốt Range & MU · Nhấp lọc sâu
                </div>
              </button>
            </div>

            {expandedMetric === 1 && (
              <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-blue-950 uppercase">
                    IQC - ISO TEST · Chọn Chuyên Môn Có Xét Nghiệm ISO 15189
                  </h3>
                  <div className="flex items-center gap-2">
                    {sectionsWithIso.map((sec) => (
                      <button
                        key={sec}
                        onClick={() => jumpFromMetric1Section(sec)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm transition"
                      >
                        Mở Biểu đồ L-J ISO: {sec} →
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {isoConfigs.map((c) => (
                    <button
                      key={c.test_id}
                      onClick={() => jumpToLJChart(c.test_id, true)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap bg-blue-600 text-white inline-flex items-center justify-center tracking-wider shadow-sm">
                        ISO 15189
                      </span>
                      <span>{c.test_name}</span>
                      <span className="text-slate-500 font-normal">
                        ({c.section} · {c.machine_name})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {expandedMetric === 2 && (
              <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-purple-950 uppercase">
                      LAB - RANGE - TEST · Danh Sách Xét Nghiệm Đang Áp Dụng
                      Range Phòng (Tím Neon)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Nhấp trực tiếp vào tên xét nghiệm để nhảy thẳng sang{" "}
                      <b>Trợ lý Range & MU</b> và lọc sẵn đúng xét nghiệm đó.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <select
                      value={m2Section}
                      onChange={(e) => {
                        setM2Section(e.target.value);
                        setM2Machine("Tất cả");
                        setM2CheckedTests([]);
                      }}
                      className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5 font-bold text-purple-900"
                    >
                      {sections.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <select
                      value={m2Machine}
                      onChange={(e) => setM2Machine(e.target.value)}
                      className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-1.5 font-bold text-purple-900"
                    >
                      <option value="Tất cả">Tất cả máy</option>
                      {getMachinesForSection(m2Section).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        jumpToAssistantWithFilter({
                          section: m2Section,
                          machine: m2Machine,
                          test_id: m2CheckedTests[0] || undefined,
                          viewMode: "RANGE",
                        })
                      }
                      className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-sm"
                    >
                      Đến Trợ Lý Thiết Lập Range & MU →
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {labRangeConfigs
                    .filter(
                      (c) =>
                        c.section === m2Section &&
                        (m2Machine === "Tất cả" || c.machine_name === m2Machine)
                    )
                    .map((c) => {
                      const checked = m2CheckedTests.includes(c.test_id);
                      return (
                        <div
                          key={c.test_id}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                            checked
                              ? "neon-purple-range"
                              : "bg-purple-50/70 border border-purple-200 text-purple-950"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked)
                                setM2CheckedTests((prev) => [
                                  ...prev,
                                  c.test_id,
                                ]);
                              else
                                setM2CheckedTests((prev) =>
                                  prev.filter((id) => id !== c.test_id)
                                );
                            }}
                            className="accent-purple-700 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              jumpToAssistantWithFilter({
                                section: c.section,
                                machine: c.machine_name,
                                test_id: c.test_id,
                                viewMode: "RANGE",
                              })
                            }
                            className="hover:underline text-left"
                          >
                            {c.test_name} ({c.machine_name}) · Đã áp dụng{" "}
                            {c.range_active_days} ngày →
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {expandedMetric === 3 && (
              <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-sm space-y-2">
                <h3 className="text-sm font-black text-amber-950 uppercase">
                  HÓA CHẤT QC PHA TAY ĐÃ SỬ DỤNG ≥ 75% SỐ LƯỢNG PHA (BM.16)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {expiringManualReagents.map((r) => (
                    <div
                      key={r.control_id}
                      className="bg-amber-50/80 border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-black text-slate-900 text-xs">
                          {r.control_name} ({r.machine_name})
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono">
                          Lô: {r.lot_number} · Ngày pha:{" "}
                          {formatDateVN(r.prep_date)} ({r.prep_by_name})
                        </div>
                        <div className="text-[11px] font-extrabold text-amber-800 mt-0.5">
                          Đã dùng: {r.usage_count}/{r.quantity_prepared} lần
                          (Ngưỡng 75%:{" "}
                          {getReagentThreshold75(r.quantity_prepared)} lần)
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setReagentExpiryModal({ open: true, reagent: r })
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] shrink-0"
                      >
                        Xác nhận
                      </button>
                    </div>
                  ))}
                  {expiringManualReagents.length === 0 && (
                    <div className="text-xs text-slate-500 italic col-span-3">
                      Hiện chưa có lô hóa chất tự pha chế nào chạm ngưỡng ≥ 75%.
                    </div>
                  )}
                </div>
              </div>
            )}

            {expandedMetric === 4 && (
              <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-sm space-y-2">
                <h3 className="text-sm font-black text-emerald-950 uppercase">
                  IQC TÍCH LŨY (≥ 15 ĐIỂM ĐO) · Nhấp Vào Xét Nghiệm Để Mở Thẳng
                  Tại Trợ Lý Range & MU
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {accumulated15Configs.map((c) => {
                    const mu1 = computeMuAndSigma(c, "L1");
                    return (
                      <button
                        key={c.test_id}
                        onClick={() =>
                          jumpToAssistantWithFilter({
                            section: c.section,
                            machine: c.machine_name,
                            test_id: c.test_id,
                            viewMode: "RANGE",
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold transition flex items-center gap-2 shadow-sm"
                      >
                        <span>
                          {c.test_name} ({c.machine_name})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10.5px]">
                          {mu1.validPointsCount} điểm hợp lệ →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BẢNG GIÁM SÁT CẢNH BÁO WESTGARD & KẾT QUẢ SAU KHẮC PHỤC THỜI GIAN THỰC */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Bảng Giám Sát Cảnh Báo Westgard & Kết Quả Kiểm Tra Lại Thời
                    Gian Thực
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Khi nhập kết quả kiểm tra lại trong Modal, số liệu sau khắc
                    phục sẽ hiển thị ngay tại bảng này và tự động vẽ điểm mới
                    lên Biểu đồ L-J.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("KIOSK")}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition"
                >
                  + Vào Nhập Kết Quả QC
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase text-[10.5px]">
                      <th className="py-2.5 px-3">Ngày · Giờ</th>
                      <th className="py-2.5 px-3">Lab / Thiết bị</th>
                      <th className="py-2.5 px-3">Xét nghiệm</th>
                      <th className="py-2.5 px-3 text-center">Đánh giá</th>
                      <th className="py-2.5 px-3">
                        Quy tắc cảnh báo / vi phạm
                      </th>
                      <th className="py-2.5 px-3">
                        Kết quả Trước ➔ Sau kiểm tra lại
                      </th>
                      <th className="py-2.5 px-3">
                        Nguyên nhân & Hành động khắc phục
                      </th>
                      <th className="py-2.5 px-3 text-right">
                        Trạng thái xử lý
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {bm09Logs.map((log, i) => (
                      <tr
                        key={log.run_id + i}
                        className="hover:bg-sky-50/50 transition"
                      >
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          <b>{formatDateVN(log.run_date)}</b> · {log.run_time}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {log.section} ·{" "}
                          <span className="text-blue-700 font-bold">
                            {log.machine_name}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => jumpToLJChart(log.test_id, false)}
                            className="font-black text-blue-700 hover:underline text-left"
                          >
                            {log.test_name}
                          </button>
                          <span className="block text-[10.5px] text-slate-400 font-mono">
                            {log.control_name} ({log.lot_number})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-[2px] rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap ${
                              log.status === "FAIL"
                                ? "bg-rose-100 text-rose-700 border border-rose-300"
                                : log.status === "WARN"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-300"
                            }`}
                          >
                            {log.status === "FAIL"
                              ? "Vi phạm"
                              : log.status === "WARN"
                              ? "Cảnh báo"
                              : "Đạt"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          <div className="text-rose-600">
                            {log.rules_single || "—"}
                          </div>
                          {log.rules_cross && (
                            <div className="text-purple-700 text-[11px]">
                              {log.rules_cross}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11.5px] whitespace-nowrap">
                          <div className="text-slate-600">
                            {log.val_L1 !== null && (
                              <span>
                                L1: <b>{log.val_L1}</b> ({log.z_L1}SD)
                              </span>
                            )}
                            {log.val_L2 !== null && (
                              <span className="ml-2">
                                L2: <b>{log.val_L2}</b> ({log.z_L2}SD)
                              </span>
                            )}
                          </div>
                          {log.post_fix_result && (
                            <div
                              className={`mt-0.5 font-black ${
                                log.resolved
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              ➔ KT lại: {log.post_fix_result}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-xs">
                          {log.cause ? (
                            <>
                              <div className="font-bold text-slate-900">
                                {log.cause}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {log.action_taken}
                              </div>
                            </>
                          ) : (
                            <span className="italic text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {log.resolved ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Đã khắc phục
                              </span>
                            ) : (
                              <button
                                onClick={() =>
                                  openSmartCorrectiveModalFromLog(log, i)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] shadow-sm transition"
                              >
                                Nhập nguyên nhân & Kiểm tra lại
                              </button>
                            )}
                            {hasPermission(
                              currentUser,
                              "OVERRIDE_RESOLUTION"
                            ) && (
                              <button
                                onClick={() =>
                                  openSmartCorrectiveModalFromLog(log, i)
                                }
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-[10.5px]"
                              >
                                Sửa (Admin)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 2. KIOSK NHẬP KẾT QUẢ QC                                             */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "KIOSK" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase text-slate-500 mr-1">
                  Lab chuyên môn:
                </span>
                {sections.map((sec) => {
                  const lock = getActiveLockForSection(sec);
                  const isLockedByOther =
                    Boolean(lock) &&
                    lock!.user_id.toLowerCase() !==
                      currentUser.id.toLowerCase();
                  const isLockedByMe =
                    Boolean(lock) &&
                    lock!.user_id.toLowerCase() ===
                      currentUser.id.toLowerCase();
                  return (
                    <div key={sec} className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSelectSectionInKiosk(sec)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                          isLockedByOther
                            ? "bg-rose-50 text-rose-700 border border-rose-300 cursor-not-allowed opacity-85"
                            : selSection === sec
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {isLockedByOther && <Ic.Lock />}
                        <span>{sec}</span>
                        {isLockedByOther && (
                          <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-md font-bold">
                            Đang nhập: {lock!.user_name}
                          </span>
                        )}
                        {isLockedByMe && (
                          <span className="text-[10px] bg-emerald-400/30 text-white px-1.5 py-0.5 rounded-md font-bold">
                            Bạn đang giữ
                          </span>
                        )}
                      </button>
                      {isLockedByOther &&
                        hasPermission(currentUser, "FORCE_UNLOCK_LAB") && (
                          <button
                            type="button"
                            onClick={() => handleForceUnlockSection(sec)}
                            className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10.5px] font-black shadow-sm flex items-center gap-1 transition"
                          >
                            <Ic.Unlock /> Mở khóa ép buộc
                          </button>
                        )}
                    </div>
                  );
                })}
                {hasPermission(currentUser, "MANAGE_CATALOG") && (
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition"
                  >
                    <Ic.Plus /> Thêm Lab
                  </button>
                )}
              </div>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setKioskInputMode("CARD")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    kioskInputMode === "CARD"
                      ? "bg-white text-blue-700 shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Thẻ chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => setKioskInputMode("GRID")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition ${
                    kioskInputMode === "GRID"
                      ? "bg-white text-indigo-700 shadow-sm font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Ic.Grid /> Bảng thu gọn
                </button>
              </div>
            </div>

            {step === "SELECT_MACHINE" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Chọn Thiết Bị Xét Nghiệm — Lab {selSection}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Nhấp chọn thiết bị để hiển thị các Hóa chất QC tương ứng.
                    </p>
                  </div>
                  {hasPermission(currentUser, "MANAGE_CATALOG") && (
                    <button
                      onClick={handleAddMachine}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                    >
                      <Ic.Plus /> Thêm Thiết Bị
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {getMachinesForSection(selSection).map((m) => {
                    const completed = isMachineCompleted(m);
                    const partial = isMachinePartial(m);
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setSelMachine(m);
                          if (completed) {
                            setWarningModal({
                              open: true,
                              type: "MACHINE",
                              machine: m,
                              control: getControlsForMachine(m)[0],
                              level: "L1",
                            });
                            setSearchQuery("");
                            setEditDrafts({});
                          } else {
                            setStep("SELECT_CONTROL");
                          }
                        }}
                        className={`rounded-2xl p-5 text-left border-2 border-b-4 transition-all hover:-translate-y-0.5 ${
                          completed
                            ? "bg-amber-50/90 border-amber-400 border-b-amber-600"
                            : partial
                            ? "bg-indigo-50/90 border-indigo-300 border-b-indigo-600"
                            : "bg-sky-50/70 border-sky-200 border-b-sky-500 hover:bg-sky-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="p-2.5 rounded-xl bg-white text-blue-600 shadow-sm border border-slate-100">
                            <Ic.Cpu />
                          </span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                              completed
                                ? "bg-amber-500 text-white"
                                : partial
                                ? "bg-indigo-600 text-white"
                                : "bg-sky-600 text-white"
                            }`}
                          >
                            {completed
                              ? "Hoàn tất"
                              : partial
                              ? "Đang nhập"
                              : "Sẵn sàng"}
                          </span>
                        </div>
                        <div className="text-lg font-black text-slate-900">
                          {m}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Hóa chất QC:{" "}
                          <b>
                            {getControlsForMachine(m).join(" · ") ||
                              "Chưa khai báo"}
                          </b>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "SELECT_CONTROL" && selMachine && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Chọn Hóa Chất QC — Thiết Bị {selMachine}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cảnh báo tự động khi Hóa chất tự pha đạt{" "}
                      <b>≥ 75% Số lượng đã pha</b>.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("SELECT_MACHINE")}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl"
                  >
                    <Ic.Back /> Đổi Thiết Bị
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getControlsForMachine(selMachine).map((ctrl) => {
                    const done = isControlCompleted(selMachine, ctrl);
                    const tList = getTestsForControl(selMachine, ctrl);
                    const rgList = reagents.filter(
                      (r) =>
                        r.machine_name === selMachine && r.control_name === ctrl
                    );
                    const rg = rgList[rgList.length - 1];
                    const reached75 =
                      rg && rg.is_manual_prep && isReagentReached75(rg);
                    return (
                      <button
                        key={ctrl}
                        onClick={() => {
                          if (reached75 && rg) {
                            setReagentExpiryModal({ open: true, reagent: rg });
                            return;
                          }
                          setSelControl(ctrl);
                          setStep("SELECT_LEVEL");
                        }}
                        className={`rounded-2xl p-5 text-left border-2 border-b-4 transition-all hover:-translate-y-0.5 ${
                          done
                            ? "bg-purple-50 border-purple-300 border-b-purple-600"
                            : "bg-sky-50/70 border-sky-200 border-b-sky-600"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="p-2 rounded-xl bg-white text-indigo-600 shadow-sm border border-slate-100">
                            <Ic.Flask />
                          </span>
                          {rg && (
                            <span
                              className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                                reached75
                                  ? "bg-amber-100 text-amber-900 border-amber-400"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              Lô: {rg.lot_number} ·{" "}
                              {rg.is_manual_prep
                                ? `Pha tay: ${rg.usage_count}/${rg.quantity_prepared}`
                                : `Mở nắp: ${formatDateVN(rg.prep_date)}`}
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-black text-slate-900">
                          {ctrl}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {tList.length} xét nghiệm:{" "}
                          <b>{tList.map((t) => t.test_name).join(", ")}</b>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "SELECT_LEVEL" && selMachine && selControl && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative space-y-5">
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-2xl">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <div className="text-xs font-black text-blue-900 uppercase">
                      Đang phân tích quy tắc Westgard & đồng bộ...
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      {kioskInputMode === "GRID"
                        ? `Bảng Nhập Nhanh (Grid Mode) — ${selMachine} (${selControl})`
                        : `Chọn Mức Nồng Độ QC — ${selMachine} (${selControl})`}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {kioskInputMode === "GRID"
                        ? "Nhấn Enter để nhảy nhanh xuống dòng tiếp theo."
                        : "Chưa nhập: Màu Xanh Dương · Đã lưu: Màu Xanh Lá."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs">
                      <span className="font-bold text-amber-900">
                        Số lần dùng hóa chất:
                      </span>
                      {[1, 2, 3].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setUseTimesIncrement(n)}
                          className={`px-2 py-0.5 rounded-lg font-black transition ${
                            useTimesIncrement === n
                              ? "bg-amber-600 text-white shadow-sm"
                              : "bg-white text-amber-900 border border-amber-300"
                          }`}
                        >
                          {n} lần
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setStep("SELECT_CONTROL")}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl"
                    >
                      <Ic.Back /> Đổi hóa chất QC
                    </button>
                  </div>
                </div>

                {kioskInputMode === "GRID" ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white uppercase text-[11px]">
                          <th className="py-2.5 px-3 w-10 text-center">STT</th>
                          <th className="py-2.5 px-3">Xét nghiệm</th>
                          <th className="py-2.5 px-3 text-center">
                            Range áp dụng
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            Mức 1 (Mean ± SD)
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            Mức 2 (Mean ± SD)
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            Mức 3 (Nếu có)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {getTestsForControl(selMachine, selControl).map(
                          (t, idx) => {
                            const isLabRange =
                              t.range_source !== "MANUFACTURER";
                            const v1 = savedValues[t.test_id]?.L1 ?? "";
                            const v2 = savedValues[t.test_id]?.L2 ?? "";
                            const v3 = savedValues[t.test_id]?.L3 ?? "";
                            return (
                              <tr
                                key={t.test_id}
                                className="hover:bg-sky-50/40"
                              >
                                <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-slate-900">
                                      {t.test_name}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      ({t.unit})
                                    </span>
                                    {t.standard_label === "ISO" && (
                                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap bg-blue-600 text-white inline-flex items-center justify-center tracking-wider shadow-sm ml-1">
                                        ISO 15189
                                      </span>
                                    )}
                                    {t.is_exempt_long_rules && (
                                      <span className="rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase whitespace-nowrap bg-amber-500 text-white">
                                        Ngoại lệ 6x/8x/10x
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black inline-block whitespace-nowrap ${
                                      isLabRange
                                        ? "neon-purple-range"
                                        : "neon-lime-range"
                                    }`}
                                  >
                                    {isLabRange ? "Range Phòng" : "Range Hãng"}
                                  </span>
                                </td>
                                <GridLevelCell
                                  test={t}
                                  lvl="L1"
                                  initialValue={v1}
                                  inputRefCallback={(el) =>
                                    (inputRefs.current[`grid-L1-${idx}`] = el)
                                  }
                                  onNavigateRow={(delta) => {
                                    const nextEl =
                                      inputRefs.current[
                                        `grid-L1-${idx + delta}`
                                      ];
                                    if (nextEl) {
                                      nextEl.focus();
                                      nextEl.select();
                                    }
                                  }}
                                  onCommitValue={handleCommitGridValue}
                                />
                                <GridLevelCell
                                  test={t}
                                  lvl="L2"
                                  initialValue={v2}
                                  inputRefCallback={(el) =>
                                    (inputRefs.current[`grid-L2-${idx}`] = el)
                                  }
                                  onNavigateRow={(delta) => {
                                    const nextEl =
                                      inputRefs.current[
                                        `grid-L2-${idx + delta}`
                                      ];
                                    if (nextEl) {
                                      nextEl.focus();
                                      nextEl.select();
                                    }
                                  }}
                                  onCommitValue={handleCommitGridValue}
                                />
                                <GridLevelCell
                                  test={t}
                                  lvl="L3"
                                  initialValue={v3}
                                  inputRefCallback={(el) =>
                                    (inputRefs.current[`grid-L3-${idx}`] = el)
                                  }
                                  onNavigateRow={(delta) => {
                                    const nextEl =
                                      inputRefs.current[
                                        `grid-L3-${idx + delta}`
                                      ];
                                    if (nextEl) {
                                      nextEl.focus();
                                      nextEl.select();
                                    }
                                  }}
                                  onCommitValue={handleCommitGridValue}
                                />
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  (() => {
                    const testsInCtrl = getTestsForControl(
                      selMachine,
                      selControl
                    );
                    const maxLv = Math.max(
                      1,
                      ...testsInCtrl.map((t) => t.levels_count || 2)
                    ) as 1 | 2 | 3;
                    const levelList: ("L1" | "L2" | "L3")[] =
                      maxLv === 3
                        ? ["L1", "L2", "L3"]
                        : maxLv === 2
                        ? ["L1", "L2"]
                        : ["L1"];
                    return (
                      <div
                        className={`grid grid-cols-1 ${
                          maxLv === 3
                            ? "md:grid-cols-3"
                            : maxLv === 2
                            ? "md:grid-cols-2"
                            : "md:grid-cols-1"
                        } gap-4 max-w-4xl mx-auto`}
                      >
                        {levelList.map((lvl) => {
                          const saved = isLevelSaved(
                            selMachine,
                            selControl,
                            lvl
                          );
                          return (
                            <button
                              key={lvl}
                              onClick={() => {
                                setSelLevel(lvl);
                                if (saved) {
                                  setWarningModal({
                                    open: true,
                                    type: "LEVEL",
                                    machine: selMachine,
                                    control: selControl,
                                    level: lvl,
                                  });
                                  setSearchQuery("");
                                  setEditDrafts({});
                                  return;
                                }
                                const initTemp: Record<string, string> = {};
                                testsInCtrl.forEach((t) => {
                                  initTemp[t.test_id] =
                                    savedValues[t.test_id]?.[lvl] ??
                                    (t.test_type === "QUALITATIVE"
                                      ? lvl === "L1"
                                        ? t.expected_qual_L1 || "ÂM TÍNH"
                                        : lvl === "L2"
                                        ? t.expected_qual_L2 || "DƯƠNG TÍNH"
                                        : t.expected_qual_L3 || "DƯƠNG TÍNH"
                                      : "");
                                });
                                setTempInputs(initTemp);
                                setStep("ENTER_RESULTS");
                              }}
                              className={`rounded-2xl p-5 text-left border-2 border-b-[5px] transition-all hover:-translate-y-0.5 ${
                                saved
                                  ? "bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-700 text-white shadow-lg"
                                  : "bg-gradient-to-b from-sky-500 to-blue-600 border-blue-800 text-white shadow-lg"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-black/20">
                                  {lvl === "L1"
                                    ? "Mức 1"
                                    : lvl === "L2"
                                    ? "Mức 2"
                                    : "Mức 3"}
                                </span>
                                {saved && <Ic.Check />}
                              </div>
                              <div className="text-xl font-black">
                                {lvl === "L1"
                                  ? "MỨC 1 (LEVEL 1)"
                                  : lvl === "L2"
                                  ? "MỨC 2 (LEVEL 2)"
                                  : "MỨC 3 (LEVEL 3)"}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                )}

                <div className="pt-4 border-t border-slate-200 flex flex-col items-center">
                  <div className="text-xs font-bold text-slate-600 mb-3">
                    Chọn Chế Độ Xét Quy Tắc Westgard & Lưu Vào Sổ BM.09 / BM.16:
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                      onClick={() =>
                        executeWestgardAnalysis(
                          "NORMAL",
                          selSection,
                          selMachine,
                          selControl,
                          mySectionEpoch,
                          configs,
                          savedValues,
                          runDate,
                          liveTime,
                          currentUser,
                          useTimesIncrement,
                          apiUrl,
                          authToken,
                          setIsAnalyzing,
                          setLastWestgardMode,
                          setConfigs,
                          setReagents,
                          setBm09Logs,
                          setWestgardReport
                        )
                      }
                      className="px-6 py-3 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-b-4 border-indigo-900 shadow-md transition"
                    >
                      1. Phân Tích Westgard Thông Thường
                    </button>
                    <button
                      onClick={() =>
                        executeWestgardAnalysis(
                          "SIGMA",
                          selSection,
                          selMachine,
                          selControl,
                          mySectionEpoch,
                          configs,
                          savedValues,
                          runDate,
                          liveTime,
                          currentUser,
                          useTimesIncrement,
                          apiUrl,
                          authToken,
                          setIsAnalyzing,
                          setLastWestgardMode,
                          setConfigs,
                          setReagents,
                          setBm09Logs,
                          setWestgardReport
                        )
                      }
                      className="px-6 py-3 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border-b-4 border-purple-900 shadow-md transition"
                    >
                      2. Phân Tích Westgard Sigma (SOP 31)
                    </button>
                  </div>
                </div>

                {/* BẢNG BÁO CÁO PHÂN TÍCH WESTGARD TẠI KIOSK */}
                {westgardReport[ctrlKey(selMachine, selControl)] && (
                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-black text-slate-900 uppercase">
                        Báo Cáo Phân Tích Westgard (
                        {lastWestgardMode === "SIGMA"
                          ? "Chế độ Six Sigma — Phân luồng tự động theo Mục 5.2.4 SOP 31"
                          : "Chế độ Thông thường"}
                        )
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse bg-white rounded-xl overflow-hidden border border-slate-200">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-[10.5px]">
                            <th className="py-2.5 px-3">Xét nghiệm</th>
                            <th className="py-2.5 px-3 text-center">Nhãn</th>
                            <th className="py-2.5 px-3 text-right">
                              Mức 1 (Z)
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              Mức 2 (Z)
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              Mức 3 (Z)
                            </th>
                            <th className="py-2.5 px-3">Quy tắc 1 mức</th>
                            <th className="py-2.5 px-3">Quy tắc phối hợp</th>
                            <th className="py-2.5 px-3 text-center">
                              Trạng thái
                            </th>
                            <th className="py-2.5 px-3">Khắc phục sự cố</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {westgardReport[ctrlKey(selMachine, selControl)].map(
                            (r) => (
                              <tr
                                key={r.test.test_id}
                                className="hover:bg-slate-50"
                              >
                                <td className="py-2.5 px-3 font-black text-slate-900">
                                  {r.test.test_name}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {r.test.standard_label === "ISO" ? (
                                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap bg-blue-600 text-white inline-flex items-center justify-center tracking-wider shadow-sm">
                                      ISO 15189
                                    </span>
                                  ) : (
                                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap bg-slate-200 text-slate-700 inline-flex items-center justify-center">
                                      Thường
                                    </span>
                                  )}
                                </td>
                                <td
                                  className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                                    r.lvl1Status === "FAIL"
                                      ? "bg-rose-100 text-rose-900 border-x border-rose-300"
                                      : r.lvl1Status === "WARN"
                                      ? "bg-amber-100 text-amber-900 border-x border-amber-300"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {r.qualL1
                                    ? r.qualL1
                                    : r.valL1 !== null
                                    ? `${r.valL1} (${
                                        r.zL1! >= 0 ? "+" : ""
                                      }${r.zL1!.toFixed(2)}SD)`
                                    : "—"}
                                </td>
                                <td
                                  className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                                    r.lvl2Status === "FAIL"
                                      ? "bg-rose-100 text-rose-900 border-x border-rose-300"
                                      : r.lvl2Status === "WARN"
                                      ? "bg-amber-100 text-amber-900 border-x border-amber-300"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {r.qualL2
                                    ? r.qualL2
                                    : r.valL2 !== null
                                    ? `${r.valL2} (${
                                        r.zL2! >= 0 ? "+" : ""
                                      }${r.zL2!.toFixed(2)}SD)`
                                    : "—"}
                                </td>
                                <td
                                  className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                                    r.lvl3Status === "FAIL"
                                      ? "bg-rose-100 text-rose-900 border-x border-rose-300"
                                      : r.lvl3Status === "WARN"
                                      ? "bg-amber-100 text-amber-900 border-x border-amber-300"
                                      : "text-slate-800"
                                  }`}
                                >
                                  {r.qualL3
                                    ? r.qualL3
                                    : r.valL3 !== null
                                    ? `${r.valL3} (${
                                        r.zL3! >= 0 ? "+" : ""
                                      }${r.zL3!.toFixed(2)}SD)`
                                    : "—"}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                                  {r.singleLevelRules.length > 0 ? (
                                    r.singleLevelRules.join(", ")
                                  ) : (
                                    <span className="text-emerald-600">
                                      Đạt
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-purple-700">
                                  {r.crossLevelRules.length > 0 ? (
                                    r.crossLevelRules.join(", ")
                                  ) : (
                                    <span className="text-emerald-600">
                                      Đạt
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase whitespace-nowrap ${
                                      r.status === "PASS"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : r.status === "WARN"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-rose-600 text-white"
                                    }`}
                                  >
                                    {r.status === "PASS"
                                      ? "ĐẠT"
                                      : r.status === "WARN"
                                      ? "CẢNH BÁO"
                                      : "VI PHẠM"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {r.status === "FAIL" ||
                                  r.status === "WARN" ? (
                                    <button
                                      onClick={() => {
                                        const logIdx = bm09Logs.findIndex(
                                          (l) =>
                                            l.test_id === r.test.test_id &&
                                            !l.resolved
                                        );
                                        const matchedLog =
                                          logIdx >= 0 ? bm09Logs[logIdx] : null;
                                        const vLvls: ("L1" | "L2" | "L3")[] =
                                          [];
                                        if (
                                          r.lvl1Status === "FAIL" ||
                                          r.lvl1Status === "WARN"
                                        )
                                          vLvls.push("L1");
                                        if (
                                          r.lvl2Status === "FAIL" ||
                                          r.lvl2Status === "WARN"
                                        )
                                          vLvls.push("L2");
                                        if (
                                          r.lvl3Status === "FAIL" ||
                                          r.lvl3Status === "WARN"
                                        )
                                          vLvls.push("L3");
                                        if (vLvls.length === 0)
                                          vLvls.push("L1");

                                        setCorrectiveModal({
                                          open: true,
                                          logIndex: logIdx >= 0 ? logIdx : 0,
                                          runId: matchedLog?.run_id || "",
                                          testId: r.test.test_id,
                                          testName: r.test.test_name,
                                          rulesText: [
                                            ...r.singleLevelRules,
                                            ...r.crossLevelRules,
                                          ].join(" · "),
                                          cause: r.cause,
                                          action: r.actionTaken,
                                          violatedLevels: vLvls,
                                          reRunInputs: {
                                            L1: "",
                                            L2: "",
                                            L3: "",
                                          },
                                          postFixResultText: r.postFixResult,
                                          adminStatusOverride:
                                            r.status === "SKIP"
                                              ? "PASS"
                                              : r.status,
                                          adminResolvedOverride: false,
                                        });
                                      }}
                                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm whitespace-nowrap"
                                    >
                                      Nhập nguyên nhân & Kiểm tra lại
                                    </button>
                                  ) : (
                                    <span className="text-slate-600">
                                      {r.suggestion}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === "ENTER_RESULTS" && selMachine && selControl && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600 text-white">
                      Đang nhập{" "}
                      {selLevel === "L1"
                        ? "Mức 1"
                        : selLevel === "L2"
                        ? "Mức 2"
                        : "Mức 3"}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 mt-1.5">
                      {selMachine} — {selControl}
                    </h2>
                  </div>
                  <button
                    onClick={() => setStep("SELECT_LEVEL")}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl"
                  >
                    <Ic.Back /> Quay lại chọn Mức
                  </button>
                </div>
                <div className="space-y-3 max-w-4xl mx-auto">
                  {getTestsForControl(selMachine, selControl).map((t, idx) => {
                    if (selLevel === "L2" && t.levels_count < 2) return null;
                    if (selLevel === "L3" && t.levels_count < 3) return null;

                    const mean =
                      selLevel === "L1"
                        ? t.mean_L1
                        : selLevel === "L2"
                        ? t.mean_L2
                        : t.mean_L3;
                    const sd =
                      selLevel === "L1"
                        ? t.sd_L1
                        : selLevel === "L2"
                        ? t.sd_L2
                        : t.sd_L3;
                    const expectedQual =
                      selLevel === "L1"
                        ? t.expected_qual_L1 || "ÂM TÍNH"
                        : selLevel === "L2"
                        ? t.expected_qual_L2 || "DƯƠNG TÍNH"
                        : t.expected_qual_L3 || "DƯƠNG TÍNH";
                    const val = tempInputs[t.test_id] ?? "";
                    const num = val !== "" ? parseFloat(val) : null;
                    const z =
                      t.test_type !== "QUALITATIVE" &&
                      num !== null &&
                      !isNaN(num) &&
                      sd > 0
                        ? (num - mean) / sd
                        : null;
                    const sdBadge =
                      z !== null ? formatSDPositionBadge(z) : null;
                    const isLabRange = t.range_source !== "MANUFACTURER";
                    return (
                      <div
                        key={t.test_id}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 transition"
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-mono font-black text-sm flex items-center justify-center shadow-sm">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-black text-slate-900">
                                {t.test_name}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                ({t.unit})
                              </span>
                              {t.standard_label === "ISO" && (
                                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap bg-blue-600 text-white inline-flex items-center justify-center tracking-wider shadow-sm">
                                  ISO 15189
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  isLabRange
                                    ? "neon-purple-range"
                                    : "neon-lime-range"
                                }`}
                              >
                                {isLabRange ? "Range Phòng" : "Range Hãng"}
                              </span>
                            </div>
                            {t.test_type !== "QUALITATIVE" ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-950 font-mono font-black text-xs border border-blue-300">
                                  MEAN: {mean}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-mono font-bold text-xs">
                                  SD: ±{sd}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
                                  Chứng chuẩn mong đợi: {expectedQual}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 justify-end">
                          {t.test_type !== "QUALITATIVE" ? (
                            <>
                              {sdBadge && (
                                <span
                                  className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border ${sdBadge.cls}`}
                                >
                                  {sdBadge.text}
                                </span>
                              )}
                              <input
                                ref={(el) =>
                                  (inputRefs.current[`entry-${idx}`] = el)
                                }
                                type="number"
                                step="any"
                                value={val}
                                placeholder="Nhập số..."
                                onChange={(e) => {
                                  const nextVal = e.target.value;
                                  setTempInputs((prev) => ({
                                    ...prev,
                                    [t.test_id]: nextVal,
                                  }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const nextEl =
                                      inputRefs.current[`entry-${idx + 1}`];
                                    if (nextEl) {
                                      nextEl.focus();
                                      nextEl.select();
                                    }
                                  }
                                }}
                                className="w-36 bg-white border-2 border-slate-300 focus:border-blue-600 text-slate-900 font-mono font-black text-base text-right px-3.5 py-2 rounded-xl shadow-inner outline-none"
                              />
                            </>
                          ) : (
                            <select
                              value={val || expectedQual}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                setTempInputs((prev) => ({
                                  ...prev,
                                  [t.test_id]: nextVal,
                                }));
                              }}
                              className="bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 font-black text-xs text-slate-900"
                            >
                              <option value="ÂM TÍNH">ÂM TÍNH</option>
                              <option value="DƯƠNG TÍNH">DƯƠNG TÍNH</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-end max-w-4xl mx-auto">
                  <button
                    onClick={() => {
                      const tests = getTestsForControl(selMachine, selControl);
                      setSavedValues((prev) => {
                        const next = { ...prev };
                        tests.forEach((t) => {
                          const raw = tempInputs[t.test_id]?.trim() || "";
                          next[t.test_id] = {
                            ...(next[t.test_id] || {}),
                            [selLevel]: raw,
                          };
                        });
                        return next;
                      });
                      const key = ctrlKey(selMachine, selControl);
                      setSavedLevels((prev) => ({
                        ...prev,
                        [key]: {
                          ...(prev[key] || { L1: false, L2: false, L3: false }),
                          [selLevel]: true,
                        },
                      }));
                      setStep("SELECT_LEVEL");
                    }}
                    className="px-8 py-3.5 rounded-xl font-black text-sm uppercase bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-b-4 border-emerald-800 shadow-lg hover:brightness-105 flex items-center gap-2"
                  >
                    <Ic.Check /> LƯU KẾT QUẢ{" "}
                    {selLevel === "L1"
                      ? "MỨC 1"
                      : selLevel === "L2"
                      ? "MỨC 2"
                      : "MỨC 3"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 3. BIỂU ĐỒ LEVEY-JENNINGS (GIỮ NGUYÊN CẤU TRÚC & CHỨC NĂNG TRÊN WEB) */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "CHARTS_LJ" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-500 uppercase">
                    1. Lab:
                  </span>
                  {sections.map((sec) => (
                    <button
                      key={sec}
                      onClick={() => {
                        setChartSection(sec);
                        setChartIsoOnlyFilter(false);
                        const firstM = getMachinesForSection(sec)[0] || "";
                        setChartMachine(firstM);
                        const firstT = configs.find(
                          (c) =>
                            c.section === sec &&
                            c.machine_name === firstM &&
                            c.test_type !== "QUALITATIVE"
                        );
                        if (firstT) setChartTestId(firstT.test_id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                        chartSection === sec
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-500 uppercase">
                    2. Thiết bị:
                  </span>
                  {getMachinesForSection(chartSection).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setChartMachine(m);
                        const firstT = configs.find(
                          (c) =>
                            c.machine_name === m &&
                            c.test_type !== "QUALITATIVE"
                        );
                        if (firstT) setChartTestId(firstT.test_id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                        chartMachine === m
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {(() => {
                  const numericConfigs = configs.filter(
                    (c) => c.test_type !== "QUALITATIVE"
                  );
                  const currentTest =
                    numericConfigs.find((c) => c.test_id === chartTestId) ||
                    numericConfigs[0];
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      {chartIsoOnlyFilter && (
                        <button
                          onClick={() => setChartIsoOnlyFilter(false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-black bg-blue-100 text-blue-800 border border-blue-300"
                        >
                          Đang lọc Test ISO 15189 (Nhấp bỏ)
                        </button>
                      )}

                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-extrabold">
                        <button
                          type="button"
                          onClick={() => setChartLevelMode("L1")}
                          className={`px-3 py-1 rounded-lg transition ${
                            chartLevelMode === "L1"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Xem L1
                        </button>
                        {currentTest && currentTest.levels_count >= 2 && (
                          <button
                            type="button"
                            onClick={() => setChartLevelMode("L2")}
                            className={`px-3 py-1 rounded-lg transition ${
                              chartLevelMode === "L2"
                                ? "bg-purple-600 text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Xem L2
                          </button>
                        )}
                        {currentTest && currentTest.levels_count === 3 && (
                          <button
                            type="button"
                            onClick={() => setChartLevelMode("L3")}
                            className={`px-3 py-1 rounded-lg transition ${
                              chartLevelMode === "L3"
                                ? "bg-amber-600 text-white shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Xem L3
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setChartLevelMode("COMBINED")}
                          className={`px-3 py-1 rounded-lg transition ${
                            chartLevelMode === "COMBINED"
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Xem Phối Hợp
                        </button>
                      </div>

                      <button
                        onClick={() => setHideFailsOnChart(!hideFailsOnChart)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                          hideFailsOnChart
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {hideFailsOnChart
                          ? "✓ Đã ẩn điểm Vi phạm"
                          : "Ẩn điểm Vi phạm"}
                      </button>

                      <button
                        onClick={() => setCompareOldLot(!compareOldLot)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                          compareOldLot
                            ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        So sánh Range gốc
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <span className="text-xs font-extrabold text-slate-500 uppercase mr-1">
                  3. Xét nghiệm:
                </span>
                {configs
                  .filter(
                    (c) =>
                      c.test_type !== "QUALITATIVE" &&
                      c.section === chartSection &&
                      (chartIsoOnlyFilter
                        ? c.standard_label === "ISO"
                        : c.machine_name === chartMachine)
                  )
                  .map((c) => {
                    const last1 = c.history_L1[c.history_L1.length - 1];
                    const last2 = c.history_L2[c.history_L2.length - 1];
                    const last3 = c.history_L3?.[c.history_L3.length - 1];
                    const st =
                      last1?.status === "FAIL" ||
                      last2?.status === "FAIL" ||
                      last3?.status === "FAIL"
                        ? "FAIL"
                        : last1?.status === "WARN" ||
                          last2?.status === "WARN" ||
                          last3?.status === "WARN"
                        ? "WARN"
                        : "PASS";
                    const isSelected = chartTestId === c.test_id;
                    const effectClass =
                      st === "FAIL"
                        ? "police-flash"
                        : st === "WARN"
                        ? "matte-warn"
                        : "crystal-pass";
                    return (
                      <button
                        key={c.test_id}
                        onClick={() => {
                          setChartTestId(c.test_id);
                          setChartMachine(c.machine_name);
                          setSelectedPointInfo(null);
                          if (chartLevelMode === "L3" && c.levels_count < 3) {
                            setChartLevelMode("COMBINED");
                          }
                          if (chartLevelMode === "L2" && c.levels_count < 2) {
                            setChartLevelMode("L1");
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black border-2 transition-all ${effectClass} ${
                          isSelected
                            ? "ring-4 ring-blue-400/60 scale-105"
                            : "opacity-90 hover:opacity-100"
                        }`}
                      >
                        {c.test_name}{" "}
                        {c.standard_label === "ISO" ? "· ISO" : ""}
                      </button>
                    );
                  })}
              </div>

              {(() => {
                const numericConfigs = configs.filter(
                  (c) => c.test_type !== "QUALITATIVE"
                );
                const activeChartTest =
                  numericConfigs.find((c) => c.test_id === chartTestId) ||
                  numericConfigs[0];
                if (!activeChartTest) return null;
                const availableLots = Array.from(
                  new Set([
                    activeChartTest.lot_number,
                    ...activeChartTest.history_L1.map((h) => h.lot_number),
                  ])
                ).filter(Boolean);
                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs mt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setChartFilterMode("DATE_RANGE");
                          setChartLotFilter("ALL");
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold ${
                          chartFilterMode === "DATE_RANGE"
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-slate-300 text-slate-700"
                        }`}
                      >
                        Lọc Theo Ngày
                      </button>
                      <button
                        onClick={() => {
                          setChartFilterMode("BY_LOT");
                          setChartLotFilter(activeChartTest.lot_number);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-bold ${
                          chartFilterMode === "BY_LOT"
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-slate-300 text-slate-700"
                        }`}
                      >
                        Lọc theo Lot
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {chartFilterMode === "BY_LOT" && (
                        <select
                          value={chartLotFilter}
                          onChange={(e) => setChartLotFilter(e.target.value)}
                          className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1 font-mono font-bold text-indigo-800"
                        >
                          <option value="ALL">Tất cả Lot</option>
                          {availableLots.map((lot) => (
                            <option key={lot} value={lot}>
                              {lot}
                            </option>
                          ))}
                        </select>
                      )}
                      <span className="font-bold text-slate-600">Từ:</span>
                      <input
                        type="date"
                        value={chartFromDate}
                        onChange={(e) => setChartFromDate(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold"
                      />
                      <span className="font-bold text-slate-600">Đến:</span>
                      <input
                        type="date"
                        value={chartToDate}
                        onChange={(e) => setChartToDate(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {(() => {
              const numericConfigs = configs.filter(
                (c) => c.test_type !== "QUALITATIVE"
              );
              const selectedChartTest =
                numericConfigs.find((c) => c.test_id === chartTestId) ||
                numericConfigs[0];
              if (!selectedChartTest) return null;
              const isLabRange =
                selectedChartTest.range_source !== "MANUFACTURER";
              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-black text-slate-900">
                        Biểu Đồ Levey-Jennings — {selectedChartTest.test_name} (
                        {selectedChartTest.machine_name})
                      </h2>
                      {selectedChartTest.standard_label === "ISO" && (
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap bg-blue-600 text-white inline-flex items-center justify-center tracking-wider shadow-sm">
                          ISO 15189
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black ${
                          isLabRange ? "neon-purple-range" : "neon-lime-range"
                        }`}
                      >
                        {isLabRange
                          ? `● Range Phòng (${selectedChartTest.range_active_days} ngày)`
                          : "● Range Hãng"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        jumpToAssistantWithFilter({
                          section: selectedChartTest.section,
                          machine: selectedChartTest.machine_name,
                          test_id: selectedChartTest.test_id,
                          viewMode: "QUALITY",
                        })
                      }
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black transition"
                    >
                      Xem Six Sigma & Hồ sơ MU của {selectedChartTest.test_name}{" "}
                      →
                    </button>
                  </div>

                  <Luminous3DLJChart
                    test={selectedChartTest}
                    showL1={
                      chartLevelMode === "COMBINED" || chartLevelMode === "L1"
                    }
                    showL2={
                      (chartLevelMode === "COMBINED" ||
                        chartLevelMode === "L2") &&
                      selectedChartTest.levels_count >= 2
                    }
                    showL3={
                      (chartLevelMode === "COMBINED" ||
                        chartLevelMode === "L3") &&
                      selectedChartTest.levels_count === 3
                    }
                    compareOldLot={compareOldLot}
                    hideResolvedFails={hideFailsOnChart}
                    filterMode={chartFilterMode}
                    lotFilter={chartLotFilter}
                    fromDate={chartFromDate}
                    toDate={chartToDate}
                    onSelectPoint={(levelKey, levelLabel, point) =>
                      setSelectedPointInfo({
                        levelKey,
                        levelLabel,
                        point,
                        testId: selectedChartTest.test_id,
                        testName: selectedChartTest.test_name,
                        unit: selectedChartTest.unit,
                      })
                    }
                  />

                  {selectedPointInfo && (
                    <div
                      className={`p-4 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-4 transition-all ${
                        selectedPointInfo.point.status === "FAIL"
                          ? "bg-rose-50 border-rose-400 text-rose-950"
                          : selectedPointInfo.point.status === "WARN"
                          ? "bg-amber-50 border-amber-400 text-amber-950"
                          : "bg-emerald-50 border-emerald-400 text-emerald-950"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-extrabold uppercase">
                          Chi Tiết Điểm QC · {selectedPointInfo.testName} (
                          {selectedPointInfo.levelLabel}) · Lô:{" "}
                          {selectedPointInfo.point.lot_number}
                          {selectedPointInfo.point.is_rerun && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px]">
                              Điểm kiểm tra lại
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black mt-0.5">
                          Giá trị đo:{" "}
                          <span className="font-mono text-base underline">
                            {selectedPointInfo.point.val}{" "}
                            {selectedPointInfo.unit}
                          </span>{" "}
                          ({selectedPointInfo.point.z >= 0 ? "+" : ""}
                          {selectedPointInfo.point.z}SD) · Ngày{" "}
                          {formatDateVN(selectedPointInfo.point.isoDate)} (
                          {selectedPointInfo.point.operator})
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-extrabold px-3.5 py-2 rounded-xl bg-white/90 border border-current">
                          {selectedPointInfo.point.rule}
                        </div>
                        {hasPermission(currentUser, "VOID_LJ_POINT") && (
                          <button
                            onClick={async () => {
                              const ok = window.confirm(
                                `Xác nhận XÓA điểm QC ngày ${formatDateVN(
                                  selectedPointInfo.point.isoDate
                                )} (${
                                  selectedPointInfo.point.val
                                }) của xét nghiệm "${
                                  selectedPointInfo.testName
                                }"?`
                              );
                              if (!ok) return;
                              const targetPt = selectedPointInfo.point;
                              const targetId = selectedPointInfo.testId;
                              setConfigs((prev) =>
                                prev.map((c) =>
                                  c.test_id === targetId
                                    ? {
                                        ...c,
                                        accumulated_points: Math.max(
                                          0,
                                          c.accumulated_points - 1
                                        ),
                                        history_L1: c.history_L1.filter(
                                          (h) =>
                                            !(
                                              h.isoDate === targetPt.isoDate &&
                                              h.val === targetPt.val &&
                                              Boolean(h.is_rerun) ===
                                                Boolean(targetPt.is_rerun)
                                            )
                                        ),
                                        history_L2: c.history_L2.filter(
                                          (h) =>
                                            !(
                                              h.isoDate === targetPt.isoDate &&
                                              h.val === targetPt.val &&
                                              Boolean(h.is_rerun) ===
                                                Boolean(targetPt.is_rerun)
                                            )
                                        ),
                                        history_L3: (c.history_L3 || []).filter(
                                          (h) =>
                                            !(
                                              h.isoDate === targetPt.isoDate &&
                                              h.val === targetPt.val &&
                                              Boolean(h.is_rerun) ===
                                                Boolean(targetPt.is_rerun)
                                            )
                                        ),
                                      }
                                    : c
                                )
                              );
                              setSelectedPointInfo(null);
                              await rpcCall(
                                apiUrl,
                                "admin_void_point",
                                { test_id: targetId, date: targetPt.isoDate },
                                authToken
                              );
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition"
                          >
                            <Ic.Trash /> Xóa điểm L-J
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 4. TAB DANH MỤC & VẬT TƯ + TAB TRỢ LÝ RANGE & MU                     */}
        {/* ------------------------------------------------------------------- */}
        {(activeTab === "CATALOG_SETUP" || activeTab === "ASSISTANT_ISO") &&
          (canAccessCatalog || canAccessAssistant) && (
            <SetupAndAssistant
              apiUrl={apiUrl}
              authToken={authToken}
              currentUser={currentUser}
              runDate={runDate}
              sections={sections}
              labMachines={labMachines}
              configs={configs}
              setConfigs={setConfigs}
              reagents={reagents}
              setReagents={setReagents}
              users={users}
              initialSubTab={
                activeTab === "ASSISTANT_ISO" ? "ASSISTANT" : "SETUP"
              }
              onSubTabChange={(sub) =>
                setActiveTab(
                  sub === "ASSISTANT" ? "ASSISTANT_ISO" : "CATALOG_SETUP"
                )
              }
            />
          )}

        {/* ------------------------------------------------------------------- */}
        {/* 5. TAB HỒ SƠ & IN ẤN ISO 15189 (L-J, BM.01, BM.09, BM.16)            */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "ISO_REPORTS" && (
          <IsoReports
            apiUrl={apiUrl}
            authToken={authToken}
            currentUser={currentUser}
            runDate={runDate}
            labMachines={labMachines}
            configs={configs}
            setConfigs={setConfigs}
            bm09Logs={bm09Logs}
            setBm09Logs={setBm09Logs}
            reagents={reagents}
          />
        )}

        {/* ------------------------------------------------------------------- */}
        {/* 6. TAB QUẢN LÝ ADMIN (GỒM CẢ CỬA SỔ 2 CỘT CÁC TEST NGOẠI LỆ)         */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === "ACCOUNTS" && canAccessAdminPanel && (
          <AdminPanel
            apiUrl={apiUrl}
            setApiUrl={setApiUrl}
            authToken={authToken}
            users={users}
            setUsers={setUsers}
            sections={sections}
            setSections={setSections}
            labMachines={labMachines}
            setLabMachines={setLabMachines}
            syncFromCloud={syncFromCloud}
            configs={configs}
            setConfigs={setConfigs}
            setReagents={setReagents}
            setBm09Logs={setBm09Logs}
          />
        )}
      </main>

      {/* ===================================================================== */}
      {/* MODAL KHẮC PHỤC SỰ CỐ: KHÓA CỨNG MỨC BỊ LỖI (KHÔNG BẮT CHỌN LẠI MỨC)   */}
      {/* ===================================================================== */}
      {correctiveModal && correctiveModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-400 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 bg-rose-50 border border-rose-200 p-4 rounded-2xl">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white">
                  Hành Động Khắc Phục · BM.09.XN.QTQL.31
                </span>
                <h3 className="text-base font-black text-rose-950 mt-1">
                  Xử Lý Sự Cố Nội Kiểm: {correctiveModal.testName}
                </h3>
                <p className="text-xs font-bold text-rose-700 mt-0.5">
                  Quy tắc cảnh báo / vi phạm: {correctiveModal.rulesText}
                </p>
              </div>
              <button
                onClick={() => setCorrectiveModal(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-black text-slate-800 block mb-1">
                  1. Nguyên nhân:
                </label>
                <input
                  type="text"
                  value={correctiveModal.cause}
                  onChange={(e) =>
                    setCorrectiveModal({
                      ...correctiveModal,
                      cause: e.target.value,
                    })
                  }
                  placeholder="Nhập nguyên nhân gốc rễ..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 rounded-xl px-3.5 py-2 font-bold text-slate-900 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGGESTED_CAUSES.map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() =>
                        setCorrectiveModal((prev) =>
                          prev
                            ? {
                                ...prev,
                                cause: prev.cause ? `${prev.cause}; ${sc}` : sc,
                              }
                            : null
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 border text-[11px] font-semibold"
                    >
                      + {sc}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-black text-slate-800 block mb-1">
                  2. Hành động khắc phục:
                </label>
                <input
                  type="text"
                  value={correctiveModal.action}
                  onChange={(e) =>
                    setCorrectiveModal({
                      ...correctiveModal,
                      action: e.target.value,
                    })
                  }
                  placeholder="Nhập hành động khắc phục đã thực hiện..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 rounded-xl px-3.5 py-2 font-bold text-slate-900 outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGGESTED_ACTIONS.map((sa) => (
                    <button
                      key={sa}
                      type="button"
                      onClick={() =>
                        setCorrectiveModal((prev) =>
                          prev
                            ? {
                                ...prev,
                                action: prev.action
                                  ? `${prev.action}; ${sa}`
                                  : sa,
                              }
                            : null
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 border text-[11px] font-semibold"
                    >
                      + {sa}
                    </button>
                  ))}
                </div>
              </div>

              {/* CHỈ HIỂN THỊ Ô NHẬP CHO ĐÚNG MỨC ĐANG BỊ LỖI (KHÓA CỨNG KHÔNG CẦN CHỌN LẠI) */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
                <div>
                  <div className="font-black text-emerald-950">
                    3. Kết quả kiểm tra lại (Hệ thống đã tự động khóa đúng mức
                    bị lỗi):
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Khi kết quả kiểm tra lại đạt trong ±2SD, điểm mới sẽ tự động
                    hiển thị lên <b>Bảng Dashboard</b> và vẽ lên{" "}
                    <b>Biểu đồ L-J</b>.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {correctiveModal.violatedLevels.map((lv) => {
                    const cfg = configs.find(
                      (c) => c.test_id === correctiveModal.testId
                    );
                    const meanRef =
                      lv === "L1"
                        ? cfg?.mean_L1
                        : lv === "L2"
                        ? cfg?.mean_L2
                        : cfg?.mean_L3;
                    const sdRef =
                      lv === "L1"
                        ? cfg?.sd_L1
                        : lv === "L2"
                        ? cfg?.sd_L2
                        : cfg?.sd_L3;
                    const lvName =
                      lv === "L1"
                        ? "Mức 1 (L1)"
                        : lv === "L2"
                        ? "Mức 2 (L2)"
                        : "Mức 3 (L3)";
                    return (
                      <div
                        key={lv}
                        className="bg-white border-2 border-emerald-400 rounded-xl p-2.5 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[10.5px]">
                            🔒 {lvName}
                          </span>
                          {meanRef !== undefined && (
                            <span className="font-mono text-[10px] text-slate-500">
                              {meanRef} ± {sdRef}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={correctiveModal.reRunInputs[lv]}
                          onChange={(e) =>
                            setCorrectiveModal({
                              ...correctiveModal,
                              reRunInputs: {
                                ...correctiveModal.reRunInputs,
                                [lv]: e.target.value,
                              },
                            })
                          }
                          placeholder={`KQ kiểm tra lại ${lv}...`}
                          className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 rounded-lg px-2.5 py-1.5 font-mono font-black text-sm text-right text-slate-900 outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {hasPermission(currentUser, "OVERRIDE_RESOLUTION") && (
                <div className="bg-indigo-50/90 border-2 border-indigo-300 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-black uppercase text-indigo-950">
                    ★ Đặc Quyền Quản Trị: Can Thiệp Trạng Thái Xử Lý & Kết Quả
                    Kiểm Tra Lại
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-indigo-900 block mb-1">
                        Đánh giá:
                      </label>
                      <select
                        value={correctiveModal.adminStatusOverride}
                        onChange={(e) =>
                          setCorrectiveModal({
                            ...correctiveModal,
                            adminStatusOverride: e.target.value as
                              | "PASS"
                              | "WARN"
                              | "FAIL",
                          })
                        }
                        className="w-full bg-white border border-indigo-300 rounded-xl px-2.5 py-1.5 font-black text-indigo-950"
                      >
                        <option value="PASS">Đạt (PASS)</option>
                        <option value="WARN">Cảnh báo (WARN)</option>
                        <option value="FAIL">Không đạt (KĐ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-indigo-900 block mb-1">
                        Trạng thái xử lý:
                      </label>
                      <select
                        value={
                          correctiveModal.adminResolvedOverride
                            ? "TRUE"
                            : "FALSE"
                        }
                        onChange={(e) =>
                          setCorrectiveModal({
                            ...correctiveModal,
                            adminResolvedOverride: e.target.value === "TRUE",
                          })
                        }
                        className="w-full bg-white border border-indigo-300 rounded-xl px-2.5 py-1.5 font-black text-indigo-950"
                      >
                        <option value="TRUE">Đã khắc phục</option>
                        <option value="FALSE">Đang chờ xử lý</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-indigo-900 block mb-1">
                        Kết quả kiểm tra lại:
                      </label>
                      <input
                        type="text"
                        value={correctiveModal.postFixResultText}
                        onChange={(e) =>
                          setCorrectiveModal({
                            ...correctiveModal,
                            postFixResultText: e.target.value,
                          })
                        }
                        placeholder="VD: Mức 1: 5.52 - Đạt"
                        className="w-full bg-white border border-indigo-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                onClick={() => setCorrectiveModal(null)}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Đóng
              </button>
              <button
                onClick={handleSaveCorrectiveAction}
                className="px-6 py-2.5 rounded-xl font-black text-xs uppercase bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:brightness-105"
              >
                Lưu Vào Dashboard, Biểu Đồ L-J & BM.09
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO HÓA CHẤT TỰ PHA CHẠM NGƯỠNG ≥ 75% */}
      {reagentExpiryModal && reagentExpiryModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-400 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <span className="text-amber-600 mt-0.5">
                <Ic.Warn />
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-900 uppercase">
                  Cảnh Báo Hóa Chất Tự Pha Đã Dùng ≥ 75% Số Lượng
                </h3>
                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                  Bạn đã sử dụng <b>{reagentExpiryModal.reagent.usage_count}</b>{" "}
                  / <b>{reagentExpiryModal.reagent.quantity_prepared}</b> lần
                  pha (đạt ngưỡng cảnh báo ≥ 75% là{" "}
                  <b>
                    {getReagentThreshold75(
                      reagentExpiryModal.reagent.quantity_prepared
                    )}
                  </b>{" "}
                  lần). Hãy xác nhận bạn vẫn còn sử dụng lô pha ngày{" "}
                  <b>{formatDateVN(reagentExpiryModal.reagent.prep_date)}</b>.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setReagentExpiryModal(null);
                  setActiveTab("CATALOG_SETUP");
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800"
              >
                Khai báo đợt pha mới
              </button>
              <button
                onClick={() => {
                  const r = reagentExpiryModal.reagent;
                  setSelControl(r.control_name);
                  setReagentExpiryModal(null);
                  setStep("SELECT_LEVEL");
                }}
                className="px-5 py-2.5 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md"
              >
                Xác nhận dùng tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẬP NHẬT LẠI KẾT QUẢ QC ĐÃ NHẬP TRONG NGÀY */}
      {warningModal && warningModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-amber-400 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <span className="text-amber-600 mt-0.5">
                <Ic.Warn />
              </span>
              <div>
                <h3 className="text-sm font-black text-amber-900 uppercase">
                  Bạn đã nhập kết quả rồi, điều chỉnh gì?
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Đang mở {warningModal.control} ({warningModal.level}) — Thiết
                  bị {warningModal.machine} · Ngày {formatDateVN(runDate)}.
                </p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400">
                <Ic.Search />
              </span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Gõ tên xét nghiệm cần điều chỉnh..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-900 outline-none"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {getTestsForControl(warningModal.machine, warningModal.control)
                .filter((t) =>
                  t.test_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((t) => {
                  const oldVal =
                    savedValues[t.test_id]?.[warningModal.level] || "Chưa có";
                  const draftVal = editDrafts[t.test_id] ?? "";
                  return (
                    <div
                      key={t.test_id}
                      className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl"
                    >
                      <span className="font-black text-slate-900 text-xs">
                        {t.test_name}{" "}
                        <span className="text-slate-500 font-normal">
                          ({t.unit})
                        </span>
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg font-semibold">
                          Cũ: <b className="font-mono">{oldVal}</b>
                        </span>
                        <input
                          type="text"
                          value={draftVal}
                          onChange={(e) =>
                            setEditDrafts((prev) => ({
                              ...prev,
                              [t.test_id]: e.target.value,
                            }))
                          }
                          placeholder="Giá trị mới..."
                          className="w-24 bg-white border-2 border-amber-400 text-slate-900 font-mono font-black text-xs text-right px-2.5 py-1.5 rounded-lg outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setWarningModal(null)}
                className="px-5 py-2 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Thoát
              </button>
              <button
                onClick={async () => {
                  const { level } = warningModal;
                  setSavedValues((prev) => {
                    const next = { ...prev };
                    Object.entries(editDrafts).forEach(([testId, newVal]) => {
                      const trimmed = newVal.trim();
                      if (trimmed !== "") {
                        next[testId] = {
                          ...(next[testId] || {}),
                          [level]: trimmed,
                        };
                        rpcCall(
                          apiUrl,
                          "update_qc_values",
                          {
                            test_id: testId,
                            run_date: runDate,
                            [`val_${level}`]: trimmed,
                          },
                          authToken
                        );
                      }
                    });
                    return next;
                  });
                  setWarningModal(null);
                }}
                className="px-6 py-2 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md"
              >
                Lưu cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
