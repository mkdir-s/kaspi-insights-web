"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Gauge,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";
import { Analytics, buildAnalytics, parseKaspiPdf, StatementData } from "@/lib/kaspi";

const colors = ["#ff5c45", "#7b61ff", "#22a06b", "#f4a340", "#2b7fff", "#db4b8f", "#22a6a1", "#64748b", "#f97316", "#8b5cf6"];
const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("ru-RU");
const date = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });

function formatMoney(value: number) {
  return money.format(value).replace("KZT", "₸");
}

function formatDate(value: string) {
  return date.format(new Date(`${value}T12:00:00`));
}

function shortMoney(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн ₸`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)} тыс. ₸`;
  return `${Math.round(value)} ₸`;
}

function downloadBlob(content: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function buildExportReport(statement: StatementData, analytics: Analytics) {
  const categoryRows = analytics.categories.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.count}</td><td>${formatMoney(item.amount)}</td><td>${Math.round(item.share * 100)}%</td></tr>`).join("");
  const merchantRows = analytics.merchants.slice(0, 20).map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.count}</td><td>${formatMoney(item.amount)}</td></tr>`).join("");
  const monthRows = analytics.monthly.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="in">${formatMoney(item.income)}</td><td class="out">${formatMoney(item.expense)}</td><td>${formatMoney(item.net)}</td></tr>`).join("");
  const maxCategory = analytics.categories[0]?.amount || 1;
  const bars = analytics.categories.slice(0, 10).map((item, index) => `<div class="bar"><span>${escapeHtml(item.name)}</span><i><b style="width:${Math.max(2, item.amount / maxCategory * 100)}%;background:${colors[index % colors.length]}"></b></i><strong>${formatMoney(item.amount)}</strong></div>`).join("");
  const checks = statement.checks.map((check) => `<tr><td>${escapeHtml(check.name)}</td><td>${formatMoney(check.calculated)}</td><td>${formatMoney(check.expected)}</td><td class="${check.ok ? "in" : "out"}">${check.ok ? "Сошлось" : "Расхождение"}</td></tr>`).join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Финансовый отчёт Kaspi</title><style>
  :root{--ink:#18211d;--muted:#68736d;--line:#e4e9e6;--paper:#fff;--bg:#f3f5f2;--accent:#ff5c45;--green:#178b5b;--red:#d54848}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 Arial,sans-serif}main{max-width:1100px;margin:auto;padding:42px 24px}.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:28px}h1{font-size:36px;margin:0 0 6px;letter-spacing:-1px}h2{font-size:20px;margin:0 0 18px}.muted{color:var(--muted)}.badge{background:#e5f5ed;color:var(--green);padding:9px 13px;border-radius:30px;font-weight:bold}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}.card,section{background:var(--paper);border:1px solid var(--line);border-radius:16px}.card{padding:18px}.card small{color:var(--muted);display:block}.card strong{font-size:22px;display:block;margin-top:8px}.grid{display:grid;grid-template-columns:1.15fr .85fr;gap:16px;margin:16px 0}section{padding:22px;break-inside:avoid}table{border-collapse:collapse;width:100%}th,td{padding:9px;border-bottom:1px solid var(--line);text-align:left}th{font-size:11px;text-transform:uppercase;color:var(--muted)}.in{color:var(--green);font-weight:bold}.out{color:var(--red);font-weight:bold}.bar{display:grid;grid-template-columns:150px 1fr 120px;align-items:center;gap:10px;margin:12px 0}.bar>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bar i{height:10px;background:#edf0ee;border-radius:9px;overflow:hidden}.bar b{height:100%;display:block;border-radius:9px}.bar strong{text-align:right;font-size:12px}footer{text-align:center;color:var(--muted);margin-top:24px}@media(max-width:750px){.cards{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}.top{display:block}.badge{display:inline-block;margin-top:12px}}@media print{body{background:white}main{max-width:none;padding:0}.card,section{box-shadow:none}.no-print{display:none}}
  </style></head><body><main><div class="top"><div><h1>Финансовый обзор</h1><div class="muted">${escapeHtml(statement.fileName)} · ${formatDate(analytics.periodStart)} — ${formatDate(analytics.periodEnd)}</div></div><div class="badge">${statement.checks.every((check) => check.ok) ? "Данные проверены" : "Нужна проверка"}</div></div>
  <div class="cards"><div class="card"><small>Поступления</small><strong class="in">${formatMoney(analytics.totalIncome)}</strong></div><div class="card"><small>Расходы</small><strong class="out">${formatMoney(analytics.totalExpense)}</strong></div><div class="card"><small>Покупки</small><strong>${formatMoney(analytics.purchases.amount)}</strong></div><div class="card"><small>Операции</small><strong>${number.format(analytics.transactionCount)}</strong></div><div class="card"><small>Переводы мне</small><strong>${formatMoney(analytics.incomingTransfers.amount)}</strong></div><div class="card"><small>Мои переводы</small><strong>${formatMoney(analytics.outgoingTransfers.amount)}</strong></div><div class="card"><small>Средняя покупка</small><strong>${formatMoney(analytics.purchases.average)}</strong></div><div class="card"><small>Расход в активный день</small><strong>${formatMoney(analytics.averageDailyExpense)}</strong></div></div>
  <div class="grid"><section><h2>Расходы по категориям</h2>${bars}</section><section><h2>Динамика по месяцам</h2><table><thead><tr><th>Месяц</th><th>Приход</th><th>Расход</th><th>Разница</th></tr></thead><tbody>${monthRows}</tbody></table></section></div>
  <div class="grid"><section><h2>Все категории</h2><table><thead><tr><th>Категория</th><th>Покупок</th><th>Сумма</th><th>Доля</th></tr></thead><tbody>${categoryRows}</tbody></table></section><section><h2>Топ продавцов</h2><table><thead><tr><th>Продавец</th><th>Раз</th><th>Сумма</th></tr></thead><tbody>${merchantRows}</tbody></table></section></div>
  <section><h2>Контрольная сверка</h2><table><thead><tr><th>Группа</th><th>Рассчитано</th><th>В выписке</th><th>Статус</th></tr></thead><tbody>${checks}</tbody></table></section><footer>Сформировано локально в Kaspi Insights · ${new Date().toLocaleDateString("ru-RU")}</footer></main></body></html>`;
}

