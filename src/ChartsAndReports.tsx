import React, { useState } from "react";
import {
  TestConfig,
  HistoryPoint,
  BM09LogEntry,
  ReagentLotBM16,
  UserAccount,
  formatDateVN,
  formatShortDM,
  rpcCall,
  computeMuAndSigma,
  getUsageCountForMonthDay,
  hasPermission,
} from "./types";

// ============================================================================
// FILE 3: src/ChartsAndReports.tsx (V5.6.0 FULL ENTERPRISE EDITION - KHÔNG CẮT GIẢM)
// 1. Đồ thị L-J: Màn hình hiện đủ 4 chú giải & viền kép; Bản in hiện 3 chú giải & điểm chuẩn
// 2. Bản in L-J 1 trang A4 Ngang (scale 0.86) + Phiếu ĐKBĐĐ đa mức (BM.01.XN.QTQL.30)
// 3. Sổ Nội kiểm (BM.09) & Sổ Pha chế Hóa chất (BM.16 - Chỉ lọc hóa chất pha tay)
// 4. Tự động sắp xếp chuỗi thời gian tăng dần khi có điểm nhập bù ngày cũ (HM 12)
// ✦ An intellectual product by Handsome Long ✦
// ============================================================================

const Ic = {
  Print: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Check: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Filter: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
};

/**
 * HM 12: Sắp xếp mảng lịch sử L-J theo đúng thứ tự thời gian (isoDate + time + is_rerun)
 * Đảm bảo khi nhập bù kết quả ngày cũ, trục hoành biểu đồ L-J và bảng in không bị đảo lộn
 */
function sortHistoryChronologically(
  arr: HistoryPoint[] | undefined
): HistoryPoint[] {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => {
    const da = String(a.isoDate || "");
    const db = String(b.isoDate || "");
    if (da !== db) return da < db ? -1 : 1;
    const ta = String(a.time || "").replace("h", ":");
    const tb = String(b.time || "").replace("h", ":");
    if (ta !== tb) return ta < tb ? -1 : 1;
    return (a.is_rerun ? 1 : 0) - (b.is_rerun ? 1 : 0);
  });
}

// ============================================================================
// COMPONENT 1: BIỂU ĐỒ LEVEY-JENNINGS 3D (TÁCH BIỆT UI MÀN HÌNH & BẢN IN)
// ============================================================================
export interface Luminous3DLJChartProps {
  test: TestConfig;
  showL1?: boolean;
  showL2?: boolean;
  showL3?: boolean;
  compareOldLot?: boolean;
  hideResolvedFails?: boolean;
  filterMode: "DATE_RANGE" | "BY_LOT";
  lotFilter: string;
  fromDate: string;
  toDate: string;
  onSelectPoint?: (
    levelKey: "L1" | "L2" | "L3",
    levelLabel: string,
    pt: HistoryPoint
  ) => void;
  isPrintView?: boolean;
}

