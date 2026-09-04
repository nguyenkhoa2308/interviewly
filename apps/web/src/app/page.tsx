import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Code2,
  FileSearch,
  // Github,
  // Linkedin,
  MessageSquareText,
  Mic2,
  Play,
  Sparkles,
  Target,
  // Twitter,
  UploadCloud,
  WandSparkles,
} from "lucide-react";

const navItems = ["How it works", "Features", "Interview modes", "AI Feedback", "FAQ", "Pricing"];

const howItWorks = [
  {
    icon: UploadCloud,
    title: "1. Upload your CV / JD",
    text: "Upload your CV or paste a job description to let Interviewly understand your target role.",
  },
  {
    icon: BookOpenCheck,
    title: "2. Choose your interview",
    text: "Select the type of interview you want to practice: technical, behavioral, coding, and more.",
  },
  {
    icon: WandSparkles,
    title: "3. Practice with AI",
    text: "Answer AI-generated questions in a real interview environment with voice or text.",
  },
  {
    icon: BarChart3,
    title: "4. Get AI feedback",
    text: "Receive instant feedback, scores, and a personalized plan to improve your skills.",
  },
];

const features = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Interviews",
    text: "Adaptive questions based on your experience, role, and performance.",
  },
  {
    icon: MessageSquareText,
    title: "Real-time Feedback",
    text: "Get instant, actionable feedback on your answers and communication.",
  },
  {
    icon: Mic2,
    title: "Voice & Transcript",
    text: "Practice with voice, get transcripts, and review every word you say.",
  },
  {
    icon: Code2,
    title: "Coding Environment",
    text: "Solve coding problems in a built-in IDE with real test cases.",
  },
  {
    icon: BriefcaseBusiness,
    title: "System Design Practice",
    text: "Practice system design with diagrams and AI evaluation.",
  },
  {
    icon: FileSearch,
    title: "CV & JD Matching",
    text: "Match your CV with job descriptions and improve your chances.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    text: "Track your scores, skills, and progress over time.",
  },
  {
    icon: Target,
    title: "Personalized Learning Plan",
    text: "Get a customized plan to strengthen your weak areas.",
  },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-[10px] bg-[#6D4AFF] shadow-[0_6px_18px_rgba(109,74,255,.28)]">
        <div className="size-4 rounded-[5px] border-[3px] border-white/95" />
      </div>
      <span className="text-[20px] font-extrabold tracking-[-0.03em] text-[#111827]">
        Interviewly
      </span>
    </Link>
  );
}

