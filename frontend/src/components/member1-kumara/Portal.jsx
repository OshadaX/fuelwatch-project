// src/pages/member1-kumara/Portal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  Building2,
  UserRound,
  Droplets,
  Plus,
  Trash2,
  Save,
  Pencil,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Eye,
  Mail,
  Phone,
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8081/api";
const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

/* ----------------------------
   Logged-in manager email helper
---------------------------- */
const getManagerEmail = () => {
  try {
    const u = JSON.parse(localStorage.getItem("fuelwatch_user") || "null");
    return String(u?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
};

/* ----------------------------
   SweetAlert
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

/* ----------------------------
   Allowed Districts
---------------------------- */
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
   Validation Regex
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

/* ----------------------------
   ZOD Schema
---------------------------- */
const schema = z
  .object({
    Id: z.string().trim().regex(stationIdRegex, "Use PUCSL/PRL/1234/202X only"),
    Name: z
      .string()
      .trim()
      .regex(stationNameRegex, "Only letters + spaces (no numbers/special chars)"),
    Location: z
      .string()
      .trim()
      .min(1, "District is required")
      .refine(
        (v) => allowedDistricts.includes(v),
        "Select a valid Sri Lanka district (First letter capital)"
      ),

    person: z.object({
      Id: z
        .string()
        .trim()
        .regex(personIdRegex, "NIC must be 9 digits + V/v OR 12 digits"),
      PersonName: z
        .string()
        .trim()
        .regex(personNameRegex, "Use 2 names with capitals (Ex: Alen Smith)"),
      PersonDesignation: z
        .string()
        .trim()
        .regex(designationRegex, "Only MANAGER is allowed"),
      PersonEmail: z
        .string()
        .trim()
        .regex(gmailRegex, "Only xxxxx@gmail.com allowed (no capitals)"),
      ContactNumber: z
        .string()
        .trim()
        .regex(phoneRegex, "Use 071-1234-567 format (2nd digit cannot be 0)"),
      StartTime: z.string().trim().regex(timeRegex, "Select a time"),
      EndTime: z.string().trim().regex(timeRegex, "Select a time"),
    }),

    tanks: z
      .array(
        z.object({
          fuel_type: z
            .string()
            .trim()
            .min(1, "Fuel type is required")
            .refine(
              (v) => allowedFuelTypes.includes(v),
              "Select a valid fuel type from the list"
            ),
          number_of_tanks: z.coerce.number().int().min(1, "Min 1").max(50, "Max 50"),
          tank_index: z.coerce.number().int().min(1, "Min 1").max(200, "Too large"),
          tank_capacity: z.coerce
            .number()
            .min(500, "Min 500L")
            .max(100000, "Max 100000L"),
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
    (data.tanks || []).forEach((t, i) => {
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
   Time dropdown
---------------------------- */
const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const mins = i * 30;
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
});

/* ----------------------------
   UI helpers
---------------------------- */
const S = {
  app: { minHeight: "100vh", background: "#F3F6FB", color: "#0F172A" },
  wrap: { maxWidth: 1100, margin: "0 auto", padding: 16 },
  card: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 10,
    padding: 14,
  },
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
    if (tone === "primary") {
      return {
        ...base,
        background: "#2563EB",
        border: "1px solid #1D4ED8",
        color: "#fff",
      };
    }
    if (tone === "danger") {
      return {
        ...base,
        background: "rgba(220,38,38,0.08)",
        border: "1px solid rgba(220,38,38,0.22)",
        color: "#DC2626",
      };
    }
    if (tone === "soft") return { ...base, background: "rgba(15,23,42,0.04)" };
    return base;
  },
  label: { fontSize: 12.5, fontWeight: 900, marginBottom: 6 },
  inputWrap: (invalid) => ({
    borderRadius: 10,
    border: invalid
      ? "1px solid rgba(220,38,38,0.50)"
      : "1px solid rgba(15,23,42,0.12)",
    background: "#fff",
    padding: "10px 10px",
  }),
  input: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 14,
    background: "transparent",
  },
  err: { fontSize: 12, color: "#DC2626", marginTop: 6, fontWeight: 850 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  divider: { height: 1, background: "rgba(15,23,42,0.10)", margin: "12px 0" },
  modalBg: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    zIndex: 50,
  },
  modal: {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    zIndex: 60,
    width: "min(920px, calc(100vw - 28px))",
  },
};

function Field({ label, hint, error, children }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div style={S.label}>{label}</div>
        {hint ? <div style={{ fontSize: 12, opacity: 0.7 }}>{hint}</div> : null}
      </div>
      {children}
      {error ? <div style={S.err}>{error}</div> : null}
    </div>
  );
}

function Input({ invalid, icon: Icon, style = {}, ...props }) {
  return (
    <div style={S.inputWrap(invalid)}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {Icon ? <Icon size={18} style={{ opacity: 0.55, color: "#1D4ED8" }} /> : null}
        <input style={{ ...S.input, ...style }} {...props} />
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

export default function Portal() {
  const [activeStep, setActiveStep] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [stations, setStations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const isEditing = !!editingId;

  const [quickFuel, setQuickFuel] = useState("all");
  const [activeTab, setActiveTab] = useState("portal");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);

  const [pucslId, setPucslId] = useState("");

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

  async function fetchStations(nextPage = 1, q = "") {
    setLoadingList(true);
    try {
      const { data } = await http.get("/station", {
        params: { page: nextPage, limit: 10, q },
      });

      const items = Array.isArray(data) ? data : data.items || [];
      const onlyMine = q
        ? items.filter((s) => (s.Id || "").toUpperCase() === q.toUpperCase())
        : items;

      setStations(onlyMine);
      setTotal(q ? onlyMine.length : Array.isArray(data) ? data.length : data.total ?? items.length);
    } catch (e) {
      await alertErr("Failed", e?.response?.data?.message || "Failed to load stations");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchStations(1, "");
  }, []);

  async function askPUCSL() {
    const r = await MySwal.fire({
      icon: "info",
      title: "Enter your PUCSL Station ID",
      input: "text",
      inputPlaceholder: "PUCSL/PRL/0005/2026",
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      inputValidator: (val) => {
        const v = (val || "").trim().toUpperCase();
        if (!v) return "PUCSL ID is required";
        if (!stationIdRegex.test(v)) return "Invalid format. Use PUCSL/PRL/1234/202X";
        const formId = (getValues("Id") || "").trim().toUpperCase();
        if (formId && formId !== v) return "PUCSL must match the Station ID in Station Details";
        return null;
      },
      didOpen: () => {
        const input = Swal.getInput();
        if (input) input.style.textTransform = "uppercase";
      },
    });

    if (!r.isConfirmed) return false;

    const entered = (r.value || "").trim().toUpperCase();
    const formId = (getValues("Id") || "").trim().toUpperCase();

    if (!formId) setValue("Id", entered, { shouldValidate: true, shouldDirty: true });

    setPucslId(entered);
    return true;
  }

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

    if (!ok) return alertErr("Validation", "Please fix the highlighted fields.");
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function prevStep() {
    setActiveStep((s) => Math.max(s - 1, 0));
  }

  async function clearForm() {
    setEditingId(null);
    setActiveStep(0);
    setPucslId("");
    localStorage.removeItem("fuelwatch_portal_draft");
    reset(defaultValues);
    await alertOk("Done", "Form cleared");
  }

  async function onSubmit(payload) {
    try {
      const manager_email = getManagerEmail();

      if (!manager_email) {
        return alertErr("Unauthorized", "Login required: manager email not found in localStorage.");
      }

      const normalized = {
        ...payload,
        manager_email,

        Id: payload.Id.trim().toUpperCase(),
        person: {
          ...payload.person,
          Id: payload.person.Id.trim(),
          PersonEmail: payload.person.PersonEmail.trim().toLowerCase(),
          ContactNumber: payload.person.ContactNumber.trim(),
        },
        tanks: payload.tanks.map((t) => ({
          ...t,
          fuel_type: t.fuel_type.trim(),
        })),
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
      setActiveTab("registry");
    } catch (e) {
      await alertErr("Save failed", e?.response?.data?.message || "Save failed");
    }
  }

  async function startEdit(row) {
    const id = row._id || row.id;
    setEditingId(id);
    setActiveStep(0);
    setActiveTab("portal");

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
  }

  async function removeStation(id) {
    const ok = await confirmBox("Delete station?", "This action cannot be undone.");
    if (!ok) return;
    try {
      await http.delete(`/station/${id}`);
      await alertOk("Deleted", "Deleted successfully");
      fetchStations(1, pucslId || "");
    } catch (e) {
      await alertErr("Delete failed", e?.response?.data?.message || "Delete failed");
    }
  }

  const doneStation = !!getValues("Id") && !!getValues("Name") && !!getValues("Location");
  const donePerson =
    !!getValues("person.Id") &&
    !!getValues("person.PersonName") &&
    !!getValues("person.PersonDesignation") &&
    !!getValues("person.PersonEmail") &&
    !!getValues("person.ContactNumber") &&
    !!getValues("person.StartTime") &&
    !!getValues("person.EndTime");

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

  const canGoPerson = stationStepOk;
  const canGoTanks = stationStepOk && personStepOk;

  const shownStations = useMemo(() => {
    const base = stations || [];
    if (quickFuel === "all") return base;
    return base.filter((s) => (s.tanks || []).some((t) => t.fuel_type === quickFuel));
  }, [stations, quickFuel]);

  function exportStationsJSON() {
    const out = { exportedAt: new Date().toISOString(), total, items: stations };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stations_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={S.app}>
      <div style={S.wrap}>
        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ ...S.row, justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 980, fontSize: 18 }}>FuelWatch Portal</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                Fuelwatch - Filling Station Registering Dashboard
              </div>
            </div>
          </div>

          <div style={S.divider} />

          <div style={S.tabs}>
            <button
              type="button"
              style={S.tabBtn(activeTab === "portal")}
              onClick={() => setActiveTab("portal")}
            >
              Form
            </button>
            <button
              type="button"
              style={S.tabBtn(activeTab === "registry")}
              onClick={() => setActiveTab("registry")}
            >
              Registry
            </button>
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: 12 }}>
          <div style={{ ...S.row, justifyContent: "space-between" }}>
            <div />
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

        {activeTab === "portal" && (
          <div style={S.card}>
            <div style={{ ...S.row, justifyContent: "space-between" }}>
              <div style={{ fontWeight: 980 }}>
                {isEditing ? "Edit Station" : "Create Station"} • Step {activeStep + 1}/{steps.length}
              </div>

              <div style={S.row}>
                <button
                  type="button"
                  style={S.btn("soft")}
                  onClick={prevStep}
                  disabled={activeStep === 0}
                >
                  <ChevronLeft size={16} /> Back
                </button>

                {activeStep < steps.length - 1 ? (
                  <button
                    type="button"
                    style={S.btn("primary")}
                    onClick={nextStep}
                    disabled={(activeStep === 0 && !stationStepOk) || (activeStep === 1 && !personStepOk)}
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
                  <button
                    type="button"
                    style={S.btn("primary")}
                    onClick={handleSubmit(onSubmit)}
                    disabled={isSubmitting || !isValid}
                  >
                    <Save size={16} /> {isSubmitting ? "Saving..." : isEditing ? "Update Station" : "Register Station"}
                  </button>
                )}
              </div>
            </div>

            <div style={S.divider} />

            <div style={S.row}>
              {steps.map((s, idx) => {
                const Icon = s.icon;
                const locked = (idx === 1 && !canGoPerson) || (idx === 2 && !canGoTanks);
                const active = idx === activeStep;

                return (
                  <button
                    key={s.key}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (locked) {
                        alertErr(
                          "Complete previous step",
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
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={S.divider} />

            {activeStep === 0 && (
              <div style={S.grid3}>
                <Field label="Station Id" hint="Enter PUCSL ID" error={errors?.Id?.message}>
                  <Input
                    icon={Building2}
                    placeholder="Enter PUCSL ID"
                    invalid={!!errors?.Id}
                    {...register("Id", {
                      onChange: (e) => setValue("Id", e.target.value.toUpperCase()),
                    })}
                  />
                </Field>

                <Field label="Station Name" error={errors?.Name?.message}>
                  <Input
                    icon={Building2}
                    placeholder="Sample Filling Station"
                    invalid={!!errors?.Name}
                    {...register("Name")}
                  />
                </Field>

                <Field label="Location (District)" error={errors?.Location?.message}>
                  <Select icon={Filter} invalid={!!errors?.Location} {...register("Location")}>
                    <option value="">Select district...</option>
                    {allowedDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {activeStep === 1 && (
              <div style={S.grid2}>
                <Field label="NIC Number" error={errors?.person?.Id?.message}>
                  <Input
                    icon={UserRound}
                    placeholder="Enter NIC number"
                    invalid={!!errors?.person?.Id}
                    {...register("person.Id", {
                      onChange: (e) => setValue("person.Id", e.target.value),
                    })}
                  />
                </Field>

                <Field label="Contact Person Name" error={errors?.person?.PersonName?.message}>
                  <Input
                    icon={UserRound}
                    placeholder="First name & Last name"
                    invalid={!!errors?.person?.PersonName}
                    {...register("person.PersonName")}
                  />
                </Field>

                <Field label="Contact Person Designation" error={errors?.person?.PersonDesignation?.message}>
                  <Input
                    icon={Building2}
                    placeholder="Designation"
                    invalid={!!errors?.person?.PersonDesignation}
                    {...register("person.PersonDesignation", {
                      onChange: (e) =>
                        setValue("person.PersonDesignation", e.target.value.toUpperCase()),
                    })}
                  />
                </Field>

                <Field
                  label="Responsible Person's Email"
                  hint="This address will receive email alerts"
                  error={errors?.person?.PersonEmail?.message}
                >
                  <Input
                    icon={Mail}
                    placeholder="Emergency Notification Email"
                    invalid={!!errors?.person?.PersonEmail}
                    style={{ color: "#EA580C" }}
                    {...register("person.PersonEmail", {
                      onChange: (e) =>
                        setValue("person.PersonEmail", e.target.value.toLowerCase()),
                    })}
                  />
                </Field>

                <Field label="Contact Number" error={errors?.person?.ContactNumber?.message}>
                  <Input
                    icon={Phone}
                    placeholder="071-1234-567"
                    invalid={!!errors?.person?.ContactNumber}
                    {...register("person.ContactNumber")}
                  />
                </Field>

                <div style={S.grid2}>
                  <Field label="Start Time" error={errors?.person?.StartTime?.message}>
                    <Select invalid={!!errors?.person?.StartTime} {...register("person.StartTime")}>
                      <option value="">Select...</option>
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="End Time" error={errors?.person?.EndTime?.message}>
                    <Select invalid={!!errors?.person?.EndTime} {...register("person.EndTime")}>
                      <option value="">Select...</option>
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div>
                <div style={{ ...S.row, justifyContent: "space-between" }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    Fuel type locked • unique tank index per fuel type
                  </div>
                  <button
                    type="button"
                    style={S.btn("primary")}
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
                  </button>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {fields.map((f, idx) => (
                    <div
                      key={f.id}
                      style={{ ...S.card, padding: 12, background: "rgba(15,23,42,0.02)" }}
                    >
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
                          <Select
                            icon={Droplets}
                            invalid={!!errors?.tanks?.[idx]?.fuel_type}
                            {...register(`tanks.${idx}.fuel_type`)}
                          >
                            <option value="">Select fuel type...</option>
                            {allowedFuelTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </Select>
                        </Field>

                        <Field
                          label="No. of Tanks"
                          error={errors?.tanks?.[idx]?.number_of_tanks?.message}
                        >
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            invalid={!!errors?.tanks?.[idx]?.number_of_tanks}
                            {...register(`tanks.${idx}.number_of_tanks`)}
                          />
                        </Field>

                        <Field label="Tank Index" error={errors?.tanks?.[idx]?.tank_index?.message}>
                          <Input
                            type="number"
                            min="1"
                            max="200"
                            invalid={!!errors?.tanks?.[idx]?.tank_index}
                            {...register(`tanks.${idx}.tank_index`)}
                          />
                        </Field>

                        <Field
                          label="Tank Capacity (L)"
                          error={errors?.tanks?.[idx]?.tank_capacity?.message}
                        >
                          <Input
                            type="number"
                            min="500"
                            max="100000"
                            step="1"
                            invalid={!!errors?.tanks?.[idx]?.tank_capacity}
                            {...register(`tanks.${idx}.tank_capacity`)}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "registry" && (
          <>
            {!pucslId ? (
              <div style={S.card}>
                <div style={{ fontWeight: 950 }}>Registry is locked</div>
                <div style={S.divider} />
                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  Enter your PUCSL Station ID to view your station details only.
                </div>
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    style={S.btn("primary")}
                    onClick={async () => {
                      const ok = await askPUCSL();
                      if (ok) fetchStations(1, (getValues("Id") || "").trim().toUpperCase());
                    }}
                  >
                    Enter PUCSL ID
                  </button>

                  <button
                    type="button"
                    style={{ ...S.btn("soft"), marginLeft: 8 }}
                    onClick={() => setActiveTab("portal")}
                  >
                    Back to Form
                  </button>
                </div>
              </div>
            ) : (
              <div style={S.card}>
                <div style={{ ...S.row, justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 980 }}>Registered Station</div>
                  <div style={S.row}>
                    <button
                      type="button"
                      style={S.btn("soft")}
                      onClick={() => fetchStations(1, pucslId)}
                      disabled={loadingList}
                    >
                      <RefreshCw size={16} /> Refresh
                    </button>

                    <button
                      type="button"
                      style={S.btn("soft")}
                      onClick={exportStationsJSON}
                      disabled={loadingList || !stations.length}
                    >
                      <Download size={16} /> Export JSON
                    </button>

                    <button
                      type="button"
                      style={S.btn("danger")}
                      onClick={async () => {
                        setPucslId("");
                        await alertInfo("Locked", "Registry locked again. Enter PUCSL ID to view.");
                      }}
                    >
                      <X size={16} /> Lock
                    </button>
                  </div>
                </div>

                <div style={S.divider} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 10 }}>
                  <div style={S.inputWrap(false)}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Filter size={18} style={{ opacity: 0.55, color: "#1D4ED8" }} />
                      <select
                        style={{ ...S.input, cursor: "pointer" }}
                        value={quickFuel}
                        onChange={(e) => setQuickFuel(e.target.value)}
                      >
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
                    onClick={() => fetchStations(1, pucslId)}
                    disabled={loadingList}
                  >
                    Search
                  </button>
                </div>

                {loadingList ? (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Loading…</div>
                ) : null}

                <div style={S.divider} />

                {shownStations.length === 0 ? (
                  <div style={{ fontSize: 13, opacity: 0.75 }}>
                    No station found for PUCSL ID: <b>{pucslId}</b>
                  </div>
                ) : (
                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid rgba(15,23,42,0.10)",
                      borderRadius: 10,
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                      <thead>
                        <tr style={{ background: "rgba(15,23,42,0.04)" }}>
                          <Th>Station</Th>
                          <Th>Id</Th>
                          <Th>Location</Th>
                          <Th>Contact</Th>
                          <Th>Tanks</Th>
                          <Th right>Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {shownStations.map((s, idx) => (
                          <tr
                            key={s._id || idx}
                            style={{ borderTop: "1px solid rgba(15,23,42,0.10)" }}
                          >
                            <Td>
                              <b>{s.Name}</b>
                              <div style={{ fontSize: 12, opacity: 0.7 }}>
                                {s.person?.PersonDesignation || "—"}
                              </div>
                            </Td>
                            <Td>{s.Id}</Td>
                            <Td>{s.Location}</Td>
                            <Td>
                              <b>{s.person?.PersonName || "—"}</b>
                              <div style={{ fontSize: 12, opacity: 0.7 }}>
                                {s.person?.ContactNumber || "—"}
                              </div>
                            </Td>
                            <Td>{(s.tanks || []).length}</Td>
                            <Td right>
                              <button
                                style={S.btn("soft")}
                                onClick={() => {
                                  setPreviewRow(s);
                                  setPreviewOpen(true);
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button style={S.btn()} onClick={() => startEdit(s)}>
                                <Pencil size={16} />
                              </button>
                              <button
                                style={S.btn("danger")}
                                onClick={() => removeStation(s._id || s.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={previewOpen}
        title={`Station Preview${previewRow?.Id ? ` • ${previewRow.Id}` : ""}`}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewRow(null);
        }}
      >
        {previewRow ? (
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              background: "rgba(15,23,42,0.04)",
              padding: 12,
              borderRadius: 10,
              overflow: "auto",
            }}
          >
            {JSON.stringify(previewRow, null, 2)}
          </pre>
        ) : null}
      </Modal>

      <style>{`
        @media (max-width: 980px){
          .grid2, .grid3, .grid4 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

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
    <td
      style={{
        padding: "10px 10px",
        fontSize: 13,
        verticalAlign: "top",
        textAlign: right ? "right" : "left",
      }}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}