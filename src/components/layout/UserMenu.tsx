import { useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleLabels } from "@/lib/permissions";
import { notify } from "@/lib/result";
import { useStore } from "@/store/useStore";

const UserMenu = () => {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const changePassword = useStore((s) => s.changePassword);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  if (!user) return null;

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) return notify({ ok: false, error: "New passwords don't match." });
    if (notify(await changePassword(form.current, form.next), "Password changed")) {
      setOpen(false);
      setForm({ current: "", next: "", confirm: "" });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="ml-1 h-auto gap-2 px-2 py-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-muted-foreground">{roleLabels[user.role]}</span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" /> Change password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            {(
              [
                ["current", "Current password", "current-password"],
                ["next", "New password (min. 10 characters)", "new-password"],
                ["confirm", "Confirm new password", "new-password"],
              ] as const
            ).map(([key, label, autoComplete]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`pw-${key}`}>{label}</Label>
                <Input
                  id={`pw-${key}`}
                  type="password"
                  autoComplete={autoComplete}
                  minLength={key === "current" ? 1 : 10}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required
                />
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Change password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserMenu;
