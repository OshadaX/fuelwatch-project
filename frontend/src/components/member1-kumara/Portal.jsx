// src/pages/member1-kumara/Portal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast, { Toaster } from "react-hot-toast";
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
      PersonDesignation: z
        .string()
        .trim()
        .min(2, "Designation is required")
        .max(50, "Max 50 characters"),
      PersonEmail: z.string().trim().email("Valid email required"),
      ContactNumber: z
        .string()
        .trim()
        .regex(phoneRegex, "Use 0XXXXXXXXX or +94XXXXXXXXX"),
      StartTime: z
        .string()
        .trim()
        .regex(timeRegex, "Time must be HH:mm (24-hour)"),
      EndTime: z
        .string()
        .trim()
        .regex(timeRegex, "Time must be HH:mm (24-hour)"),
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
          tank_capacity: z
            .coerce
            .number()
            .min(500, "Capacity too low (min 500L)")
            .max(100000, "Capacity too high (max 100000L)"),
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
  { key: "station", title: "Station", icon: Building2 },
  { key: "person", title: "Contact Person", icon: UserRound },
  { key: "tanks", title: "Tanks", icon: Droplets },
];

// Small UI helpers
function Card({ children, style }) {
  return (
    <div
      style={{
        borderRadius: 18,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({ variant = "ghost", children, style, disabled, ...props }) {
  const base = {
    borderRadius: 14,
    padding: "10px 14px",
    border: "1px solid rgba(0,0,0,0.10)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.15s ease",
    opacity: disabled ? 0.6 : 1,
    userSelect: "none",
  };

  const theme = {
    primary: { background: "#111", color: "#fff" },
    ghost: { background: "#fff", color: "#111" },
    danger: {
      background: "#fff",
      color: "#b42318",
      border: "1px solid rgba(180,35,24,0.25)",
    },
  }[variant];

  return (
    <button style={{ ...base, ...theme, ...style }} disabled={disabled} {...props}>
      {children}
    </button>
  );
}

function Input({ invalid, style, ...props }) {
  return (
    <input
      style={{
        width: "100%",
        borderRadius: 14,
        border: invalid ? "1px solid rgba(180,35,24,0.55)" : "1px solid rgba(0,0,0,0.12)",
        padding: "10px 12px",
        outline: "none",
        background: "#fff",
        ...style,
      }}
      {...props}
    />
  );
}

function Select({ invalid, style, children, ...props }) {
  return (
    <select
      style={{
        width: "100%",
        borderRadius: 14,
        border: invalid ? "1px solid rgba(180,35,24,0.55)" : "1px solid rgba(0,0,0,0.12)",
        padding: "10px 12px",
        outline: "none",
        background: "#fff",
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  );
}

function Label({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{children}</div>
      {right ? <div style={{ fontSize: 12, opacity: 0.55 }}>{right}</div> : null}
    </div>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return <div style={{ fontSize: 12, color: "#b42318", marginTop: 4 }}>{children}</div>;
}

function Badge({ children }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.10)",
        background: "rgba(0,0,0,0.04)",
      }}
    >
      {children}
    </span>
  );
}

function StepChip({ active, done, icon: Icon, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 18,
        padding: "10px 12px",
        border: "1px solid rgba(0,0,0,0.10)",
        background: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 26,
          height: 26,
          borderRadius: 12,
          background: active ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
        }}
      >
        <Icon size={16} />
      </span>
      <span style={{ fontWeight: 800, fontSize: 13 }}>{title}</span>
      {done && !active ? <Badge>Done</Badge> : null}
    </button>
  );
}

// Pretty validation status chip
function ValidityChip({ ok, text }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.10)",
        background: ok ? "rgba(22,163,74,0.08)" : "rgba(180,35,24,0.08)",
        color: ok ? "#166534" : "#7f1d1d",
        fontWeight: 700,
      }}
    >
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {text}
    </span>
  );
}

