// src/pages/member1-kumara/Portal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
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
  Download,
  Filter,
  Eye,
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8081/api";
const http = axios.create({ baseURL: API_BASE, headers: { "Content-Type": "application/json" } });

/* ----------------------------
   SweetAlert (single place)
---------------------------- */
const MySwal = withReactContent(Swal);
const alertOk = (title, text = "") =>
  MySwal.fire({ icon: "success", title, text, confirmButtonText: "OK" });
const alertErr = (title, text = "") =>
  MySwal.fire({ icon: "error", title, text, confirmButtonText: "OK" });
const alertInfo = (title, text = "") =>
  MySwal.fire({ icon: "info", title, text, confirmButtonText: "OK" });
const confirmBox = async (title, text = "Are you sure?") => {
  const r = await MySwal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "Cancel",
  });
  return r.isConfirmed;
};

const allowedDistricts = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];

/* ----------------------------
   Validation (LOGIC SAME)
---------------------------- */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const stationIdRegex = /^PUCSL\/PRL\/\d{4}\/202\d$/;
const stationNameRegex = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
const personIdRegex = /^(?:\d{9}[Vv]|\d{12})$/;
const personNameRegex = /^[A-Z][a-z]+ [A-Z][a-z]+$/;
const designationRegex = /^MANAGER$/;
const gmailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;
const phoneRegex = /^0[1-9]\d-\d{4}-\d{3}$/;

const allowedFuelTypes = [
  "Lanka Auto Diesel",
  "Lanka Super Diesel",
  "Lanka Petrol 92 Octane",
  "Lanka Petrol 95 Octane",
  "Kerosene",
];

