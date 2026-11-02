import React, { useState, useEffect } from "react";
import {
  UserAccount,
  UserRole,
  PermissionKey,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getEffectivePermissions,
  rpcCall,
  STORAGE_KEYS,
  TestConfig,
  ReagentLotBM16,
  BM09LogEntry,
  INITIAL_REAGENTS,
  INITIAL_CONFIGS,
  INITIAL_BM09_LOGS,
  usePersistentState,
  AiSystemConfig,
  DEFAULT_AI_CONFIG,
} from "./types";

// ============================================================================
// FILE 4: src/AdminPanel.tsx (V5.6.0 FULL ENTERPRISE EDITION - KHÔNG CẮT GIẢM)
// 1. Cửa sổ 2 cột Quản lý Xét nghiệm Ngoại lệ (Không xét quy tắc 6x, 8x, 10x)
// 2. Giao diện Spring Pastel & Ma trận Cấp/Tước 8 Quyền Quản trị trực tiếp
// 3. Công cụ 1-Click: Nạp lại Dữ liệu mẫu chuẩn HOẶC Xóa trắng để vận hành thật
// 4. Tích hợp Cấu hình Khóa Gemini AI Dùng Chung Toàn Khoa (Đồng bộ PC & Mobile)
// ✦ An intellectual product by Handsome Long ✦
// ============================================================================

const Ic = {
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
  Edit: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
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
  Shield: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Key: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  Search: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
  Users: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Cpu: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  ),
  Database: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      viewBox="0 0 24 24"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      viewBox="0 0 24 24"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
};

const HEMATOLOGY_EXEMPT_CODES = ["WBC", "RBC", "HGB", "HCT", "PLT"];

function matchesDefaultExemptCode(testName: string): boolean {
  const upper = String(testName || "")
    .trim()
    .toUpperCase();
  return HEMATOLOGY_EXEMPT_CODES.some(
    (code) =>
      upper === code ||
      upper.startsWith(`${code} `) ||
      upper.includes(`(${code})`)
  );
}

export interface AdminPanelProps {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  authToken: string;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  sections: string[];
  setSections: React.Dispatch<React.SetStateAction<string[]>>;
  labMachines: { section: string; machine: string }[];
  setLabMachines: React.Dispatch<
    React.SetStateAction<{ section: string; machine: string }[]>
  >;
  syncFromCloud: () => Promise<void>;
  configs?: TestConfig[];
  setConfigs?: React.Dispatch<React.SetStateAction<TestConfig[]>>;
  setReagents?: React.Dispatch<React.SetStateAction<ReagentLotBM16[]>>;
  setBm09Logs?: React.Dispatch<React.SetStateAction<BM09LogEntry[]>>;
  aiConfig?: AiSystemConfig;
  setAiConfig?: React.Dispatch<React.SetStateAction<AiSystemConfig>>;
  currentUser?: UserAccount;
}

