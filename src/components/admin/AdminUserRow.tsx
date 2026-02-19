import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  username: string | null;
  wallet_address: string;
  vibe_score: number | null;
  last_seen: string | null;
  is_online: boolean;
  created_at: string;
  real_name: string | null;
  display_name: string | null;
  country: string | null;
  city: string | null;
  x_handle: string | null;
  instagram_handle: string | null;
  bio_text: string | null;
  tapestry_id: string | null;
  games_played: number | null;
  games_won: number | null;
  avatar_url: string | null;
  find_score: number | null;
  hide_score: number | null;
  hunter_points: number | null;
  hunted_points: number | null;
}

interface AdminUserRowProps {
  user: UserProfile;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: (checked: boolean) => void;
  onDelete: () => void;
}

const fmt = (val: string | number | null | undefined, fallback = "—"): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "number") return String(val);
  return val || fallback;
};

const AdminUserRow = ({ user, isExpanded, isSelected, onToggleExpand, onToggleSelect, onDelete }: AdminUserRowProps) => (
  <React.Fragment>
    <TableRow
      className="border-primary/5 cursor-pointer hover:bg-primary/5 transition-colors"
      onClick={onToggleExpand}
    >
      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </TableCell>
      <TableCell className="font-mono text-sm">{user.username ?? "—"}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
      </TableCell>
      <TableCell className="font-mono text-sm">{fmt(user.vibe_score, "0")}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {user.last_seen ? new Date(user.last_seen).toLocaleString() : "—"}
      </TableCell>
      <TableCell>
        <span className={`inline-block w-2 h-2 rounded-full ${user.is_online ? "bg-green-500" : "bg-muted-foreground/30"}`} />
      </TableCell>
    </TableRow>
    {isExpanded && (
      <TableRow className="border-primary/5 bg-primary/5">
        <TableCell colSpan={6} className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 font-mono text-xs">
            {[
              ["Display Name", fmt(user.display_name)],
              ["Real Name", fmt(user.real_name)],
              ["Country", fmt(user.country)],
              ["City", fmt(user.city)],
              ["X Handle", user.x_handle ? `@${user.x_handle}` : "—"],
              ["Instagram", user.instagram_handle ? `@${user.instagram_handle}` : "—"],
              ["Tapestry ID", fmt(user.tapestry_id)],
              ["Games Played", fmt(user.games_played, "0")],
              ["Games Won", fmt(user.games_won, "0")],
              ["Vibe Score (Find)", fmt(user.find_score, "0")],
              ["Hide Score", fmt(user.hide_score, "0")],
              ["Hunter Pts", fmt(user.hunter_points, "0")],
              ["Hunted Pts", fmt(user.hunted_points, "0")],
              ["Joined", new Date(user.created_at).toLocaleDateString()],
            ].map(([label, val]) => (
              <div key={label as string}>
                <span className="text-muted-foreground">{label as string}</span>
                <p className="text-foreground mt-0.5">{val as string}</p>
              </div>
            ))}
            {user.bio_text && (
              <div className="col-span-2 md:col-span-3">
                <span className="text-muted-foreground">Bio</span>
                <p className="text-foreground mt-0.5">{user.bio_text}</p>
              </div>
            )}
            <div className="col-span-2 md:col-span-3 pt-2 border-t border-primary/10">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Delete User
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {user.username ?? "this user"}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the user and all their associated data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </TableCell>
      </TableRow>
    )}
  </React.Fragment>
);

export { type UserProfile };
export default AdminUserRow;