export default function Portal() {
  const [activeStep, setActiveStep] = useState(0);

  const [loadingList, setLoadingList] = useState(false);
  const [stations, setStations] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const isEditing = !!editingId;

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
      // normalize Station Id on frontend too (matches backend)
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

  // Helpful “live validity” chips
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

  return (
    <>
      <Toaster position="top-right" />

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14 }}>
        {/* LEFT: Form */}
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Fuelwatch Portal</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Register filling stations • contact person • tank details
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ValidityChip ok={stationStepOk} text="Station Valid" />
                <ValidityChip ok={personStepOk} text="Contact Valid" />
                <ValidityChip ok={tanksStepOk} text="Tanks Valid" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {isEditing ? <Badge>Editing</Badge> : null}
              <Button type="button" onClick={clearForm}>
                <X size={16} /> Clear
              </Button>

              {/* Disable save until whole form valid */}
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || !isValid}
                title={!isValid ? "Fix all validation errors before saving" : ""}
              >
                <Save size={16} />{" "}
                {isSubmitting ? "Saving..." : isEditing ? "Update" : "Register"}
              </Button>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {steps.map((s, idx) => (
              <StepChip
                key={s.key}
                title={s.title}
                icon={s.icon}
                active={idx === activeStep}
                done={(idx === 0 && stationStepOk) || (idx === 1 && personStepOk) || (idx === 2 && tanksStepOk)}
                onClick={() => setActiveStep(idx)}
              />
            ))}
          </div>

          {/* Step content */}
          <div style={{ marginTop: 18 }}>
            {activeStep === 0 && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ fontWeight: 900 }}>Station Details</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  <div>
                    <Label>Station Id</Label>
                    <Input
                      placeholder="e.g. ST-0001"
                      {...register("Id", {
                        onChange: (e) => setValue("Id", e.target.value.toUpperCase()),
                      })}
                      invalid={!!errors?.Id}
                    />
                    <ErrorText>{errors?.Id?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Station Name</Label>
                    <Input placeholder="e.g. Lanka IOC - Borella" {...register("Name")} invalid={!!errors?.Name} />
                    <ErrorText>{errors?.Name?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Location</Label>
                    <Input placeholder="e.g. Colombo 08" {...register("Location")} invalid={!!errors?.Location} />
                    <ErrorText>{errors?.Location?.message}</ErrorText>
                  </div>
                </div>

                <Card style={{ background: "#fafafa" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Required format: <b>ST-0001</b> (A–Z, 0–9, hyphen). This must be unique in the system.
                  </div>
                </Card>
              </div>
            )}

            {activeStep === 1 && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ fontWeight: 900 }}>Contact Person</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  <div>
                    <Label>Person Id</Label>
                    <Input
                      placeholder="e.g. P-100"
                      {...register("person.Id", {
                        onChange: (e) => setValue("person.Id", e.target.value.toUpperCase()),
                      })}
                      invalid={!!errors?.person?.Id}
                    />
                    <ErrorText>{errors?.person?.Id?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Person Name</Label>
                    <Input placeholder="e.g. Kumara Perera" {...register("person.PersonName")} invalid={!!errors?.person?.PersonName} />
                    <ErrorText>{errors?.person?.PersonName?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Designation</Label>
                    <Input placeholder="e.g. Station Manager" {...register("person.PersonDesignation")} invalid={!!errors?.person?.PersonDesignation} />
                    <ErrorText>{errors?.person?.PersonDesignation?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input placeholder="e.g. manager@station.com" {...register("person.PersonEmail")} invalid={!!errors?.person?.PersonEmail} />
                    <ErrorText>{errors?.person?.PersonEmail?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Contact Number</Label>
                    <Input
                      placeholder="e.g. 0771234567 or +94771234567"
                      {...register("person.ContactNumber")}
                      invalid={!!errors?.person?.ContactNumber}
                    />
                    <ErrorText>{errors?.person?.ContactNumber?.message}</ErrorText>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <Label>Start Time</Label>
                      <Input type="time" {...register("person.StartTime")} invalid={!!errors?.person?.StartTime} />
                      <ErrorText>{errors?.person?.StartTime?.message}</ErrorText>
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input type="time" {...register("person.EndTime")} invalid={!!errors?.person?.EndTime} />
                      <ErrorText>{errors?.person?.EndTime?.message}</ErrorText>
                    </div>
                  </div>
                </div>

                <Card style={{ background: "#fafafa" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Validation rules: valid email • Sri Lanka phone • End time must be after start time.
                  </div>
                </Card>
              </div>
            )}

            {activeStep === 2 && (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>Tank Details</div>
                  <Button
                    type="button"
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
                  </Button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {fields.map((f, idx) => (
                    <Card key={f.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ fontWeight: 800 }}>Tank #{idx + 1}</div>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                          title={fields.length === 1 ? "At least one tank required" : "Remove"}
                        >
                          <Trash2 size={16} /> Remove
                        </Button>
                      </div>

                      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                        <div>
                          <Label>Fuel Type</Label>
                          <Select {...register(`tanks.${idx}.fuel_type`)} invalid={!!errors?.tanks?.[idx]?.fuel_type}>
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
                          <Input type="number" min="1" max="50" {...register(`tanks.${idx}.number_of_tanks`)} invalid={!!errors?.tanks?.[idx]?.number_of_tanks} />
                          <ErrorText>{errors?.tanks?.[idx]?.number_of_tanks?.message}</ErrorText>
                        </div>

                        <div>
                          <Label>Tank Index</Label>
                          <Input type="number" min="1" max="200" {...register(`tanks.${idx}.tank_index`)} invalid={!!errors?.tanks?.[idx]?.tank_index} />
                          <ErrorText>{errors?.tanks?.[idx]?.tank_index?.message}</ErrorText>
                        </div>

                        <div>
                          <Label>Tank Capacity (L)</Label>
                          <Input type="number" min="500" max="100000" step="1" {...register(`tanks.${idx}.tank_capacity`)} invalid={!!errors?.tanks?.[idx]?.tank_capacity} />
                          <ErrorText>{errors?.tanks?.[idx]?.tank_capacity?.message}</ErrorText>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
                        Rule: Tank index must be unique per fuel type (no duplicates).
                      </div>
                    </Card>
                  ))}
                </div>

                <Card style={{ background: "#fafafa" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Validation rules: choose fuel type • capacity min 500L • unique tank index per fuel type.
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Wizard buttons */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button type="button" onClick={prevStep} disabled={activeStep === 0}>
              Back
            </Button>

            {activeStep < steps.length - 1 ? (
              <Button type="button" variant="primary" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit(onSubmit)}
                disabled={isSubmitting || !isValid}
                title={!isValid ? "Fix all validation errors before saving" : ""}
              >
                <Save size={16} /> {isSubmitting ? "Saving..." : isEditing ? "Update Station" : "Register Station"}
              </Button>
            )}
          </div>
        </Card>

        {/* RIGHT: List */}
        <div style={{ display: "grid", gap: 14 }}>
          <Card style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900 }}>Registered Stations</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{total} total</div>
              </div>

              <Button type="button" onClick={() => fetchStations(page, q)} disabled={loadingList} style={{ padding: "10px 12px" }}>
                <RefreshCw size={16} /> Refresh
              </Button>
            </div>

            {/* Search */}
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: 11, opacity: 0.5 }}>
                  <Search size={16} />
                </span>
                <Input
                  style={{ paddingLeft: 36 }}
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

              <Button
                type="button"
                onClick={() => {
                  setPage(1);
                  fetchStations(1, q);
                }}
                disabled={loadingList}
              >
                Search
              </Button>
            </div>

            {/* Results */}
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {stations.map((s) => (
                <Card key={s._id} style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>{s.Name}</div>
                        <Badge>{s.Id}</Badge>
                      </div>

                      <div style={{ marginTop: 4, fontSize: 13, opacity: 0.75 }}>{s.Location}</div>

                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
                        Person: {s.person?.PersonName} • {s.person?.PersonDesignation} • {s.person?.PersonEmail}
                      </div>

                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(s.tanks || []).slice(0, 4).map((t, i) => (
                          <Badge key={i}>
                            {t.fuel_type} • idx {t.tank_index} • {t.tank_capacity}L
                          </Badge>
                        ))}
                        {(s.tanks || []).length > 4 ? <Badge>+{(s.tanks || []).length - 4} more</Badge> : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <Button type="button" onClick={() => startEdit(s)}>
                        <Pencil size={16} /> Edit
                      </Button>
                      <Button type="button" variant="danger" onClick={() => removeStation(s._id || s.id)}>
                        <Trash2 size={16} /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {stations.length === 0 ? (
                <Card style={{ background: "#fff" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>No stations found.</div>
                </Card>
              ) : null}
            </div>

            {/* Pagination */}
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                type="button"
                disabled={page <= 1}
                onClick={() => {
                  const p = page - 1;
                  setPage(p);
                  fetchStations(p, q);
                }}
              >
                Prev
              </Button>

              <div style={{ fontSize: 13, opacity: 0.7 }}>
                Page <b>{page}</b> / {pages}
              </div>

              <Button
                type="button"
                disabled={page >= pages}
                onClick={() => {
                  const p = page + 1;
                  setPage(p);
                  fetchStations(p, q);
                }}
              >
                Next
              </Button>
            </div>
          </Card>

          <Card style={{ padding: 18 }}>
            <div style={{ fontWeight: 900 }}>Included UI/UX Features</div>
            <ul style={{ marginTop: 8, paddingLeft: 18, opacity: 0.75, fontSize: 13, display: "grid", gap: 6 }}>
              <li>Multi-step wizard with strict validation (cannot save unless valid)</li>
              <li>Station ID format validation + uppercase normalization</li>
              <li>Person email + Sri Lanka phone validation</li>
              <li>End time must be after start time</li>
              <li>Fuel type dropdown (no free-text)</li>
              <li>Tank index unique per fuel type + capacity bounds</li>
              <li>Create + Update + Delete</li>
              <li>Search + pagination</li>
              <li>Autosave draft for new registration</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 980px){
          div[style*="grid-template-columns: 1.1fr 0.9fr"]{ grid-template-columns: 1fr !important; }
          div[style*="repeat(3, 1fr)"]{ grid-template-columns: 1fr !important; }
          div[style*="repeat(2, 1fr)"]{ grid-template-columns: 1fr !important; }
          div[style*="repeat(4, 1fr)"]{ grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
