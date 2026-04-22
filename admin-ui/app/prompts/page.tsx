import { PagePlaceholder } from "@/components/shell/placeholder";

export default function PromptLabPage() {
  return (
    <PagePlaceholder title="Prompt Lab" phase="Phase 4.9.9">
      <div className="space-y-2">
        <div>
          Ajan seçici (<code className="font-mono text-xs">detailagent</code> /{" "}
          <code className="font-mono text-xs">detailagent-ms</code>), bölüm
          bölüm instruction editor (role, GOAL, tool selection tablosu, render kuralları),
          7 tool için registry (description + zod input + output sample), versiyon geçmişi +
          diff, playground (canlı Gemini) Phase 4.9.9'da etkinleşecek.
        </div>
        <div>
          Read-only iskelet bu fazda, edit + commit flow Phase 4.9.8 staging
          altyapısının üzerine binecek.
        </div>
      </div>
    </PagePlaceholder>
  );
}
