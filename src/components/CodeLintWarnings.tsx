import { AlertTriangle, Zap } from "lucide-react";
import type { LintError } from "@/lib/cpp-linter";

interface Props {
  errors: LintError[];
  onDismiss: () => void;
}

const CodeLintWarnings = ({ errors, onDismiss }: Props) => {
  if (errors.length === 0) return null;

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-destructive" />
          <span className="text-xs font-semibold text-destructive">
            Instant Fix — {errors.length} issue{errors.length > 1 ? "s" : ""} detected
          </span>
        </div>
        <button onClick={onDismiss} className="text-xs text-muted-foreground hover:text-foreground">
          Dismiss
        </button>
      </div>
      <ul className="space-y-1.5">
        {errors.map((err, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-foreground font-medium">{err.message}</span>
              <span className="text-muted-foreground ml-1">— {err.tip}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CodeLintWarnings;