export function Luminous3DLJChart({
  test,
  showL1 = true,
  showL2 = false,
  showL3 = false,
  compareOldLot = false,
  hideResolvedFails = false,
  filterMode,
  lotFilter,
  fromDate,
  toDate,
  onSelectPoint,
  isPrintView = false,
}: Luminous3DLJChartProps) {
  const filterHistory = (arr: HistoryPoint[] | undefined) => {
    const sorted = sortHistoryChronologically(arr);
    let filtered = sorted.filter((p) => {
      if (
        filterMode === "BY_LOT" &&
        lotFilter !== "ALL" &&
        p.lot_number !== lotFilter
      ) {
        return false;
      }
      if (fromDate && p.isoDate < fromDate) return false;
      if (toDate && p.isoDate > toDate) return false;
      if (hideResolvedFails && p.status === "FAIL") return false;
      return true;
    });
    if (filterMode === "BY_LOT" && !fromDate && !toDate) {
      filtered = filtered.slice(-32);
    }
    return filtered;
  };

  const rawPts1 = filterHistory(test.history_L1);
  const rawPts2 = filterHistory(test.history_L2);
  const rawPts3 = filterHistory(test.history_L3);

  const maxLimit = isPrintView ? 32 : 35;
  const isOverLimit =
    rawPts1.length > maxLimit ||
    rawPts2.length > maxLimit ||
    rawPts3.length > maxLimit;

  const pts1 = rawPts1.slice(-maxLimit);
  const pts2 = rawPts2.slice(-maxLimit);
  const pts3 = rawPts3.slice(-maxLimit);

  const basePts =
    showL1 && pts1.length > 0
      ? pts1
      : showL2 && pts2.length > 0
      ? pts2
      : showL3 && pts3.length > 0
      ? pts3
      : pts1.length >= pts2.length && pts1.length >= pts3.length
      ? pts1
      : pts2.length >= pts3.length
      ? pts2
      : pts3;

  const uniqueMonths = Array.from(
    new Set(basePts.map((p) => p.isoDate.slice(0, 7)))
  );
  const isMultiMonth = uniqueMonths.length > 1;
  const firstMonthKey = uniqueMonths[0] || "";

  // Bóp chiều cao H = 175 khi in để 100% nằm gọn trên 1 trang A4 Landscape
  const W = isPrintView ? 1120 : 1000;
  const H = isPrintView ? 175 : 375;
  const L = 66;
  const R = 28;
  const T = isPrintView ? 16 : 26;
  const B = isPrintView ? 24 : 44;
  const pw = W - L - R;
  const ph = H - T - B;
  const n = Math.max(basePts.length, 1);

  const xOf = (i: number) => L + (i / Math.max(n - 1, 1)) * pw;
  const yOf = (z: number) => {
    const clamped = Math.max(-3.85, Math.min(3.85, z));
    return T + ((3.85 - clamped) / 7.7) * ph;
  };

  const buildPath = (pts: HistoryPoint[]) =>
    pts
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.z).toFixed(1)}`
      )
      .join(" ");

  const path1 = buildPath(pts1);
  const path2 = buildPath(pts2);
  const path3 = buildPath(pts3);

  const prevLotArch =
    test.lot_history && test.lot_history.length > 0
      ? test.lot_history[0]
      : null;
  const refMean = showL1 ? test.mean_L1 : showL2 ? test.mean_L2 : test.mean_L3;
  const refSd = showL1 ? test.sd_L1 : showL2 ? test.sd_L2 : test.sd_L3;
  const oldRefMean = prevLotArch
    ? showL1
      ? prevLotArch.mean_L1
      : showL2
      ? prevLotArch.mean_L2
      : prevLotArch.mean_L3
    : showL1
    ? test.mfg_mean_L1
    : showL2
    ? test.mfg_mean_L2
    : test.mfg_mean_L3;
  const oldRefSd = prevLotArch
    ? showL1
      ? prevLotArch.sd_L1
      : showL2
      ? prevLotArch.sd_L2
      : prevLotArch.sd_L3
    : showL1
    ? test.mfg_sd_L1
    : showL2
    ? test.mfg_sd_L2
    : test.mfg_sd_L3;
  const oldLotLabel = prevLotArch ? prevLotArch.lot_number : "Range Hãng SX";

  const oldMeanZ = refSd > 0 ? (oldRefMean - refMean) / refSd : 0;
  const oldPlus2Z =
    refSd > 0 ? (oldRefMean + 2 * oldRefSd - refMean) / refSd : 2;
  const oldMinus2Z =
    refSd > 0 ? (oldRefMean - 2 * oldRefSd - refMean) / refSd : -2;

  const needRotateX = basePts.length > 15;

  return (
    <div className={isPrintView ? "w-full" : "space-y-2"}>
      {isOverLimit && !isPrintView && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center justify-between">
          <span>
            ⚠️ Khoảng thời gian chọn có hơn {maxLimit} điểm đo. Hệ thống hiển
            thị {maxLimit} điểm gần nhất để đồ thị L-J sắc nét và không chồng
            lấp.
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full h-auto select-none bg-white ${
          isPrintView
            ? "rounded-xl border border-indigo-200"
            : "rounded-2xl border border-slate-300 shadow-inner"
        }`}
      >
        <defs>
          <filter id="drop3D" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow
              dx="0"
              dy={isPrintView ? "1" : "2"}
              stdDeviation={isPrintView ? "1" : "1.6"}
              floodColor="#0f172a"
              floodOpacity={isPrintView ? "0.22" : "0.32"}
            />
          </filter>
          <linearGradient id="zonePass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ecfdf5" />
            <stop offset="50%" stopColor="#d1fae5" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ecfdf5" />
          </linearGradient>
        </defs>

        {/* DẢI MÀU NỀN CẢNH BÁO SD */}
        <rect x={L} y={T} width={pw} height={yOf(2) - T} fill="#fff1f2" />
        <rect
          x={L}
          y={yOf(2)}
          width={pw}
          height={yOf(1) - yOf(2)}
          fill="#fffbeb"
        />
        <rect
          x={L}
          y={yOf(1)}
          width={pw}
          height={yOf(-1) - yOf(1)}
          fill="url(#zonePass)"
        />
        <rect
          x={L}
          y={yOf(-1)}
          width={pw}
          height={yOf(-2) - yOf(-1)}
          fill="#fffbeb"
        />
        <rect
          x={L}
          y={yOf(-2)}
          width={pw}
          height={T + ph - yOf(-2)}
          fill="#fff1f2"
        />

        {/* KHUNG VIỀN ĐỒ THỊ */}
        <rect
          x={L}
          y={T}
          width={pw}
          height={ph}
          fill="none"
          stroke={isPrintView ? "#1e3a8a" : "#64748b"}
          strokeWidth={isPrintView ? "1.4" : "1.5"}
        />

        {/* CÁC ĐƯỜNG CHUẨN SD (-3SD -> +3SD) */}
        {[-3, -2, -1, 0, 1, 2, 3].map((sd) => {
          const lineStroke =
            sd === 0
              ? "#0284c7"
              : Math.abs(sd) === 3
              ? "#e11d48"
              : Math.abs(sd) === 2
              ? "#d97706"
              : "#64748b";
          const textFill =
            sd === 0
              ? "#0369a1"
              : Math.abs(sd) === 3
              ? "#be123c"
              : Math.abs(sd) === 2
              ? "#b45309"
              : "#475569";
          return (
            <g key={sd}>
              <line
                x1={L}
                y1={yOf(sd)}
                x2={L + pw}
                y2={yOf(sd)}
                stroke={lineStroke}
                strokeWidth={sd === 0 ? 2.1 : Math.abs(sd) >= 2 ? 1.2 : 0.9}
                strokeDasharray={
                  sd === 0 ? undefined : Math.abs(sd) === 3 ? "5 3" : "4 3"
                }
              />
              <text
                x={L - 8}
                y={yOf(sd) + 4}
                textAnchor="end"
                fontSize={isPrintView ? "10.5" : "11"}
                fontWeight="800"
                fill={textFill}
                fontFamily="monospace"
              >
                {sd === 0 ? "MEAN" : `${sd > 0 ? "+" : ""}${sd}SD`}
              </text>
            </g>
          );
        })}

        {/* ĐƯỜNG SO SÁNH LOT CŨ / RANGE HÃNG (NẾU BẬT) */}
        {compareOldLot && (
          <g>
            <line
              x1={L}
              y1={yOf(oldMeanZ)}
              x2={L + pw}
              y2={yOf(oldMeanZ)}
              stroke="#ea580c"
              strokeWidth="2.2"
            />
            <line
              x1={L}
              y1={yOf(oldPlus2Z)}
              x2={L + pw}
              y2={yOf(oldPlus2Z)}
              stroke="#f97316"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <line
              x1={L}
              y1={yOf(oldMinus2Z)}
              x2={L + pw}
              y2={yOf(oldMinus2Z)}
              stroke="#f97316"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <rect
              x={L + pw - 235}
              y={Math.max(T + 2, yOf(oldMeanZ) - 18)}
              width="228"
              height="15"
              rx="4"
              fill="#fff7ed"
              stroke="#fdba74"
            />
            <text
              x={L + pw - 121}
              y={Math.max(T + 12, yOf(oldMeanZ) - 7)}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="800"
              fill="#c2410c"
            >
              So sánh ({oldLotLabel}): {oldRefMean} ± {oldRefSd}
            </text>
          </g>
        )}

        {/* TRỤC X THÔNG MINH (Ở BẢN IN SẼ HIỂN THỊ NHƯ ĐIỂM BÌNH THƯỜNG, KHÔNG DẤU *) */}
        {basePts.map((p, i) => {
          const monthKey = p.isoDate.slice(0, 7);
          const prevMonthKey =
            i > 0 ? basePts[i - 1].isoDate.slice(0, 7) : monthKey;
          const isMonthTransition = i > 0 && monthKey !== prevMonthKey;
          const dayOnly = p.isoDate.slice(8, 10);
          const labelX = !isPrintView && p.is_rerun ? `${dayOnly}*` : dayOnly;
          const color =
            !isPrintView && p.is_rerun
              ? "#047857"
              : !isMultiMonth
              ? "#0f172a"
              : monthKey === firstMonthKey
              ? "#4338ca"
              : "#c2410c";

          const cx = xOf(i);
          const cy = H - (isPrintView ? 6 : 12);

          return (
            <g key={`x-${i}`}>
              {isMonthTransition && (
                <g>
                  <line
                    x1={cx - pw / Math.max(n - 1, 1) / 2}
                    y1={T}
                    x2={cx - pw / Math.max(n - 1, 1) / 2}
                    y2={T + ph}
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                  <rect
                    x={cx - 28}
                    y={T + 3}
                    width="56"
                    height="12"
                    rx="3"
                    fill="#fef3c7"
                    stroke="#f59e0b"
                    strokeWidth="1"
                  />
                  <text
                    x={cx}
                    y={T + 11.5}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="900"
                    fill="#b45309"
                  >
                    Tháng {monthKey.slice(5, 7)}
                  </text>
                </g>
              )}

              {i === 0 && isMultiMonth && (
                <g>
                  <rect
                    x={L + 6}
                    y={T + 3}
                    width="56"
                    height="12"
                    rx="3"
                    fill="#e0e7ff"
                    stroke="#6366f1"
                    strokeWidth="1"
                  />
                  <text
                    x={L + 34}
                    y={T + 11.5}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="900"
                    fill="#3730a3"
                  >
                    Tháng {firstMonthKey.slice(5, 7)}
                  </text>
                </g>
              )}

              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                fontSize={isPrintView ? "9.5" : "10"}
                fontWeight="800"
                fill={color}
                fontFamily="monospace"
                transform={
                  needRotateX && !isPrintView
                    ? `rotate(-35, ${cx}, ${cy})`
                    : undefined
                }
              >
                {labelX}
              </text>
            </g>
          );
        })}

        {/* ĐƯỜNG BIỂU DIỄN L1, L2, L3 */}
        {showL1 && pts1.length > 1 && (
          <path
            d={path1}
            fill="none"
            stroke="#0284c7"
            strokeWidth={isPrintView ? "2.2" : "3.0"}
            filter="url(#drop3D)"
          />
        )}
        {showL2 && pts2.length > 1 && (
          <path
            d={path2}
            fill="none"
            stroke="#9333ea"
            strokeDasharray="6 3"
            strokeWidth={isPrintView ? "2.0" : "2.6"}
            filter="url(#drop3D)"
          />
        )}
        {showL3 && pts3.length > 1 && (
          <path
            d={path3}
            fill="none"
            stroke="#ea580c"
            strokeDasharray="3 2"
            strokeWidth={isPrintView ? "2.0" : "2.6"}
            filter="url(#drop3D)"
          />
        )}

        {/* ĐIỂM ĐO MỨC 1 (HÌNH TRÒN - CHỈ HIỆN VIỀN KÉP TRÊN MÀN HÌNH, BẢN IN NHƯ ĐIỂM THƯỜNG) */}
        {showL1 &&
          pts1.map((p, i) => {
            const fill =
              p.status === "FAIL"
                ? "#ef4444"
                : p.status === "WARN"
                ? "#f59e0b"
                : !isPrintView && p.is_rerun
                ? "#059669"
                : "#10b981";
            const radius = isPrintView
              ? p.status === "FAIL"
                ? 5.0
                : 4.0
              : p.status === "FAIL"
              ? 6.8
              : 5.4;
            return (
              <g
                key={`p1-${i}`}
                className={!isPrintView ? "cursor-pointer" : ""}
                onClick={() =>
                  !isPrintView && onSelectPoint?.("L1", "Mức 1", p)
                }
              >
                {!isPrintView && p.is_rerun && (
                  <circle
                    cx={xOf(i)}
                    cy={yOf(p.z)}
                    r={radius + 2.8}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="1.6"
                    strokeDasharray="2 1"
                  />
                )}
                <circle
                  cx={xOf(i)}
                  cy={yOf(p.z)}
                  r={radius}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  filter="url(#drop3D)"
                />
              </g>
            );
          })}

        {/* ĐIỂM ĐO MỨC 2 (HÌNH VUÔNG) */}
        {showL2 &&
          pts2.map((p, i) => {
            const fill =
              p.status === "FAIL"
                ? "#ef4444"
                : p.status === "WARN"
                ? "#f59e0b"
                : "#8b5cf6";
            const size = isPrintView
              ? p.status === "FAIL"
                ? 9.5
                : 8.0
              : p.status === "FAIL"
              ? 12.5
              : 10.0;
            return (
              <g
                key={`p2-${i}`}
                className={!isPrintView ? "cursor-pointer" : ""}
                onClick={() =>
                  !isPrintView && onSelectPoint?.("L2", "Mức 2", p)
                }
              >
                {!isPrintView && p.is_rerun && (
                  <circle
                    cx={xOf(i)}
                    cy={yOf(p.z)}
                    r={size / 2 + 3.2}
                    fill="none"
                    stroke="#9333ea"
                    strokeWidth="1.5"
                    strokeDasharray="2 1"
                  />
                )}
                <rect
                  x={xOf(i) - size / 2}
                  y={yOf(p.z) - size / 2}
                  width={size}
                  height={size}
                  rx="1.5"
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  filter="url(#drop3D)"
                />
              </g>
            );
          })}

        {/* ĐIỂM ĐO MỨC 3 (HÌNH THOI) */}
        {showL3 &&
          pts3.map((p, i) => {
            const fill =
              p.status === "FAIL"
                ? "#ef4444"
                : p.status === "WARN"
                ? "#f59e0b"
                : "#0d9488";
            const d = isPrintView
              ? p.status === "FAIL"
                ? 6.2
                : 5.2
              : p.status === "FAIL"
              ? 8.5
              : 7.0;
            const cx = xOf(i);
            const cy = yOf(p.z);
            return (
              <g
                key={`p3-${i}`}
                className={!isPrintView ? "cursor-pointer" : ""}
                onClick={() =>
                  !isPrintView && onSelectPoint?.("L3", "Mức 3", p)
                }
              >
                {!isPrintView && p.is_rerun && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={d + 2.8}
                    fill="none"
                    stroke="#ea580c"
                    strokeWidth="1.5"
                    strokeDasharray="2 1"
                  />
                )}
                <polygon
                  points={`${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${
                    cx - d
                  },${cy}`}
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  filter="url(#drop3D)"
                />
              </g>
            );
          })}
      </svg>

      {/* CHÚ GIẢI MÀU SẮC (Ở CHẾ ĐỘ IN CHỈ HIỆN 3 CHÚ THÍCH ĐẠT, CẢNH BÁO, VI PHẠM) */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-2 ${
          isPrintView ? "text-[10px] pt-0" : "text-[11px] pt-1"
        } font-bold text-slate-600`}
      >
        <div className="flex flex-wrap items-center gap-4">
          {showL1 && (
            <span className="inline-flex items-center gap-1.5 text-sky-800">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-sky-700 inline-block" />
              <span>Mức 1 (L1 - Đường liền Xanh)</span>
            </span>
          )}
          {showL2 && (
            <span className="inline-flex items-center gap-1.5 text-purple-800">
              <span className="w-3 h-3 rounded-sm bg-violet-500 border border-purple-800 inline-block" />
              <span>Mức 2 (L2 - Nét đứt Tím)</span>
            </span>
          )}
          {showL3 && (
            <span className="inline-flex items-center gap-1.5 text-orange-800">
              <span className="w-2.5 h-2.5 rotate-45 bg-teal-600 border border-orange-700 inline-block" />
              <span>Mức 3 (L3 - Nét chấm gạch Cam)</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
            Đạt (&lt;2SD)
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />{" "}
            Cảnh báo (2SD–3SD)
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />{" "}
            Vi phạm (≥3SD / Westgard)
          </span>
          {!isPrintView && (
            <span className="inline-flex items-center gap-1 text-sky-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-sky-600 inline-block" />{" "}
              Điểm kiểm tra lại (*)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENT 2: MÀN HÌNH HỒ SƠ & IN ẤN ISO 15189 (L-J, BM.01 MU, BM.09, BM.16)
// ============================================================================
interface IsoReportsProps {
  apiUrl: string;
  authToken: string;
  currentUser: UserAccount;
  runDate: string;
  labMachines: { section: string; machine: string }[];
  configs: TestConfig[];
  setConfigs: React.Dispatch<React.SetStateAction<TestConfig[]>>;
  bm09Logs: BM09LogEntry[];
  setBm09Logs: React.Dispatch<React.SetStateAction<BM09LogEntry[]>>;
  reagents: ReagentLotBM16[];
}

export default function IsoReports({
  apiUrl,
  authToken,
  currentUser,
  runDate,
  labMachines,
  configs,
  bm09Logs,
  setBm09Logs,
  reagents,
}: IsoReportsProps) {
  const [reportSubTab, setReportSubTab] = useState<
    "LJ_PRINT" | "BM01_MU" | "BM09" | "BM16"
  >("LJ_PRINT");

  // --- STATE BỘ LỌC IN BIỂU ĐỒ L-J MÀU & PHIẾU BM.01 MU ---
  const sectionsList = Array.from(new Set(configs.map((c) => c.section)));
  const [ljPrintSection, setLjPrintSection] = useState<string>(
    sectionsList[0] || "Sinh Hóa"
  );
  const [ljPrintMachine, setLjPrintMachine] = useState<string>("Tất cả");
  const [ljPrintTestId, setLjPrintTestId] = useState<string>("");
  const [ljChartToggle, setLjChartToggle] = useState<
    "L1" | "L2" | "L3" | "COMBINED"
  >("COMBINED");
  const [ljTableLevel, setLjTableLevel] = useState<"L1" | "L2" | "L3">("L1");
  const [ljPrintFrom, setLjPrintFrom] = useState<string>("2026-09-26");
  const [ljPrintTo, setLjPrintTo] = useState<string>(runDate);
  const [hideResolvedFailsInPrint, setHideResolvedFailsInPrint] =
    useState<boolean>(true);

  // --- STATE THÔNG TIN HÀNH CHÍNH TRÊN PHIẾU BM.01.XN.QTQL.30 ---
  const [bm01SerialNo, setBm01SerialNo] = useState<string>("24835");
  const [bm01MethodName, setBm01MethodName] = useState<string>(
    "Đo quang hấp thụ / Đo trở kháng"
  );
  const [bm01Approver, setBm01Approver] = useState<string>(
    "CKI.XN. Lê Hữu Thịnh"
  );
  const [bm01Creator, setBm01Creator] = useState<string>(currentUser.name);
  const [bm01Note, setBm01Note] = useState<string>("");

  // --- STATE BỘ LỌC BM.09 & BM.16 ---
  const [bm09MachineFilter, setBm09MachineFilter] = useState<string>("Tất cả");
  const [bm09TestFilter, setBm09TestFilter] = useState<string>("Tất cả");
  const [bm09MonthFilter, setBm09MonthFilter] = useState<string>(
    runDate.slice(0, 7)
  );

  const [bm16SectionFilter, setBm16SectionFilter] = useState<string>("Tất cả");
  const [bm16ControlFilter, setBm16ControlFilter] = useState<string>("Tất cả");
  const [bm16MonthFilter, setBm16MonthFilter] = useState<string>(
    runDate.slice(0, 7)
  );

  const canSignChecker =
    currentUser.role === "ADMIN" ||
    currentUser.role === "QLCM" ||
    hasPermission(currentUser, "SIGN_BM09_CHECKER");

  const ljConfigs = configs.filter(
    (c) =>
      c.section === ljPrintSection &&
      (ljPrintMachine === "Tất cả" || c.machine_name === ljPrintMachine) &&
      c.test_type !== "QUALITATIVE"
  );
  const activeLjTest =
    ljConfigs.find((c) => c.test_id === ljPrintTestId) || ljConfigs[0];

  const muResL1 = activeLjTest ? computeMuAndSigma(activeLjTest, "L1") : null;
  const muResL2 =
    activeLjTest && activeLjTest.levels_count >= 2
      ? computeMuAndSigma(activeLjTest, "L2")
      : null;
  const muResL3 =
    activeLjTest && activeLjTest.levels_count === 3
      ? computeMuAndSigma(activeLjTest, "L3")
      : null;

  // HM 12: Lấy tối đa 32 điểm đã sắp xếp đúng thứ tự thời gian để chia đều thành 2 cột
  const getPrintTablePoints = (): HistoryPoint[] => {
    if (!activeLjTest) return [];
    const effectiveLevel =
      ljChartToggle === "COMBINED"
        ? ljTableLevel
        : (ljChartToggle as "L1" | "L2" | "L3");
    const rawArr =
      effectiveLevel === "L1"
        ? activeLjTest.history_L1
        : effectiveLevel === "L2"
        ? activeLjTest.history_L2
        : activeLjTest.history_L3 || [];
    return sortHistoryChronologically(rawArr)
      .filter((p) => {
        if (p.isoDate < ljPrintFrom || p.isoDate > ljPrintTo) return false;
        if (hideResolvedFailsInPrint && p.status === "FAIL") return false;
        return true;
      })
      .slice(-32);
  };

  const ljTableData = getPrintTablePoints();
  const colLeftData = ljTableData.slice(0, 16);
  const colRightData = ljTableData.slice(16, 32);

  const bm09AvailableTests = Array.from(
    new Set(
      bm09Logs
        .filter(
          (l) =>
            bm09MachineFilter === "Tất cả" ||
            l.machine_name === bm09MachineFilter
        )
        .map((l) => l.test_name)
        .concat(
          configs
            .filter(
              (c) =>
                bm09MachineFilter === "Tất cả" ||
                c.machine_name === bm09MachineFilter
            )
            .map((c) => c.test_name)
        )
    )
  ).filter(Boolean);

  // BM.16 CHỈ LỌC CÁC HÓA CHẤT PHA TAY (is_manual_prep === true)
  const manualPrepReagentsOnly = reagents.filter((r) => r.is_manual_prep);
  const bm16AvailableControls = Array.from(
    new Set(
      manualPrepReagentsOnly
        .filter(
          (r) =>
            bm16SectionFilter === "Tất cả" ||
            r.section_name === bm16SectionFilter
        )
        .map((r) => r.control_name)
    )
  ).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* CSS IN ẤN ĐỈNH CAO: AUTO PAGINATION, CHỐNG TRÀN L-J */}
      <style>{`
        @media print {
          @page {
            size: ${
              reportSubTab === "BM01_MU" ? "A4 portrait" : "A4 landscape"
            };
            margin: 6mm;
          }
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          
          /* L-J KHÓA CỨNG 1 TRANG (SCALE 0.86) */
          .lj-print-container {
            transform: scale(0.86);
            transform-origin: top center;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            height: 100% !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* BM.01, BM.09 & BM.16 TỰ ĐỘNG LẶP TIÊU ĐỀ & FOOTER Ở MỌI TRANG */
          .auto-page-table {
            width: 100%;
            border-collapse: collapse;
          }
          .auto-page-table thead { display: table-header-group; }
          .auto-page-table tfoot { display: table-footer-group; }
          .auto-page-table tr { page-break-inside: avoid; }
          
          body { counter-reset: print-page; }
          .page-number::after {
            counter-increment: print-page;
            content: counter(print-page);
          }
        }
      `}</style>

      {/* THANH CÔNG CỤ LỌC & CHỌN BIỂU MẪU IN (ẨN KHI IN) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReportSubTab("LJ_PRINT")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition ${
                reportSubTab === "LJ_PRINT"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              1. In Màu L-J (1 Trang A4 Ngang)
            </button>
            <button
              type="button"
              onClick={() => setReportSubTab("BM01_MU")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition ${
                reportSubTab === "BM01_MU"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              2. Phiếu ĐKBĐĐ Đa Mức (BM.01.XN.QTQL.30)
            </button>
            <button
              type="button"
              onClick={() => setReportSubTab("BM09")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition ${
                reportSubTab === "BM09"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              3. Sổ Nội Kiểm Hàng Ngày (BM.09)
            </button>
            <button
              type="button"
              onClick={() => setReportSubTab("BM16")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition ${
                reportSubTab === "BM16"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              4. Sổ Hóa Chất Tự Pha Chế (BM.16)
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 hover:brightness-105 text-white font-black text-xs shadow-md transition"
          >
            <Ic.Print />
            <span>IN BIỂU MẪU (EPSON L1110)</span>
          </button>
        </div>

        {/* BỘ LỌC TÙY THEO BIỂU MẪU */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          {(reportSubTab === "LJ_PRINT" || reportSubTab === "BM01_MU") && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-slate-600">Lab:</span>
                <select
                  value={ljPrintSection}
                  onChange={(e) => {
                    setLjPrintSection(e.target.value);
                    setLjPrintMachine("Tất cả");
                    setLjPrintTestId("");
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
                >
                  {sectionsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="font-extrabold text-slate-600">Máy:</span>
                <select
                  value={ljPrintMachine}
                  onChange={(e) => {
                    setLjPrintMachine(e.target.value);
                    setLjPrintTestId("");
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-blue-700"
                >
                  <option value="Tất cả">Tất cả máy</option>
                  {labMachines
                    .filter((m) => m.section === ljPrintSection)
                    .map((m) => (
                      <option key={m.machine} value={m.machine}>
                        {m.machine}
                      </option>
                    ))}
                </select>
                <span className="font-extrabold text-slate-600">
                  Xét nghiệm:
                </span>
                <select
                  value={activeLjTest?.test_id || ""}
                  onChange={(e) => setLjPrintTestId(e.target.value)}
                  className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 font-black text-indigo-900"
                >
                  {ljConfigs.map((c) => (
                    <option key={c.test_id} value={c.test_id}>
                      {c.test_name} ({c.machine_name})
                    </option>
                  ))}
                </select>

                {reportSubTab === "LJ_PRINT" && (
                  <>
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => {
                          setLjChartToggle("L1");
                          setLjTableLevel("L1");
                        }}
                        className={`px-2.5 py-1 rounded-md font-extrabold text-[11px] transition ${
                          ljChartToggle === "L1"
                            ? "bg-sky-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Xem L1
                      </button>
                      {activeLjTest && activeLjTest.levels_count >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLjChartToggle("L2");
                            setLjTableLevel("L2");
                          }}
                          className={`px-2.5 py-1 rounded-md font-extrabold text-[11px] transition ${
                            ljChartToggle === "L2"
                              ? "bg-purple-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Xem L2
                        </button>
                      )}
                      {activeLjTest && activeLjTest.levels_count === 3 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLjChartToggle("L3");
                            setLjTableLevel("L3");
                          }}
                          className={`px-2.5 py-1 rounded-md font-extrabold text-[11px] transition ${
                            ljChartToggle === "L3"
                              ? "bg-amber-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Xem L3
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setLjChartToggle("COMBINED")}
                        className={`px-2.5 py-1 rounded-md font-extrabold text-[11px] transition ${
                          ljChartToggle === "COMBINED"
                            ? "bg-emerald-600 text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Xem Phối Hợp
                      </button>
                    </div>

                    {ljChartToggle === "COMBINED" && (
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-600">
                          Bảng số liệu:
                        </span>
                        <select
                          value={ljTableLevel}
                          onChange={(e) =>
                            setLjTableLevel(
                              e.target.value as "L1" | "L2" | "L3"
                            )
                          }
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800"
                        >
                          <option value="L1">Số liệu Mức 1 (L1)</option>
                          {activeLjTest && activeLjTest.levels_count >= 2 && (
                            <option value="L2">Số liệu Mức 2 (L2)</option>
                          )}
                          {activeLjTest && activeLjTest.levels_count === 3 && (
                            <option value="L3">Số liệu Mức 3 (L3)</option>
                          )}
                        </select>
                      </div>
                    )}

                    <label className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-950 px-2.5 py-1 rounded-lg font-extrabold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideResolvedFailsInPrint}
                        onChange={(e) =>
                          setHideResolvedFailsInPrint(e.target.checked)
                        }
                        className="accent-emerald-600 rounded"
                      />
                      <span>Ẩn điểm Vi phạm (Chỉ in điểm Đạt & đã KT lại)</span>
                    </label>
                  </>
                )}
              </div>

              {reportSubTab === "LJ_PRINT" && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-600">Từ:</span>
                  <input
                    type="date"
                    value={ljPrintFrom}
                    onChange={(e) => setLjPrintFrom(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold"
                  />
                  <span className="font-bold text-slate-600">Đến:</span>
                  <input
                    type="date"
                    value={ljPrintTo}
                    onChange={(e) => setLjPrintTo(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold"
                  />
                </div>
              )}

              {reportSubTab === "BM01_MU" && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-600">Seri No.:</span>
                  <input
                    type="text"
                    value={bm01SerialNo}
                    onChange={(e) => setBm01SerialNo(e.target.value)}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold"
                  />
                  <span className="font-bold text-slate-600">Phương pháp:</span>
                  <input
                    type="text"
                    value={bm01MethodName}
                    onChange={(e) => setBm01MethodName(e.target.value)}
                    className="w-48 bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold"
                  />
                  <span className="font-bold text-slate-600">
                    Người phê duyệt:
                  </span>
                  <input
                    type="text"
                    value={bm01Approver}
                    onChange={(e) => setBm01Approver(e.target.value)}
                    className="w-40 bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold"
                  />
                </div>
              )}
            </>
          )}

          {reportSubTab === "BM09" && (
            <div className="flex flex-wrap items-center gap-3 w-full">
              <div className="flex items-center gap-1.5">
                <Ic.Filter />
                <span className="font-extrabold text-slate-700">
                  Lọc Thiết bị:
                </span>
                <select
                  value={bm09MachineFilter}
                  onChange={(e) => {
                    setBm09MachineFilter(e.target.value);
                    setBm09TestFilter("Tất cả");
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-blue-800"
                >
                  <option value="Tất cả">Tất cả thiết bị</option>
                  {labMachines.map((m) => (
                    <option key={m.machine} value={m.machine}>
                      {m.machine} ({m.section})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-700">
                  Lọc Xét nghiệm:
                </span>
                <select
                  value={bm09TestFilter}
                  onChange={(e) => setBm09TestFilter(e.target.value)}
                  className="bg-white border border-indigo-300 rounded-lg px-3 py-1.5 font-bold text-indigo-900"
                >
                  <option value="Tất cả">Tất cả xét nghiệm</option>
                  {bm09AvailableTests.map((tName) => (
                    <option key={tName} value={tName}>
                      {tName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-700">
                  Tháng/Năm:
                </span>
                <input
                  type="month"
                  value={bm09MonthFilter}
                  onChange={(e) => setBm09MonthFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono font-bold"
                />
              </div>
            </div>
          )}

          {reportSubTab === "BM16" && (
            <div className="flex flex-wrap items-center gap-3 w-full">
              <div className="flex items-center gap-1.5">
                <Ic.Filter />
                <span className="font-extrabold text-slate-700">
                  Lọc Lab chuyên môn:
                </span>
                <select
                  value={bm16SectionFilter}
                  onChange={(e) => {
                    setBm16SectionFilter(e.target.value);
                    setBm16ControlFilter("Tất cả");
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-indigo-900"
                >
                  <option value="Tất cả">Tất cả Lab chuyên môn</option>
                  {sectionsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-700">
                  Lọc Hóa chất tự pha:
                </span>
                <select
                  value={bm16ControlFilter}
                  onChange={(e) => setBm16ControlFilter(e.target.value)}
                  className="bg-white border border-purple-300 rounded-lg px-3 py-1.5 font-bold text-purple-900"
                >
                  <option value="Tất cả">Tất cả hóa chất tự pha (BM.16)</option>
                  {bm16AvailableControls.map((ctrl) => (
                    <option key={ctrl} value={ctrl}>
                      {ctrl}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-700">
                  Tháng theo dõi:
                </span>
                <input
                  type="month"
                  value={bm16MonthFilter}
                  onChange={(e) => setBm16MonthFilter(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-mono font-bold"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. BẢN IN MÀU BIỂU ĐỒ L-J EPSON L1110 (VỪA KHÍT 1 TRANG A4 NGANG)       */}
      {/* ===================================================================== */}
      {reportSubTab === "LJ_PRINT" && activeLjTest && (
        <div
          className="lj-print-container bg-white text-slate-900 rounded-2xl p-4 border-2 border-indigo-200 shadow-lg"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <div className="flex justify-between items-center border-b-[1.5px] border-indigo-900 pb-2 mb-2 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-2 py-1 rounded-t-xl">
            <div>
              <div className="text-[12.5px] font-bold uppercase text-indigo-950 tracking-wide">
                BỆNH VIỆN ĐA KHOA CÀ MAU
              </div>
              <div className="text-[12.5px] font-black uppercase text-blue-800">
                KHOA XÉT NGHIỆM — LAB {activeLjTest.section.toUpperCase()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[15.5px] font-black uppercase text-indigo-950 tracking-wide">
                BIỂU ĐỒ LEVEY-JENNINGS KẾT QUẢ NỘI KIỂM CHẤT LƯỢNG
              </div>
              <div className="text-[11px] font-bold text-slate-700">
                Giai đoạn theo dõi: Từ ngày <b>{formatDateVN(ljPrintFrom)}</b>{" "}
                đến ngày <b>{formatDateVN(ljPrintTo)}</b>
              </div>
            </div>
            <div className="text-right">
              {activeLjTest.standard_label === "ISO" && (
                <span className="rounded-full px-3 py-0.5 text-[9.5px] font-black uppercase whitespace-nowrap bg-blue-700 text-white inline-block shadow-sm">
                  ISO 15189:2022
                </span>
              )}
              <div className="text-[10.5px] font-bold text-indigo-900 mt-0.5">
                {activeLjTest.range_source !== "MANUFACTURER"
                  ? "Dải chuẩn: Range Phòng XN"
                  : "Dải chuẩn: Range Hãng SX"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 bg-sky-50/70 border border-sky-200 rounded-lg px-2.5 py-1 text-[11.5px] mb-2">
            <div>
              <span className="font-bold text-slate-600">Tên xét nghiệm: </span>
              <b className="text-indigo-950">
                {activeLjTest.test_name} ({activeLjTest.unit})
              </b>
            </div>
            <div>
              <span className="font-bold text-slate-600">
                Thiết bị phân tích:{" "}
              </span>
              <b className="text-blue-800">{activeLjTest.machine_name}</b>
            </div>
            <div>
              <span className="font-bold text-slate-600">
                Tên hóa chất QC:{" "}
              </span>
              <b className="text-purple-900">{activeLjTest.control_name}</b>
            </div>
            <div>
              <span className="font-bold text-slate-600">
                Số Lô (Lot) / HSD:{" "}
              </span>
              <b className="font-mono text-emerald-800">
                {activeLjTest.lot_number} (
                {formatDateVN(activeLjTest.expiry_date)})
              </b>
            </div>
          </div>

          <div className="mb-2">
            <Luminous3DLJChart
              test={activeLjTest}
              showL1={ljChartToggle === "COMBINED" || ljChartToggle === "L1"}
              showL2={
                (ljChartToggle === "COMBINED" || ljChartToggle === "L2") &&
                activeLjTest.levels_count >= 2
              }
              showL3={
                (ljChartToggle === "COMBINED" || ljChartToggle === "L3") &&
                activeLjTest.levels_count === 3
              }
              compareOldLot={false}
              hideResolvedFails={hideResolvedFailsInPrint}
              filterMode="DATE_RANGE"
              lotFilter="ALL"
              fromDate={ljPrintFrom}
              toDate={ljPrintTo}
              isPrintView={true}
            />
          </div>

          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-4 flex flex-col justify-between">
              <div>
                <div className="text-[10.5px] font-black uppercase text-indigo-950 mb-1">
                  I. Thống Kê Dải Chuẩn & Six Sigma
                </div>
                <table className="w-full border-collapse border border-indigo-900 text-[10.5px] text-center">
                  <thead>
                    <tr className="bg-indigo-900 text-white font-bold">
                      <th className="border border-indigo-900 py-[2px] px-1 text-left w-20">
                        Thông số
                      </th>
                      <th className="border border-indigo-900 py-[2px] px-1 bg-sky-800">
                        Mức 1 (L1)
                      </th>
                      {activeLjTest.levels_count >= 2 && (
                        <th className="border border-indigo-900 py-[2px] px-1 bg-purple-800">
                          Mức 2 (L2)
                        </th>
                      )}
                      {activeLjTest.levels_count === 3 && (
                        <th className="border border-indigo-900 py-[2px] px-1 bg-amber-700">
                          Mức 3 (L3)
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="border border-slate-400 py-[1.5px] px-1 font-bold text-left">
                        Điểm hợp lệ (N)
                      </td>
                      <td className="border border-slate-400 py-[1.5px] font-mono font-bold">
                        {muResL1?.validPointsCount ?? 0}
                      </td>
                      {activeLjTest.levels_count >= 2 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-bold">
                          {muResL2?.validPointsCount ?? 0}
                        </td>
                      )}
                      {activeLjTest.levels_count === 3 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-bold">
                          {muResL3?.validPointsCount ?? 0}
                        </td>
                      )}
                    </tr>
                    <tr className="bg-sky-50/40">
                      <td className="border border-slate-400 py-[1.5px] px-1 font-bold text-left">
                        Mean áp dụng
                      </td>
                      <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-blue-800">
                        {activeLjTest.mean_L1}
                      </td>
                      {activeLjTest.levels_count >= 2 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-purple-800">
                          {activeLjTest.mean_L2}
                        </td>
                      )}
                      {activeLjTest.levels_count === 3 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-amber-800">
                          {activeLjTest.mean_L3}
                        </td>
                      )}
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-slate-400 py-[1.5px] px-1 font-bold text-left">
                        SD áp dụng
                      </td>
                      <td className="border border-slate-400 py-[1.5px] font-mono">
                        ±{activeLjTest.sd_L1}
                      </td>
                      {activeLjTest.levels_count >= 2 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono">
                          ±{activeLjTest.sd_L2}
                        </td>
                      )}
                      {activeLjTest.levels_count === 3 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono">
                          ±{activeLjTest.sd_L3}
                        </td>
                      )}
                    </tr>
                    <tr className="bg-sky-50/40">
                      <td className="border border-slate-400 py-[1.5px] px-1 font-bold text-left">
                        CV (%)
                      </td>
                      <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-emerald-700">
                        {muResL1?.cvPct.toFixed(2)}%
                      </td>
                      {activeLjTest.levels_count >= 2 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-emerald-700">
                          {muResL2?.cvPct.toFixed(2)}%
                        </td>
                      )}
                      {activeLjTest.levels_count === 3 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-emerald-700">
                          {muResL3?.cvPct.toFixed(2)}%
                        </td>
                      )}
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-slate-400 py-[1.5px] px-1 font-bold text-left">
                        Bias (%)
                      </td>
                      <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-indigo-700">
                        {muResL1?.biasPct.toFixed(2)}%
                      </td>
                      {activeLjTest.levels_count >= 2 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-indigo-700">
                          {muResL2?.biasPct.toFixed(2)}%
                        </td>
                      )}
                      {activeLjTest.levels_count === 3 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-bold text-indigo-700">
                          {muResL3?.biasPct.toFixed(2)}%
                        </td>
                      )}
                    </tr>
                    <tr className="bg-emerald-50/60">
                      <td className="border border-slate-400 py-[1.5px] px-1 font-bold text-left">
                        Six Sigma (σ)
                      </td>
                      <td className="border border-slate-400 py-[1.5px] font-mono font-black text-emerald-900">
                        {muResL1?.sigma !== null && muResL1?.sigma !== undefined
                          ? `${muResL1.sigma.toFixed(2)}σ`
                          : "N/A"}
                      </td>
                      {activeLjTest.levels_count >= 2 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-black text-emerald-900">
                          {muResL2?.sigma !== null &&
                          muResL2?.sigma !== undefined
                            ? `${muResL2.sigma.toFixed(2)}σ`
                            : "N/A"}
                        </td>
                      )}
                      {activeLjTest.levels_count === 3 && (
                        <td className="border border-slate-400 py-[1.5px] font-mono font-black text-emerald-900">
                          {muResL3?.sigma !== null &&
                          muResL3?.sigma !== undefined
                            ? `${muResL3.sigma.toFixed(2)}σ`
                            : "N/A"}
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-200 text-center">
                <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-1.5">
                  <div className="font-bold text-[9.5px] uppercase text-indigo-950">
                    QUẢN LÝ CHUYÊN MÔN
                  </div>
                  <div className="italic text-[8.5px] text-slate-500 mb-8">
                    (Ký và ghi rõ họ tên)
                  </div>
                  <div className="text-[10px] font-bold text-slate-800 h-3" />
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-1.5">
                  <div className="font-bold text-[9.5px] uppercase text-indigo-950">
                    NGƯỜI LẬP BIỂU ĐỒ
                  </div>
                  <div className="italic text-[8.5px] text-slate-500 mb-8">
                    (Ký và ghi rõ họ tên)
                  </div>
                  <div className="text-[10px] font-bold text-indigo-900">
                    {currentUser.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-8">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10.5px] font-black uppercase text-indigo-950">
                  II. Bảng Số Liệu Nội Kiểm Hàng Ngày (
                  {ljChartToggle === "L1"
                    ? "Mức 1 - L1"
                    : ljChartToggle === "L2"
                    ? "Mức 2 - L2"
                    : ljChartToggle === "L3"
                    ? "Mức 3 - L3"
                    : `Đang hiện số liệu ${ljTableLevel}`}
                  )
                </span>
                <span className="text-[9.5px] font-bold text-slate-500">
                  Chia 2 cột tối ưu trên 1 trang A4 Landscape
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[colLeftData, colRightData].map((columnRows, colIdx) => (
                  <div key={colIdx}>
                    <table className="w-full border-collapse border border-indigo-900 text-[10px] text-center">
                      <thead>
                        <tr className="bg-gradient-to-r from-indigo-900 to-blue-800 text-white font-bold">
                          <th className="border border-indigo-900 py-[2px] w-8">
                            STT
                          </th>
                          <th className="border border-indigo-900 py-[2px] w-14">
                            Ngày TH
                          </th>
                          <th className="border border-indigo-900 py-[2px] w-16">
                            Kết quả đo
                          </th>
                          <th className="border border-indigo-900 py-[2px] w-14">
                            Z-Score
                          </th>
                          <th className="border border-indigo-900 py-[2px]">
                            Người TH
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 16 }, (_, rIdx) => {
                          const item = columnRows[rIdx];
                          const globalIdx = colIdx * 16 + rIdx + 1;
                          const absZ = item ? Math.abs(item.z) : 0;
                          const zColor = !item
                            ? ""
                            : absZ >= 3
                            ? "text-rose-600 font-black bg-rose-50"
                            : absZ >= 2
                            ? "text-amber-700 font-bold bg-amber-50/70"
                            : "text-emerald-700 font-semibold";
                          return (
                            <tr
                              key={rIdx}
                              className={
                                rIdx % 2 === 0 ? "bg-white" : "bg-sky-50/30"
                              }
                            >
                              <td className="border border-slate-300 py-[1.5px] font-mono text-slate-500">
                                {globalIdx}
                              </td>
                              <td className="border border-slate-300 py-[1.5px] font-mono font-semibold">
                                {item ? item.date : "\u00A0"}
                              </td>
                              <td className="border border-slate-300 py-[1.5px] font-mono font-bold text-slate-900">
                                {item ? item.val : ""}
                              </td>
                              <td
                                className={`border border-slate-300 py-[1.5px] font-mono ${zColor}`}
                              >
                                {item
                                  ? `${item.z > 0 ? "+" : ""}${item.z.toFixed(
                                      2
                                    )}`
                                  : ""}
                              </td>
                              <td className="border border-slate-300 py-[1.5px] text-slate-800">
                                {item ? item.operator : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. BẢN IN PHIẾU XÁC ĐỊNH ĐỘ KHÔNG ĐẢM BẢO ĐO (BM.01.XN.QTQL.30)        */}
      {/* Hiển thị rõ công thức uc, hệ số phủ k=1.96/k=2.0 & tiêu chuẩn 0.75TEa   */}
      {/* ===================================================================== */}
      {reportSubTab === "BM01_MU" && activeLjTest && (
        <div
          className="print-paper bg-white text-black rounded-2xl p-8 border border-slate-300 shadow-lg max-w-3xl mx-auto"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <div className="flex justify-between items-end border-b-[1.5px] border-black pb-1.5 mb-5 text-[14px] font-bold">
            <div>Phiếu xác định độ không đảm bảo đo</div>
            <div>BM.01.XN.QTQL.30</div>
          </div>

          <div className="space-y-1.5 text-[14px] mb-4">
            <div className="flex justify-between">
              <div>
                <b>1. Tên xét nghiệm:</b> {activeLjTest.test_name}
              </div>
              <div className="w-52">
                <b>Đơn vị:</b> {activeLjTest.unit}
              </div>
            </div>
            <div className="flex justify-between">
              <div>
                <b>2. Thiết bị:</b> {activeLjTest.machine_name}
              </div>
              <div className="w-52">
                <b>Seri No.:</b> {bm01SerialNo}
              </div>
            </div>
            <div>
              <b>3. Phương pháp:</b> {bm01MethodName}
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[13.5px] mb-4">
            <thead>
              <tr className="font-bold text-center bg-slate-100">
                <th className="border border-black py-1.5 px-2 w-14">STT</th>
                <th className="border border-black py-1.5 px-3">Nội dung</th>
                <th className="border border-black py-1.5 px-3 w-48">
                  Kết quả
                </th>
              </tr>
            </thead>
            <tbody>
              {(activeLjTest.levels_count === 3
                ? (["L1", "L2", "L3"] as const)
                : activeLjTest.levels_count === 2
                ? (["L1", "L2"] as const)
                : (["L1"] as const)
              ).map((lvKey) => {
                const muRes = computeMuAndSigma(activeLjTest, lvKey);
                const curMean =
                  lvKey === "L1"
                    ? activeLjTest.mean_L1
                    : lvKey === "L2"
                    ? activeLjTest.mean_L2
                    : activeLjTest.mean_L3;
                const muCfg =
                  lvKey === "L1"
                    ? activeLjTest.mu_L1
                    : lvKey === "L2"
                    ? activeLjTest.mu_L2
                    : activeLjTest.mu_L3;
                const isPeriodic = muCfg?.mu_mode === "PERIODIC_IQC";
                const kFactor = isPeriodic ? "k=2" : "k=1.96";
                const isAbsTea = activeLjTest.tea_unit === "ABSOLUTE";

                const urVal = isPeriodic
                  ? Number(muCfg?.urw_pooled || muRes.cvPct || 0).toFixed(2)
                  : Number(muCfg?.verif_cvr || muRes.cvPct || 0).toFixed(2);
                const ubVal = isPeriodic
                  ? Number(
                      Math.sqrt(
                        Math.pow(Number(muRes.biasPct || 0), 2) +
                          Math.pow(Number(muCfg?.uc_cal || 0), 2)
                      )
                    ).toFixed(2)
                  : Number(muRes.biasPct || 0).toFixed(2);

                const ucDisplay =
                  muRes.ucPct !== null
                    ? isAbsTea && muRes.ucAbs !== null
                      ? `${muRes.ucPct.toFixed(2)}% (${muRes.ucAbs} ${
                          activeLjTest.unit
                        })`
                      : `${muRes.ucPct.toFixed(2)}%`
                    : "Chưa thiết lập";

                const ueDisplay =
                  muRes.uePct !== null
                    ? isAbsTea && muRes.ueAbs !== null
                      ? `${muRes.uePct.toFixed(2)}% (${muRes.ueAbs} ${
                          activeLjTest.unit
                        })`
                      : `${muRes.uePct.toFixed(2)}%`
                    : "Chưa thiết lập";

                const limitDisplay =
                  muRes.targetLimitPct !== null
                    ? isAbsTea && muRes.targetLimitAbs !== null
                      ? `${muRes.targetLimitPct.toFixed(2)}% (${
                          muRes.targetLimitAbs
                        } ${activeLjTest.unit})`
                      : `${muRes.targetLimitPct.toFixed(2)}%`
                    : "Chưa có TEa";

                const evalText =
                  muRes.isPassMu === true
                    ? "Đạt"
                    : muRes.isPassMu === false
                    ? "Không đạt"
                    : "—";

                return (
                  <React.Fragment key={lvKey}>
                    <tr className="bg-slate-50 font-bold">
                      <td
                        colSpan={3}
                        className="border border-black py-1.5 px-3 text-left"
                      >
                        Mức nồng độ: {curMean} ({lvKey} ·{" "}
                        {isPeriodic
                          ? "Ước lượng định kỳ IQC, hệ số phủ k=2"
                          : "Thẩm định ban đầu, hệ số phủ k=1.96"}
                        )
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black py-1 px-2 text-center">
                        1
                      </td>
                      <td className="border border-black py-1 px-3">
                        Độ không đảm bảo đo của độ tái lặp (
                        {isPeriodic ? (
                          <>
                            u<sub>Rw</sub>
                          </>
                        ) : (
                          <>
                            u<sub>R</sub>
                          </>
                        )}
                        )
                      </td>
                      <td className="border border-black py-1 px-3 text-center">
                        {urVal}%
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black py-1 px-2 text-center">
                        2
                      </td>
                      <td className="border border-black py-1 px-3">
                        Độ không đảm bảo đo của độ chệch (u<sub>B</sub>
                        {isPeriodic && muCfg?.uc_cal ? " + uCal" : ""})
                      </td>
                      <td className="border border-black py-1 px-3 text-center">
                        {ubVal}%
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black py-1 px-2 text-center">
                        3
                      </td>
                      <td className="border border-black py-1 px-3">
                        <div>
                          Độ không đảm bảo đo tổng hợp (u<sub>c</sub>)
                        </div>
                        <div className="text-[11px] italic text-slate-600">
                          Công thức: {muRes.formulaNote}
                        </div>
                      </td>
                      <td className="border border-black py-1 px-3 text-center">
                        {ucDisplay}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black py-1 px-2 text-center">
                        4
                      </td>
                      <td className="border border-black py-1 px-3">
                        Độ không đảm bảo đo mở rộng (U<sub>e</sub> = {kFactor} ×
                        u<sub>c</sub>), {kFactor}
                      </td>
                      <td className="border border-black py-1 px-3 text-center">
                        {ueDisplay}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black py-1 px-2 text-center">
                        5
                      </td>
                      <td className="border border-black py-1 px-3">
                        Tiêu chuẩn (0.75TEa)
                      </td>
                      <td className="border border-black py-1 px-3 text-center">
                        {limitDisplay}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black py-1 px-2 text-center">
                        6
                      </td>
                      <td className="border border-black py-1 px-3">
                        Đánh giá (U<sub>e</sub> &lt; 0.75TEa)
                      </td>
                      <td className="border border-black py-1 px-3 text-center font-bold">
                        {evalText}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black py-1 px-2 text-center">
                        7
                      </td>
                      <td className="border border-black py-1 px-3">
                        Kết quả ước tính
                      </td>
                      <td className="border border-black py-1 px-3 text-center font-bold">
                        {muRes.uePct !== null
                          ? `${curMean} ± ${muRes.uePct.toFixed(2)}%`
                          : "—"}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          <div className="text-[13.5px] mb-5">
            <b>Ghi chú:</b>{" "}
            <input
              type="text"
              value={bm01Note}
              onChange={(e) => setBm01Note(e.target.value)}
              placeholder=".........................................................................................................................................."
              className="w-4/5 border-b border-dotted border-black outline-none px-1"
            />
          </div>

          <div className="text-right italic text-[13.5px] mb-2 pr-6">
            Cà Mau, ngày {runDate.slice(8, 10)} tháng {runDate.slice(5, 7)} năm{" "}
            {runDate.slice(0, 4)}
          </div>

          <div className="grid grid-cols-2 gap-6 text-center text-[13.5px] mb-8">
            <div>
              <div className="font-bold">Người phê duyệt</div>
              <div className="italic text-[12.5px] mb-14">
                (Ký, ghi rõ họ tên)
              </div>
              <div className="font-bold text-indigo-950">{bm01Approver}</div>
            </div>
            <div>
              <div className="font-bold">Người lập</div>
              <div className="italic text-[12.5px] mb-14">
                (Ký, ghi rõ họ tên)
              </div>
              <div className="font-bold text-indigo-950">
                <input
                  type="text"
                  value={bm01Creator}
                  onChange={(e) => setBm01Creator(e.target.value)}
                  className="text-center font-bold outline-none bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center border-t-[1.5px] border-black pt-2 text-[12.5px] italic">
            <div>Ngày ban hành: 21/09/2026</div>
            <div>Lần ban hành: 04</div>
            <div>
              Trang <span className="page-number">1</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. BẢN IN BM.09 (AUTO PAGINATION QUA THEAD VÀ TFOOT)                    */}
      {/* ===================================================================== */}
      {reportSubTab === "BM09" && (
        <div
          className="print-paper bg-white text-black rounded-2xl p-6 border border-slate-300 shadow-lg"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <table className="auto-page-table text-[11.5px]">
            <thead>
              <tr>
                <td colSpan={10} className="border-none pb-3">
                  <div className="flex justify-between items-end border-b-[1.5px] border-black pb-1.5 mb-3 text-[13.5px] font-bold">
                    <div>Phiếu theo dõi kết quả nội kiểm hàng ngày</div>
                    <div>BM.09.XN.QTQL.31</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[16px] font-black uppercase">
                      PHIẾU THEO DÕI KẾT QUẢ NỘI KIỂM HÀNG NGÀY
                    </div>
                    <div className="text-[13.5px] font-bold">
                      Thiết bị:{" "}
                      <span className="underline decoration-dotted px-2">
                        {bm09MachineFilter === "Tất cả"
                          ? "Tất cả thiết bị"
                          : bm09MachineFilter}
                      </span>
                      {bm09TestFilter !== "Tất cả" && (
                        <>
                          &nbsp;&nbsp;|&nbsp;&nbsp; Xét nghiệm:{" "}
                          <span className="underline decoration-dotted px-2">
                            {bm09TestFilter}
                          </span>
                        </>
                      )}
                      &nbsp;&nbsp;|&nbsp;&nbsp; Tháng:{" "}
                      <span className="underline decoration-dotted px-2">
                        {bm09MonthFilter.slice(5, 7)}
                      </span>{" "}
                      Năm:{" "}
                      <span className="underline decoration-dotted px-2">
                        {bm09MonthFilter.slice(0, 4)}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr className="text-center font-bold bg-slate-100">
                <th className="border border-black py-1.5 px-1 w-14">
                  Ngày
                  <br />
                  thực hiện
                </th>
                <th className="border border-black py-1.5 px-1 w-10">
                  Giờ
                  <br />
                  TH
                </th>
                <th className="border border-black py-1.5 px-1 w-24">
                  Xét nghiệm
                </th>
                <th className="border border-black py-1.5 px-1 w-12">
                  Đánh
                  <br />
                  giá
                </th>
                <th className="border border-black py-1.5 px-1 w-24">
                  Quy tắc
                  <br />
                  vi phạm
                </th>
                <th className="border border-black py-1.5 px-1">Nguyên nhân</th>
                <th className="border border-black py-1.5 px-1">
                  Hành động khắc phục
                </th>
                <th className="border border-black py-1.5 px-1 w-28">
                  Kết quả
                  <br />
                  kiểm tra lại
                </th>
                <th className="border border-black py-1.5 px-1 w-20">
                  Người
                  <br />
                  thực hiện
                </th>
                <th className="border border-black py-1.5 px-1 w-20">
                  Người
                  <br />
                  kiểm tra
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filteredLogs = bm09Logs.filter((l) => {
                  if (
                    bm09MachineFilter !== "Tất cả" &&
                    l.machine_name !== bm09MachineFilter
                  )
                    return false;
                  if (
                    bm09TestFilter !== "Tất cả" &&
                    l.test_name !== bm09TestFilter
                  )
                    return false;
                  if (
                    bm09MonthFilter &&
                    !l.run_date.startsWith(bm09MonthFilter)
                  )
                    return false;
                  return true;
                });
                const totalRows = Math.max(12, filteredLogs.length);
                return Array.from({ length: totalRows }, (_, idx) => {
                  const l = filteredLogs[idx];
                  if (!l) {
                    return (
                      <tr key={`empty-bm09-${idx}`} className="h-7">
                        <td className="border border-black" />
                        <td className="border border-black" />
                        <td className="border border-black" />
                        <td className="border border-black" />
                        <td className="border border-black" />
                        <td className="border border-black" />
                        <td className="border border-black" />
                        <td className="border border-black" />
                        <td className="border border-black" />
                        <td className="border border-black" />
                      </tr>
                    );
                  }
                  const rulesCombined = [l.rules_single, l.rules_cross]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr
                      key={`${l.run_id}-${idx}`}
                      className="text-center h-7 page-break-inside-avoid"
                    >
                      <td className="border border-black py-1 px-1">
                        {formatShortDM(l.run_date)}
                      </td>
                      <td className="border border-black py-1 px-1">
                        {l.run_time}
                      </td>
                      <td className="border border-black py-1 px-1 font-bold">
                        {l.test_name}
                      </td>
                      <td
                        className={`border border-black py-1 px-1 font-bold ${
                          l.status === "FAIL"
                            ? "text-rose-700"
                            : l.status === "WARN"
                            ? "text-amber-700"
                            : "text-emerald-800"
                        }`}
                      >
                        {l.status === "FAIL" ? "KĐ" : "Đạt"}
                      </td>
                      <td className="border border-black py-1 px-1 text-rose-700 font-semibold">
                        {rulesCombined}
                      </td>
                      <td className="border border-black py-1 px-1.5 text-left">
                        {l.cause}
                      </td>
                      <td className="border border-black py-1 px-1.5 text-left">
                        {l.action_taken}
                      </td>
                      <td className="border border-black py-1 px-1 font-semibold">
                        {l.post_fix_result}
                      </td>
                      <td className="border border-black py-1 px-1">
                        {l.operator_name}
                      </td>
                      <td className="border border-black py-1 px-1">
                        {l.checker_name ? (
                          <span className="font-bold text-indigo-900">
                            {l.checker_name}
                          </span>
                        ) : canSignChecker ? (
                          <button
                            type="button"
                            onClick={async () => {
                              setBm09Logs((prev) =>
                                prev.map((item) =>
                                  item.run_id === l.run_id &&
                                  item.test_id === l.test_id
                                    ? {
                                        ...item,
                                        checker_name: currentUser.name,
                                        resolved: true,
                                      }
                                    : item
                                )
                              );
                              await rpcCall(
                                apiUrl,
                                "update_corrective_action",
                                {
                                  run_id: l.run_id,
                                  test_id: l.test_id,
                                  checker_name: currentUser.name,
                                },
                                authToken
                              );
                            }}
                            className="no-print px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shadow-sm"
                          >
                            Ký duyệt
                          </button>
                        ) : (
                          ""
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10} className="border-none pt-4">
                  <div className="flex justify-between items-center border-t-[1.5px] border-black pt-2 text-[12px] italic">
                    <div>Ngày ban hành: 01/04/2026</div>
                    <div>Lần ban hành: 02</div>
                    <div>
                      Trang <span className="page-number">1</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. BẢN IN BM.16 (CHỈ IN HÓA CHẤT TỰ PHA CHẾ - KHÔNG IN HÓA CHẤT MỞ NẮP) */}
      {/* ===================================================================== */}
      {reportSubTab === "BM16" && (
        <div
          className="print-paper bg-white text-black rounded-2xl p-5 border border-slate-300 shadow-lg"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <table className="auto-page-table w-full text-[10px]">
            <thead>
              <tr>
                <td colSpan={40} className="border-none pb-2">
                  <div className="flex justify-between items-end border-b-[1.5px] border-black pb-1 mb-2 text-[12.5px] font-bold">
                    <div>
                      Phiếu theo dõi hóa chất, sinh phẩm/ môi trường tự pha chế
                    </div>
                    <div>BM.16.XN.QTQL.23</div>
                  </div>
                  <div className="text-center text-[15px] font-black uppercase mb-1">
                    PHIẾU THEO DÕI HÓA CHẤT, SINH PHẨM/ MÔI TRƯỜNG TỰ PHA CHẾ
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-[12.5px] font-bold mb-1 px-1">
                    <div>
                      Lab chuyên môn:{" "}
                      <span className="underline decoration-dotted px-2">
                        {bm16SectionFilter === "Tất cả"
                          ? "Tất cả Lab chuyên môn"
                          : bm16SectionFilter}
                      </span>
                    </div>
                    <div>
                      Tên hóa chất, sinh phẩm:{" "}
                      <span className="underline decoration-dotted px-2">
                        {bm16ControlFilter === "Tất cả"
                          ? "Tất cả hóa chất tự pha chế"
                          : bm16ControlFilter}
                      </span>
                    </div>
                    <div>
                      Tháng:{" "}
                      <span className="underline decoration-dotted px-1">
                        {bm16MonthFilter.slice(5, 7)}
                      </span>{" "}
                      / Năm:{" "}
                      <span className="underline decoration-dotted px-1">
                        {bm16MonthFilter.slice(0, 4)}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr className="text-center font-bold bg-slate-100">
                <th rowSpan={2} className="border border-black px-1 w-5">
                  Stt
                </th>
                <th rowSpan={2} className="border border-black px-1 w-24">
                  Tên hóa chất
                </th>
                <th rowSpan={2} className="border border-black px-1 w-14">
                  Lô (Lot)
                </th>
                <th rowSpan={2} className="border border-black px-1 w-14">
                  Date
                  <br />
                  (HSD Lô)
                </th>
                <th rowSpan={2} className="border border-black px-1 w-12">
                  Ngày
                  <br />
                  pha
                </th>
                <th rowSpan={2} className="border border-black px-1 w-12">
                  Hạn
                  <br />
                  dùng
                </th>
                <th rowSpan={2} className="border border-black px-1 w-14">
                  Người
                  <br />
                  pha
                </th>
                <th rowSpan={2} className="border border-black px-1 w-10">
                  Số lượng
                  <br />
                  đã pha
                </th>
                <th colSpan={31} className="border border-black py-0.5">
                  Ngày sử dụng trong tháng {bm16MonthFilter.slice(5, 7)}/
                  {bm16MonthFilter.slice(0, 4)}
                </th>
                <th rowSpan={2} className="border border-black px-1 w-14">
                  Ghi chú
                </th>
              </tr>
              <tr className="text-center font-bold text-[8.5px] bg-slate-50">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="border border-black w-4 py-0.5">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filteredReagents = manualPrepReagentsOnly.filter((r) => {
                  if (
                    bm16SectionFilter !== "Tất cả" &&
                    r.section_name !== bm16SectionFilter
                  )
                    return false;
                  if (
                    bm16ControlFilter !== "Tất cả" &&
                    r.control_name !== bm16ControlFilter
                  )
                    return false;
                  return true;
                });
                const rowCount = Math.max(16, filteredReagents.length);
                return Array.from({ length: rowCount }, (_, index) => {
                  const r = filteredReagents[index] || null;
                  return (
                    <tr
                      key={r ? r.control_id : `empty-bm16-${index}`}
                      className="text-center h-6 page-break-inside-avoid"
                    >
                      <td className="border border-black px-1 font-bold">
                        {index + 1}
                      </td>
                      <td className="border border-black px-1 text-left font-semibold">
                        {r ? r.control_name : ""}
                      </td>
                      <td className="border border-black px-1 font-mono">
                        {r ? r.lot_number : ""}
                      </td>
                      <td className="border border-black px-1">
                        {r ? formatShortDM(r.expiry_date) : ""}
                      </td>
                      <td className="border border-black px-1">
                        {r ? formatShortDM(r.prep_date) : ""}
                      </td>
                      <td className="border border-black px-1">
                        {r
                          ? formatShortDM(r.use_expiry_date || r.expiry_date)
                          : ""}
                      </td>
                      <td className="border border-black px-1">
                        {r ? r.prep_by_name : ""}
                      </td>
                      <td className="border border-black px-1 font-bold">
                        {r ? r.quantity_prepared : ""}
                      </td>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                        const count = r
                          ? getUsageCountForMonthDay(
                              r.used_days_map,
                              bm16MonthFilter,
                              d
                            )
                          : 0;
                        const tickText =
                          count <= 0
                            ? ""
                            : count <= 3
                            ? Array(count).fill("✓").join("")
                            : `✓×${count}`;
                        return (
                          <td
                            key={d}
                            className="border border-black font-bold text-[8px] text-emerald-800 leading-none"
                          >
                            {tickText}
                          </td>
                        );
                      })}
                      <td className="border border-black px-1 text-left text-[9px]">
                        {r ? r.note : ""}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={40} className="border-none pt-3">
                  <div className="flex justify-between items-center border-t-[1.5px] border-black pt-2 text-[12px] italic">
                    <div>Ngày ban hành: 23/06/2025</div>
                    <div>Lần ban hành: 01</div>
                    <div>
                      Trang <span className="page-number">1</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
