export type Transaction = {
  id: number;
  page: number;
  date: string;
  amount: number;
  operation: string;
  details: string;
  direction: "income" | "expense" | "internal" | "refund";
  kind: string;
  category: string;
  counterparty: string;
  foreignAmount?: number;
  foreignCurrency?: string;
};

export type ValidationCheck = {
  name: string;
  calculated: number;
  expected: number;
  difference: number;
  ok: boolean;
};

export type StatementData = {
  fileName: string;
  pages: number;
  transactions: Transaction[];
  openingBalance?: number;
  closingBalance?: number;
  checks: ValidationCheck[];
};

export type RankedItem = { name: string; count: number; amount: number };

export type Analytics = {
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  totalIncome: number;
  totalExpense: number;
  externalNet: number;
  incomingTransfers: { count: number; amount: number };
  outgoingTransfers: { count: number; amount: number };
  purchases: { count: number; amount: number; average: number };
  ownTransfers: { count: number; amount: number };
  withdrawals: { count: number; amount: number };
  fees: { count: number; amount: number };
  refunds: { count: number; amount: number };
  foreignOperations: { count: number; amount: number };
  activeDays: number;
  averageDailyExpense: number;
  monthly: Array<{ month: string; label: string; income: number; expense: number; net: number; count: number }>;
  categories: Array<RankedItem & { share: number; average: number }>;
  operations: RankedItem[];
  merchants: RankedItem[];
  senders: RankedItem[];
  recipients: RankedItem[];
  weekdays: Array<{ name: string; amount: number; count: number }>;
  balance: Array<{ date: string; label: string; balance: number }>;
  daily: Array<{ date: string; amount: number; count: number }>;
  recurring: Array<RankedItem & { months: number; average: number }>;
  anomalies: Transaction[];
  unknownShare: number;
  topFiveMerchantShare: number;
  insights: Array<{ title: string; value: string; note: string; tone: "good" | "warn" | "neutral" }>;
};

type RawRow = { date: string; amount: string; operation: string; details: string; page: number };

const amountPattern = /([+\-−])\s*([\d\s]+,\d{2})\s*₸/;
const foreignPattern = /\(([+\-−])\s*([\d\s]+,\d{2})\s*([A-Z]{3})\)/;
const datePattern = /^\d{2}\.\d{2}\.\d{2}$/;

const categoryRules: Array<[string, string[]]> = [
  ["Продукты", ["MAGNUM", "GALMART", "SMALL", "TOIMART", "METRO CASH", "SIRIUS RETAIL", "СУПЕРМАРКЕТ", "МАГАЗИН", "ОЛЖА"]],
  ["Кафе и рестораны", ["BURGER", "DODO", "DONER", "PIZZA", "SAFIA", "FOOD MIX", "COFFEE", "CAFE", "RESTAURANT", "COMPASS", "КОНДИТЕР", "ПЕЧЕНКИН", "ПЕЧЁНКИН"]],
  ["Транспорт", ["ПАРКОВКА", "ПАРКИНГ", "TAXI", "YANDEX.GO", "UBER", "INTERPAY*TAXI", "АВТОБУС"]],
  ["Топливо", ["SINOOIL", "ARLAN OIL", "QAZAQ OIL", "ГАЗПРОМ", "АЗС"]],
  ["Развлечения", ["KINO.KZ", "KINOPARK", "CINEMA", "КИНО", "MELOMAN"]],
  ["Подписки", ["ANTHROPIC", "OPENAI", "GOOGLE", "APPLE.COM/BILL", "NETFLIX", "SPOTIFY", "YOUTUBE"]],
  ["Маркетплейсы", ["WILDBERRIES", "OZON", "LAMODA", "ALIEXPRESS", "KASPI МАГАЗИН"]],
  ["Красота и здоровье", ["BARBERSHOP", "BEAUTY", "SALON", "АПТЕКА", "PHARMACY", "CLINIC", "СТОМАТОЛ"]],
  ["Дом и техника", ["SULPAK", "TECHNODOM", "MECHTA", "FIX PRICE", "РЫНОК", "IKEA"]],
  ["Связь и интернет", ["TELE2", "ALTEL", "KCELL", "ACTIV", "BEELINE", "КАЗАХТЕЛЕКОМ"]],
  ["Образование", ["COURSERA", "UDEMY", "ШКОЛА", "УНИВЕРСИТЕТ", "КУРС"]],
];

