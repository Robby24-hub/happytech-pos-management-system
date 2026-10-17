import "./Administration.css";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Card,
  Button,
  SearchField,
  Select,
  Modal,
  Field,
  Badge,
  Empty,
} from "../../components/UI";
import { dateTime } from "../../data/mock";
export default function Administration({ state, update, user, notify, page }) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All Roles"),
    [edit, setEdit] = useState(null),
    [draft, setDraft] = useState({
      name: "",
      pin: "",
      role: "Admin",
      active: true,
    }),
    [error, setError] = useState("");
  const open = (u) => {
    setDraft(u ? { ...u } : { name: "", pin: "", role: "Admin", active: true });
    setEdit(true);
    setError("");
  };
  const logs = state.logs.filter((l) =>
    (l.action + " " + l.actor).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className="main">
      <div className="mb-5">
        <p className="eyebrow">
          {page === "logs" ? "STORE ACTIVITY" : "SUPER ADMIN"}
        </p>
        <h2 className="text-2xl">
          {page === "logs" ? "Activity Logs" : "User Management"}
        </h2>
        <p className="helper mt-2">
          {page === "logs"
            ? "Recent account and store activity."
            : "Manage accounts and their access."}
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="table-controls">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={
              page === "logs"
                ? "Search activity or user..."
                : "Search accounts..."
            }
          />
          {page !== "logs" && (
            <>
              <Select
                label="Account role"
                value={filter}
                onChange={setFilter}
                options={["All Roles", "Super Admin", "Admin", "Cashier"]}
              />
              <Button primary onClick={() => open()}>
                <Plus size={18} />
                Add Account
              </Button>
            </>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {(page === "logs"
                  ? ["Date & Time", "User", "Action"]
                  : ["Name", "Role", "Status", "Actions"]
                ).map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page === "logs"
                ? logs.map((l) => (
                    <tr key={l.id}>
                      <td>{dateTime(l.date)}</td>
                      <td>{l.actor}</td>
                      <td>{l.action}</td>
                    </tr>
                  ))
                : state.users
                    .filter(
                      (u) =>
                        u.name.toLowerCase().includes(search.toLowerCase()) &&
                        (filter === "All Roles" || filter === u.role),
                    )
                    .map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.role}</td>
                        <td>
                          <Badge tone={u.active ? "green" : "gray"}>
                            {u.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex gap-3">
                            <Button onClick={() => open(u)}>
                              Edit / Reset PIN
                            </Button>
                            <Button
                              disabled={u.id === user.id}
                              onClick={() => {
                                update(
                                  (s) => ({
                                    ...s,
                                    users: s.users.map((x) =>
                                      x.id === u.id
                                        ? { ...x, active: !x.active }
                                        : x,
                                    ),
                                  }),
                                  `${u.active ? "Deactivated" : "Reactivated"} ${u.name}`,
                                );
                                notify("Account updated");
                              }}
                            >
                              {u.active ? "Deactivate" : "Reactivate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
          {page === "logs" && !logs.length && (
            <Empty>
              No activity recorded yet. Complete a sale or edit a product to see
              logs.
            </Empty>
          )}
        </div>
      </Card>
      {edit && (
        <Modal
          title={draft.id ? "Edit Account" : "Add Account"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\d{4}$/.test(draft.pin)) {
                setError("PIN must contain exactly 4 digits.");
                return;
              }
              const u = { ...draft, id: draft.id || crypto.randomUUID() };
              update(
                (s) => ({
                  ...s,
                  users: draft.id
                    ? s.users.map((x) => (x.id === u.id ? u : x))
                    : [...s.users, u],
                }),
                `${draft.id ? "Updated" : "Created"} account ${u.name}`,
              );
              setEdit(null);
              notify("Account saved");
            }}
          >
            <Field
              label="Full Name"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Field label="Role">
              <select
                disabled={draft.id === user.id}
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              >
                {["Super Admin", "Admin", "Cashier"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field
              label="4-digit PIN"
              required
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={draft.pin}
              onChange={(e) =>
                setDraft({ ...draft, pin: e.target.value.replace(/\D/g, "") })
              }
            />
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <Button type="button" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button primary>Save Account</Button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
