import { saveHomeContent, saveProfessionalContent } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/access";
import { getHomeContent, getProfessionalContent } from "@/lib/content";

export default async function AdminPage() {
  await requireAdmin();
  const homeContent = await getHomeContent();
  const professionalContent = await getProfessionalContent();

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="space-y-3 rounded-3xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin content editor</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Edit homepage and professional page content. Changes are saved directly to the database.
        </p>
      </header>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Home page</h2>
        <form action={saveHomeContent} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Headline</label>
            <Input name="headline" defaultValue={homeContent.headline} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Intro</label>
            <Textarea name="intro" defaultValue={homeContent.intro} required rows={4} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sections (one per line)</label>
            <Textarea name="sections" defaultValue={homeContent.sections.join("\n")} required rows={8} />
          </div>
          <Button type="submit">Save home content</Button>
        </form>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-semibold tracking-tight">Professional page</h2>
        <form action={saveProfessionalContent} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero title</label>
            <Input name="heroTitle" defaultValue={professionalContent.heroTitle} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hero intro</label>
            <Textarea name="heroIntro" defaultValue={professionalContent.heroIntro} required rows={4} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Competencies (one per line)</label>
            <Textarea name="competencies" defaultValue={professionalContent.competencies.join("\n")} required rows={6} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Experience highlights (one per line)</label>
            <Textarea
              name="experienceHighlights"
              defaultValue={professionalContent.experienceHighlights.join("\n")}
              required
              rows={6}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Focus areas</h3>
            {professionalContent.focusAreas.map((area, index) => (
              <div key={`${area.title}-${index}`} className="rounded-2xl border border-border/80 bg-muted/20 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input name="focusTitle" defaultValue={area.title} required />
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-sm font-medium">Body</label>
                  <Textarea name="focusBody" defaultValue={area.body} required rows={4} />
                </div>
              </div>
            ))}
          </div>

          <Button type="submit">Save professional content</Button>
        </form>
      </section>
    </div>
  );
}