const summaryLabels: Record<string, string> = {
  "Пополнения": "Пополнение",
  "Поступления со своих счетов": "Поступление со своего счета",
  "Переводы": "Перевод",
  "Переводы на свои счета": "Перевод на свой счет",
  "Покупки": "Покупка",
  "Снятия": "Снятие",
  "Разное": "Разное",
};

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseAmount(value: string) {
  const match = value.match(amountPattern);
  if (!match) throw new Error(`Не удалось распознать сумму: ${value}`);
  const number = Number(match[2].replace(/\s/g, "").replace(",", "."));
  return match[1] === "+" ? number : -number;
}

function isoDate(value: string) {
  const [day, month, year] = value.split(".").map(Number);
  return `20${String(year).padStart(2, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isPerson(value: string) {
  return /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі'’-]{2,}(?:\s+[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі'’-]{2,})*\s+[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]\.$/.test(value.trim());
}

function purchaseCategory(details: string) {
  const haystack = details.toUpperCase().replace(/Ё/g, "Е");
  for (const [category, keywords] of categoryRules) {
    if (keywords.some((keyword) => haystack.includes(keyword.replace(/Ё/g, "Е")))) return category;
  }
  return "Прочее";
}

function classify(row: RawRow, id: number): Transaction {
  const amount = parseAmount(row.amount);
  const operation = normalize(row.operation);
  const details = normalize(row.details);
  const foreign = row.amount.match(foreignPattern);
  const tx: Transaction = {
    id,
    page: row.page,
    date: isoDate(row.date),
    amount,
    operation,
    details,
    direction: amount > 0 ? "income" : "expense",
    kind: operation || "Другая операция",
    category: "Прочее",
    counterparty: details,
  };
  if (foreign) {
    const value = Number(foreign[2].replace(/\s/g, "").replace(",", "."));
    tx.foreignAmount = foreign[1] === "+" ? value : -value;
    tx.foreignCurrency = foreign[3];
  }

  if (operation === "Перевод на свой счет" || operation === "Поступление со своего счета") {
    tx.direction = "internal";
    tx.kind = "Между своими счетами";
    tx.category = "Свои счета";
  } else if (details.toUpperCase().includes("ВОЗВРАТ") || (operation === "Покупка" && amount > 0)) {
    tx.direction = "refund";
    tx.kind = "Возврат / отмена";
    tx.category = operation === "Покупка" ? purchaseCategory(details) : "Возвраты";
  } else if (operation === "Пополнение") {
    if (amount > 0 && isPerson(details)) {
      tx.kind = "Перевод мне";
      tx.category = "Переводы";
    } else {
      tx.kind = amount > 0 ? "Другое пополнение" : "Отмена пополнения";
      tx.category = amount > 0 ? "Другие поступления" : "Возвраты";
    }
  } else if (operation === "Перевод") {
    tx.kind = "Мой перевод";
    tx.category = "Переводы";
  } else if (operation === "Покупка") {
    tx.kind = "Покупка";
    tx.category = purchaseCategory(details);
  } else if (operation === "Снятие") {
    tx.kind = "Снятие наличных";
    tx.category = "Наличные";
  } else if (operation === "Разное") {
    tx.kind = "Комиссия / прочее";
    tx.category = "Комиссии";
  }
  return tx;
}

function parseSummaryLine(text: string, expected: Record<string, number>) {
  for (const [label, operation] of Object.entries(summaryLabels)) {
    const index = text.indexOf(label);
    if (index < 0) continue;
    const amount = text.slice(index + label.length).match(amountPattern);
    if (amount) expected[operation] = parseAmount(amount[0]);
  }
}

export async function parseKaspiPdf(file: File, progress?: (value: number) => void): Promise<StatementData> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const rows: RawRow[] = [];
  const expected: Record<string, number> = {};
  const balances: number[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items
      .filter((item): item is typeof item & { str: string; transform: number[] } => "str" in item && "transform" in item)
      .map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));

    const lineMap = new Map<number, typeof items>();
    for (const item of items) {
      const key = Math.round(item.y * 2) / 2;
      const line = lineMap.get(key) ?? [];
      line.push(item);
      lineMap.set(key, line);
    }
    const lines = [...lineMap.entries()]
      .sort(([a], [b]) => b - a)
      .map(([, line]) => line.sort((a, b) => a.x - b.x));

    let current: RawRow | null = null;
    for (const line of lines) {
      const whole = normalize(line.map((item) => item.str).join(" "));
      parseSummaryLine(whole, expected);
      if (/Доступно на \d{2}\.\d{2}\.\d{2}/.test(whole)) {
        const amount = whole.match(amountPattern);
        if (amount) balances.push(parseAmount(amount[0]));
      }

      const columns = { date: [] as string[], amount: [] as string[], operation: [] as string[], details: [] as string[] };
      for (const item of line) {
        const ratio = item.x / viewport.width;
        if (ratio < 0.175) columns.date.push(item.str);
        else if (ratio < 0.355) columns.amount.push(item.str);
        else if (ratio < 0.515) columns.operation.push(item.str);
        else columns.details.push(item.str);
      }
      const date = normalize(columns.date.join(" "));
      const amount = normalize(columns.amount.join(" "));
      const operation = normalize(columns.operation.join(" "));
      const details = normalize(columns.details.join(" "));

      if (datePattern.test(date) && amountPattern.test(amount)) {
        if (current) rows.push(current);
        current = { date, amount, operation, details, page: pageNumber };
      } else if (current) {
        if (amount && (foreignPattern.test(amount) || !current.amount.includes("₸"))) current.amount = normalize(`${current.amount} ${amount}`);
        if (operation) current.operation = normalize(`${current.operation} ${operation}`);
        if (details) current.details = normalize(`${current.details} ${details}`);
      }
    }
    if (current) rows.push(current);
    progress?.(Math.round((pageNumber / pdf.numPages) * 100));
  }

  if (!rows.length) throw new Error("В PDF не найдена таблица операций Kaspi Gold.");
  const transactions = rows.map((row, index) => classify(row, index + 1));
  const operationTotals = new Map<string, number>();
  for (const tx of transactions) operationTotals.set(tx.operation, (operationTotals.get(tx.operation) ?? 0) + tx.amount);

  const checks: ValidationCheck[] = [];
  const openingBalance = balances[0];
  const closingBalance = balances.at(-1);
  if (openingBalance !== undefined && closingBalance !== undefined) {
    const calculated = openingBalance + transactions.reduce((sum, tx) => sum + tx.amount, 0);
    checks.push({ name: "Баланс", calculated, expected: closingBalance, difference: calculated - closingBalance, ok: Math.abs(calculated - closingBalance) < 0.02 });
  }
  for (const [operation, expectedValue] of Object.entries(expected)) {
    const calculated = operationTotals.get(operation) ?? 0;
    checks.push({ name: operation, calculated, expected: expectedValue, difference: calculated - expectedValue, ok: Math.abs(calculated - expectedValue) < 0.02 });
  }
  return { fileName: file.name, pages: pdf.numPages, transactions, openingBalance, closingBalance, checks };
}

function rank(transactions: Transaction[], key: (tx: Transaction) => string, positive = false): RankedItem[] {
  const map = new Map<string, RankedItem>();
  for (const tx of transactions) {
    const name = key(tx) || "Не указано";
    const current = map.get(name) ?? { name, count: 0, amount: 0 };
    current.count += 1;
    current.amount += positive ? tx.amount : Math.abs(tx.amount);
    map.set(name, current);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

const moneyShort = (value: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
const ruDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));

export function buildAnalytics(transactions: Transaction[], openingBalance = 0): Analytics {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const external = transactions.filter((tx) => tx.direction !== "internal");
  const expenses = external.filter((tx) => tx.amount < 0 && tx.direction !== "refund");
  const incomes = external.filter((tx) => tx.amount > 0 && tx.direction !== "refund");
  const purchases = transactions.filter((tx) => tx.operation === "Покупка" && tx.amount < 0);
  const incomingTransfers = transactions.filter((tx) => tx.kind === "Перевод мне");
  const outgoingTransfers = transactions.filter((tx) => tx.kind === "Мой перевод");
  const own = transactions.filter((tx) => tx.direction === "internal");
  const withdrawals = transactions.filter((tx) => tx.kind === "Снятие наличных");
  const fees = transactions.filter((tx) => tx.kind === "Комиссия / прочее");
  const refunds = transactions.filter((tx) => tx.direction === "refund");
  const foreign = transactions.filter((tx) => tx.foreignCurrency);
  const totalIncome = incomes.reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const purchaseAmount = purchases.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const monthlyMap = new Map<string, { month: string; label: string; income: number; expense: number; net: number; count: number }>();
  for (const tx of external) {
    const month = tx.date.slice(0, 7);
    const current = monthlyMap.get(month) ?? { month, label: new Intl.DateTimeFormat("ru-RU", { month: "short", year: "2-digit" }).format(new Date(`${month}-01T12:00:00`)), income: 0, expense: 0, net: 0, count: 0 };
    current.count += 1;
    current.net += tx.amount;
    if (tx.amount > 0) current.income += tx.amount;
    else current.expense += Math.abs(tx.amount);
    monthlyMap.set(month, current);
  }

  const categoryBase = rank(purchases, (tx) => tx.category);
  const categories = categoryBase.map((item) => ({ ...item, share: purchaseAmount ? item.amount / purchaseAmount : 0, average: item.count ? item.amount / item.count : 0 }));
  const merchants = rank(purchases, (tx) => tx.details);
  const senders = rank(incomingTransfers, (tx) => tx.counterparty, true);
  const recipients = rank(outgoingTransfers, (tx) => tx.counterparty);
  const operations = rank(transactions.filter((tx) => tx.direction !== "internal"), (tx) => tx.kind);

  const weekdayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const weekdayMap = weekdayNames.map((name) => ({ name, amount: 0, count: 0 }));
  for (const tx of purchases) {
    const day = (new Date(`${tx.date}T12:00:00`).getDay() + 6) % 7;
    weekdayMap[day].amount += Math.abs(tx.amount);
    weekdayMap[day].count += 1;
  }

  const dailyMap = new Map<string, { date: string; amount: number; count: number }>();
  for (const tx of expenses) {
    const current = dailyMap.get(tx.date) ?? { date: tx.date, amount: 0, count: 0 };
    current.amount += Math.abs(tx.amount);
    current.count += 1;
    dailyMap.set(tx.date, current);
  }
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  let running = openingBalance;
  const balance = sorted.map((tx) => {
    running += tx.amount;
    return { date: tx.date, label: ruDate(tx.date), balance: running };
  });

  const merchantMonths = new Map<string, Set<string>>();
  for (const tx of purchases) {
    const months = merchantMonths.get(tx.details) ?? new Set<string>();
    months.add(tx.date.slice(0, 7));
    merchantMonths.set(tx.details, months);
  }
  const recurring = merchants
    .filter((item) => item.count >= 3 && (merchantMonths.get(item.name)?.size ?? 0) >= 2)
    .map((item) => ({ ...item, months: merchantMonths.get(item.name)?.size ?? 0, average: item.amount / item.count }))
    .slice(0, 12);

  const purchaseValues = purchases.map((tx) => Math.abs(tx.amount)).sort((a, b) => a - b);
  const q3 = purchaseValues[Math.floor(purchaseValues.length * 0.75)] ?? 0;
  const q1 = purchaseValues[Math.floor(purchaseValues.length * 0.25)] ?? 0;
  const anomalyThreshold = q3 + 1.5 * (q3 - q1);
  const anomalies = purchases.filter((tx) => Math.abs(tx.amount) > anomalyThreshold).sort((a, b) => a.amount - b.amount).slice(0, 20);

  const unknownAmount = categories.find((item) => item.name === "Прочее")?.amount ?? 0;
  const topFiveAmount = merchants.slice(0, 5).reduce((sum, item) => sum + item.amount, 0);
  const activeDays = new Set(transactions.map((tx) => tx.date)).size;
  const biggestPurchase = purchases.reduce<Transaction | undefined>((best, tx) => !best || tx.amount < best.amount ? tx : best, undefined);
  const biggestDay = [...daily].sort((a, b) => b.amount - a.amount)[0];
  const busiestMerchant = [...merchants].sort((a, b) => b.count - a.count)[0];
  const busiestWeekday = [...weekdayMap].sort((a, b) => b.amount - a.amount)[0];

  const insights: Analytics["insights"] = [];
  if (biggestPurchase) insights.push({ title: "Самая крупная покупка", value: moneyShort(Math.abs(biggestPurchase.amount)), note: `${biggestPurchase.details} · ${ruDate(biggestPurchase.date)}`, tone: "neutral" });
  if (biggestDay) insights.push({ title: "Самый затратный день", value: moneyShort(biggestDay.amount), note: `${ruDate(biggestDay.date)} · ${biggestDay.count} операций`, tone: "warn" });
  if (busiestMerchant) insights.push({ title: "Самый частый продавец", value: `${busiestMerchant.count} покупок`, note: `${busiestMerchant.name} · ${moneyShort(busiestMerchant.amount)}`, tone: "neutral" });
  if (busiestWeekday) insights.push({ title: "Пиковый день недели", value: busiestWeekday.name, note: `${moneyShort(busiestWeekday.amount)} расходов на покупки`, tone: "neutral" });
  insights.push({ title: "Качество категоризации", value: `${Math.round((1 - (purchaseAmount ? unknownAmount / purchaseAmount : 0)) * 100)}%`, note: unknownAmount ? `${moneyShort(unknownAmount)} пока в категории «Прочее»` : "Все покупки распределены", tone: unknownAmount / Math.max(purchaseAmount, 1) > 0.25 ? "warn" : "good" });
  insights.push({ title: "Концентрация расходов", value: `${Math.round((purchaseAmount ? topFiveAmount / purchaseAmount : 0) * 100)}%`, note: "Доля пяти крупнейших продавцов", tone: "neutral" });

  return {
    periodStart: sorted[0]?.date ?? "",
    periodEnd: sorted.at(-1)?.date ?? "",
    transactionCount: transactions.length,
    totalIncome,
    totalExpense,
    externalNet: external.reduce((sum, tx) => sum + tx.amount, 0),
    incomingTransfers: { count: incomingTransfers.length, amount: incomingTransfers.reduce((sum, tx) => sum + tx.amount, 0) },
    outgoingTransfers: { count: outgoingTransfers.length, amount: outgoingTransfers.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) },
    purchases: { count: purchases.length, amount: purchaseAmount, average: purchases.length ? purchaseAmount / purchases.length : 0 },
    ownTransfers: { count: own.length, amount: own.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) },
    withdrawals: { count: withdrawals.length, amount: withdrawals.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) },
    fees: { count: fees.length, amount: fees.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) },
    refunds: { count: refunds.length, amount: refunds.reduce((sum, tx) => sum + tx.amount, 0) },
    foreignOperations: { count: foreign.length, amount: foreign.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) },
    activeDays,
    averageDailyExpense: activeDays ? totalExpense / activeDays : 0,
    monthly: [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
    categories,
    operations,
    merchants,
    senders,
    recipients,
    weekdays: weekdayMap,
    balance,
    daily,
    recurring,
    anomalies,
    unknownShare: purchaseAmount ? unknownAmount / purchaseAmount : 0,
    topFiveMerchantShare: purchaseAmount ? topFiveAmount / purchaseAmount : 0,
    insights,
  };
}