function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div className="absolute -inset-8 -z-10 rounded-[44px] bg-[#6D4AFF]/10 blur-3xl" />
      <div className="overflow-hidden rounded-[24px] border border-[#DDD5FF] bg-white shadow-[0_25px_70px_rgba(60,39,140,.18)]">
        <div className="flex h-12 items-center justify-between border-b border-[#ECEEF2] px-4">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-md bg-[#6D4AFF]">
              <div className="size-3 rounded-[4px] border-2 border-white" />
            </div>
            <span className="text-[11px] font-bold">Interviewly</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-6 rounded-full bg-[#F3F0FF]" />
            <div className="h-2.5 w-20 rounded bg-[#E6E8ED]" />
          </div>
        </div>

        <div className="grid min-h-[470px] grid-cols-[128px_1fr]">
          <aside className="border-r border-[#ECEEF2] bg-[#FCFBFF] p-3">
            <div className="mb-4 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              Prepare
            </div>
            {["Dashboard", "Interviews", "Practice", "Question Bank"].map((item, i) => (
              <div
                key={item}
                className={`mb-1 rounded-md px-2 py-2 text-[9px] ${
                  i === 0 ? "bg-[#F3F0FF] font-semibold text-[#6D4AFF]" : "text-[#667085]"
                }`}
              >
                {item}
              </div>
            ))}

            <div className="mb-2 mt-4 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              Career
            </div>
            {["CV", "Job Descriptions", "CV-JD Matching"].map((item) => (
              <div key={item} className="mb-1 rounded-md px-2 py-2 text-[9px] text-[#667085]">
                {item}
              </div>
            ))}

            <div className="mb-2 mt-4 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              Growth
            </div>
            {["Reports", "Skills & Progress", "Learning Plan"].map((item) => (
              <div key={item} className="mb-1 rounded-md px-2 py-2 text-[9px] text-[#667085]">
                {item}
              </div>
            ))}

            <div className="mb-2 mt-4 text-[8px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              Library
            </div>
            {["History", "Saved"].map((item) => (
              <div key={item} className="mb-1 rounded-md px-2 py-2 text-[9px] text-[#667085]">
                {item}
              </div>
            ))}
          </aside>

          <section className="bg-[#F8F9FC] p-4">
            <div className="mb-4">
              <h3 className="text-[16px] font-bold text-[#111827]">Welcome back, Khoa! 👋</h3>
              <p className="mt-1 text-[9px] text-[#667085]">Ready to ace your next interview?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <div className="text-[9px] font-semibold text-[#667085]">Continue your preparation</div>
                <div className="mt-3 rounded-lg border border-[#ECEEF2] p-3">
                  <div className="text-[10px] font-semibold">Frontend Developer Interview</div>
                  <div className="mt-2 h-2 rounded-full bg-[#EEF0F4]">
                    <div className="h-2 w-[60%] rounded-full bg-[#6D4AFF]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[8px] text-[#667085]">60% completed</span>
                    <button className="rounded-md bg-[#6D4AFF] px-3 py-1.5 text-[8px] font-semibold text-white">
                      Continue
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <div className="text-[9px] font-semibold text-[#667085]">Next scheduled interview</div>
                <div className="mt-3 rounded-lg border border-[#ECEEF2] p-3">
                  <div className="text-[10px] font-semibold">System Design Interview</div>
                  <div className="mt-1 text-[8px] text-[#667085]">May 15, 2026 at 10:00 AM</div>
                  <div className="mt-5 flex justify-end">
                    <button className="rounded-md border border-[#DDD5FF] px-3 py-1.5 text-[8px] font-semibold text-[#6D4AFF]">
                      View details
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="mb-3 text-[9px] font-semibold text-[#667085]">Your progress</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  ["12", "Interviews Completed"],
                  ["85%", "Average Score"],
                  ["24", "Hours Practiced"],
                  ["8", "Skills Improved"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg border border-[#ECEEF2] p-3 text-center">
                    <div className="text-[15px] font-bold text-[#6D4AFF]">{value}</div>
                    <div className="mt-1 text-[7px] leading-3 text-[#667085]">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[9px] font-semibold">Recent activity</span>
                <span className="text-[8px] font-semibold text-[#6D4AFF]">View all activity →</span>
              </div>
              {[
                ["Completed Frontend Developer Interview", "Score: 85%", "2 hours ago"],
                ["Improved in React.js", "+15% progress", "1 day ago"],
                ["Added 5 new questions to practice", "", "3 days ago"],
              ].map(([title, meta, time]) => (
                <div key={title} className="flex items-center justify-between border-t border-[#F0F1F4] py-2 first:border-t-0">
                  <div className="flex items-center gap-2">
                    <div className="grid size-5 place-items-center rounded-md bg-[#F3F0FF]">
                      <Sparkles className="size-3 text-[#6D4AFF]" />
                    </div>
                    <span className="text-[8px]">{title}</span>
                  </div>
                  <div className="flex gap-5 text-[7px] text-[#667085]">
                    <span>{meta}</span>
                    <span>{time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-white text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-[#ECEEF2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-6 lg:px-10">
          <Brand />

          <nav className="hidden items-center gap-8 text-[14px] font-semibold text-[#344054] lg:flex">
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="hover:text-[#6D4AFF]">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-[#111827] hover:bg-[#F8F9FC] sm:inline-flex">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-[#6D4AFF] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(109,74,255,.22)] hover:bg-[#5B3DEB]"
            >
              Start practicing free
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_75%_20%,rgba(109,74,255,.08),transparent_35%),linear-gradient(180deg,#FCFBFF_0%,#FFFFFF_72%)]">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-6 pb-16 pt-16 lg:grid-cols-[.78fr_1.22fr] lg:px-10 lg:pb-20 lg:pt-18">
          <div className="max-w-[560px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DDD5FF] bg-[#F3F0FF] px-4 py-2 text-xs font-semibold text-[#6D4AFF]">
              <Sparkles className="size-4" />
              AI-Powered Interview Preparation
            </div>

            <h1 className="mt-6 text-[58px] font-extrabold leading-[1.02] tracking-[-0.045em] text-[#111827]">
              Practice smarter.
              <span className="block bg-gradient-to-r from-[#6D4AFF] to-[#8D5BFF] bg-clip-text text-transparent">
                Get hired faster.
              </span>
            </h1>

            <p className="mt-7 max-w-[530px] text-[17px] leading-8 text-[#667085]">
              Interviewly helps you ace your interviews with AI-powered practice,
              real-time feedback, and a personalized improvement plan.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-xl bg-[#6D4AFF] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(109,74,255,.24)] hover:bg-[#5B3DEB]"
              >
                Start practicing free
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-[#D9DDE6] bg-white px-6 py-3.5 text-sm font-semibold text-[#111827] hover:bg-[#F8F9FC]"
              >
                <Play className="size-4" />
                Watch demo
              </a>
            </div>

            <div className="mt-10 grid max-w-[560px] grid-cols-3 gap-5">
              {[
                [Sparkles, "AI-Powered", "Realistic & adaptive"],
                [MessageSquareText, "Real-time Feedback", "Instant, actionable insights"],
                [BarChart3, "Personalized Plan", "Track and improve"],
              ].map(([Icon, title, text]) => {
                const Comp = Icon as typeof Sparkles;
                return (
                  <div key={title as string} className="flex items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#F3F0FF]">
                      <Comp className="size-4 text-[#6D4AFF]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold">{title as string}</div>
                      <div className="mt-1 text-[10px] leading-4 text-[#667085]">{text as string}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ProductMockup />
        </div>

        <div className="mx-auto max-w-[1240px] px-6 pb-8 lg:px-10">
          <p className="mb-5 text-center text-xs font-medium text-[#667085]">
            Trusted by ambitious job seekers preparing for their next opportunity
          </p>
          <div className="grid grid-cols-4 items-center gap-5 text-center text-[20px] font-extrabold tracking-[-0.03em] text-[#98A2B3] md:grid-cols-8">
            {["Google", "Microsoft", "SAMSUNG", "Shopee", "TikTok", "VNG", "FPT", "VINFAST"].map((brand) => (
              <div key={brand} className="opacity-80">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-t border-[#ECEEF2] py-16">
        <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-[-0.03em]">How it works</h2>
            <p className="mt-2 text-sm text-[#667085]">Get better at interviews in 4 simple steps</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {howItWorks.map((item, i) => (
              <div key={item.title} className="relative rounded-2xl border border-[#E5E7EB] bg-white p-6">
                <div className="grid size-11 place-items-center rounded-xl bg-[#F3F0FF] text-[#6D4AFF]">
                  <item.icon className="size-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#667085]">{item.text}</p>
                {i < howItWorks.length - 1 && (
                  <ChevronRight className="absolute -right-4 top-1/2 hidden size-6 -translate-y-1/2 text-[#6D4AFF] xl:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-t border-[#ECEEF2] py-16">
        <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-[-0.03em]">Powerful features to help you succeed</h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
                <div className="grid size-10 place-items-center rounded-lg bg-[#F3F0FF]">
                  <Icon className="size-5 text-[#6D4AFF]" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#667085]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai-feedback" className="scroll-mt-24 py-16">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-10">
          <div className="rounded-[24px] border border-[#E5E7EB] bg-[#FBFAFF] p-6">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="grid grid-cols-[160px_1fr] gap-6">
                <div>
                  <div className="text-sm font-semibold">Interview Report</div>
                  <div className="mt-5 grid size-28 place-items-center rounded-full border-[8px] border-[#6D4AFF] text-3xl font-bold">
                    85
                  </div>
                  <p className="mt-4 text-sm font-semibold">Great job!</p>
                  <p className="mt-1 text-xs leading-5 text-[#667085]">You performed better than 80% of users.</p>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Strengths</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["React.js", "JavaScript", "Problem Solving"].map((item) => (
                      <span key={item} className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-medium text-[#16A34A]">
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Areas to improve</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["System Design", "Performance Optimization"].map((item) => (
                      <span key={item} className="rounded-full bg-[#F3F0FF] px-3 py-1 text-xs font-medium text-[#6D4AFF]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[#ECEEF2] pt-5">
                <div className="mb-4 text-sm font-semibold">Score breakdown</div>
                <div className="grid gap-5 md:grid-cols-3">
                  {[
                    ["Technical Knowledge", 85],
                    ["Problem Solving", 80],
                    ["Communication", 90],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="mb-2 flex items-center justify-between text-[11px]">
                        <span>{label as string}</span>
                        <span className="font-semibold">{value}/100</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#EEF0F4]">
                        <div className="h-2 rounded-full bg-[#6D4AFF]" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="inline-flex rounded-full bg-[#F3F0FF] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6D4AFF]">
              AI Feedback that matters
            </div>
            <h2 className="mt-5 text-[42px] font-bold leading-[1.05] tracking-[-0.04em]">
              Know your strengths.
              <br />
              Improve your weaknesses.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#667085]">
              Interviewly gives you detailed feedback and insights so you know exactly what to improve.
            </p>

            <div className="mt-7 space-y-3">
              {[
                "Detailed score breakdown",
                "Strengths and weaknesses analysis",
                "Actionable suggestions",
                "Personalized improvement plan",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-medium">
                  <div className="grid size-5 place-items-center rounded-full bg-[#6D4AFF]">
                    <Check className="size-3.5 text-white" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-5 lg:px-10">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-6 rounded-[22px] bg-[linear-gradient(100deg,#4E1FEA_0%,#6D4AFF_58%,#8758FF_100%)] px-8 py-7 text-white md:flex-row">
          <div>
            <h3 className="text-2xl font-bold tracking-[-0.03em]">Ready to ace your next interview?</h3>
            <p className="mt-1 text-sm text-white/80">
              Start practicing smarter with Interviewly.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#5B3DEB]">
              Start practicing free
              <ArrowRight className="size-4" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-lg border border-white/35 px-5 py-3 text-sm font-semibold">
              <Play className="size-4" />
              Watch demo
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#ECEEF2] bg-white">
        <div className="mx-auto max-w-[1240px] px-6 py-10 lg:px-10">
          <div className="grid gap-10 md:grid-cols-[1.25fr_repeat(4,1fr)]">
            <div>
              <Brand />
              <p className="mt-4 max-w-xs text-xs leading-5 text-[#667085]">
                AI-powered interview preparation platform to help you practice smarter and get hired faster.
              </p>
              <div className="mt-5 flex gap-3">
                {/* {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a key={i} href="#" className="grid size-8 place-items-center rounded-full border border-[#E5E7EB]">
                    <Icon className="size-4 text-[#667085]" />
                  </a>
                ))} */}
              </div>
            </div>

            {[
              ["Product", ["Features", "Interview modes", "AI Feedback", "Pricing"]],
              ["Resources", ["Blog", "FAQ", "Interview tips", "Help center"]],
              ["Company", ["About us", "Careers", "Contact us", "Privacy policy"]],
            ].map(([title, links]) => (
              <div key={title as string}>
                <div className="text-sm font-semibold">{title as string}</div>
                <div className="mt-4 space-y-3 text-xs text-[#667085]">
                  {(links as string[]).map((item) => (
                    <a key={item} href="#" className="block hover:text-[#111827]">
                      {item}
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <div className="text-sm font-semibold">Stay updated</div>
              <p className="mt-4 text-xs text-[#667085]">Get the latest tips and updates.</p>
              <div className="mt-4 flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="min-w-0 flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-xs outline-none focus:border-[#6D4AFF]"
                />
                <button className="rounded-lg bg-[#6D4AFF] px-4 py-2.5 text-xs font-semibold text-white">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-[#ECEEF2] pt-5 text-center text-[11px] text-[#98A2B3]">
            © 2026 Interviewly. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
