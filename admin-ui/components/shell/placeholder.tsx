import { Construction } from "lucide-react";

type Props = {
  title: string;
  phase: string;
  children?: React.ReactNode;
};

export function PagePlaceholder({ title, phase, children }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-6">
        <div className="font-mono text-xs uppercase tracking-widest text-foreground-muted">
          {phase}
        </div>
        <h1 className="mt-1 text-3xl text-stone-700">{title}</h1>
      </header>

      <div className="flex items-start gap-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-5">
        <Construction className="size-5 shrink-0 text-amber-600" aria-hidden />
        <div className="text-sm text-stone-700">
          <div className="font-medium">Bu ekran henüz iskelet aşamasında.</div>
          <p className="mt-1 text-foreground-muted">
            Next faz dahilinde canlıya alınacak. Tasarım detayları için{" "}
            <code className="font-mono text-xs">docs/design/admin-ui-design-plan.md</code>
            .
          </p>
          {children && <div className="mt-3 text-foreground">{children}</div>}
        </div>
      </div>
    </div>
  );
}
