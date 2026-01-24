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
} from "lucide-react";

/**
 * ✅ Backend endpoint base: /api/station  (UPDATED)
 * - GET    /api/station            (list, supports ?page&limit&q)
 * - POST   /api/station            (create)
 * - PUT    /api/station/:id        (update)
 * - DELETE /api/station/:id        (delete)
 *
 * If your backend returns either:
 *  A) { items: [], total: number, page, limit, pages }
 *  B) []  (simple array)
 * This component supports both.
 */

// Change this if needed
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8081/api";

// Axios client
const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Validation schema (based on your required fields)
const schema = z.object({
  Id: z.string().min(1, "Station Id is required"),
  Name: z.string().min(1, "Station name is required"),
  Location: z.string().min(1, "Location is required"),

  person: z.object({
    Id: z.string().min(1, "Person Id is required"),
    PersonName: z.string().min(1, "Person name is required"),
    PersonDesignation: z.string().min(1, "Designation is required"),
    PersonEmail: z.string().email("Valid email required"),
    ContactNumber: z.string().min(7, "Valid contact number required"),
    StartTime: z.string().min(1, "Start time required"),
    EndTime: z.string().min(1, "End time required"),
  }),

  tanks: z
    .array(
      z.object({
        fuel_type: z.string().min(1, "Fuel type required"),
        number_of_tanks: z.coerce.number().int().min(1, "Min 1"),
        tank_index: z.coerce.number().int().min(1, "Min 1"),
        tank_capacity: z.coerce.number().min(0, "Must be >= 0"),
      })
    )
    .min(1, "At least one tank is required"),
});

const steps = [
  { key: "station", title: "Station", icon: Building2 },
  { key: "person", title: "Contact Person", icon: UserRound },
  { key: "tanks", title: "Tanks", icon: Droplets },
];

// Small UI helpers (no extra files needed)
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
    <button
      style={{ ...base, ...theme, ...style }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ style, ...props }) {
  return (
    <input
      style={{
        width: "100%",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.12)",
        padding: "10px 12px",
        outline: "none",
        background: "#fff",
        ...style,
      }}
      {...props}
    />
  );
}