function MetricCard({ icon, label, value, detail, tone = "default" }: { icon: React.ReactNode; label: string; value: string; detail: string; tone?: "default" | "green" | "red" | "violet" }) {
  return <article className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><b>{label}</b>{payload.map((item) => <div key={item.name}><i style={{ background: item.color }} />{item.name}<strong>{formatMoney(item.value)}</strong></div>)}</div>;
}

function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return <div className="section-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div>{note && <p>{note}</p>}</div>;
}

function EmptyState({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return <main className="landing">
    <nav className="landing-nav"><a className="brand" href="#"><span><Gauge size={18} /></span>Kaspi Insights</a><div className="privacy-pill"><LockKeyhole size={14} /> Данные остаются на устройстве</div></nav>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><Sparkles size={15} /> Выписка становится понятной</div><h1>Вся финансовая картина.<br /><em>Без ручных таблиц.</em></h1><p>Загрузите выписку Kaspi Gold — приложение разложит  каждую операцию по полочкам, покажет привычки, связи и точки роста.</p><div className="hero-trust"><span><ShieldCheck size={17} /> Локальная обработка</span><span><CheckCircle2 size={17} /> Проверка итогов</span><span><FileDown size={17} /> Красивый экспорт</span></div></div>
      <button className={`drop-zone ${dragging ? "dragging" : ""}`} onClick={() => input.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) onFile(file); }}>
        <input ref={input} type="file" accept="application/pdf,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); }} />
        <span className="upload-orbit"><UploadCloud size={30} /></span><h2>Перетащите PDF-выписку</h2><p>или нажмите, чтобы выбрать файл</p><small>Официальная выписка Kaspi Gold · до 50 МБ</small>
      </button>
    </section>
    <section className="feature-strip"><div><TrendingUp /><b>Динамика</b><span>Доходы, расходы и баланс</span></div><div><ShoppingBag /><b>Категории</b><span>Куда действительно уходят деньги</span></div><div><Landmark /><b>Переводы</b><span>Отправители и получатели</span></div><div><Sparkles /><b>Наблюдения</b><span>Пики, повторы и аномалии</span></div></section>
    <footer className="landing-footer">Kaspi Insights не связан с АО «Kaspi Bank». Файл обрабатывается только в вашем браузере.</footer>
  </main>;
}

