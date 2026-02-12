// src/pages/member1-kumara/Portal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  UserRound,
  Droplets,
  Plus,
  Trash2,
  Save,
  Search,
  Pencil,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  List,
  Clock,
  Phone,
  Mail,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  ClipboardList,
  Download,
  UploadCloud,
  Filter,
} from "lucide-react";

/**
 * ✅ Backend endpoint base: /api/station
 * - GET    /api/station            (list, supports ?page&limit&q)
 * - POST   /api/station            (create)
 * - PUT    /api/station/:id        (update)
 * - DELETE /api/station/:id        (delete)
 */

// Change this if needed
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8081/api";

// Axios client
const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ===== Theme: match your homepage (FuelWatch blue + deep navy) =====
const THEME = {
  // Brand
  brand: "#2563EB", // FuelWatch blue
  brand2: "#1D4ED8",
  navy: "#0B1220", // deep sidebar-like navy
  navy2: "#0F172A",
  ink: "#0F172A",
  text: "#0B1220",
  muted: "rgba(15, 23, 42, 0.65)",
  // Surfaces
  pageBg: "#F5F8FF",
  card: "rgba(255,255,255,0.92)",
  card2: "rgba(255,255,255,0.80)",
  stroke: "rgba(15, 23, 42, 0.10)",
  strokeStrong: "rgba(15, 23, 42, 0.16)",
  shadow: "0 18px 55px -40px rgba(15, 23, 42, 0.55)",
  // Status
  success: "#16A34A",
  danger: "#DC2626",
  warn: "#F59E0B",
};

// ====== Strict validations (100% user input validations) ======
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm
const stationIdRegex = /^[A-Z0-9-]{3,20}$/; // e.g. ST-0001
const personIdRegex = /^[A-Z0-9-]{2,20}$/; // e.g. P-100
const phoneRegex = /^(?:\+94|0)\d{9}$/; // Sri Lanka style: 0771234567 or +94771234567

const allowedFuelTypes = [
  "Lanka Auto Diesel",
  "Lanka Super Diesel",
  "Lanka Petrol 92 Octane",
  "Lanka Petrol 95 Octane",
  "Industrial Kerosene",
  "Auto Kerosene",
];

