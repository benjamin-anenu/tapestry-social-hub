import { Button } from "@/components/ui/button";
import { Trash2, Download, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onExport: () => void;
  deleting: boolean;
}

const AdminBulkActions = ({ selectedCount, onClearSelection, onBulkDelete, onExport, deleting }: AdminBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 backdrop-blur">
      <span className="font-mono text-sm text-primary">{selectedCount} selected</span>
      <Button variant="ghost" size="sm" onClick={onClearSelection} className="gap-1 text-muted-foreground">
        <X className="h-3 w-3" /> Clear
      </Button>
      <div className="flex-1" />
      <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
        <Download className="h-4 w-4" /> Export CSV
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2" disabled={deleting}>
            <Trash2 className="h-4 w-4" /> Delete {selectedCount}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} users?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedCount} user(s) and all their associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onBulkDelete}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBulkActions;