function Label({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>
        {children}
      </div>
      {right ? <div style={{ fontSize: 12, opacity: 0.55 }}>{right}</div> : null}
    </div>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return (
    <div style={{ fontSize: 12, color: "#b42318", marginTop: 4 }}>
      {children}
    </div>
  );
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
      tanks: [
        { fuel_type: "", number_of_tanks: 1, tank_index: 1, tank_capacity: 0 },
      ],
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
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    defaultValues,
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "tanks" });

  // autosave draft (only in create mode)
  useEffect(() => {
    const sub = watch((val) => {
      if (!isEditing)
        localStorage.setItem("fuelwatch_portal_draft", JSON.stringify(val));
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

  // ✅ UPDATED endpoint: /station
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

  // ✅ UPDATED endpoint: /station
  async function onSubmit(payload) {
    try {
      if (isEditing) {
        await http.put(`/station/${editingId}`, payload);
        toast.success("Station updated!");
      } else {
        await http.post("/station", payload);
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
      tanks: (row.tanks?.length ? row.tanks : defaultValues.tanks).map(
        (t) => ({
          fuel_type: t.fuel_type ?? "",
          number_of_tanks: t.number_of_tanks ?? 1,
          tank_index: t.tank_index ?? 1,
          tank_capacity: t.tank_capacity ?? 0,
        })
      ),
    });

    toast("Editing mode enabled");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ✅ UPDATED endpoint: /station
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

  const doneStation =
    !!getValues("Id") && !!getValues("Name") && !!getValues("Location");
  const donePerson =
    !!getValues("person.Id") &&
    !!getValues("person.PersonName") &&
    !!getValues("person.PersonDesignation") &&
    !!getValues("person.PersonEmail") &&
    !!getValues("person.ContactNumber") &&
    !!getValues("person.StartTime") &&
    !!getValues("person.EndTime");
  const doneTanks = (getValues("tanks") || []).length > 0;

  return (
    <>
      <Toaster position="top-right" />

      {/* This component is designed to render INSIDE your dashboard content area */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14 }}>
        {/* LEFT: Form */}
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Fuelwatch Portal</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Register filling stations • contact person • tank details
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {isEditing ? <Badge>Editing</Badge> : null}
              <Button type="button" onClick={clearForm}>
                <X size={16} /> Clear
              </Button>
              <Button type="button" variant="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                <Save size={16} /> {isSubmitting ? "Saving..." : isEditing ? "Update" : "Register"}
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
                done={(idx === 0 && doneStation) || (idx === 1 && donePerson) || (idx === 2 && doneTanks)}
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
                    <Input placeholder="e.g. ST-0001" {...register("Id")} />
                    <ErrorText>{errors?.Id?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Station Name</Label>
                    <Input placeholder="e.g. Lanka IOC - Borella" {...register("Name")} />
                    <ErrorText>{errors?.Name?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Location</Label>
                    <Input placeholder="e.g. Colombo 08" {...register("Location")} />
                    <ErrorText>{errors?.Location?.message}</ErrorText>
                  </div>
                </div>

                <Card style={{ background: "#fafafa" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Tip: Use a consistent Station Id format (ST-0001) so it’s easy to search later.
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
                    <Input placeholder="e.g. P-100" {...register("person.Id")} />
                    <ErrorText>{errors?.person?.Id?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Person Name</Label>
                    <Input placeholder="e.g. Kumara Perera" {...register("person.PersonName")} />
                    <ErrorText>{errors?.person?.PersonName?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Designation</Label>
                    <Input placeholder="e.g. Station Manager" {...register("person.PersonDesignation")} />
                    <ErrorText>{errors?.person?.PersonDesignation?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input placeholder="e.g. manager@station.com" {...register("person.PersonEmail")} />
                    <ErrorText>{errors?.person?.PersonEmail?.message}</ErrorText>
                  </div>

                  <div>
                    <Label>Contact Number</Label>
                    <Input placeholder="e.g. 0771234567" {...register("person.ContactNumber")} />
                    <ErrorText>{errors?.person?.ContactNumber?.message}</ErrorText>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <Label>Start Time</Label>
                      <Input type="time" {...register("person.StartTime")} />
                      <ErrorText>{errors?.person?.StartTime?.message}</ErrorText>
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input type="time" {...register("person.EndTime")} />
                      <ErrorText>{errors?.person?.EndTime?.message}</ErrorText>
                    </div>
                  </div>
                </div>

                <Card style={{ background: "#fafafa" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Tip: Start/End time can represent office hours for the station contact person.
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
                        tank_capacity: 0,
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
                          <Input placeholder="e.g. Lanka Auto Diesel" {...register(`tanks.${idx}.fuel_type`)} />
                          <ErrorText>{errors?.tanks?.[idx]?.fuel_type?.message}</ErrorText>
                        </div>

                        <div>
                          <Label>No. of Tanks</Label>
                          <Input type="number" min="1" {...register(`tanks.${idx}.number_of_tanks`)} />
                          <ErrorText>{errors?.tanks?.[idx]?.number_of_tanks?.message}</ErrorText>
                        </div>

                        <div>
                          <Label>Tank Index</Label>
                          <Input type="number" min="1" {...register(`tanks.${idx}.tank_index`)} />
                          <ErrorText>{errors?.tanks?.[idx]?.tank_index?.message}</ErrorText>
                        </div>

                        <div>
                          <Label>Tank Capacity (L)</Label>
                          <Input type="number" min="0" step="0.01" {...register(`tanks.${idx}.tank_capacity`)} />
                          <ErrorText>{errors?.tanks?.[idx]?.tank_capacity?.message}</ErrorText>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card style={{ background: "#fafafa" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Tip: Use tank_index to uniquely identify tanks per fuel type (e.g., Diesel tank 1, 2, etc.).
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
              <Button type="button" variant="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
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
              <li>Multi-step wizard (Station → Person → Tanks)</li>
              <li>Live validation + clean errors</li>
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
