import { useState } from "react";
import { KeyRound, Pencil, Plus, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from "@/components/common/PageHeader";
import { formatDate } from "@/lib/calc";
import { roleLabels, roles, type Role } from "@/lib/permissions";
import { notify } from "@/lib/result";
import { useStore, type AppUser } from "@/store/useStore";

const roleHelp: Record<Role, string> = {
  ADMIN: "Everything, including users and company settings",
  MANAGER: "All operations, sales and invoicing; no users or settings",
  ACCOUNTS: "Customers, quotations, sales orders, invoices and payments; read-only operations",
  TECHNICIAN: "Their own jobs and attendance; read-only stock",
};

type Form = { name: string; email: string; role: Role; password: string; active: boolean };
const blank: Form = { name: "", email: "", role: "TECHNICIAN", password: "", active: true };

const UsersPage = () => {
  const users = useStore((s) => s.users);
  const me = useStore((s) => s.user);
  const store = useStore.getState;
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState(false);

  const open = (user: AppUser | null) => {
    setEditing(user);
    setCreating(!user);
    setForm(user ? { name: user.name, email: user.email, role: user.role, password: "", active: user.active } : blank);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = editing
      ? await store().updateUser(editing.id, {
          name: form.name,
          role: form.role,
          active: form.active,
          ...(form.password ? { password: form.password } : {}),
        })
      : await store().createUser({ name: form.name, email: form.email, role: form.role, password: form.password });
    setBusy(false);
    if (notify(r, editing ? `${form.name} updated` : `${form.name} can now sign in`)) close();
  };

  const isSelf = editing?.id === me?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Who can sign in, and what each role can do."
        actions={
          <Button onClick={() => open(null)}>
            <Plus className="mr-2 h-4 w-4" /> Add user
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((role) => (
          <Card key={role}>
            <CardContent className="p-4">
              <p className="text-sm font-medium">
                {roleLabels[role]} <span className="text-muted-foreground">· {users.filter((u) => u.role === role && u.active).length}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{roleHelp[role]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={u.active ? "" : "opacity-60"}>
                    <TableCell className="font-medium">
                      {u.name} {u.id === me?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{roleLabels[u.role]}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "secondary" : "outline"}>{u.active ? "Active" : "Disabled"}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(u.createdAt.slice(0, 10))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" aria-label={`Edit ${u.name}`} onClick={() => open(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={creating || editing !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" /> {editing ? `Edit ${editing.name}` : "Add user"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Leave the password blank to keep the current one." : "Share the password with them securely; they can change it after signing in."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="user-name">Full name</Label>
              <Input id="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              {form.role === "TECHNICIAN" && (
                <p className="text-xs text-muted-foreground">Technicians are assigned to jobs by this name.</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={Boolean(editing)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="user-role">Role</Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role: role as Role })} disabled={isSelf}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{roleHelp[form.role]}</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="user-password" className="flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5" /> {editing ? "Reset password" : "Password"}
              </Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                placeholder={editing ? "Unchanged" : "At least 10 characters"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
              />
            </div>
            {editing && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="user-active">Can sign in</Label>
                  <p className="text-xs text-muted-foreground">Disabling signs them out immediately; their history is kept.</p>
                </div>
                <Switch
                  id="user-active"
                  checked={form.active}
                  onCheckedChange={(active) => setForm({ ...form, active })}
                  disabled={isSelf}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {editing ? "Save changes" : "Add user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
