import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface AdminUserSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const AdminUserSearch = ({ value, onChange }: AdminUserSearchProps) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search by username or wallet address..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-9 font-mono text-sm bg-background/50 border-primary/20"
    />
  </div>
);

export default AdminUserSearch;
