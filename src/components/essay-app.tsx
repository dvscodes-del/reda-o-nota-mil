import { useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Flame,
  ImagePlus,
  LayoutDashboard,
  Lightbulb,
  Menu,
  PenLine,
  Play,
  Quote,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { correctEssay } from "@/lib/essay.functions";
import constituicaoImage from "@/assets/repertorio-constituicao.jpg";
import geografiaImage from "@/assets/repertorio-geografia.jpg";
import cinemaImage from "@/assets/repertorio-cinema.jpg";

type Section = "dashboard" | "mural" | "competencias" | "repertorio" | "laboratorio";
type Correction = Awaited<ReturnType<typeof correctEssay>>;

const navItems = [
  { id: "dashboard" as const, label: "Visão geral", icon: LayoutDashboard },
  { id: "mural" as const, label: "Mural nota mil", icon: Award },
  { id: "competencias" as const, label: "Competências", icon: Target },
  { id: "repertorio" as const, label: "Repertório", icon: BookOpen },
  { id: "laboratorio" as const, label: "Laboratório", icon: PenLine },
];

const competencies = [
  ["C1", "Domínio da norma culta", "Gramática, ortografia, pontuação e registro formal."],
  ["C2", "Compreensão e repertório", "Leitura do tema e repertório produtivo, pertinente e legitimado."],
  ["C3", "Projeto de texto", "Seleção e organização de argumentos para defender uma tese."],
  ["C4", "Coesão", "Conectivos e mecanismos linguísticos que articulam as ideias."],
  ["C5", "Proposta de intervenção", "Ação completa, detalhada e alinhada aos direitos humanos."],
];

const essays = [
  {
    title: "A persistência da violência contra a mulher",
    author: "Mariana S. · ENEM 2023",
    intro: "Na obra Cidadão de Papel, Gilberto Dimenstein denuncia a distância entre os direitos garantidos e sua efetivação social.",
    text: [
      "Na obra Cidadão de Papel, Gilberto Dimenstein denuncia a distância entre os direitos garantidos e sua efetivação social. Sob essa ótica, a persistência da violência contra a mulher revela um cenário em que a cidadania ainda não se concretiza plenamente.",
      "Em primeiro plano, a naturalização de condutas abusivas dificulta o reconhecimento e a denúncia da violência. Além disso, a fragilidade da rede de acolhimento amplia a vulnerabilidade das vítimas.",
      "Portanto, cabe ao poder público fortalecer centros de atendimento e promover educação preventiva nas escolas, por meio de equipes especializadas e campanhas permanentes, a fim de romper esse ciclo.",
    ],
  },
  {
    title: "Invisibilidade do trabalho de cuidado",
    author: "Lucas A. · Modelo 2024",
    intro: "A divisão desigual das tarefas domésticas evidencia uma herança histórica que limita oportunidades e autonomia.",
    text: [
      "A divisão desigual das tarefas domésticas evidencia uma herança histórica que limita oportunidades e autonomia. Essa realidade mantém o cuidado fora das prioridades públicas.",
      "Nesse contexto, a ausência de equipamentos sociais e a reprodução de estereótipos sobre gênero transferem às famílias — sobretudo às mulheres — uma responsabilidade coletiva.",
      "Logo, municípios devem ampliar creches e centros de cuidado, enquanto escolas promovem debates sobre corresponsabilidade, para tornar esse trabalho visível e democraticamente distribuído.",
    ],
  },
  {
    title: "Democratização do acesso à cultura",
    author: "Ana P. · Modelo 2025",
    intro: "Embora a cultura seja um direito, barreiras econômicas e territoriais ainda restringem seu acesso no país.",
    text: [
      "Embora a cultura seja um direito, barreiras econômicas e territoriais ainda restringem seu acesso no país. Assim, a fruição artística permanece concentrada.",
      "A escassez de equipamentos em regiões periféricas e a insuficiência de políticas de formação de público aprofundam a exclusão simbólica.",
      "Dessa forma, secretarias de cultura devem descentralizar editais e manter circuitos culturais gratuitos, com transporte e mediação, para ampliar a participação social.",
    ],
  },
];

const repertories = [
  { category: "Leis", title: "Constituição Federal de 1988", author: "Artigo 6º", image: constituicaoImage, body: "Use para sustentar direitos sociais como educação, saúde, moradia e alimentação — sempre conectando o direito à falha de sua efetivação." },
  { category: "Livros", title: "Geografia da Fome", author: "Josué de Castro", image: geografiaImage, body: "Ajuda a argumentar que a fome não é natural: decorre de escolhas políticas e estruturas econômicas excludentes." },
  { category: "Filmes", title: "Nunca Me Sonharam", author: "Cacau Rhoden", image: cinemaImage, body: "Documentário útil em temas sobre ensino médio, desigualdade educacional, juventude e projeto de vida." },
];

export function EssayApp() {
  const [section, setSection] = useState<Section>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedEssay, setSelectedEssay] = useState<(typeof essays)[number] | null>(null);
  const [activeCompetency, setActiveCompetency] = useState(0);
  const [filter, setFilter] = useState("Todos");
  const [labTab, setLabTab] = useState<"digital" | "photo">("digital");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Correction | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const runCorrection = useServerFn(correctEssay);

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, chars: text.length, lines: Math.min(30, Math.max(1, Math.ceil(text.length / 78))) };
  }, [text]);

  function goTo(next: Section) {
    setSection(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleCorrection() {
    if (text.trim().length < 120) {
      setError("Escreva pelo menos um parágrafo completo antes de solicitar a correção.");
      return;
    }
    setCorrecting(true);
    setError("");
    try {
      const correction = await runCorrection({ data: { essay: text } });
      setResult(correction);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível corrigir agora. Tente novamente em instantes.");
    } finally {
      setCorrecting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-sidebar p-5 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="mb-10 flex items-center justify-between">
            <button type="button" onClick={() => goTo("dashboard")} className="flex items-center gap-3" aria-label="Ir para o início">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><PenLine className="size-5" /></span>
              <span className="text-left"><strong className="block text-lg leading-none">Escreva+</strong><small className="text-muted-foreground">Seu treino ENEM</small></span>
            </button>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X /></Button>
          </div>
          <nav className="space-y-1.5" aria-label="Navegação principal">
            {navItems.map((item) => <Button key={item.id} variant="ghost" onClick={() => goTo(item.id)} className={`h-11 w-full justify-start rounded-xl px-3 ${section === item.id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground"}`}><item.icon />{item.label}</Button>)}
          </nav>
          <div className="mt-auto rounded-xl bg-sidebar-accent p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Flame className="text-highlight" /> 7 dias de sequência</div>
            <Progress value={70} className="bg-background" />
            <p className="mt-2 text-xs text-muted-foreground">Mais 3 dias para sua próxima conquista.</p>
          </div>
        </div>
      </aside>

      <main className="lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></Button>
          <div className="hidden text-sm text-muted-foreground sm:block">Domingo, 20 de setembro</div>
          <div className="flex items-center gap-3"><div className="text-right"><strong className="block text-sm">Davi</strong><small className="text-muted-foreground">Nível 8 · 1.240 XP</small></div><div className="grid size-10 place-items-center rounded-full bg-accent font-bold text-accent-foreground">DF</div></div>
        </header>

        <div className="mx-auto max-w-7xl p-4 md:p-8 lg:p-10">
          {section === "dashboard" && <Dashboard goTo={goTo} />}
          {section === "mural" && <Mural onOpen={setSelectedEssay} />}
          {section === "competencias" && <Competencies active={activeCompetency} setActive={setActiveCompetency} />}
          {section === "repertorio" && <Repertory filter={filter} setFilter={setFilter} />}
          {section === "laboratorio" && <Laboratory tab={labTab} setTab={setLabTab} text={text} setText={setText} stats={stats} timer={timer} setTimer={setTimer} preview={preview} fileRef={fileRef} setPreview={setPreview} correcting={correcting} error={error} handleCorrection={handleCorrection} result={result} setResult={setResult} />}
        </div>
      </main>

      <Dialog open={Boolean(selectedEssay)} onOpenChange={(open) => !open && setSelectedEssay(null)}>
        <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto rounded-xl">
          {selectedEssay && <><DialogHeader><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary"><Award className="size-4" /> Redação comentada</div><DialogTitle className="text-2xl">{selectedEssay.title}</DialogTitle><DialogDescription>{selectedEssay.author}</DialogDescription></DialogHeader><div className="space-y-5 leading-7 text-foreground">{selectedEssay.text.map((p, i) => <div key={p}><p>{p}</p><p className="mt-2 rounded-lg border-l-4 border-primary bg-accent p-3 text-sm text-accent-foreground"><Lightbulb className="mr-2 inline size-4" />{i === 0 ? "Tese clara e repertório conectado ao problema." : i === 1 ? "Argumentação progressiva, sem abandonar o recorte temático." : "Intervenção com agente, ação, meio e finalidade."}</p></div>)}</div></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p><h1 className="text-3xl font-bold md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-muted-foreground">{description}</p></div>;
}

function Dashboard({ goTo }: { goTo: (section: Section) => void }) {
  const dashboardStats: Array<[string, string, LucideIcon]> = [
    ["12", "Redações enviadas", FileText],
    ["840", "Média atual", TrendingUp],
    ["+80", "Evolução recente", BrainCircuit],
  ];
  return <><PageTitle eyebrow="Seu espaço de evolução" title="Boa tarde, Davi!" description="Cada parágrafo é um passo. Continue construindo sua melhor nota." />
    <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm md:p-10">
      <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 opacity-15 md:block"><Quote className="size-52" /></div>
      <div className="relative max-w-3xl"><span className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold uppercase"><Sparkles className="size-3" /> Desafio do dia · +120 XP</span><h2 className="text-2xl font-bold leading-tight md:text-4xl">Desafios para o enfrentamento da insegurança alimentar no Brasil contemporâneo</h2><p className="mt-4 text-primary-foreground/75">Pratique repertório produtivo, construção de tese e proposta de intervenção completa.</p><Button onClick={() => goTo("laboratorio")} className="mt-7 rounded-xl bg-background text-foreground hover:bg-background/90">Começar a escrever <ArrowRight /></Button></div>
    </section>
    <section className="mt-6 grid gap-4 sm:grid-cols-3">{dashboardStats.map(([value,label,Icon]) => <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-5" /></span><span className="text-xs font-semibold text-success">este mês</span></div><strong className="text-3xl">{value}</strong><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>)}</section>
    <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><div className="mb-8 flex items-center justify-between"><div><h3 className="font-bold">Sua evolução</h3><p className="text-sm text-muted-foreground">Últimas cinco redações</p></div><span className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-primary">+10,5%</span></div><div className="flex h-44 items-end justify-between gap-3 border-b border-border px-2">{[620,700,680,780,840].map((score,i) => <div key={score} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><span className="text-xs font-bold">{score}</span><div className="rounded-t-md bg-primary/20 transition-colors hover:bg-primary" style={{height: `${score/10}%`}} /><span className="pb-2 text-xs text-muted-foreground">R{i+1}</span></div>)}</div></div><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h3 className="font-bold">Próximo objetivo</h3><p className="mt-1 text-sm text-muted-foreground">Chegue à média 900</p><div className="my-6 grid place-items-center"><div className="grid size-32 place-items-center rounded-full border-[12px] border-accent"><div className="text-center"><strong className="text-2xl">840</strong><small className="block text-muted-foreground">de 900</small></div></div></div><Progress value={84} /><p className="mt-3 text-center text-xs text-muted-foreground">Você está a 60 pontos da meta.</p></div></section>
  </>;
}

function Mural({ onOpen }: { onOpen: (essay: (typeof essays)[number]) => void }) {
  return <><PageTitle eyebrow="Inspire-se" title="Mural nota mil" description="Leia textos exemplares com olhos de autor: observe escolhas, conexões e estratégias replicáveis." /><div className="grid gap-5 md:grid-cols-3">{essays.map((essay,i) => <article key={essay.title} onClick={() => onOpen(essay)} className="group cursor-pointer rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"><div className="mb-5 flex items-center justify-between"><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">NOTA 1000</span><span className="text-5xl font-black text-primary/10">0{i+1}</span></div><h2 className="text-xl font-bold leading-snug group-hover:text-primary">{essay.title}</h2><p className="mt-2 text-xs font-semibold text-muted-foreground">{essay.author}</p><p className="mt-5 line-clamp-4 text-sm leading-6 text-muted-foreground">{essay.intro}</p><div className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">Ler e analisar <ArrowRight className="size-4" /></div></article>)}</div></>;
}

function Competencies({ active, setActive }: { active: number; setActive: (value: number) => void }) {
  return <><PageTitle eyebrow="Teoria em prática" title="Domine as competências" description="Entenda como cada parte da sua redação é avaliada e treine uma habilidade por vez." /><div className="space-y-3">{competencies.map(([code,title,body],i) => <div key={code} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><button type="button" onClick={() => setActive(active === i ? -1 : i)} className="flex w-full items-center gap-4 p-5 text-left"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent font-bold text-primary">{code}</span><span className="flex-1"><strong className="block">{title}</strong><small className="text-muted-foreground">0 a 200 pontos</small></span><ChevronDown className={`size-5 transition-transform ${active === i ? "rotate-180" : ""}`} /></button>{active === i && <div className="border-t border-border px-5 pb-6 pt-5 md:pl-20"><p className="text-muted-foreground">{body}</p><div className="mt-5 rounded-xl bg-accent p-5"><strong className="flex items-center gap-2 text-accent-foreground"><Play className="size-4" /> Treinamento isolado</strong><p className="mt-2 text-sm text-muted-foreground">{i === 3 ? "Substitua “e também” por um conectivo de conclusão adequado: “______, medidas devem ser tomadas.”" : i === 4 ? "Monte a intervenção: quem fará, o que fará, como, com qual finalidade e qual detalhamento?" : "Identifique a melhor estratégia para fortalecer este aspecto em um parágrafo curto."}</p><div className="mt-4 flex gap-2"><input className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Escreva sua resposta..." /><Button className="rounded-lg">Conferir</Button></div></div></div>}</div>)}</div></>;
}

function Repertory({ filter, setFilter }: { filter: string; setFilter: (value: string) => void }) {
  const filters = ["Todos", "Livros", "Filmes", "Leis"];
  return <><PageTitle eyebrow="Banco de ideias" title="Repertório sociocultural" description="Referências legitimadas e explicadas para você usar com pertinência — sem decorar frases soltas." /><div className="mb-6 flex flex-wrap gap-2">{filters.map((item) => <Button key={item} variant={filter === item ? "default" : "outline"} onClick={() => setFilter(item)} className="rounded-full">{item}</Button>)}</div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{repertories.filter((item) => filter === "Todos" || item.category === filter).map((item) => <article key={item.title} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><img src={item.image} alt="" loading="lazy" width={768} height={960} className="aspect-[4/3] w-full object-cover" /><div className="p-5"><span className="text-xs font-bold uppercase text-primary">{item.category}</span><h2 className="mt-2 text-xl font-bold">{item.title}</h2><p className="mt-1 text-sm font-semibold text-muted-foreground">{item.author}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">{item.body}</p><div className="mt-5 rounded-lg bg-accent p-3 text-xs text-accent-foreground"><Lightbulb className="mr-1 inline size-4" /> Dica: apresente, relacione e interprete a referência.</div></div></article>)}</div></>;
}

function Laboratory(props: { tab: "digital"|"photo"; setTab: (v:"digital"|"photo")=>void; text:string; setText:(v:string)=>void; stats:{words:number;chars:number;lines:number}; timer:boolean; setTimer:(v:boolean)=>void; preview:string|null; fileRef:React.RefObject<HTMLInputElement|null>; setPreview:(v:string|null)=>void; correcting:boolean; error:string; handleCorrection:()=>void; result:Correction|null; setResult:(v:Correction|null)=>void }) {
  if (props.result) return <Feedback result={props.result} onBack={() => props.setResult(null)} />;
  return <><PageTitle eyebrow="Hora de escrever" title="Laboratório de redação" description="Organize suas ideias, escreva no seu ritmo e receba uma análise pedagógica detalhada." /><div className="mb-5 inline-flex rounded-xl bg-muted p-1"><Button variant={props.tab === "digital" ? "default" : "ghost"} onClick={() => props.setTab("digital")} className="rounded-lg"><PenLine /> Redação digital</Button><Button variant={props.tab === "photo" ? "default" : "ghost"} onClick={() => props.setTab("photo")} className="rounded-lg"><Camera /> Redação escrita</Button></div>
    {props.tab === "digital" ? <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground"><span>{props.stats.words} palavras</span><span>{props.stats.chars} caracteres</span><span>{props.stats.lines}/30 linhas</span></div><Button variant="outline" size="sm" onClick={() => props.setTimer(!props.timer)} className="rounded-lg"><Clock3 /> {props.timer ? "01:29:42" : "Ativar temporizador"}</Button></div><textarea value={props.text} onChange={(e) => props.setText(e.target.value)} placeholder="Comece pela sua tese. O que você defende sobre o tema?" className="min-h-[480px] w-full resize-none bg-card p-6 text-base leading-8 outline-none md:p-10" style={{ backgroundImage: "linear-gradient(to bottom, transparent 31px, var(--line) 32px)", backgroundSize: "100% 32px" }} /><div className="flex flex-col items-end gap-2 border-t border-border p-4"><Button size="lg" onClick={props.handleCorrection} disabled={props.correcting} className="h-12 rounded-xl px-6"><Sparkles /> {props.correcting ? "Analisando sua redação..." : "Corrigir com Inteligência Artificial"}</Button>{props.error && <p className="text-sm text-destructive">{props.error}</p>}</div></div> : <div className="rounded-xl border-2 border-dashed border-border bg-card p-8 text-center shadow-sm md:p-16"><input ref={props.fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file=e.target.files?.[0]; if(file) props.setPreview(URL.createObjectURL(file)); }} />{props.preview ? <img src={props.preview} alt="Prévia da redação" className="mx-auto max-h-[520px] rounded-xl object-contain shadow-sm" /> : <><span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-primary"><UploadCloud className="size-7" /></span><h2 className="mt-5 text-xl font-bold">Envie uma foto nítida da sua redação</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Posicione a folha inteira, evite sombras e confira se o texto está legível.</p></>}<div className="mt-6 flex flex-wrap justify-center gap-2"><Button className="rounded-xl" onClick={() => props.fileRef.current?.click()}><ImagePlus /> Escolher imagem</Button><Button variant="outline" className="rounded-xl" onClick={() => props.fileRef.current?.click()}><Camera /> Usar câmera</Button></div></div>}
  </>;
}

function Feedback({ result, onBack }: { result: Correction; onBack: () => void }) {
  const score = Math.max(0, Math.min(1000, Math.round(result.score)));
  return <><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><PageTitle eyebrow="Correção concluída" title="Seu feedback personalizado" description="Use os comentários como um mapa para a próxima versão do seu texto." /><Button variant="outline" onClick={onBack} className="rounded-xl">Voltar ao texto</Button></div><div className="grid gap-6 lg:grid-cols-[320px_1fr]"><div className="rounded-xl border border-border bg-card p-7 text-center shadow-sm"><div className="mx-auto grid size-48 place-items-center rounded-full border-[14px] border-primary bg-accent"><div><strong className="text-5xl text-primary">{score}</strong><span className="block text-sm text-muted-foreground">de 1000</span></div></div><h2 className="mt-6 text-xl font-bold">Ótimo avanço!</h2><p className="mt-2 text-sm text-muted-foreground">Sua argumentação tem uma base promissora. Agora é hora de lapidar.</p></div><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="text-xl font-bold">Desempenho por competência</h2><div className="mt-6 space-y-5">{result.competencies.slice(0,5).map((item,i) => <div key={`${item.name}-${i}`}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-semibold">C{i+1} · {item.name}</span><strong className="text-primary">{Math.round(item.score)}/200</strong></div><Progress value={Math.max(0,Math.min(100,item.score/2))} /><p className="mt-2 text-xs text-muted-foreground">{item.feedback}</p></div>)}</div></div></div><div className="mt-6 grid gap-6 md:grid-cols-2"><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold text-success"><CheckCircle2 /> O que está excelente</h2><ul className="mt-5 space-y-4">{result.strengths.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />{item}</li>)}</ul></div><div className="rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-bold text-highlight"><AlertCircle /> O que precisa melhorar</h2><ul className="mt-5 space-y-4">{result.improvements.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><AlertCircle className="mt-1 size-4 shrink-0 text-highlight" />{item}</li>)}</ul></div></div>{result.annotations.length > 0 && <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm"><h2 className="text-lg font-bold">Intervenções no seu texto</h2><div className="mt-5 space-y-4">{result.annotations.map((item) => <div key={item.excerpt} className="rounded-lg border-l-4 border-primary bg-accent p-4"><p className="font-medium">“{item.excerpt}”</p><p className="mt-2 text-sm text-muted-foreground"><Sparkles className="mr-2 inline size-4 text-primary" />{item.suggestion}</p></div>)}</div></div>}</>;
}