function LoadingState({ progress, fileName }: { progress: number; fileName: string }) {
  return <main className="loading-screen"><div className="loading-card"><span className="scan-icon"><FileText /><i /></span><div className="eyebrow">Читаем выписку</div><h1>{fileName}</h1><p>Извлекаем операции, сверяем баланс и строим финансовую модель.</p><div className="progress"><i style={{ width: `${progress}%` }} /></div><div className="progress-meta"><span>{progress}%</span><span>Ничего не отправляем в интернет</span></div><LoaderCircle className="spinner" /></div></main>;
}

function Dashboard({ statement, onReset }: { statement: StatementData; onReset: () => void }) {
  const analytics = useMemo(() => buildAnalytics(statement.transactions, statement.openingBalance), [statement]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все категории");
  const [kind, setKind] = useState("Все типы");
  const [month, setMonth] = useState("Весь период");
  const [showAll, setShowAll] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const allChecksOk = statement.checks.length > 0 && statement.checks.every((check) => check.ok);

  const filtered = useMemo(() => statement.transactions.filter((tx) => {
    const query = search.toLowerCase();
    return (!query || `${tx.details} ${tx.category} ${tx.kind}`.toLowerCase().includes(query)) && (category === "Все категории" || tx.category === category) && (kind === "Все типы" || tx.kind === kind) && (month === "Весь период" || tx.date.startsWith(month));
  }), [statement.transactions, search, category, kind, month]);

  const exportHtml = () => {
    downloadBlob(buildExportReport(statement, analytics), `kaspi-report-${analytics.periodEnd}.html`, "text/html;charset=utf-8");
    setExportOpen(false);
  };
  const exportCsv = () => {
    const header = ["Дата", "Сумма", "Операция", "Тип", "Категория", "Детали"].join(";");
    const rows = statement.transactions.map((tx) => [formatDate(tx.date), tx.amount.toFixed(2).replace(".", ","), tx.operation, tx.kind, tx.category, tx.details].map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"));
    downloadBlob(`\ufeff${[header, ...rows].join("\n")}`, `kaspi-operations-${analytics.periodEnd}.csv`, "text/csv;charset=utf-8");
    setExportOpen(false);
  };

  return <main className="dashboard-shell">
    <header className="topbar"><a className="brand" href="#top"><span><Gauge size={18} /></span>Kaspi Insights</a><nav><a href="#overview">Обзор</a><a href="#spending">Расходы</a><a href="#transfers">Переводы</a><a href="#operations">Операции</a></nav><div className="topbar-actions"><button className="ghost-button" onClick={onReset}><RefreshCcw size={16} /> Другая выписка</button><div className="export-wrap"><button className="primary-button" onClick={() => setExportOpen((value) => !value)}><Download size={16} /> Выгрузить отчёт <ChevronDown size={14} /></button>{exportOpen && <div className="export-menu"><button onClick={exportHtml}><FileText /> Красивый HTML-отчёт<span>Откроется без приложения</span></button><button onClick={() => window.print()}><FileDown /> Сохранить в PDF<span>Через диалог печати</span></button><button onClick={exportCsv}><FileSpreadsheet /> Все операции CSV<span>Для Excel и Google Sheets</span></button></div>}</div></div></header>

    <div className="dashboard" id="top">
      <section className="welcome-row" id="overview"><div><div className="eyebrow"><CalendarDays size={15} /> {formatDate(analytics.periodStart)} — {formatDate(analytics.periodEnd)}</div><h1>Ваш финансовый обзор</h1><p>{statement.fileName} · {statement.pages} страниц · {number.format(analytics.transactionCount)} операций</p></div><div className={`verification ${allChecksOk ? "success" : "warning"}`}><ShieldCheck /><div><b>{allChecksOk ? "Данные сошлись" : "Проверьте данные"}</b><span>{allChecksOk ? `${statement.checks.length} контрольных итогов совпали` : "Есть расхождение со сводкой Kaspi"}</span></div></div></section>

      <section className="metrics-grid">
        <MetricCard icon={<ArrowDownLeft />} label="Поступления извне" value={formatMoney(analytics.totalIncome)} detail={`${number.format(analytics.incomingTransfers.count)} переводов от людей`} tone="green" />
        <MetricCard icon={<ArrowUpRight />} label="Расходы вовне" value={formatMoney(analytics.totalExpense)} detail={`${formatMoney(analytics.averageDailyExpense)} в активный день`} tone="red" />
        <MetricCard icon={<ShoppingBag />} label="Покупки" value={formatMoney(analytics.purchases.amount)} detail={`${number.format(analytics.purchases.count)} · средняя ${formatMoney(analytics.purchases.average)}`} tone="violet" />
        <MetricCard icon={<WalletCards />} label="Чистый поток" value={formatMoney(analytics.externalNet)} detail="Без переводов между своими счетами" tone={analytics.externalNet >= 0 ? "green" : "red"} />
        <MetricCard icon={<Landmark />} label="Между своими счетами" value={formatMoney(analytics.ownTransfers.amount)} detail={`${analytics.ownTransfers.count} внутренних движений`} />
        <MetricCard icon={<Banknote />} label="Наличные" value={formatMoney(analytics.withdrawals.amount)} detail={`${analytics.withdrawals.count} снятий`} />
        <MetricCard icon={<ReceiptText />} label="Комиссии и прочее" value={formatMoney(analytics.fees.amount)} detail={`${analytics.fees.count} операций`} />
        <MetricCard icon={<CircleDollarSign />} label="Возвраты и отмены" value={formatMoney(analytics.refunds.amount)} detail={`${analytics.refunds.count} операций`} />
      </section>

      <section className="chart-grid wide-left">
        <article className="panel"><SectionHeading eyebrow="Денежный поток" title="Поступления и расходы по месяцам" note="Внутренние переводы исключены" /><div className="chart-large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.monthly}><defs><linearGradient id="income" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22a06b" stopOpacity={0.35} /><stop offset="1" stopColor="#22a06b" stopOpacity={0.02} /></linearGradient><linearGradient id="expense" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff5c45" stopOpacity={0.32} /><stop offset="1" stopColor="#ff5c45" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0ee" /><XAxis dataKey="label" axisLine={false} tickLine={false} /><YAxis tickFormatter={shortMoney} axisLine={false} tickLine={false} width={72} /><Tooltip content={<ChartTooltip />} /><Area name="Поступления" type="monotone" dataKey="income" stroke="#22a06b" strokeWidth={2.5} fill="url(#income)" /><Area name="Расходы" type="monotone" dataKey="expense" stroke="#ff5c45" strokeWidth={2.5} fill="url(#expense)" /></AreaChart></ResponsiveContainer></div></article>
        <article className="panel balance-panel"><SectionHeading eyebrow="Баланс" title="Как менялся остаток" /><div className="balance-now"><span>На конец периода</span><strong>{formatMoney(statement.closingBalance ?? analytics.balance.at(-1)?.balance ?? 0)}</strong><small className={analytics.externalNet >= 0 ? "positive" : "negative"}>{analytics.externalNet >= 0 ? <TrendingUp /> : <TrendingDown />}{formatMoney(Math.abs(analytics.externalNet))} внешний поток</small></div><div className="chart-small"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.balance}><XAxis dataKey="label" hide /><YAxis domain={["auto", "auto"]} hide /><Tooltip content={<ChartTooltip />} /><Line name="Баланс" type="monotone" dataKey="balance" stroke="#7b61ff" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></article>
      </section>

      <section className="insights-section"><SectionHeading eyebrow="Автоматические наблюдения" title="Что выделяется в вашей выписке" note="Факты без оценочных суждений" /><div className="insights-grid">{analytics.insights.map((insight) => <article className={`insight ${insight.tone}`} key={insight.title}><span>{insight.tone === "warn" ? <TrendingUp /> : <Sparkles />}</span><div><small>{insight.title}</small><strong>{insight.value}</strong><p>{insight.note}</p></div></article>)}</div></section>

      <section className="chart-grid" id="spending">
        <article className="panel"><SectionHeading eyebrow="Структура покупок" title="Куда уходят деньги" note={`${Math.round((1 - analytics.unknownShare) * 100)}% расходов распознано`} /><div className="category-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.categories.slice(0, 8)} dataKey="amount" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2}>{analytics.categories.slice(0, 8).map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => formatMoney(Number(value))} /></PieChart></ResponsiveContainer><div><strong>{formatMoney(analytics.purchases.amount)}</strong><span>всего покупок</span></div></div><div className="category-list">{analytics.categories.slice(0, 8).map((item, index) => <div key={item.name}><i style={{ background: colors[index % colors.length] }} /><span>{item.name}<small>{item.count} операций</small></span><b>{Math.round(item.share * 100)}%</b><strong>{formatMoney(item.amount)}</strong></div>)}</div></div></article>
        <article className="panel"><SectionHeading eyebrow="Поведение" title="Расходы на покупки по дням недели" note="Помогает увидеть недельный ритм" /><div className="chart-medium"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.weekdays}><CartesianGrid vertical={false} stroke="#edf0ee" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis tickFormatter={shortMoney} axisLine={false} tickLine={false} width={70} /><Tooltip content={<ChartTooltip />} /><Bar name="Покупки" dataKey="amount" fill="#7b61ff" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
      </section>

      <section className="table-grid"><article className="panel"><SectionHeading eyebrow="Категории" title="Подробная разбивка" /><div className="data-table compact"><table><thead><tr><th>Категория</th><th>Операций</th><th>Средняя</th><th>Доля</th><th>Сумма</th></tr></thead><tbody>{analytics.categories.map((item, index) => <tr key={item.name}><td><span className="table-dot" style={{ background: colors[index % colors.length] }} />{item.name}</td><td>{item.count}</td><td>{formatMoney(item.average)}</td><td>{Math.round(item.share * 100)}%</td><td><b>{formatMoney(item.amount)}</b></td></tr>)}</tbody></table></div></article><article className="panel"><SectionHeading eyebrow="Продавцы" title="Где вы тратите чаще всего" /><div className="rank-list">{analytics.merchants.slice(0, 10).map((item, index) => <div key={item.name}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span>{item.name}<small>{item.count} покупок</small></span><strong>{formatMoney(item.amount)}</strong></div>)}</div></article></section>

      <section className="chart-grid" id="transfers"><article className="panel transfer-panel"><SectionHeading eyebrow="Входящие переводы" title="Кто переводит вам" note={`${analytics.incomingTransfers.count} переводов · ${formatMoney(analytics.incomingTransfers.amount)}`} /><div className="rank-list">{analytics.senders.slice(0, 12).map((item) => <div key={item.name}><span className="avatar green">{item.name.charAt(0)}</span><span>{item.name}<small>{item.count} переводов</small></span><strong className="positive">+{formatMoney(item.amount)}</strong></div>)}</div></article><article className="panel transfer-panel"><SectionHeading eyebrow="Исходящие переводы" title="Кому переводите вы" note={`${analytics.outgoingTransfers.count} переводов · ${formatMoney(analytics.outgoingTransfers.amount)}`} /><div className="rank-list">{analytics.recipients.slice(0, 12).map((item) => <div key={item.name}><span className="avatar coral">{item.name.charAt(0)}</span><span>{item.name}<small>{item.count} переводов</small></span><strong className="negative">−{formatMoney(item.amount)}</strong></div>)}</div></article></section>

      <section className="table-grid"><article className="panel"><SectionHeading eyebrow="Повторяющиеся расходы" title="Регулярные продавцы и сервисы" note="Минимум 3 покупки в нескольких месяцах" />{analytics.recurring.length ? <div className="data-table compact"><table><thead><tr><th>Продавец</th><th>Месяцев</th><th>Платежей</th><th>Средняя</th><th>Всего</th></tr></thead><tbody>{analytics.recurring.map((item) => <tr key={item.name}><td><b>{item.name}</b></td><td>{item.months}</td><td>{item.count}</td><td>{formatMoney(item.average)}</td><td>{formatMoney(item.amount)}</td></tr>)}</tbody></table></div> : <div className="empty-panel">Регулярные траты не обнаружены</div>}</article><article className="panel"><SectionHeading eyebrow="Необычные суммы" title="Крупные покупки относительно обычных" note="Статистическое отклонение, не оценка операции" />{analytics.anomalies.length ? <div className="rank-list anomalies">{analytics.anomalies.slice(0, 10).map((tx) => <div key={tx.id}><span className="warning-icon">!</span><span>{tx.details}<small>{formatDate(tx.date)} · {tx.category}</small></span><strong>{formatMoney(Math.abs(tx.amount))}</strong></div>)}</div> : <div className="empty-panel">Явных выбросов не найдено</div>}</article></section>

      <section className="panel operations-panel" id="operations"><SectionHeading eyebrow="Полный журнал" title="Все операции" note={`Показано ${showAll ? filtered.length : Math.min(filtered.length, 50)} из ${filtered.length}`} /><div className="filters"><label className="search-field"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Продавец, человек или категория" />{search && <button onClick={() => setSearch("")}><X /></button>}</label><select value={month} onChange={(event) => setMonth(event.target.value)}><option>Весь период</option>{analytics.monthly.map((item) => <option key={item.month} value={item.month}>{item.label}</option>)}</select><select value={kind} onChange={(event) => setKind(event.target.value)}><option>Все типы</option>{[...new Set(statement.transactions.map((tx) => tx.kind))].sort().map((value) => <option key={value}>{value}</option>)}</select><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Все категории</option>{[...new Set(statement.transactions.map((tx) => tx.category))].sort().map((value) => <option key={value}>{value}</option>)}</select></div><div className="data-table operations-table"><table><thead><tr><th>Дата</th><th>Описание</th><th>Тип</th><th>Категория</th><th>Сумма</th></tr></thead><tbody>{filtered.slice(0, showAll ? filtered.length : 50).map((tx) => <tr key={tx.id}><td>{formatDate(tx.date)}</td><td><b>{tx.details}</b><small>Страница {tx.page} · {tx.operation}</small></td><td><span className={`type-pill ${tx.direction}`}>{tx.kind}</span></td><td>{tx.category}</td><td className={tx.amount > 0 ? "positive" : "negative"}><b>{tx.amount > 0 ? "+" : "−"}{formatMoney(Math.abs(tx.amount))}</b>{tx.foreignAmount !== undefined && <small>{Math.abs(tx.foreignAmount)} {tx.foreignCurrency}</small>}</td></tr>)}</tbody></table></div>{filtered.length > 50 && <button className="show-more" onClick={() => setShowAll((value) => !value)}>{showAll ? "Свернуть" : `Показать все ${filtered.length} операций`}<ChevronDown /></button>}</section>

      <section className="validation-panel"><div><ShieldCheck /><span><b>Контроль качества данных</b><small>Суммы сравниваются со встроенной сводкой Kaspi</small></span></div><div className="validation-checks">{statement.checks.map((check) => <span className={check.ok ? "ok" : "fail"} key={check.name}>{check.ok ? <CheckCircle2 /> : <X />}{check.name}</span>)}</div></section>
      <footer className="dashboard-footer"><span><Gauge /> Kaspi Insights</span><p>Локальный анализ · данные не покидают ваш браузер</p><button onClick={onReset}>Загрузить другую выписку</button></footer>
    </div>
  </main>;
}

export default function Home() {
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleFile = useCallback(async (file: File) => {
    setError("");
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Выберите PDF-выписку Kaspi Gold."); return; }
    if (file.size > 50 * 1024 * 1024) { setError("Файл больше 50 МБ. Выберите оригинальную PDF-выписку."); return; }
    setFileName(file.name); setLoading(true); setProgress(3);
    try {
      const parsed = await parseKaspiPdf(file, setProgress);
      setStatement(parsed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось прочитать выписку.");
    } finally { setLoading(false); }
  }, []);

  if (loading) return <LoadingState progress={progress} fileName={fileName} />;
  if (statement) return <Dashboard statement={statement} onReset={() => { setStatement(null); setProgress(0); setError(""); }} />;
  return <><EmptyState onFile={handleFile} />{error && <div className="error-toast"><X /><span><b>Не удалось обработать файл</b>{error}</span><button onClick={() => setError("")}><X /></button></div>}</>;
}
