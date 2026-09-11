import Link from "next/link";

const PLANS = [
  { name: "Free", price: "$0", credits: "100 pages / mo", pages: "20 pages / job", exports: "CSV only", team: false },
  { name: "Starter", price: "$19", credits: "2,000 pages / mo", pages: "100 pages / job", exports: "CSV, XLSX, JSON", team: false },
  { name: "Pro", price: "$49", credits: "10,000 pages / mo", pages: "500 pages / job", exports: "CSV, XLSX, JSON, API", team: true },
  { name: "Business", price: "$149", credits: "50,000 pages / mo", pages: "2,000 pages / job", exports: "Everything + priority queue", team: true },
];

const FAQ = [
  {
    q: "What can this legally collect?",
    a: "Only information already public on the pages you point it at — no login walls, no paywalls, no CAPTCHA bypass. It checks robots.txt before crawling and rate-limits every request so it doesn't hammer the sites it visits.",
  },
  {
    q: "How is this different from a Google Maps scraper?",
    a: "It doesn't target any one platform. You give it a starting URL — a directory page, a company site, a listings page — and it crawls outward within rules you set, pulling structured fields from each page it visits.",
  },
  {
    q: "Can I define my own fields?",
    a: "Yes. Beyond the built-in fields (email, phone, address, social links), you can add a CSS selector or regex pattern for anything else on the page and save it as a reusable template.",
  },
  {
    q: "What happens when I hit my monthly limit?",
    a: "Jobs already running finish, but new jobs are blocked until your period resets or you upgrade. You'll see a usage bar in the dashboard before you get close.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink-950 text-paper-50">
      {/* Nav */}
      <header className="border-b border-ink-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="font-display text-lg tracking-tight">Lead Console</span>
          <nav className="flex items-center gap-6 text-sm text-paper-400">
            <a href="#features" className="hover:text-paper-50">Features</a>
            <a href="#pricing" className="hover:text-paper-50">Pricing</a>
            <a href="#faq" className="hover:text-paper-50">FAQ</a>
            <Link href="/login" className="hover:text-paper-50">Log in</Link>
            <Link
              href="/signup"
              className="rounded bg-signal-amber px-4 py-2 font-medium text-ink-950 hover:bg-signal-amber/90"
            >
              Start scraping
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div>
            <h1 className="font-display text-5xl leading-[1.1] tracking-tight lg:text-6xl">
              Point it at a page.
              <br />
              Get back a spreadsheet.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-paper-400">
              Lead Console crawls public web pages within limits you set, pulls out contact details
              and any custom field you define, and hands you clean, deduplicated rows — ready to
              export or push through the API.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/signup"
                className="rounded bg-signal-amber px-6 py-3 font-medium text-ink-950 hover:bg-signal-amber/90"
              >
                Start scraping — free
              </Link>
              <a href="#features" className="text-paper-400 hover:text-paper-50">
                See how it works
              </a>
            </div>
          </div>

          {/* Job status mockup — grounded in the actual product, not decoration */}
          <div className="rounded-lg border border-ink-700 bg-ink-900 p-5 font-mono text-sm">
            <div className="flex items-center justify-between text-paper-400">
              <span>directory-crawl-04</span>
              <span className="flex items-center gap-2 text-signal-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-signal-amber" /> running
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded bg-ink-800">
              <div className="h-full w-2/3 bg-signal-amber" />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-4 text-paper-100">
              <div>
                <dt className="text-xs text-paper-400">pages</dt>
                <dd className="text-lg">142 / 200</dd>
              </div>
              <div>
                <dt className="text-xs text-paper-400">records</dt>
                <dd className="text-lg text-signal-teal">318</dd>
              </div>
              <div>
                <dt className="text-xs text-paper-400">errors</dt>
                <dd className="text-lg">2</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-ink-800 bg-ink-900/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl">Built for the messy parts of scraping</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <Feature
              title="Crawl controls that hold"
              body="Set max pages, crawl depth, same-domain restriction, include/exclude patterns. Robots.txt is checked and honored automatically."
            />
            <Feature
              title="Fields you define"
              body="Built-in extraction for email, phone, address, and social links. Add your own CSS selector or regex for anything else and save it as a template."
            />
            <Feature
              title="Leads, not just rows"
              body="Tag, filter, favorite, and add notes to what you collect. Duplicate detection runs automatically across every job."
            />
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl">Who this is for</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <UseCase
              title="Agencies building prospect lists"
              body="Crawl an industry directory or association member list once, export to CSV, load into your outreach tool."
            />
            <UseCase
              title="Researchers mapping a market"
              body="Pull structured data from a set of company sites to compare positioning, categories, and public contact info at scale."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-ink-800 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-3xl">Pricing</h2>
          <p className="mt-2 text-paper-400">Credits are pages crawled, not records extracted.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {PLANS.map((plan) => (
              <div key={plan.name} className="rounded-lg border border-ink-700 p-6">
                <div className="text-sm text-paper-400">{plan.name}</div>
                <div className="mt-2 font-display text-3xl">{plan.price}<span className="text-base text-paper-400">/mo</span></div>
                <ul className="mt-6 space-y-2 text-sm text-paper-100">
                  <li>{plan.credits}</li>
                  <li>{plan.pages}</li>
                  <li>{plan.exports}</li>
                  <li>{plan.team ? "Team seats" : "Single user"}</li>
                </ul>
                <Link
                  href="/signup"
                  className="mt-6 block rounded border border-ink-600 py-2 text-center text-sm hover:border-signal-amber hover:text-signal-amber"
                >
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-ink-800 bg-ink-900/50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-3xl">Frequently asked</h2>
          <div className="mt-8 divide-y divide-ink-800">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="cursor-pointer list-none text-lg text-paper-50">
                  {item.q}
                </summary>
                <p className="mt-3 text-paper-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-800 py-10 text-center text-sm text-paper-400">
        <Link href="/terms" className="hover:text-paper-50">Terms</Link>
        <span className="mx-3">·</span>
        <Link href="/privacy" className="hover:text-paper-50">Privacy</Link>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 text-paper-400">{body}</p>
    </div>
  );
}

function UseCase({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-ink-700 p-6">
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 text-paper-400">{body}</p>
    </div>
  );
}