export default function AdminPanel({
  apiUrl,
  setApiUrl,
  authToken,
  users,
  setUsers,
  sections,
  setSections,
  labMachines,
  setLabMachines,
  syncFromCloud,
  configs = [],
  setConfigs,
  setReagents,
  setBm09Logs,
  aiConfig: externalAiConfig,
  setAiConfig: setExternalAiConfig,
  currentUser,
}: AdminPanelProps) {
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);
  const [urlSavedMsg, setUrlSavedMsg] = useState(false);

  // --- STATE CẤU HÌNH GEMINI AI TOÀN KHOA (DÙNG CHUNG CHO MỌI ĐIỆN THOẠI & PC) ---
  const [internalAiConfig, setInternalAiConfig] =
    usePersistentState<AiSystemConfig>(
      STORAGE_KEYS.AI_CONFIG,
      DEFAULT_AI_CONFIG
    );
  const activeAiConfig = externalAiConfig || internalAiConfig;

  const [tempGeminiKey, setTempGeminiKey] = useState<string>(
    activeAiConfig.gemini_api_key || ""
  );
  const [tempAiModel, setTempAiModel] = useState<string>(
    activeAiConfig.ai_model || "gemini-2.5-flash"
  );
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isSavingAi, setIsSavingAi] = useState<boolean>(false);
  const [isTestingAi, setIsTestingAi] = useState<boolean>(false);

  useEffect(() => {
    if (activeAiConfig) {
      setTempGeminiKey(activeAiConfig.gemini_api_key || "");
      setTempAiModel(activeAiConfig.ai_model || "gemini-2.5-flash");
    }
  }, [activeAiConfig]);

  const updateBothAiConfigs = (nextCfg: AiSystemConfig) => {
    setInternalAiConfig(nextCfg);
    if (setExternalAiConfig) {
      setExternalAiConfig(nextCfg);
    }
  };

  // --- STATE BỘ LỌC & HIỂN THỊ MA TRẬN PHÂN QUYỀN NHÂN SỰ ---
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [showAllMatrices, setShowAllMatrices] = useState<boolean>(true);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [showPermDictionary, setShowPermDictionary] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // --- STATE CỬA SỔ QUẢN LÝ CÁC TEST NGOẠI LỆ (KHÔNG XÉT 6x, 8x, 10x) ---
  const [exemptLabFilter, setExemptLabFilter] = useState<string>("Tất cả");
  const [exemptSearch, setExemptSearch] = useState<string>("");

  // --- STATE TẠO TÀI KHOẢN MỚI KÈM PHÂN QUYỀN TÙY CHỈNH ---
  const [newAcc, setNewAcc] = useState<{
    id: string;
    name: string;
    role: UserRole;
    permissions: PermissionKey[];
  }>({
    id: "",
    name: "",
    role: "USER",
    permissions: [...DEFAULT_ROLE_PERMISSIONS.USER],
  });

  // --- STATE THÊM NHANH LAB & THIẾT BỊ ---
  const [newLabInput, setNewLabInput] = useState("");
  const [newMachineInputs, setNewMachineInputs] = useState<
    Record<string, string>
  >({});

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => {
      setActionToast((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  // =========================================================================
  // 1. CÔNG CỤ QUẢN TRỊ DỮ LIỆU 1 CHẠM & CẤU HÌNH KHÓA GEMINI AI TOÀN KHOA
  // =========================================================================
  const handleReloadSeedData = () => {
    if (
      !window.confirm(
        "Nạp lại toàn bộ Dữ liệu mẫu chuẩn từ types.ts (gồm 2 Lô hóa chất Mở nắp/Pha tay, cấu hình Glucose 2 mức, WBC 3 mức Ngoại lệ kèm hồ sơ MU% và điểm chạy lại) để kiểm thử?"
      )
    )
      return;

    localStorage.setItem(
      STORAGE_KEYS.REAGENTS,
      JSON.stringify(INITIAL_REAGENTS)
    );
    localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(INITIAL_CONFIGS));
    localStorage.setItem(STORAGE_KEYS.BM09, JSON.stringify(INITIAL_BM09_LOGS));

    if (setReagents) setReagents(INITIAL_REAGENTS);
    if (setConfigs) setConfigs(INITIAL_CONFIGS);
    if (setBm09Logs) setBm09Logs(INITIAL_BM09_LOGS);

    triggerToast("Đã khôi phục bộ Dữ liệu mẫu chuẩn thành công!");
  };

  const handleWipeAllTestDataForProduction = () => {
    if (
      !window.confirm(
        "⚠️ XÁC NHẬN XÓA TRẮNG DỮ LIỆU THỬ NGHIỆM:\n\nHệ thống sẽ xóa sạch toàn bộ Hóa chất mẫu, Xét nghiệm mẫu, Điểm L-J mẫu và Nhật ký BM.09 nháp (Giữ nguyên Tài khoản nhân sự và Danh mục Lab/Máy) để bạn bắt đầu nhập dữ liệu thực tế.\n\nBạn có chắc chắn muốn thực hiện?"
      )
    )
      return;

    localStorage.setItem(STORAGE_KEYS.REAGENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BM09, JSON.stringify([]));

    if (setReagents) setReagents([]);
    if (setConfigs) setConfigs([]);
    if (setBm09Logs) setBm09Logs([]);

    triggerToast(
      "Đã xóa trắng toàn bộ dữ liệu thử nghiệm! Hệ thống sẵn sàng nhập liệu thực tế."
    );
  };

  const handleSaveAiConfig = async () => {
    const cleanKey = tempGeminiKey.trim();
    const cleanModel = tempAiModel.trim() || "gemini-2.5-flash";
    const nextCfg: AiSystemConfig = {
      gemini_api_key: cleanKey,
      ai_model: cleanModel,
      updated_by: currentUser?.name || "ADMIN",
      updated_at: new Date().toISOString(),
    };

    setIsSavingAi(true);
    updateBothAiConfigs(nextCfg);

    const res = await rpcCall(
      apiUrl,
      "admin_save_ai_config",
      {
        gemini_api_key: cleanKey,
        ai_model: cleanModel,
        updated_by: currentUser?.name || "ADMIN",
      },
      authToken
    );
    setIsSavingAi(false);

    if (res.net && res.body?.status === "success") {
      triggerToast(
        "Đã lưu Khóa Gemini AI lên Google Sheets! Mọi Điện thoại & Máy tính trong Khoa đã có thể quét ảnh QC."
      );
    } else {
      triggerToast(
        "Đã lưu Khóa Gemini AI trên trình duyệt này (Chờ đồng bộ lên Google Sheets)."
      );
    }
  };

  const handleTestAiConnection = async () => {
    const cleanKey = tempGeminiKey.trim();
    const cleanModel = tempAiModel.trim() || "gemini-2.5-flash";
    if (!cleanKey) {
      window.alert("Vui lòng dán mã Gemini API Key trước khi bấm Kiểm tra!");
      return;
    }

    setIsTestingAi(true);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        cleanModel
      )}:generateContent?key=${encodeURIComponent(cleanKey)}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Trả về đúng chuỗi JSON: {"status":"OK","engine":"MEDLAB_IQC_AI"}',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      });

      if (response.ok) {
        triggerToast(
          `Kết nối thành công với mô hình ${cleanModel}! Sẵn sàng quét ảnh QC trên Điện thoại & PC.`
        );
      } else {
        const errText = await response.text();
        window.alert(
          `Khóa API hoặc Model trả về lỗi (${response.status}): ${errText.slice(
            0,
            150
          )}`
        );
      }
    } catch {
      triggerToast(
        "Trình duyệt sẽ tự động dùng cổng Proxy trên Google Apps Script khi quét ảnh!"
      );
    } finally {
      setIsTestingAi(false);
    }
  };

  // =========================================================================
  // 2. XỬ LÝ CỬA SỔ CÁC TEST NGOẠI LỆ (KHÔNG XÉT QUY TẮC 6x, 8x, 10x)
  // =========================================================================
  const handleToggleExemptTest = async (
    testObj: TestConfig,
    makeExempt: boolean
  ) => {
    if (!setConfigs) return;
    const updatedObj: TestConfig = {
      ...testObj,
      is_exempt_long_rules: makeExempt,
    };
    setConfigs((prev) =>
      prev.map((c) => (c.test_id === testObj.test_id ? updatedObj : c))
    );
    triggerToast(
      makeExempt
        ? `Đã đưa [${testObj.test_name} - ${testObj.machine_name}] vào Cửa sổ Test Ngoại lệ (Bỏ qua 6x, 8x, 10x).`
        : `Đã trả [${testObj.test_name} - ${testObj.machine_name}] về danh sách xét đầy đủ quy tắc Westgard.`
    );
    await rpcCall(apiUrl, "save_config", updatedObj, authToken);
  };

  const handleAutoDetectDefaultExemptTests = () => {
    if (!setConfigs) return;
    const matchedList: TestConfig[] = [];
    setConfigs((prev) =>
      prev.map((c) => {
        if (matchesDefaultExemptCode(c.test_name)) {
          const nextObj = { ...c, is_exempt_long_rules: true };
          matchedList.push(nextObj);
          return nextObj;
        }
        return c;
      })
    );
    matchedList.forEach((cfg) => {
      rpcCall(apiUrl, "save_config", cfg, authToken);
    });
    triggerToast(
      matchedList.length > 0
        ? `Đã tự động đưa ${matchedList.length} xét nghiệm thuộc nhóm (WBC, RBC, HGB, HCT, PLT) vào Cửa sổ Ngoại lệ!`
        : "Hiện chưa có xét nghiệm nào trùng tên WBC, RBC, HGB, HCT, PLT trong danh mục."
    );
  };

  // =========================================================================
  // 3. CÁC HÀM QUẢN TRỊ NHÂN SỰ & CẤP / TƯỚC QUYỀN CHI TIẾT
  // =========================================================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newAcc.id.trim().toLowerCase();
    const cleanName = newAcc.name.trim();
    if (!cleanId || !cleanName) return;

    if (users.some((u) => u.id.toLowerCase() === cleanId)) {
      window.alert(`ID đăng nhập "${cleanId}" đã tồn tại trong hệ thống!`);
      return;
    }

    const created: UserAccount = {
      id: cleanId,
      name: cleanName,
      password: "Longdeptrai",
      role: newAcc.role,
      mustChange: true,
      permissions: [...newAcc.permissions],
    };

    setUsers((prev) => [...prev, created]);
    setNewAcc({
      id: "",
      name: "",
      role: "USER",
      permissions: [...DEFAULT_ROLE_PERMISSIONS.USER],
    });
    triggerToast(
      `Đã tạo tài khoản "${cleanName}" (${cleanId}) với ${
        created.permissions?.length || 0
      } quyền!`
    );
    await rpcCall(apiUrl, "admin_upsert_user", created, authToken);
  };

  const handleRoleChange = async (userObj: UserAccount, newRole: UserRole) => {
    if (userObj.id.toLowerCase() === "thlong") return;
    const defaultPermsForNewRole = [...DEFAULT_ROLE_PERMISSIONS[newRole]];

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userObj.id
          ? { ...u, role: newRole, permissions: defaultPermsForNewRole }
          : u
      )
    );
    triggerToast(
      `Đã chuyển vai trò của [${userObj.name}] sang ${newRole} (Áp dụng bộ quyền chuẩn ${newRole}).`
    );
    await rpcCall(
      apiUrl,
      "admin_upsert_user",
      {
        id: userObj.id,
        name: userObj.name,
        role: newRole,
        permissions: defaultPermsForNewRole,
      },
      authToken
    );
  };

  const handleToggleUserPermission = async (
    userObj: UserAccount,
    permKey: PermissionKey
  ) => {
    if (userObj.id.toLowerCase() === "thlong") {
      window.alert(
        "Tài khoản Root Admin (thlong) luôn giữ toàn quyền hệ thống!"
      );
      return;
    }

    const currentPerms = getEffectivePermissions(userObj);
    const hasIt = currentPerms.includes(permKey);
    const nextPerms: PermissionKey[] = hasIt
      ? currentPerms.filter((k) => k !== permKey)
      : [...currentPerms, permKey];

    const permDef = ALL_PERMISSIONS.find((p) => p.key === permKey);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userObj.id ? { ...u, permissions: nextPerms } : u
      )
    );

    triggerToast(
      `${hasIt ? "Đã thu hồi quyền" : "Đã cấp thêm quyền"} [${
        permDef?.label || permKey
      }] đối với ${userObj.name}.`
    );

    await rpcCall(
      apiUrl,
      "admin_upsert_user",
      {
        id: userObj.id,
        name: userObj.name,
        role: userObj.role,
        permissions: nextPerms,
      },
      authToken
    );
  };

  const handlePresetPermissions = async (
    userObj: UserAccount,
    mode: "ROLE_DEFAULT" | "GRANT_ALL" | "REVOKE_ALL"
  ) => {
    if (userObj.id.toLowerCase() === "thlong") return;
    const nextPerms: PermissionKey[] =
      mode === "GRANT_ALL"
        ? [...DEFAULT_ROLE_PERMISSIONS.ADMIN]
        : mode === "REVOKE_ALL"
        ? []
        : [...DEFAULT_ROLE_PERMISSIONS[userObj.role]];

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userObj.id ? { ...u, permissions: nextPerms } : u
      )
    );

    triggerToast(
      mode === "GRANT_ALL"
        ? `Đã cấp toàn bộ 8 quyền quản trị cho [${userObj.name}].`
        : mode === "REVOKE_ALL"
        ? `Đã thu hồi toàn bộ quyền mở rộng của [${userObj.name}].`
        : `Đã khôi phục quyền mặc định theo vai trò ${userObj.role} cho [${userObj.name}].`
    );

    await rpcCall(
      apiUrl,
      "admin_upsert_user",
      {
        id: userObj.id,
        name: userObj.name,
        role: userObj.role,
        permissions: nextPerms,
      },
      authToken
    );
  };

  const handleResetPassword = async (u: UserAccount) => {
    if (
      !window.confirm(
        `Đặt lại mật khẩu của [${u.name}] về mật khẩu mặc định "Longdeptrai" (Bắt buộc đổi mật khẩu ở lần đăng nhập tới)?`
      )
    )
      return;
    setUsers((prev) =>
      prev.map((item) =>
        item.id === u.id
          ? { ...item, password: "Longdeptrai", mustChange: true }
          : item
      )
    );
    triggerToast(`Đã đặt lại mật khẩu mặc định cho [${u.name}].`);
    await rpcCall(apiUrl, "admin_reset_password", { userId: u.id }, authToken);
  };

  const handleDeleteUser = async (u: UserAccount) => {
    if (u.id.toLowerCase() === "thlong") {
      window.alert("Không thể xóa tài khoản Root Admin (Tô Hoàng Long)!");
      return;
    }
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn XÓA tài khoản nhân viên [${u.name}]?`
      )
    )
      return;
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    triggerToast(`Đã xóa tài khoản [${u.name}].`);
    await rpcCall(apiUrl, "admin_delete_user", { userId: u.id }, authToken);
  };

  // =========================================================================
  // 4. CÁC HÀM QUẢN TRỊ CÂY THƯ MỤC LAB CHUYÊN MÔN & THIẾT BỊ XÉT NGHIỆM
  // =========================================================================
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLabInput.trim();
    if (!trimmed) return;
    if (sections.includes(trimmed)) {
      window.alert(`Lab chuyên môn "${trimmed}" đã tồn tại!`);
      return;
    }
    setSections((prev) => [...prev, trimmed]);
    setNewLabInput("");
    triggerToast(`Đã thêm Lab chuyên môn mới: ${trimmed}`);
    await rpcCall(
      apiUrl,
      "admin_add_lab_machine",
      { section_name: trimmed },
      authToken
    );
  };

  const handleRenameLab = async (oldSec: string) => {
    const newSec = window.prompt("Nhập tên mới cho Lab chuyên môn:", oldSec);
    if (!newSec || !newSec.trim() || newSec.trim() === oldSec) return;
    const trimmed = newSec.trim();
    setSections((prev) => prev.map((s) => (s === oldSec ? trimmed : s)));
    setLabMachines((prev) =>
      prev.map((m) => (m.section === oldSec ? { ...m, section: trimmed } : m))
    );
    if (setConfigs) {
      setConfigs((prev) =>
        prev.map((c) => (c.section === oldSec ? { ...c, section: trimmed } : c))
      );
    }
    if (setReagents) {
      setReagents((prev) =>
        prev.map((r) =>
          r.section_name === oldSec ? { ...r, section_name: trimmed } : r
        )
      );
    }
    triggerToast(`Đã đổi tên Lab "${oldSec}" thành "${trimmed}".`);
    await rpcCall(
      apiUrl,
      "admin_rename_lab_machine",
      { mode: "SECTION", old_section: oldSec, new_section: trimmed },
      authToken
    );
  };

  const handleDeleteLab = async (sec: string) => {
    if (
      !window.confirm(
        `Xác nhận xóa TOÀN BỘ Lab [${sec}] và các thiết bị trực thuộc Lab này?`
      )
    )
      return;
    setSections((prev) => prev.filter((s) => s !== sec));
    setLabMachines((prev) => prev.filter((m) => m.section !== sec));
    triggerToast(`Đã xóa Lab chuyên môn [${sec}].`);
    await rpcCall(
      apiUrl,
      "admin_delete_lab_machine",
      { section_name: sec },
      authToken
    );
  };

  const handleAddMachineToSection = async (sec: string) => {
    const rawName = (newMachineInputs[sec] || "").trim();
    if (!rawName) return;
    if (labMachines.some((m) => m.section === sec && m.machine === rawName)) {
      window.alert(`Thiết bị "${rawName}" đã tồn tại trong Lab ${sec}!`);
      return;
    }
    setLabMachines((prev) => [...prev, { section: sec, machine: rawName }]);
    setNewMachineInputs((prev) => ({ ...prev, [sec]: "" }));
    triggerToast(`Đã thêm thiết bị "${rawName}" vào Lab ${sec}.`);
    await rpcCall(
      apiUrl,
      "admin_add_lab_machine",
      { section_name: sec, machine_name: rawName },
      authToken
    );
  };

  const handleRenameMachine = async (sec: string, oldMac: string) => {
    const newMac = window.prompt(
      `Nhập tên mới cho Thiết bị [${oldMac}]:`,
      oldMac
    );
    if (!newMac || !newMac.trim() || newMac.trim() === oldMac) return;
    const trimmed = newMac.trim();
    setLabMachines((prev) =>
      prev.map((m) =>
        m.section === sec && m.machine === oldMac
          ? { ...m, machine: trimmed }
          : m
      )
    );
    if (setConfigs) {
      setConfigs((prev) =>
        prev.map((c) =>
          c.machine_name === oldMac ? { ...c, machine_name: trimmed } : c
        )
      );
    }
    if (setReagents) {
      setReagents((prev) =>
        prev.map((r) =>
          r.machine_name === oldMac ? { ...r, machine_name: trimmed } : r
        )
      );
    }
    triggerToast(`Đã đổi tên thiết bị "${oldMac}" thành "${trimmed}".`);
    await rpcCall(
      apiUrl,
      "admin_rename_lab_machine",
      {
        mode: "MACHINE",
        old_section: sec,
        old_machine: oldMac,
        new_machine: trimmed,
      },
      authToken
    );
  };

  const handleDeleteMachine = async (sec: string, mac: string) => {
    if (!window.confirm(`Xóa thiết bị [${mac}] khỏi Lab [${sec}]?`)) return;
    setLabMachines((prev) =>
      prev.filter((m) => !(m.section === sec && m.machine === mac))
    );
    triggerToast(`Đã xóa thiết bị [${mac}] khỏi Lab [${sec}].`);
    await rpcCall(
      apiUrl,
      "admin_delete_lab_machine",
      { section_name: sec, machine_name: mac },
      authToken
    );
  };

  // --- THỐNG KÊ NHANH CHO BANNER SPRING PASTEL ---
  const totalAdmins = users.filter((u) => u.role === "ADMIN").length;
  const totalQlcm = users.filter((u) => u.role === "QLCM").length;
  const totalSafePw = users.filter(
    (u) => !u.mustChange && u.password !== "Longdeptrai"
  ).length;
  const totalExemptTests = configs.filter((c) =>
    Boolean(c.is_exempt_long_rules)
  ).length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (userSearch.trim() !== "") {
      const q = userSearch.trim().toLowerCase();
      return u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
    }
    return true;
  });

  // Lọc danh sách xét nghiệm cho Cửa sổ 2 cột Ngoại lệ Westgard
  const filteredConfigsForExemptBox = configs.filter((c) => {
    if (c.test_type === "QUALITATIVE") return false;
    if (exemptLabFilter !== "Tất cả" && c.section !== exemptLabFilter)
      return false;
    if (
      exemptSearch.trim() !== "" &&
      !c.test_name.toLowerCase().includes(exemptSearch.trim().toLowerCase()) &&
      !c.machine_name.toLowerCase().includes(exemptSearch.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const standardRuleTests = filteredConfigsForExemptBox.filter(
    (c) => !c.is_exempt_long_rules
  );
  const exemptRuleTests = filteredConfigsForExemptBox.filter((c) =>
    Boolean(c.is_exempt_long_rules)
  );

  const isUserCardOpen = (uid: string) =>
    showAllMatrices || expandedUserIds.includes(uid);

  const toggleUserCardOpen = (uid: string) => {
    if (showAllMatrices) {
      setShowAllMatrices(false);
      setExpandedUserIds([uid]);
      return;
    }
    setExpandedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* THÔNG BÁO TOAST KHI THAO TÁC QUẢN TRỊ */}
      {actionToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gradient-to-r from-teal-600 via-emerald-600 to-sky-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/40 text-xs font-black flex items-center gap-2">
          <span>🌸</span>
          <span>{actionToast}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BANNER THỐNG KÊ MÙA XUÂN (SPRING PASTEL OVERVIEW CARDS)               */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-sky-50 via-cyan-50/70 to-blue-50 border border-sky-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-[10.5px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-0.5 rounded-full border border-sky-200">
              Tổng Nhân Sự Khoa XN
            </span>
            <Ic.Users />
          </div>
          <div className="text-2xl font-black text-sky-950 mt-2">
            {users.length} Tài khoản
          </div>
          <div className="text-[11px] font-semibold text-sky-700 mt-0.5">
            {sections.length} Lab chuyên môn · {labMachines.length} Thiết bị
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 via-fuchsia-50/70 to-pink-50 border border-purple-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[10.5px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-0.5 rounded-full border border-purple-200">
              Cơ Cấu Vai Trò
            </span>
            <Ic.Shield />
          </div>
          <div className="text-2xl font-black text-purple-950 mt-2">
            {totalAdmins} Admin · {totalQlcm} QLCM
          </div>
          <div className="text-[11px] font-semibold text-purple-700 mt-0.5">
            Còn lại {users.length - totalAdmins - totalQlcm} Nhân viên (USER)
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/70 to-lime-50 border border-emerald-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10.5px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
              An Toàn Mật Khẩu
            </span>
            <Ic.Key />
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-2">
            {totalSafePw}/{users.length} Đã đổi MK
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
            Chuẩn ≥8 ký tự, chữ HOA & ký tự đặc biệt
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 via-orange-50/70 to-rose-50 border border-amber-200 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-[10.5px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-0.5 rounded-full border border-amber-200">
              Test Ngoại Lệ (SOP 31)
            </span>
            <Ic.Shield />
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2">
            {totalExemptTests} Xét nghiệm
          </div>
          <div className="text-[11px] font-semibold text-amber-800 mt-0.5">
            Không xét quy tắc dài hạn 6x, 8x, 10x
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* KHỐI 1: CẤU HÌNH URL KẾT NỐI MÁY CHỦ & CÔNG CỤ DỮ LIỆU 1 CHẠM          */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-gradient-to-r from-sky-50/90 via-indigo-50/60 to-emerald-50/80 border border-sky-200 rounded-3xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-black text-sky-950 uppercase flex items-center gap-2">
              <Ic.Shield />
              <span>Cấu Hình URL Máy Chủ Google Apps Script</span>
            </h3>
            <button
              type="button"
              onClick={syncFromCloud}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-black flex items-center gap-1.5 shadow-sm transition"
            >
              <Ic.Sync /> Đồng bộ G.Sheets ngay
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={tempApiUrl}
              onChange={(e) => setTempApiUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 bg-white/95 border border-sky-300 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-700 outline-none focus:border-sky-600 shadow-inner"
            />
            <button
              type="button"
              onClick={() => {
                setApiUrl(tempApiUrl.trim());
                setUrlSavedMsg(true);
                setTimeout(() => setUrlSavedMsg(false), 2500);
              }}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:brightness-105 text-white font-black text-xs shadow-md transition whitespace-nowrap"
            >
              {urlSavedMsg ? "✓ Đã Lưu URL" : "Lưu URL Máy Chủ"}
            </button>
          </div>
        </div>

        {/* CÔNG CỤ NẠP DỮ LIỆU MẪU HOẶC XÓA TRẮNG KHÔNG CẦN F12 CONSOLE */}
        <div className="lg:col-span-5 bg-gradient-to-r from-amber-50/90 via-rose-50/60 to-purple-50/80 border border-amber-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-amber-950 uppercase flex items-center gap-2">
              <Ic.Database />
              <span>Khởi Tạo & Dọn Sạch Dữ Liệu 1 Chạm</span>
            </h3>
            <p className="text-[11px] text-slate-600 mt-1">
              Thay thế hoàn toàn thao tác mở F12 Console: Bạn có thể nạp lại dữ
              liệu mẫu để kiểm thử hoặc xóa trắng để bắt đầu nhập dữ liệu thật
              của Bệnh viện.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            <button
              type="button"
              onClick={handleReloadSeedData}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:brightness-105 text-white font-black text-xs shadow-sm transition text-center"
            >
              ↻ Nạp Lại Dữ Liệu Mẫu Chuẩn
            </button>
            <button
              type="button"
              onClick={handleWipeAllTestDataForProduction}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 hover:brightness-105 text-white font-black text-xs shadow-sm transition text-center"
            >
              🗑️ Xóa Trắng Để Nhập Thật
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* KHỐI 1.5 (ADD-ON V5.6): KHÓA GEMINI AI DÙNG CHUNG TOÀN KHOA            */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-amber-50/80 border-2 border-indigo-200 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white">
              Zero-Config Mobile AI Vision
            </span>
            <h3 className="text-sm font-black text-indigo-950 uppercase mt-1">
              🤖 Cấu Hình Khóa Gemini AI Dùng Chung Toàn Khoa (Quét Ảnh QC Điện
              Thoại ↔ Máy Tính)
            </h3>
            <p className="text-xs text-slate-600">
              Bạn chỉ cần dán mã Gemini API Key 1 lần tại đây và bấm{" "}
              <b>Lưu & Đồng Bộ</b>. Toàn bộ Điện thoại của KTV khi đăng nhập sẽ
              tự động nhận được khóa AI từ Google Sheets mà không cần cài đặt
              lại trên điện thoại.
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-black border ${
              activeAiConfig.gemini_api_key
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-amber-100 text-amber-800 border-amber-300"
            }`}
          >
            {activeAiConfig.gemini_api_key
              ? "✓ Đã kích hoạt AI Toàn Khoa"
              : "Chưa cấu hình API Key"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
          <div className="md:col-span-5">
            <label className="font-bold text-slate-700 block mb-1">
              Mã khóa Google Gemini API Key (Lấy từ Google AI Studio):
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={tempGeminiKey}
                onChange={(e) => setTempGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white border border-indigo-300 rounded-2xl pl-3.5 pr-14 py-2 font-mono font-bold text-slate-800 outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px]"
              >
                {showApiKey ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="font-bold text-slate-700 block mb-1">
              Mô hình nhận diện ảnh QC:
            </label>
            <select
              value={tempAiModel}
              onChange={(e) => setTempAiModel(e.target.value)}
              className="w-full bg-white border border-indigo-300 rounded-2xl px-3 py-2 font-bold text-indigo-950 outline-none"
            >
              <option value="gemini-2.5-flash">
                gemini-2.5-flash (Khuyên dùng)
              </option>
              <option value="gemini-2.0-flash">
                gemini-2.0-flash (Siêu tốc)
              </option>
              <option value="gemini-1.5-flash">
                gemini-1.5-flash (Ổn định)
              </option>
              <option value="gemini-2.5-pro">
                gemini-2.5-pro (Chuyên sâu)
              </option>
            </select>
          </div>

          <div className="md:col-span-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAiConfig}
              disabled={isSavingAi}
              className="flex-1 py-2 px-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:brightness-105 text-white font-black shadow-sm transition whitespace-nowrap disabled:opacity-50"
            >
              {isSavingAi ? "⏳ Đang lưu..." : "💾 Lưu & Đồng Bộ Toàn Khoa"}
            </button>
            <button
              type="button"
              onClick={handleTestAiConnection}
              disabled={isTestingAi}
              className="py-2 px-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black transition whitespace-nowrap disabled:opacity-50"
            >
              {isTestingAi ? "⏳ Đang thử..." : "⚡ Test Key"}
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* KHỐI 2: CỬA SỔ 2 CỘT QUẢN LÝ CÁC TEST NGOẠI LỆ (KHÔNG XÉT 6x, 8x, 10x) */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-r from-amber-50/70 via-white to-emerald-50/70 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white shadow-sm">
              Mục 5.2.3 Quy Trình Nội Kiểm XN.QTQL.31 v6.0
            </span>
            <h3 className="text-base font-black text-amber-950 uppercase mt-1">
              Cửa Sổ Quản Lý Xét Nghiệm Ngoại Lệ (Không Xét Quy Tắc 6x, 8x, 10x)
            </h3>
            <p className="text-xs text-slate-600">
              Khi bạn đưa bất kỳ xét nghiệm nào vào{" "}
              <b>Cửa sổ Xét nghiệm Ngoại lệ (Cột Phải)</b>, bộ máy phân tích
              Westgard sẽ tự động bỏ qua các quy tắc sai số hệ thống dài hạn{" "}
              <b>6x, 8x, 10x</b> (Mặc định áp dụng cho các chỉ số{" "}
              <b>WBC, RBC, HGB, HCT, PLT</b>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleAutoDetectDefaultExemptTests}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-sm transition"
            >
              ⚡ Tự động gom WBC, RBC, HGB, HCT, PLT vào Ngoại lệ
            </button>
          </div>
        </div>

        {/* THANH LỌC TRONG CỬA SỔ NGOẠI LỆ */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/90 p-3 rounded-2xl border border-amber-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-600">Lọc theo Lab:</span>
            <select
              value={exemptLabFilter}
              onChange={(e) => setExemptLabFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900"
            >
              <option value="Tất cả">Tất cả Lab chuyên môn</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-2 text-slate-400">
              <Ic.Search />
            </span>
            <input
              type="text"
              value={exemptSearch}
              onChange={(e) => setExemptSearch(e.target.value)}
              placeholder="Tìm nhanh tên xét nghiệm hoặc máy (VD: WBC, PLT, Glucose)..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl pl-9 pr-3 py-1.5 font-bold text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* GIAO DIỆN 2 CỘT CHUYỂN ĐỔI (DUAL-LIST TRANSFER BOX) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* CỘT TRÁI: CÁC XÉT NGHIỆM TIÊU CHUẨN (XÉT ĐẦY ĐỦ 6x, 8x, 10x) */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <div>
                  <span className="text-xs font-black uppercase text-slate-800">
                    1. Danh Sách Xét Nghiệm Tiêu Chuẩn (
                    {standardRuleTests.length})
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Áp dụng đầy đủ quy tắc Westgard (bao gồm cả 6x, 8x, 10x khi
                    Sigma &lt; 5.0)
                  </p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {standardRuleTests.map((t) => (
                  <div
                    key={t.test_id}
                    className="flex items-center justify-between gap-2 bg-slate-50 hover:bg-sky-50/70 border border-slate-200 rounded-xl px-3 py-2 transition"
                  >
                    <div>
                      <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{t.test_name}</span>
                        <span className="text-[10.5px] font-normal text-slate-500">
                          ({t.unit})
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 font-semibold">
                        {t.section} ·{" "}
                        <span className="text-blue-700">{t.machine_name}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleExemptTest(t, true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] flex items-center gap-1 shadow-sm transition shrink-0"
                    >
                      <span>Đưa vào Ngoại lệ</span>
                      <Ic.ArrowRight />
                    </button>
                  </div>
                ))}

                {standardRuleTests.length === 0 && (
                  <div className="text-xs text-slate-400 italic py-6 text-center">
                    Không có xét nghiệm nào ở danh sách tiêu chuẩn khớp bộ lọc.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: CỬA SỔ CÁC TEST NGOẠI LỆ (KHÔNG XÉT 6x, 8x, 10x) */}
          <div className="bg-amber-50/60 border-2 border-amber-400 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-amber-200 pb-2 mb-3">
                <div>
                  <span className="text-xs font-black uppercase text-amber-950">
                    2. Cửa Sổ Các Test Ngoại Lệ ({exemptRuleTests.length})
                  </span>
                  <p className="text-[11px] text-amber-800 font-semibold">
                    Được miễn trừ — Tuyệt đối KHÔNG xét các quy tắc dài hạn 6x,
                    8x, 10x
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-black text-[10px] uppercase">
                  Bỏ 6x · 8x · 10x
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {exemptRuleTests.map((t) => (
                  <div
                    key={t.test_id}
                    className="flex items-center justify-between gap-2 bg-white border border-amber-300 rounded-xl px-3 py-2 shadow-sm transition"
                  >
                    <div>
                      <div className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                        <span>{t.test_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9.5px] font-black">
                          Ngoại lệ
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-600 font-semibold">
                        {t.section} ·{" "}
                        <span className="text-blue-700">{t.machine_name}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleExemptTest(t, false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 border border-slate-300 font-bold text-[11px] flex items-center gap-1 transition shrink-0"
                    >
                      <Ic.ArrowLeft />
                      <span>Bỏ Ngoại lệ</span>
                    </button>
                  </div>
                ))}

                {exemptRuleTests.length === 0 && (
                  <div className="text-xs text-amber-800/70 italic py-6 text-center">
                    Chưa có xét nghiệm nào trong Cửa sổ Ngoại lệ. Hãy bấm "Đưa
                    vào Ngoại lệ" ở cột trái!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* Bố cục 2 Cột: TRÁI (Ma trận Phân quyền Nhân sự) | PHẢI (Tạo Acc & Lab) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (8/12): DANH SÁCH NHÂN SỰ & MA TRẬN CẤP/TƯỚC QUYỀN TƯƠNG TÁC */}
        <div className="lg:col-span-8 bg-gradient-to-b from-pink-50/40 via-white to-purple-50/40 border border-purple-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200">
                Spring Pastel Permission Center
              </span>
              <h3 className="text-base font-black text-purple-950 uppercase mt-1">
                Ma Trận Phân Quyền & Quản Lý {users.length} Nhân Sự
              </h3>
              <p className="text-xs text-slate-500">
                Tick chọn hoặc bỏ chọn trực tiếp trên từng ô để{" "}
                <b>cấp thêm quyền</b> hoặc <b>tước quyền</b> của bất kỳ{" "}
                <b>USER</b> hay <b>QLCM</b> nào.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPermDictionary(!showPermDictionary)}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition"
              >
                {showPermDictionary
                  ? "Ẩn giải thích 8 quyền"
                  : "Bảng tổng hợp 8 quyền Admin"}
              </button>
              <button
                type="button"
                onClick={() => setShowAllMatrices(!showAllMatrices)}
                className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 text-xs font-black transition"
              >
                {showAllMatrices
                  ? "Thu gọn bảng quyền"
                  : "Mở rộng tất cả bảng quyền"}
              </button>
            </div>
          </div>

          {showPermDictionary && (
            <div className="bg-gradient-to-r from-amber-50/80 via-rose-50/60 to-purple-50/80 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-black text-amber-950 uppercase">
                Danh Sách 8 Quyền Quản Trị Tổng Hợp (Dùng Để Cấp Thêm Hoặc Thu
                Hồi):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {ALL_PERMISSIONS.map((p, idx) => (
                  <div
                    key={p.key}
                    className="bg-white/90 border border-amber-100 rounded-xl p-2.5 shadow-sm"
                  >
                    <div className="font-black text-indigo-950">
                      {idx + 1}. {p.label}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      {p.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* THANH TÌM KIẾM & LỌC VAI TRÒ */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white/90 p-3 rounded-2xl border border-purple-100 shadow-sm text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Ic.Search />
              </span>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm theo Họ tên hoặc ID nhân sự (VD: Sang, Long...)"
                className="w-full bg-slate-50 border border-slate-200 focus:border-purple-400 rounded-xl pl-9 pr-3 py-1.5 font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center gap-1">
              {(
                [
                  { id: "ALL", label: `Tất cả (${users.length})` },
                  { id: "ADMIN", label: `ADMIN (${totalAdmins})` },
                  { id: "QLCM", label: `QLCM (${totalQlcm})` },
                  {
                    id: "USER",
                    label: `USER (${users.length - totalAdmins - totalQlcm})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-black text-[11px] transition ${
                    roleFilter === tab.id
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* DANH SÁCH THẺ NHÂN SỰ SPRING PASTEL */}
          <div className="max-h-[680px] overflow-y-auto space-y-3.5 pr-1.5">
            {filteredUsers.map((u) => {
              const isRootAdmin = u.id.toLowerCase() === "thlong";
              const effectivePerms = getEffectivePermissions(u);
              const roleDefaultPerms = DEFAULT_ROLE_PERMISSIONS[u.role];
              const isOpen = isUserCardOpen(u.id);

              const cardGradient =
                u.role === "ADMIN"
                  ? "from-rose-50/80 via-pink-50/50 to-amber-50/60 border-rose-200"
                  : u.role === "QLCM"
                  ? "from-purple-50/80 via-indigo-50/50 to-sky-50/60 border-purple-200"
                  : "from-emerald-50/70 via-teal-50/40 to-sky-50/50 border-teal-200";

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-3xl bg-gradient-to-r ${cardGradient} border transition-all hover:shadow-md`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      className="cursor-pointer select-none"
                      onClick={() => toggleUserCardOpen(u.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm">
                          {u.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/90 border border-slate-200 font-mono font-bold text-[11px] text-purple-800">
                          ID: {u.id}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[10px]">
                          {effectivePerms.length}/{ALL_PERMISSIONS.length} quyền
                          quản trị
                        </span>
                        {isRootAdmin && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] uppercase">
                            ★ Root Admin
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                        {u.mustChange || u.password === "Longdeptrai" ? (
                          <span className="text-amber-800 font-bold bg-amber-100/90 px-2 py-0.5 rounded-lg border border-amber-200">
                            Đang dùng MK mặc định (Longdeptrai)
                          </span>
                        ) : (
                          <span className="text-emerald-800 font-bold bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-200">
                            ✓ Đã đổi mật khẩu cá nhân an toàn
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={u.role}
                        disabled={isRootAdmin}
                        onChange={(e) =>
                          handleRoleChange(u, e.target.value as UserRole)
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border outline-none shadow-sm cursor-pointer ${
                          u.role === "ADMIN"
                            ? "bg-rose-100 text-rose-900 border-rose-300"
                            : u.role === "QLCM"
                            ? "bg-purple-100 text-purple-900 border-purple-300"
                            : "bg-teal-100 text-teal-900 border-teal-300"
                        }`}
                      >
                        <option value="ADMIN">Quản Trị (ADMIN)</option>
                        <option value="QLCM">Quản Lý C.Môn (QLCM)</option>
                        <option value="USER">Nhân Viên (USER)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => toggleUserCardOpen(u.id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-black border border-purple-200 shadow-sm transition"
                      >
                        {isOpen ? "Ẩn quyền ▲" : "Cấp/Tước quyền ▼"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResetPassword(u)}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 shadow-sm transition"
                      >
                        Reset MK
                      </button>

                      <button
                        type="button"
                        disabled={isRootAdmin}
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 rounded-xl bg-white text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 shadow-sm transition disabled:opacity-30"
                      >
                        <Ic.Trash />
                      </button>
                    </div>
                  </div>

                  {/* MA TRẬN CHECKLIST 8 QUYỀN TƯƠNG TÁC */}
                  {isOpen && (
                    <div className="mt-3 bg-white/95 rounded-2xl p-3.5 border border-white shadow-sm space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="text-[10.5px] font-black uppercase text-slate-500 tracking-wider">
                          Checklist Cấp Thêm / Thu Hồi Quyền Của [{u.name}]
                        </span>

                        {!isRootAdmin && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handlePresetPermissions(u, "ROLE_DEFAULT")
                              }
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition"
                            >
                              Mặc định {u.role}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handlePresetPermissions(u, "GRANT_ALL")
                              }
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold transition"
                            >
                              + Cấp đủ 8 quyền
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handlePresetPermissions(u, "REVOKE_ALL")
                              }
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold transition"
                            >
                              - Thu hồi hết
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ALL_PERMISSIONS.map((perm) => {
                          const isChecked = effectivePerms.includes(perm.key);
                          const isDefaultInRole = roleDefaultPerms.includes(
                            perm.key
                          );
                          const isExtraGranted = isChecked && !isDefaultInRole;
                          const isCustomRevoked = !isChecked && isDefaultInRole;

                          return (
                            <label
                              key={perm.key}
                              title={perm.desc}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold cursor-pointer select-none transition ${
                                isChecked
                                  ? "bg-gradient-to-r from-purple-50/90 to-sky-50/90 border-purple-300 text-indigo-950 shadow-sm"
                                  : "bg-slate-50/70 border-slate-200 text-slate-400 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isRootAdmin}
                                  onChange={() =>
                                    handleToggleUserPermission(u, perm.key)
                                  }
                                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                                />
                                <span>{perm.label}</span>
                              </div>

                              {isExtraGranted && (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9.5px] font-black whitespace-nowrap">
                                  + Cấp thêm
                                </span>
                              )}
                              {isCustomRevoked && (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 text-[9.5px] font-black whitespace-nowrap">
                                  - Đã thu hồi
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI (4/12): TẠO TÀI KHOẢN MỚI & QUẢN LÝ LAB / MÁY */}
        <div className="lg:col-span-4 space-y-6">
          {/* KHỐI TẠO TÀI KHOẢN MỚI */}
          <div className="bg-gradient-to-b from-teal-50/70 via-emerald-50/40 to-white border border-teal-200 rounded-3xl p-6 shadow-sm">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-200">
              Mint Pastel Onboarding
            </span>
            <h3 className="text-base font-black text-teal-950 uppercase mt-1 mb-3">
              Cấp Tài Khoản Nhân Sự Mới
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-teal-900 block mb-1">
                  ID Đăng nhập (Viết liền, không dấu) *
                </label>
                <input
                  required
                  value={newAcc.id}
                  onChange={(e) => setNewAcc({ ...newAcc, id: e.target.value })}
                  placeholder="VD: pmmman, ttttin..."
                  className="w-full bg-white border border-teal-200 focus:border-teal-500 rounded-xl px-3.5 py-2 font-mono font-bold text-slate-900 outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="font-bold text-teal-900 block mb-1">
                  Họ và tên nhân viên *
                </label>
                <input
                  required
                  value={newAcc.name}
                  onChange={(e) =>
                    setNewAcc({ ...newAcc, name: e.target.value })
                  }
                  placeholder="Nhập đầy đủ họ và tên..."
                  className="w-full bg-white border border-teal-200 focus:border-teal-500 rounded-xl px-3.5 py-2 font-bold text-slate-900 outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="font-bold text-teal-900 block mb-1">
                  Vai trò mặc định
                </label>
                <select
                  value={newAcc.role}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setNewAcc({
                      ...newAcc,
                      role: r,
                      permissions: [...DEFAULT_ROLE_PERMISSIONS[r]],
                    });
                  }}
                  className="w-full bg-white border border-teal-200 focus:border-teal-500 rounded-xl px-3.5 py-2 font-bold text-teal-950 outline-none"
                >
                  <option value="USER">Nhân viên (USER)</option>
                  <option value="QLCM">Quản lý chuyên môn (QLCM)</option>
                  <option value="ADMIN">Quản trị hệ thống (ADMIN)</option>
                </select>
              </div>

              <div className="bg-white/90 border border-teal-100 rounded-2xl p-3 space-y-1.5">
                <div className="font-black text-teal-900 text-[11px]">
                  Cấp quyền ban đầu ({newAcc.permissions.length}/8 quyền):
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {ALL_PERMISSIONS.map((perm) => {
                    const checked = newAcc.permissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? newAcc.permissions.filter((k) => k !== perm.key)
                              : [...newAcc.permissions, perm.key];
                            setNewAcc({ ...newAcc, permissions: next });
                          }}
                          className="accent-teal-600 rounded"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-teal-800 bg-teal-100/60 px-3 py-2 rounded-xl font-semibold">
                Mật khẩu khởi tạo mặc định:{" "}
                <b className="font-mono">Longdeptrai</b> (Yêu cầu đổi mật khẩu
                riêng ở lần đăng nhập đầu tiên).
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-black uppercase tracking-wide bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md hover:brightness-105 transition"
              >
                + Tạo Tài Khoản & Lưu Phân Quyền
              </button>
            </form>
          </div>

          {/* KHỐI QUẢN LÝ CÂY THƯ MỤC LAB & THIẾT BỊ */}
          <div className="bg-gradient-to-b from-orange-50/60 via-amber-50/30 to-white border border-orange-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-800 border border-orange-200">
                Lab & Analyzer Directory
              </span>
              <h3 className="text-base font-black text-orange-950 uppercase mt-1">
                Quản Lý Lab & Thiết Bị Xét Nghiệm
              </h3>
            </div>

            <form onSubmit={handleAddSection} className="flex gap-2 text-xs">
              <input
                type="text"
                value={newLabInput}
                onChange={(e) => setNewLabInput(e.target.value)}
                placeholder="Tên Lab mới (VD: Vi sinh)..."
                className="flex-1 bg-white border border-orange-200 focus:border-orange-500 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs flex items-center gap-1 shadow-sm transition whitespace-nowrap"
              >
                <Ic.Plus /> Thêm Lab
              </button>
            </form>

            <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1 text-xs">
              {sections.map((sec) => {
                const machinesInSec = labMachines.filter(
                  (m) => m.section === sec
                );
                return (
                  <div
                    key={sec}
                    className="border border-orange-200/80 rounded-2xl p-3.5 bg-white/95 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-black text-indigo-950 text-xs uppercase tracking-wide">
                        Lab {sec} ({machinesInSec.length} máy)
                      </span>
                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          type="button"
                          title="Đổi tên Lab"
                          onClick={() => handleRenameLab(sec)}
                          className="p-1 hover:text-blue-600 transition"
                        >
                          <Ic.Edit />
                        </button>
                        <button
                          type="button"
                          title="Xóa Lab"
                          onClick={() => handleDeleteLab(sec)}
                          className="p-1 hover:text-rose-600 transition"
                        >
                          <Ic.Trash />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {machinesInSec.map((mac) => (
                        <div
                          key={mac.machine}
                          className="flex items-center justify-between bg-sky-50/60 px-3 py-1.5 rounded-xl border border-sky-100"
                        >
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="text-sky-600">
                              <Ic.Cpu />
                            </span>
                            <span>{mac.machine}</span>
                          </span>
                          <div className="flex items-center gap-1 text-slate-400">
                            <button
                              type="button"
                              title="Đổi tên thiết bị"
                              onClick={() =>
                                handleRenameMachine(sec, mac.machine)
                              }
                              className="p-1 hover:text-blue-600"
                            >
                              <Ic.Edit />
                            </button>
                            <button
                              type="button"
                              title="Xóa thiết bị"
                              onClick={() =>
                                handleDeleteMachine(sec, mac.machine)
                              }
                              className="p-1 hover:text-rose-600"
                            >
                              <Ic.Trash />
                            </button>
                          </div>
                        </div>
                      ))}

                      {machinesInSec.length === 0 && (
                        <div className="text-slate-400 italic text-[11px] px-1">
                          Chưa có thiết bị nào trong Lab này.
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        value={newMachineInputs[sec] || ""}
                        onChange={(e) =>
                          setNewMachineInputs((prev) => ({
                            ...prev,
                            [sec]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddMachineToSection(sec);
                          }
                        }}
                        placeholder={`+ Thêm máy vào ${sec}...`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-semibold outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddMachineToSection(sec)}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px]"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