const schema = z
  .object({
    Id: z
      .string()
      .trim()
      .min(3, "Station Id is required")
      .max(20, "Max 20 characters")
      .regex(stationIdRegex, "Use format like ST-0001 (A-Z, 0-9, - only)"),
    Name: z
      .string()
      .trim()
      .min(3, "Station name is required (min 3 chars)")
      .max(80, "Station name too long (max 80)"),
    Location: z
      .string()
      .trim()
      .min(3, "Location is required (min 3 chars)")
      .max(120, "Location too long (max 120)"),

    person: z.object({
      Id: z
        .string()
        .trim()
        .min(2, "Person Id is required")
        .max(20, "Max 20 characters")
        .regex(personIdRegex, "Use A-Z, 0-9, - only (e.g. P-100)"),
      PersonName: z
        .string()
        .trim()
        .min(3, "Person name required (min 3 chars)")
        .max(60, "Max 60 characters")
        .regex(/^[A-Za-z\s.'-]+$/, "Name can contain letters, spaces, . ' -"),
      PersonDesignation: z.string().trim().min(2, "Designation is required").max(50, "Max 50 characters"),
      PersonEmail: z.string().trim().email("Valid email required"),
      ContactNumber: z.string().trim().regex(phoneRegex, "Use 0XXXXXXXXX or +94XXXXXXXXX"),
      StartTime: z.string().trim().regex(timeRegex, "Time must be HH:mm (24-hour)"),
      EndTime: z.string().trim().regex(timeRegex, "Time must be HH:mm (24-hour)"),
    }),

    tanks: z
      .array(
        z.object({
          fuel_type: z
            .string()
            .trim()
            .min(1, "Fuel type is required")
            .refine((v) => allowedFuelTypes.includes(v), "Select a valid fuel type from the list"),
          number_of_tanks: z.coerce.number().int().min(1, "Min 1").max(50, "Max 50"),
          tank_index: z.coerce.number().int().min(1, "Min 1").max(200, "Too large"),
          tank_capacity: z.coerce.number().min(500, "Capacity too low (min 500L)").max(100000, "Capacity too high (max 100000L)"),
        })
      )
      .min(1, "At least one tank is required")
      .max(50, "Too many tanks (max 50)"),
  })
  .superRefine((data, ctx) => {
    // EndTime must be after StartTime
    const toMins = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    if (data?.person?.StartTime && data?.person?.EndTime) {
      if (toMins(data.person.EndTime) <= toMins(data.person.StartTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["person", "EndTime"],
          message: "End time must be after Start time",
        });
      }
    }

    // Tank index must be unique inside this station
    const seen = new Set();
    data.tanks.forEach((t, i) => {
      const key = `${t.fuel_type}::${t.tank_index}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tanks", i, "tank_index"],
          message: "Tank index must be unique per fuel type",
        });
      } else {
        seen.add(key);
      }
    });
  });

const steps = [
  { key: "station", title: "Station", icon: Building2, subtitle: "Basic station details and location" },
  { key: "person", title: "Contact", icon: UserRound, subtitle: "Manager details and operating hours" },
  { key: "tanks", title: "Tanks", icon: Droplets, subtitle: "Fuel types, capacity, and indexing" },
];

// -----------------------------
// UI Helpers (FuelWatch Theme)
// -----------------------------
function GlassCard({ children, style }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 22,
        background: THEME.card,
        border: `1px solid ${THEME.stroke}`,
        boxShadow: THEME.shadow,
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            `radial-gradient(900px 240px at 10% 0%, rgba(37,99,235,0.16), transparent 60%),` +
            `radial-gradient(780px 240px at 92% 12%, rgba(37,99,235,0.10), transparent 60%),` +
            `radial-gradient(860px 260px at 50% 110%, rgba(15,23,42,0.10), transparent 55%)`,
        }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

function Pill({ children, tone = "neutral", icon: Icon }) {
  const tones = {
    neutral: { bg: "rgba(15,23,42,0.04)", bd: "rgba(15,23,42,0.10)", fg: THEME.ink },
    success: { bg: "rgba(22,163,74,0.10)", bd: "rgba(22,163,74,0.22)", fg: "#166534" },
    danger: { bg: "rgba(220,38,38,0.10)", bd: "rgba(220,38,38,0.22)", fg: "#7F1D1D" },
    info: { bg: "rgba(37,99,235,0.10)", bd: "rgba(37,99,235,0.22)", fg: THEME.brand2 },
    warn: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.22)", fg: "#92400E" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${tones.bd}`,
        background: tones.bg,
        color: tones.fg,
        fontSize: 12,
        fontWeight: 850,
        whiteSpace: "nowrap",
      }}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </span>
  );
}

function SoftButton({ variant = "ghost", children, disabled, style, ...props }) {
  const base = {
    borderRadius: 14,
    padding: "10px 14px",
    border: `1px solid ${THEME.stroke}`,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "transform .12s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease",
    opacity: disabled ? 0.6 : 1,
    userSelect: "none",
    background: "#fff",
    color: THEME.ink,
  };

  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${THEME.brand}, ${THEME.brand2})`,
      color: "#fff",
      border: "1px solid rgba(37,99,235,0.35)",
      boxShadow: "0 18px 40px -30px rgba(37,99,235,0.95)",
    },
    ghost: {
      background: THEME.card2,
    },
    subtle: {
      background: "rgba(255,255,255,0.65)",
    },
    danger: {
      background: THEME.card2,
      color: THEME.danger,
      border: "1px solid rgba(220,38,38,0.25)",
    },
  }[variant];

  return (
    <button
      style={{
        ...base,
        ...variants,
        ...style,
      }}
      disabled={disabled}
      onMouseDown={(e) => {
        // tiny “press” effect without breaking logic
        if (disabled) return;
        e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      {...props}
    >
      {children}
    </button>
  );
}

function Label({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 950, color: THEME.ink }}>{children}</div>
      {right ? <div style={{ fontSize: 12, color: THEME.muted }}>{right}</div> : null}
    </div>
  );
}

function Hint({ children, icon: Icon }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderRadius: 16,
        border: `1px solid ${THEME.stroke}`,
        background: "rgba(37,99,235,0.06)",
        fontSize: 12,
        color: "rgba(15,23,42,0.75)",
      }}
    >
      {Icon ? <Icon size={16} style={{ marginTop: 1, color: THEME.brand }} /> : null}
      <div>{children}</div>
    </div>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return <div style={{ fontSize: 12, color: THEME.danger, marginTop: 6, fontWeight: 800 }}>{children}</div>;
}

function Field({ invalid, children }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: invalid ? "1px solid rgba(220,38,38,0.45)" : `1px solid ${THEME.stroke}`,
        background: "#fff",
        padding: "10px 12px",
        boxShadow: "0 1px 0 rgba(15,23,42,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function Input({ invalid, style, leftIcon: LeftIcon, ...props }) {
  return (
    <Field invalid={invalid}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {LeftIcon ? <LeftIcon size={18} style={{ opacity: 0.55, color: THEME.brand2 }} /> : null}
        <input
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            color: THEME.ink,
            ...style,
          }}
          {...props}
        />
      </div>
    </Field>
  );
}

function Select({ invalid, children, leftIcon: LeftIcon, ...props }) {
  return (
    <Field invalid={invalid}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {LeftIcon ? <LeftIcon size={18} style={{ opacity: 0.55, color: THEME.brand2 }} /> : null}
        <select
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            color: THEME.ink,
          }}
          {...props}
        >
          {children}
        </select>
      </div>
    </Field>
  );
}

function ValidityChip({ ok, text }) {
  return (
    <Pill tone={ok ? "success" : "danger"} icon={ok ? BadgeCheck : AlertTriangle}>
      {text}
    </Pill>
  );
}

function StepPill({ active, done, icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 18,
        padding: "12px 12px",
        border: active ? `1px solid rgba(37,99,235,0.35)` : `1px solid ${THEME.stroke}`,
        background: active
          ? `linear-gradient(135deg, ${THEME.navy}, ${THEME.navy2})`
          : "rgba(255,255,255,0.85)",
        color: active ? "#fff" : THEME.ink,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        boxShadow: active ? "0 18px 45px -35px rgba(15,23,42,0.95)" : "none",
        transition: "all .18s ease",
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: active ? "rgba(255,255,255,0.12)" : "rgba(37,99,235,0.08)",
          border: active ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(37,99,235,0.14)",
        }}
      >
        <Icon size={18} />
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 950, fontSize: 14 }}>{title}</div>
          {done && !active ? (
            <Pill tone="success" icon={CheckCircle2}>
              Done
            </Pill>
          ) : null}
        </div>
        <div style={{ fontSize: 12, opacity: active ? 0.85 : 0.65, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}

function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ height: 10, borderRadius: 999, background: "rgba(15,23,42,0.10)", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${v}%`,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${THEME.brand}, ${THEME.brand2})`,
          transition: "width .2s ease",
        }}
      />
    </div>
  );
}

// -----------------------------
// Main Component
// -----------------------------
export default function Portal() {
  const [activeStep, setActiveStep] = useState(0);

  const [loadingList, setLoadingList] = useState(false);
  const [stations, setStations] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const isEditing = !!editingId;

  const [view, setView] = useState("cards"); // cards | compact
  const [quickFuel, setQuickFuel] = useState("all"); // optional filter client-side

  const defaultValues = useMemo(
    () => ({
      Id: "",
      Name: "",
      Location: "",
      person: {
        Id: "",
        PersonName: "",
        PersonDesignation: "",
        PersonEmail: "",
        ContactNumber: "",
        StartTime: "",
        EndTime: "",
      },
      tanks: [{ fuel_type: "", number_of_tanks: 1, tank_index: 1, tank_capacity: 500 }],
    }),
    []
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    trigger,
    getValues,
    formState: { errors, isSubmitting, isValid },
    watch,
    setValue,
  } = useForm({
    defaultValues,
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "tanks" });

  // autosave draft (only in create mode)
  useEffect(() => {
    const sub = watch((val) => {
      if (!isEditing) localStorage.setItem("fuelwatch_portal_draft", JSON.stringify(val));
    });
    return () => sub.unsubscribe();
  }, [watch, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      const draft = localStorage.getItem("fuelwatch_portal_draft");
      if (draft) {
        try {
          reset(JSON.parse(draft));
        } catch {}
      }
    }
  }, [reset, isEditing]);

  async function fetchStations(nextPage = 1, nextQ = "") {
    setLoadingList(true);
    try {
      const { data } = await http.get("/station", {
        params: { page: nextPage, limit: 10, q: nextQ },
      });

      if (Array.isArray(data)) {
        setStations(data);
        setTotal(data.length);
      } else {
        setStations(data.items || []);
        setTotal(data.total ?? (data.items ? data.items.length : 0));
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load stations");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchStations(1, "");
  }, []);

  const pages = Math.max(1, Math.ceil(total / 10));

  async function nextStep() {
    const ok =
      activeStep === 0
        ? await trigger(["Id", "Name", "Location"])
        : activeStep === 1
        ? await trigger([
            "person.Id",
            "person.PersonName",
            "person.PersonDesignation",
            "person.PersonEmail",
            "person.ContactNumber",
            "person.StartTime",
            "person.EndTime",
          ])
        : await trigger(["tanks"]);

    if (!ok) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function prevStep() {
    setActiveStep((s) => Math.max(s - 1, 0));
  }

  function clearForm() {
    setEditingId(null);
    setActiveStep(0);
    localStorage.removeItem("fuelwatch_portal_draft");
    reset(defaultValues);
    toast.success("Form cleared");
  }

  async function onSubmit(payload) {
    try {
      const normalized = {
        ...payload,
        Id: payload.Id.trim().toUpperCase(),
        person: {
          ...payload.person,
          Id: payload.person.Id.trim().toUpperCase(),
          PersonEmail: payload.person.PersonEmail.trim(),
          ContactNumber: payload.person.ContactNumber.trim(),
        },
        tanks: payload.tanks.map((t) => ({
          ...t,
          fuel_type: t.fuel_type.trim(),
        })),
      };

      if (isEditing) {
        await http.put(`/station/${editingId}`, normalized);
        toast.success("Station updated!");
      } else {
        await http.post("/station", normalized);
        toast.success("Station registered!");
      }

      clearForm();
      setPage(1);
      fetchStations(1, q);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed");
    }
  }

  function startEdit(row) {
    const id = row._id || row.id;
    setEditingId(id);
    setActiveStep(0);

    reset({
      Id: row.Id || "",
      Name: row.Name || "",
      Location: row.Location || "",
      person: row.person || defaultValues.person,
      tanks: (row.tanks?.length ? row.tanks : defaultValues.tanks).map((t) => ({
        fuel_type: t.fuel_type ?? "",
        number_of_tanks: t.number_of_tanks ?? 1,
        tank_index: t.tank_index ?? 1,
        tank_capacity: t.tank_capacity ?? 500,
      })),
    });

    toast("Editing mode enabled");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeStation(id) {
    if (!window.confirm("Delete this station?")) return;
    try {
      await http.delete(`/station/${id}`);
      toast.success("Deleted successfully");
      setPage(1);
      fetchStations(1, q);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Delete failed");
    }
  }

  // Step completion flags
  const doneStation = !!getValues("Id") && !!getValues("Name") && !!getValues("Location");
  const donePerson =
    !!getValues("person.Id") &&
    !!getValues("person.PersonName") &&
    !!getValues("person.PersonDesignation") &&
    !!getValues("person.PersonEmail") &&
    !!getValues("person.ContactNumber") &&
    !!getValues("person.StartTime") &&
    !!getValues("person.EndTime");
  const doneTanks = (getValues("tanks") || []).length > 0;

  const stationStepOk = !errors.Id && !errors.Name && !errors.Location && doneStation;
  const personStepOk =
    !errors?.person?.Id &&
    !errors?.person?.PersonName &&
    !errors?.person?.PersonDesignation &&
    !errors?.person?.PersonEmail &&
    !errors?.person?.ContactNumber &&
    !errors?.person?.StartTime &&
    !errors?.person?.EndTime &&
    donePerson;

  const tanksStepOk = !errors?.tanks && doneTanks;

  const completion = useMemo(() => {
    const a = stationStepOk ? 34 : 0;
    const b = personStepOk ? 33 : 0;
    const c = tanksStepOk ? 33 : 0;
    return a + b + c;
  }, [stationStepOk, personStepOk, tanksStepOk]);

  // Client-side optional filter by fuel type
  const shownStations = useMemo(() => {
    const base = stations || [];
    if (quickFuel === "all") return base;
    return base.filter((s) => (s.tanks || []).some((t) => t.fuel_type === quickFuel));
  }, [stations, quickFuel]);

  // Export stations list (client side)
  function exportStationsJSON() {
    const out = { exportedAt: new Date().toISOString(), total, items: stations };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stations_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Toaster position="top-right" />

      {/* Global background to match homepage (clean light + blue glow) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -2,
          background: `linear-gradient(180deg, ${THEME.pageBg}, #ffffff 38%, #F8FAFC)`,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background:
            `radial-gradient(900px 260px at 15% 0%, rgba(37,99,235,0.18), transparent 60%),` +
            `radial-gradient(780px 240px at 92% 10%, rgba(37,99,235,0.12), transparent 60%),` +
            `radial-gradient(900px 280px at 55% 110%, rgba(15,23,42,0.10), transparent 55%)`,
        }}
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "18px 14px 28px" }}>
        {/* Header */}
        <GlassCard style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(37,99,235,0.10)",
                    border: "1px solid rgba(37,99,235,0.18)",
                    color: THEME.brand2,
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 980, letterSpacing: -0.4, color: THEME.ink }}>
                    FuelWatch <span style={{ color: THEME.brand }}>Portal</span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>
                    Station registry • contacts • tank inventory structure
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ValidityChip ok={stationStepOk} text="Station Valid" />
                <ValidityChip ok={personStepOk} text="Contact Valid" />
                <ValidityChip ok={tanksStepOk} text="Tanks Valid" />
                {isEditing ? (
                  <Pill tone="warn" icon={Pencil}>
                    Editing mode
                  </Pill>
                ) : (
                  <Pill tone="info" icon={ShieldCheck}>
                    Strict validation enabled
                  </Pill>
                )}
              </div>
            </div>

            <div style={{ minWidth: 280, width: "min(460px, 100%)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 950, color: THEME.muted }}>
                  Setup completion: <span style={{ color: THEME.ink }}>{completion}%</span>
                </div>
                <Pill tone={isValid ? "success" : "danger"} icon={isValid ? CheckCircle2 : AlertTriangle}>
                  {isValid ? "Ready to save" : "Fix validation"}
                </Pill>
              </div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={completion} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <SoftButton type="button" onClick={clearForm}>
                <X size={16} /> Clear
              </SoftButton>

              <SoftButton
                type="button"
                variant="primary"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || !isValid}
                title={!isValid ? "Fix all validation errors before saving" : ""}
              >
                <Save size={16} /> {isSubmitting ? "Saving..." : isEditing ? "Update" : "Register"}
              </SoftButton>
            </div>
          </div>
        </GlassCard>

        {/* Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.08fr 0.92fr", gap: 14 }}>
          {/* LEFT: Wizard */}
          <GlassCard style={{ padding: 18 }}>
            {/* Stepper */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {steps.map((s, idx) => (
                <StepPill
                  key={s.key}
                  title={s.title}
                  subtitle={s.subtitle}
                  icon={s.icon}
                  active={idx === activeStep}
                  done={(idx === 0 && stationStepOk) || (idx === 1 && personStepOk) || (idx === 2 && tanksStepOk)}
                  onClick={() => setActiveStep(idx)}
                />
              ))}
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Pill tone="info" icon={ClipboardList}>
                Step {activeStep + 1} / {steps.length}
              </Pill>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <SoftButton type="button" variant="subtle" onClick={prevStep} disabled={activeStep === 0}>
                  <ChevronLeft size={16} /> Back
                </SoftButton>

                {activeStep < steps.length - 1 ? (
                  <SoftButton type="button" variant="primary" onClick={nextStep}>
                    Next <ChevronRight size={16} />
                  </SoftButton>
                ) : (
                  <SoftButton
                    type="button"
                    variant="primary"
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting || !isValid}
                    title={!isValid ? "Fix all validation errors before saving" : ""}
                  >
                    <Save size={16} /> {isSubmitting ? "Saving..." : isEditing ? "Update Station" : "Register Station"}
                  </SoftButton>
                )}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <AnimatePresence mode="wait">
                {/* STEP 0 */}
                {activeStep === 0 && (
                  <motion.div key="station" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 980, fontSize: 16, color: THEME.ink }}>Station Details</div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
                          Use a unique Station ID format. FuelWatch will enforce strict rules.
                        </div>
                      </div>
                      <Pill tone={stationStepOk ? "success" : "danger"} icon={stationStepOk ? CheckCircle2 : AlertTriangle}>
                        {stationStepOk ? "Valid" : "Incomplete"}
                      </Pill>
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      <div>
                        <Label right="ST-0001 format">Station Id</Label>
                        <Input
                          placeholder="e.g. ST-0001"
                          leftIcon={Building2}
                          {...register("Id", {
                            onChange: (e) => setValue("Id", e.target.value.toUpperCase()),
                          })}
                          invalid={!!errors?.Id}
                        />
                        <ErrorText>{errors?.Id?.message}</ErrorText>
                      </div>

                      <div>
                        <Label>Station Name</Label>
                        <Input placeholder="e.g. Lanka IOC - Borella" leftIcon={BadgeCheck} {...register("Name")} invalid={!!errors?.Name} />
                        <ErrorText>{errors?.Name?.message}</ErrorText>
                      </div>

                      <div>
                        <Label>Location</Label>
                        <Input placeholder="e.g. Colombo 08" leftIcon={MapPin} {...register("Location")} invalid={!!errors?.Location} />
                        <ErrorText>{errors?.Location?.message}</ErrorText>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <Hint icon={ShieldCheck}>
                        Required format: <b>ST-0001</b> (A–Z, 0–9, hyphen). This must be unique in the system.
                      </Hint>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1 */}
                {activeStep === 1 && (
                  <motion.div key="person" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 980, fontSize: 16, color: THEME.ink }}>Contact Person</div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
                          Validated email • Sri Lanka phone • proper time window
                        </div>
                      </div>
                      <Pill tone={personStepOk ? "success" : "danger"} icon={personStepOk ? CheckCircle2 : AlertTriangle}>
                        {personStepOk ? "Valid" : "Incomplete"}
                      </Pill>
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                      <div>
                        <Label>Person Id</Label>
                        <Input
                          placeholder="e.g. P-100"
                          leftIcon={UserRound}
                          {...register("person.Id", {
                            onChange: (e) => setValue("person.Id", e.target.value.toUpperCase()),
                          })}
                          invalid={!!errors?.person?.Id}
                        />
                        <ErrorText>{errors?.person?.Id?.message}</ErrorText>
                      </div>

                      <div>
                        <Label>Person Name</Label>
                        <Input placeholder="e.g. Kumara Perera" leftIcon={BadgeCheck} {...register("person.PersonName")} invalid={!!errors?.person?.PersonName} />
                        <ErrorText>{errors?.person?.PersonName?.message}</ErrorText>
                      </div>

                      <div>
                        <Label>Designation</Label>
                        <Input placeholder="e.g. Station Manager" leftIcon={ClipboardList} {...register("person.PersonDesignation")} invalid={!!errors?.person?.PersonDesignation} />
                        <ErrorText>{errors?.person?.PersonDesignation?.message}</ErrorText>
                      </div>

                      <div>
                        <Label>Email</Label>
                        <Input placeholder="e.g. manager@station.com" leftIcon={Mail} {...register("person.PersonEmail")} invalid={!!errors?.person?.PersonEmail} />
                        <ErrorText>{errors?.person?.PersonEmail?.message}</ErrorText>
                      </div>

                      <div>
                        <Label>Contact Number</Label>
                        <Input placeholder="e.g. 0771234567 or +94771234567" leftIcon={Phone} {...register("person.ContactNumber")} invalid={!!errors?.person?.ContactNumber} />
                        <ErrorText>{errors?.person?.ContactNumber?.message}</ErrorText>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <Label>Start Time</Label>
                          <Input type="time" leftIcon={Clock} {...register("person.StartTime")} invalid={!!errors?.person?.StartTime} />
                          <ErrorText>{errors?.person?.StartTime?.message}</ErrorText>
                        </div>
                        <div>
                          <Label>End Time</Label>
                          <Input type="time" leftIcon={Clock} {...register("person.EndTime")} invalid={!!errors?.person?.EndTime} />
                          <ErrorText>{errors?.person?.EndTime?.message}</ErrorText>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <Hint icon={AlertTriangle}>
                        Validation rules: valid email • Sri Lanka phone • End time must be after start time.
                      </Hint>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 */}
                {activeStep === 2 && (
                  <motion.div key="tanks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 980, fontSize: 16, color: THEME.ink }}>Tank Details</div>
                        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
                          Fuel type locked list • capacity bounds • unique tank index
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Pill tone={tanksStepOk ? "success" : "danger"} icon={tanksStepOk ? CheckCircle2 : AlertTriangle}>
                          {tanksStepOk ? "Valid" : "Incomplete"}
                        </Pill>

                        <SoftButton
                          type="button"
                          variant="primary"
                          onClick={() =>
                            append({
                              fuel_type: "",
                              number_of_tanks: 1,
                              tank_index: fields.length + 1,
                              tank_capacity: 500,
                            })
                          }
                        >
                          <Plus size={16} /> Add Tank
                        </SoftButton>
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                      {fields.map((f, idx) => (
                        <GlassCard key={f.id} style={{ padding: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 980, color: THEME.ink }}>Tank #{idx + 1}</div>
                            <SoftButton
                              type="button"
                              variant="danger"
                              onClick={() => remove(idx)}
                              disabled={fields.length === 1}
                              title={fields.length === 1 ? "At least one tank required" : "Remove"}
                            >
                              <Trash2 size={16} /> Remove
                            </SoftButton>
                          </div>

                          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                            <div>
                              <Label>Fuel Type</Label>
                              <Select {...register(`tanks.${idx}.fuel_type`)} invalid={!!errors?.tanks?.[idx]?.fuel_type} leftIcon={Droplets}>
                                <option value="">Select fuel type...</option>
                                {allowedFuelTypes.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </Select>
                              <ErrorText>{errors?.tanks?.[idx]?.fuel_type?.message}</ErrorText>
                            </div>

                            <div>
                              <Label>No. of Tanks</Label>
                              <Input type="number" min="1" max="50" leftIcon={ClipboardList} {...register(`tanks.${idx}.number_of_tanks`)} invalid={!!errors?.tanks?.[idx]?.number_of_tanks} />
                              <ErrorText>{errors?.tanks?.[idx]?.number_of_tanks?.message}</ErrorText>
                            </div>

                            <div>
                              <Label>Tank Index</Label>
                              <Input type="number" min="1" max="200" leftIcon={BadgeCheck} {...register(`tanks.${idx}.tank_index`)} invalid={!!errors?.tanks?.[idx]?.tank_index} />
                              <ErrorText>{errors?.tanks?.[idx]?.tank_index?.message}</ErrorText>
                            </div>

                            <div>
                              <Label>Tank Capacity (L)</Label>
                              <Input type="number" min="500" max="100000" step="1" leftIcon={UploadCloud} {...register(`tanks.${idx}.tank_capacity`)} invalid={!!errors?.tanks?.[idx]?.tank_capacity} />
                              <ErrorText>{errors?.tanks?.[idx]?.tank_capacity?.message}</ErrorText>
                            </div>
                          </div>

                          <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted }}>
                            Rule: Tank index must be unique per fuel type (no duplicates).
                          </div>
                        </GlassCard>
                      ))}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <Hint icon={Filter}>
                        Validation rules: choose fuel type • capacity min 500L • unique tank index per fuel type.
                      </Hint>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom actions */}
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Pill tone="info" icon={Sparkles}>
                Autosave draft enabled (create mode)
              </Pill>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <SoftButton
                  type="button"
                  variant="subtle"
                  onClick={() => {
                    localStorage.removeItem("fuelwatch_portal_draft");
                    toast.success("Draft cleared");
                  }}
                  disabled={isEditing}
                >
                  <Trash2 size={16} /> Clear draft
                </SoftButton>
                <SoftButton type="button" onClick={clearForm}>
                  <X size={16} /> Reset form
                </SoftButton>
              </div>
            </div>
          </GlassCard>

          {/* RIGHT: Registry list */}
          <div style={{ display: "grid", gap: 14 }}>
            <GlassCard style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 980, fontSize: 16, color: THEME.ink }}>Registered Stations</div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>{total} total</div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <SoftButton type="button" onClick={() => fetchStations(page, q)} disabled={loadingList} style={{ padding: "10px 12px" }}>
                    <RefreshCw size={16} /> Refresh
                  </SoftButton>
                  <SoftButton type="button" onClick={exportStationsJSON} disabled={loadingList || !stations.length}>
                    <Download size={16} /> Export JSON
                  </SoftButton>

                  <SoftButton type="button" onClick={() => setView((v) => (v === "cards" ? "compact" : "cards"))} title="Toggle view">
                    {view === "cards" ? <LayoutGrid size={16} /> : <List size={16} />} {view === "cards" ? "Cards" : "Compact"}
                  </SoftButton>
                </div>
              </div>

              {/* Search + quick filter */}
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 220px auto", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: 13, opacity: 0.55, color: THEME.brand2 }}>
                    <Search size={16} />
                  </span>
                  <input
                    style={{
                      width: "100%",
                      borderRadius: 16,
                      border: `1px solid ${THEME.stroke}`,
                      padding: "12px 12px 12px 38px",
                      outline: "none",
                      background: THEME.card2,
                      color: THEME.ink,
                    }}
                    placeholder="Search by Id / Name / Location / Person..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setPage(1);
                        fetchStations(1, q);
                      }
                    }}
                  />
                </div>

                <select
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    border: `1px solid ${THEME.stroke}`,
                    padding: "12px 12px",
                    outline: "none",
                    background: THEME.card2,
                    fontWeight: 900,
                    fontSize: 13,
                    color: THEME.ink,
                  }}
                  value={quickFuel}
                  onChange={(e) => setQuickFuel(e.target.value)}
                  title="Quick filter (client-side)"
                >
                  <option value="all">All fuel types</option>
                  {allowedFuelTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <SoftButton
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setPage(1);
                    fetchStations(1, q);
                  }}
                  disabled={loadingList}
                >
                  Search
                </SoftButton>
              </div>

              {/* Loading strip */}
              {loadingList ? (
                <div style={{ marginTop: 10 }}>
                  <ProgressBar value={65} />
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 6 }}>Loading stations…</div>
                </div>
              ) : null}

              {/* Results */}
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {shownStations.map((s) => (
                  <GlassCard key={s._id} style={{ padding: view === "compact" ? 12 : 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          <div style={{ fontWeight: 980, color: THEME.ink }}>{s.Name}</div>
                          <Pill tone="info" icon={Building2}>
                            {s.Id}
                          </Pill>
                          <Pill tone="neutral" icon={MapPin}>
                            {s.Location}
                          </Pill>
                        </div>

                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <Pill tone="neutral" icon={UserRound}>
                            {s.person?.PersonName || "—"} • {s.person?.PersonDesignation || "—"}
                          </Pill>
                          {s.person?.PersonEmail ? (
                            <Pill tone="neutral" icon={Mail}>
                              {s.person.PersonEmail}
                            </Pill>
                          ) : null}
                          {s.person?.ContactNumber ? (
                            <Pill tone="neutral" icon={Phone}>
                              {s.person.ContactNumber}
                            </Pill>
                          ) : null}
                        </div>

                        {view === "cards" ? (
                          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(s.tanks || []).slice(0, 6).map((t, i) => (
                              <Pill key={i} tone="neutral" icon={Droplets}>
                                {t.fuel_type} • idx {t.tank_index} • {t.tank_capacity}L
                              </Pill>
                            ))}
                            {(s.tanks || []).length > 6 ? <Pill tone="neutral">+{(s.tanks || []).length - 6} more</Pill> : null}
                          </div>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <SoftButton type="button" onClick={() => startEdit(s)}>
                          <Pencil size={16} /> Edit
                        </SoftButton>
                        <SoftButton type="button" variant="danger" onClick={() => removeStation(s._id || s.id)}>
                          <Trash2 size={16} /> Delete
                        </SoftButton>
                      </div>
                    </div>
                  </GlassCard>
                ))}

                {shownStations.length === 0 ? <Hint icon={AlertTriangle}>No stations found. Try clearing filters or searching again.</Hint> : null}
              </div>

              {/* Pagination */}
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <SoftButton
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    const p = page - 1;
                    setPage(p);
                    fetchStations(p, q);
                  }}
                >
                  <ChevronLeft size={16} /> Prev
                </SoftButton>

                <div style={{ fontSize: 13, color: THEME.muted }}>
                  Page <b style={{ color: THEME.ink }}>{page}</b> / {pages}
                </div>

                <SoftButton
                  type="button"
                  disabled={page >= pages}
                  onClick={() => {
                    const p = page + 1;
                    setPage(p);
                    fetchStations(p, q);
                  }}
                >
                  Next <ChevronRight size={16} />
                </SoftButton>
              </div>
            </GlassCard>

            {/* Feature card */}
            <GlassCard style={{ padding: 18 }}>
              <div style={{ fontWeight: 980, fontSize: 16, color: THEME.ink }}>Required Registration Details</div>
              <ul style={{ marginTop: 10, paddingLeft: 18, color: THEME.muted, fontSize: 13, display: "grid", gap: 7 }}>
                <li>Filling Station General Details</li>
                <li>Filling Station Contact Details</li>
                <li>Filling Station Tank Details</li>
                
              </ul>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 1100px){
          div[style*="grid-template-columns: 1.08fr 0.92fr"]{ grid-template-columns: 1fr !important; }
        }
        @media (max-width: 980px){
          div[style*="grid-template-columns: repeat(3, 1fr)"]{ grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: repeat(2, 1fr)"]{ grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: repeat(4, 1fr)"]{ grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 1fr 220px auto"]{ grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