const schema = z
  .object({
    Id: z
      .string()
      .trim()
      .min(3, "Station Id is required")
      .max(20, "Max 20 characters")
      .regex(stationIdRegex),
    

    Name: z
      .string()
      .trim()
      .regex(
    stationNameRegex,
    "Station name must contain letters and spaces only"
    ),

    Location: z
      .string()
      .trim()
      .min(1, "District is required")
      .refine((v) => allowedDistricts.includes(v), "Enter district (First letter must be capital)"),

    person: z.object({
      Id: z.string().trim().regex(personIdRegex, "NIC must be in the correct format"),

    PersonName: z
        .string()
        .trim()
        .regex(personNameRegex, "Ex - Alen Smith"),

    PersonDesignation: z.string().trim().regex(designationRegex, 'Give the correct designation'),
    PersonEmail: z.string().trim().regex(gmailRegex,'Email must be in the correct format'),
    ContactNumber: z.string().trim().regex(phoneRegex,'Contact number must be in correct format'),
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

/* ----------------------------
   Simple, readable UI helpers
---------------------------- */
const S = {
  app: { minHeight: "100vh", background: "#F3F6FB", color: "#0F172A" },
  wrap: { maxWidth: 1100, margin: "0 auto", padding: 16 },
  card: { background: "#fff", border: "1px solid rgba(15,23,42,0.10)", borderRadius: 10, padding: 14 },
  row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap" },
  tabBtn: (active) => ({
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background: active ? "rgba(37,99,235,0.10)" : "#fff",
    fontWeight: 900,
    cursor: "pointer",
  }),
  btn: (tone = "default") => {
    const base = {
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid rgba(15,23,42,0.12)",
      background: "#fff",
      fontWeight: 900,
      cursor: "pointer",
      display: "inline-flex",
      gap: 8,
      alignItems: "center",
    };
    if (tone === "primary") return { ...base, background: "#2563EB", border: "1px solid #1D4ED8", color: "#fff" };
    if (tone === "danger") return { ...base, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.22)", color: "#DC2626" };
    if (tone === "soft") return { ...base, background: "rgba(15,23,42,0.04)" };
    return base;
  },
  pill: (tone) => {
    const map = {
      ok: { bg: "rgba(22,163,74,0.10)", bd: "rgba(22,163,74,0.25)", fg: "#166534" },
      bad: { bg: "rgba(220,38,38,0.10)", bd: "rgba(220,38,38,0.25)", fg: "#7F1D1D" },
      warn: { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.25)", fg: "#92400E" },
      info: { bg: "rgba(37,99,235,0.10)", bd: "rgba(37,99,235,0.25)", fg: "#1D4ED8" },
      neutral: { bg: "rgba(15,23,42,0.04)", bd: "rgba(15,23,42,0.12)", fg: "#0F172A" },
    }[tone || "neutral"];
    return {
      display: "inline-flex",
      gap: 8,
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      background: map.bg,
      border: `1px solid ${map.bd}`,
      color: map.fg,
      fontSize: 12,
      fontWeight: 900,
      whiteSpace: "nowrap",
    };
  },
  label: { fontSize: 12.5, fontWeight: 900, marginBottom: 6 },
  inputWrap: (invalid) => ({
    borderRadius: 10,
    border: invalid ? "1px solid rgba(220,38,38,0.50)" : "1px solid rgba(15,23,42,0.12)",
    background: "#fff",
    padding: "10px 10px",
  }),
  input: { width: "100%", border: "none", outline: "none", fontSize: 14, background: "transparent" },
  err: { fontSize: 12, color: "#DC2626", marginTop: 6, fontWeight: 850 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  divider: { height: 1, background: "rgba(15,23,42,0.10)", margin: "12px 0" },
  modalBg: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 50 },
  modal: { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 60, width: "min(920px, calc(100vw - 28px))" },
};

function Field({ label, hint, error, children }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <div style={S.label}>{label}</div>
        {hint ? <div style={{ fontSize: 12, opacity: 0.7 }}>{hint}</div> : null}
      </div>
      {children}
      {error ? <div style={S.err}>{error}</div> : null}
    </div>
  );
}

function Input({ invalid, icon: Icon, ...props }) {
  return (
    <div style={S.inputWrap(invalid)}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {Icon ? <Icon size={18} style={{ opacity: 0.55, color: "#1D4ED8" }} /> : null}
        <input style={S.input} {...props} />
      </div>
    </div>
  );
}

function Select({ invalid, icon: Icon, children, ...props }) {
  return (
    <div style={S.inputWrap(invalid)}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {Icon ? <Icon size={18} style={{ opacity: 0.55, color: "#1D4ED8" }} /> : null}
        <select style={{ ...S.input, cursor: "pointer" }} {...props}>
          {children}
        </select>
      </div>
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <>
      <div style={S.modalBg} onClick={onClose} />
      <div style={S.modal}>
        <div style={S.card}>
          <div style={{ ...S.row, justifyContent: "space-between" }}>
            <div style={{ fontWeight: 980 }}>{title}</div>
            <button style={S.btn("soft")} type="button" onClick={onClose}>
              <X size={16} /> Close
            </button>
          </div>
          <div style={S.divider} />
          {children}
        </div>
      </div>
    </>
  );
}

const steps = [
  { key: "station", title: "Station Details", icon: Building2 },
  { key: "person", title: "Contact Person", icon: UserRound },
  { key: "tanks", title: "Tank Details", icon: Droplets },
];

/* ----------------------------
   MAIN (LOGIC UNCHANGED)
---------------------------- */
export default function Portal() {
  const [activeStep, setActiveStep] = useState(0);

  const [loadingList, setLoadingList] = useState(false);
  const [stations, setStations] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const isEditing = !!editingId;

  const [view, setView] = useState("table");
  const [quickFuel, setQuickFuel] = useState("all");

  const [activeTab, setActiveTab] = useState("portal");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);

  const defaultValues = useMemo(
    () => ({
      Id: "",
      Name: "",
      Location: "",
      person: { Id: "", PersonName: "", PersonDesignation: "", PersonEmail: "", ContactNumber: "", StartTime: "", EndTime: "" },
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
  } = useForm({ defaultValues, resolver: zodResolver(schema), mode: "onChange", reValidateMode: "onChange" });

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
      const { data } = await http.get("/station", { params: { page: nextPage, limit: 10, q: nextQ } });
      if (Array.isArray(data)) {
        setStations(data);
        setTotal(data.length);
      } else {
        setStations(data.items || []);
        setTotal(data.total ?? (data.items ? data.items.length : 0));
      }
    } catch (e) {
      await alertErr("Failed", e?.response?.data?.message || "Failed to load stations");
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
        ? await trigger(["person.Id", "person.PersonName", "person.PersonDesignation", "person.PersonEmail", "person.ContactNumber", "person.StartTime", "person.EndTime"])
        : await trigger(["tanks"]);

    if (!ok) return alertErr("Validation", "Please fix the highlighted fields.");
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function prevStep() {
    setActiveStep((s) => Math.max(s - 1, 0));
  }

  async function clearForm() {
    setEditingId(null);
    setActiveStep(0);
    localStorage.removeItem("fuelwatch_portal_draft");
    reset(defaultValues);
    await alertOk("Done", "Form cleared");
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
        tanks: payload.tanks.map((t) => ({ ...t, fuel_type: t.fuel_type.trim() })),
      };

      if (isEditing) {
        await http.put(`/station/${editingId}`, normalized);
        await alertOk("Success", "Station updated!");
      } else {
        await http.post("/station", normalized);
        await alertOk("Success", "Station registered!");
      }

      await clearForm();
      setPage(1);
      fetchStations(1, q);
      setActiveTab("registry");
    } catch (e) {
      await alertErr("Save failed", e?.response?.data?.message || "Save failed");
    }
  }

  async function startEdit(row) {
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

    await alertInfo("Edit mode", "Editing mode enabled");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveTab("portal");
  }

  async function removeStation(id) {
    const ok = await confirmBox("Delete station?", "This action cannot be undone.");
    if (!ok) return;
    try {
      await http.delete(`/station/${id}`);
      await alertOk("Deleted", "Deleted successfully");
      setPage(1);
      fetchStations(1, q);
    } catch (e) {
      await alertErr("Delete failed", e?.response?.data?.message || "Delete failed");
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

  const canGoPerson = stationStepOk;
  const canGoTanks = stationStepOk && personStepOk;

  const completion = useMemo(() => (stationStepOk ? 34 : 0) + (personStepOk ? 33 : 0) + (tanksStepOk ? 33 : 0), [stationStepOk, personStepOk, tanksStepOk]);

  const shownStations = useMemo(() => {
    const base = stations || [];
    if (quickFuel === "all") return base;
    return base.filter((s) => (s.tanks || []).some((t) => t.fuel_type === quickFuel));
  }, [stations, quickFuel]);

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

  const statusPill = isValid ? ["ok", CheckCircle2, "Ready"] : ["bad", AlertTriangle, "Fix validation"];
  const modePill = isEditing ? ["warn", Pencil, "Editing"] : ["info", CheckCircle2, "Create"];

  return (
    <div style={S.app}>
      {/* kept for compatibility; no longer used for notifications */}
      <Toaster position="top-right" />

      <div style={S.wrap}>
        {/* Header */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ ...S.row, justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 980, fontSize: 18 }}>FuelWatch Portal</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Fuelwatch - Filling Station Registering Dashboard</div>
            </div>
            <div style={S.row}>
              <span style={S.pill(statusPill[0])}>
                {React.createElement(statusPill[1], { size: 16 })} {statusPill[2]}
              </span>
              <span style={S.pill(modePill[0])}>
                {React.createElement(modePill[1], { size: 16 })} {modePill[2]}
              </span>
            </div>
          </div>

          <div style={S.divider} />

          {/* Tabs */}
          <div style={S.tabs}>
            <button type="button" style={S.tabBtn(activeTab === "portal")} onClick={() => setActiveTab("portal")}>
              Form
            </button>
            <button type="button" style={S.tabBtn(activeTab === "registry")} onClick={() => setActiveTab("registry")}>
              Registry
            </button>
            <button type="button" style={S.tabBtn(activeTab === "settings")} onClick={() => setActiveTab("settings")}>
              Settings
            </button>
          </div>
        </div>

        {/* Progress + actions */}
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ ...S.row, justifyContent: "space-between" }}>
            

            <div style={S.row}>
              <button type="button" style={S.btn("soft")} onClick={clearForm}>
                <X size={16} /> Reset
              </button>
              <button
                type="button"
                style={S.btn("primary")}
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || !isValid}
                title={!isValid ? "Fix all validation errors before saving" : ""}
              >
                <Save size={16} /> {isSubmitting ? "Saving..." : isEditing ? "Update" : "Register"}
              </button>
            </div>
          </div>

          
        </div>

        {/* FORM TAB */}
        {activeTab === "portal" && (
          <div style={S.card}>
            <div style={{ ...S.row, justifyContent: "space-between" }}>
              <div style={{ fontWeight: 980 }}>
                {isEditing ? "Edit Station" : "Create Station"} • Step {activeStep + 1}/{steps.length}
              </div>

              <div style={S.row}>
                <button type="button" style={S.btn("soft")} onClick={prevStep} disabled={activeStep === 0}>
                  <ChevronLeft size={16} /> Back
                </button>

                {activeStep < steps.length - 1 ? (
                  <button
                        type="button"
                        style={S.btn("primary")}
                        onClick={nextStep}
                        disabled={
                          (activeStep === 0 && !stationStepOk) ||
                          (activeStep === 1 && !personStepOk)
                        }
                        title={
                          activeStep === 0 && !stationStepOk
                            ? "Complete Station Details first"
                            : activeStep === 1 && !personStepOk
                            ? "Complete Contact Person details first"
                            : ""
                        }
                      >
                        Next <ChevronRight size={16} />
                      </button>
                ) : (
                  <button type="button" style={S.btn("primary")} onClick={handleSubmit(onSubmit)} disabled={isSubmitting || !isValid}>
                    <Save size={16} /> {isSubmitting ? "Saving..." : isEditing ? "Update Station" : "Register Station"}
                  </button>
                )}

              </div>
            </div>

            <div style={S.divider} />

            {/* Step buttons */}
            <div style={S.row}>
              {steps.map((s, idx) => {
                  const Icon = s.icon;
                  const ok = idx === 0 ? stationStepOk : idx === 1 ? personStepOk : tanksStepOk;
                  const active = idx === activeStep;

                  const locked = (idx === 1 && !canGoPerson) || (idx === 2 && !canGoTanks);

              return (
                  <button
                     key={s.key}
                      type="button"
                      disabled={locked}
                      onClick={() => {
              if (locked) {
              toast.error(
              idx === 1
                ? "Complete Station Details first."
                : "Complete Station + Contact Person details first."
              );
            return;
                  }
                setActiveStep(idx);
                  }}
                    style={{
                        ...S.tabBtn(active),
                        opacity: locked ? 0.5 : 1,
                        cursor: locked ? "not-allowed" : "pointer",
                  }}
                  title={locked ? "Complete previous step first" : ""}
                    >
                <span style={S.row}>
                <Icon size={16} /> {s.title}
                <span style={S.pill(ok ? "ok" : "neutral")}>{ok ? "Valid" : "View"}</span>
                </span>
              </button>
              );
              })}
            </div>

            <div style={S.divider} />

            {/* STEP 0 */}
            {activeStep === 0 && (
              <div style={S.grid3}>
                <Field label="Station Id" hint="PUCSL" >
                  <Input
                    icon={Building2}
                    placeholder="Enter PUCSL Id"
                    invalid={!!errors?.Id}
                    {...register("Id", { onChange: (e) => setValue("Id", e.target.value.toUpperCase()) })}
                  />
                </Field>

                <Field label="Station Name" error={errors?.Name?.message}>
                  <Input icon={Building2} placeholder="Sample Filling Station" invalid={!!errors?.Name} {...register("Name")} />
                </Field>

                <Field label="Location" error={errors?.Location?.message}>
                  <Input icon={Filter} placeholder="Enter District (First letter must be capital)" invalid={!!errors?.Location} {...register("Location")} />
                </Field>
              </div>
            )}

            {/* STEP 1 */}
            {activeStep === 1 && (
              <div style={S.grid2}>
                <Field label="NIC Number" error={errors?.person?.Id?.message}>
                  <Input icon={UserRound} placeholder="Enter NIC number" invalid={!!errors?.person?.Id}
                    {...register("person.Id", { onChange: (e) => setValue("person.Id", e.target.value.toLowerCase()) })}
                  />
                </Field>

                <Field label="Person Name" error={errors?.person?.PersonName?.message}>
                  <Input icon={UserRound} placeholder="Alen Smith" invalid={!!errors?.person?.PersonName} {...register("person.PersonName")} />
                </Field>

                <Field label="Designation" error={errors?.person?.PersonDesignation?.message}>
                  <Input icon={Building2} placeholder="ADMINISTRATOR (Only uppercase letters)" invalid={!!errors?.person?.PersonDesignation} {...register("person.PersonDesignation")} />
                </Field>

                <Field label="Email" error={errors?.person?.PersonEmail?.message}>
                  <Input icon={Search} placeholder="e.g. alen@gmail.com" invalid={!!errors?.person?.PersonEmail} {...register("person.PersonEmail")} />
                </Field>

                <Field label="Contact Number" error={errors?.person?.ContactNumber?.message}>
                  <Input icon={Search} placeholder="071-0000-000" invalid={!!errors?.person?.ContactNumber} {...register("person.ContactNumber")} />
                </Field>

                <div style={S.grid2}>
                  <Field label="Start Time" error={errors?.person?.StartTime?.message}>
                    <Input type="time" invalid={!!errors?.person?.StartTime} {...register("person.StartTime")} />
                  </Field>
                  <Field label="End Time" error={errors?.person?.EndTime?.message}>
                    <Input type="time" invalid={!!errors?.person?.EndTime} {...register("person.EndTime")} />
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {activeStep === 2 && (
              <div>
                <div style={{ ...S.row, justifyContent: "space-between" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Fuel type is locked list • capacity bounds • unique tank index per fuel type</div>
                  <button
                    type="button"
                    style={S.btn("primary")}
                    onClick={() => append({ fuel_type: "", number_of_tanks: 1, tank_index: fields.length + 1, tank_capacity: 500 })}
                  >
                    <Plus size={16} /> Add Tank
                  </button>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {fields.map((f, idx) => (
                    <div key={f.id} style={{ ...S.card, padding: 12, background: "rgba(15,23,42,0.02)" }}>
                      <div style={{ ...S.row, justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 980 }}>Tank #{idx + 1}</div>
                        <button
                          type="button"
                          style={S.btn("danger")}
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                          title={fields.length === 1 ? "At least one tank required" : "Remove"}
                        >
                          <Trash2 size={16} /> Remove
                        </button>
                      </div>

                      <div style={{ ...S.grid4, marginTop: 10 }}>
                        <Field label="Fuel Type" error={errors?.tanks?.[idx]?.fuel_type?.message}>
                          <Select icon={Droplets} invalid={!!errors?.tanks?.[idx]?.fuel_type} {...register(`tanks.${idx}.fuel_type`)}>
                            <option value="">Select fuel type...</option>
                            {allowedFuelTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </Select>
                        </Field>

                        <Field label="No. of Tanks" error={errors?.tanks?.[idx]?.number_of_tanks?.message}>
                          <Input type="number" min="1" max="50" invalid={!!errors?.tanks?.[idx]?.number_of_tanks} {...register(`tanks.${idx}.number_of_tanks`)} />
                        </Field>

                        <Field label="Tank Index" error={errors?.tanks?.[idx]?.tank_index?.message}>
                          <Input type="number" min="1" max="200" invalid={!!errors?.tanks?.[idx]?.tank_index} {...register(`tanks.${idx}.tank_index`)} />
                        </Field>

                        <Field label="Tank Capacity (L)" error={errors?.tanks?.[idx]?.tank_capacity?.message}>
                          <Input type="number" min="500" max="100000" step="1" invalid={!!errors?.tanks?.[idx]?.tank_capacity} {...register(`tanks.${idx}.tank_capacity`)} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* REGISTRY TAB */}
        {activeTab === "registry" && (
          <div style={S.card}>
            <div style={{ ...S.row, justifyContent: "space-between" }}>
              <div style={{ fontWeight: 980 }}>Registered Stations ({total})</div>
              <div style={S.row}>
                
                <button type="button" style={S.btn("soft")} onClick={exportStationsJSON} disabled={loadingList || !stations.length}>
                  <Download size={16} /> Export JSON
                </button>
                
              </div>
            </div>

            <div style={S.divider} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px auto", gap: 10 }}>
              <div style={S.inputWrap(false)}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Filter size={18} style={{ opacity: 0.55, color: "#1D4ED8" }} />
                  <select style={{ ...S.input, cursor: "pointer" }} value={quickFuel} onChange={(e) => setQuickFuel(e.target.value)}>
                    <option value="all">All fuel types</option>
                    {allowedFuelTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                style={S.btn("primary")}
                onClick={() => {
                  setPage(1);
                  fetchStations(1, q);
                }}
                disabled={loadingList}
              >
                Search
              </button>
            </div>

            {loadingList ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Loading stations…</div> : null}
            <div style={S.divider} />

            {shownStations.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.75, display: "flex", gap: 8, alignItems: "center" }}>
                <AlertTriangle size={18} /> No stations found.
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid rgba(15,23,42,0.10)", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                  <thead>
                    <tr style={{ background: "rgba(15,23,42,0.04)" }}>
                      <Th>Station</Th><Th>Id</Th><Th>Location</Th><Th>Contact</Th><Th>Tanks</Th><Th right>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownStations.map((s, idx) => (
                      <tr key={s._id || idx} style={{ borderTop: "1px solid rgba(15,23,42,0.10)" }}>
                        <Td><b>{s.Name}</b><div style={{ fontSize: 12, opacity: 0.7 }}>{s.person?.PersonDesignation || "—"}</div></Td>
                        <Td>{s.Id}</Td>
                        <Td>{s.Location}</Td>
                        <Td><b>{s.person?.PersonName || "—"}</b><div style={{ fontSize: 12, opacity: 0.7 }}>{s.person?.ContactNumber || "—"}</div></Td>
                        <Td>{(s.tanks || []).length}</Td>
                        <Td right>
                          <button style={S.btn("soft")} onClick={() => { setPreviewRow(s); setPreviewOpen(true); }}><Eye size={16} /></button>
                          <button style={S.btn()} onClick={() => startEdit(s)}><Pencil size={16} /></button>
                          <button style={S.btn("danger")} onClick={() => removeStation(s._id || s.id)}><Trash2 size={16} /></button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ ...S.row, justifyContent: "space-between", marginTop: 12 }}>
              <button
                type="button"
                style={S.btn()}
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  fetchStations(p, q);
                }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Page <b style={{ opacity: 1 }}>{page}</b> / {pages}
              </div>
              <button
                type="button"
                style={S.btn()}
                disabled={page >= pages}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  fetchStations(p, q);
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <div style={S.card}>
            <div style={{ fontWeight: 980 }}>Settings</div>
            <div style={S.divider} />
            <div style={{ fontSize: 13, opacity: 0.75 }}>Coming soon</div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        title={`Station Preview${previewRow?.Id ? ` • ${previewRow.Id}` : ""}`}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewRow(null);
        }}
      >
        {previewRow ? (
          <pre style={{ margin: 0, fontSize: 12, background: "rgba(15,23,42,0.04)", padding: 12, borderRadius: 10, overflow: "auto" }}>
            {JSON.stringify(previewRow, null, 2)}
          </pre>
        ) : null}
      </Modal>
    </div>
  );
}

/* ----------------------------
   Table helpers
---------------------------- */
function Th({ children, right }) {
  return (
    <th
      style={{
        textAlign: right ? "right" : "left",
        padding: "10px 10px",
        fontSize: 12,
        opacity: 0.75,
        fontWeight: 950,
        borderBottom: "1px solid rgba(15,23,42,0.10)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}
function Td({ children, right, colSpan }) {
  return (
    <td style={{ padding: "10px 10px", fontSize: 13, verticalAlign: "top", textAlign: right ? "right" : "left" }} colSpan={colSpan}>
      {children}
    </td>
  );
}