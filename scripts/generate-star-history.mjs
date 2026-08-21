import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_REPO = "kaima2022/Health-reminder";
const DEFAULT_OUT_DIR = "docs/star-history";

const THEMES = {
  light: {
    background: "#ffffff",
    grid: "#d8dee4",
    axis: "#8c959f",
    text: "#24292f",
    muted: "#57606a",
    line: "#0ea5e9",
    accent: "#22c55e",
    area: "rgba(14, 165, 233, 0.16)",
  },
  dark: {
    background: "#0d1117",
    grid: "#30363d",
    axis: "#6e7681",
    text: "#f0f6fc",
    muted: "#8b949e",
    line: "#38bdf8",
    accent: "#34d399",
    area: "rgba(56, 189, 248, 0.20)",
  },
};

function parseArgs(argv) {
  const options = {
    repo: DEFAULT_REPO,
    outDir: DEFAULT_OUT_DIR,
    title: "Health Reminder Star History",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") {
      options.repo = argv[++index];
    } else if (arg === "--out-dir") {
      options.outDir = argv[++index];
    } else if (arg === "--title") {
      options.title = argv[++index];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!/^[^/\s]+\/[^/\s]+$/.test(options.repo)) {
    throw new Error(`Invalid repo "${options.repo}". Expected owner/name.`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: npm run star-history -- [--repo owner/name] [--out-dir docs/star-history] [--title "Title"]`);
}

function getToken() {
  const envToken =
    process.env.STAR_HISTORY_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN;

  if (envToken?.trim()) {
    return envToken.trim();
  }

  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error(
      "Missing GitHub token. Set STAR_HISTORY_TOKEN/GH_TOKEN, or run `gh auth login` locally.",
    );
  }
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.star+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "health-reminder-star-history",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${body.slice(0, 240)}`);
  }

  return response.json();
}

async function fetchStargazers(repo, token) {
  const stars = [];

  for (let page = 1; ; page += 1) {
    const url = `https://api.github.com/repos/${repo}/stargazers?per_page=100&page=${page}`;
    const data = await fetchJson(url, token);

    if (!Array.isArray(data)) {
      throw new Error("Unexpected GitHub stargazers response.");
    }

    for (const item of data) {
      if (item.starred_at) {
        stars.push(new Date(item.starred_at));
      }
    }

    if (data.length < 100) {
      break;
    }
  }

  return stars.sort((a, b) => a.getTime() - b.getTime());
}

function dayStart(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatDate(ms) {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(ms) {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function niceCeil(value) {
  if (value <= 10) {
    return 10;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const rounded =
    normalized <= 2 ? 2 : normalized <= 3 ? 3 : normalized <= 5 ? 5 : 10;

  return rounded * magnitude;
}

function buildSeries(stars) {
  const byDay = new Map();

  for (const starredAt of stars) {
    const day = dayStart(starredAt);
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }

  const days = [...byDay.keys()].sort((a, b) => a - b);
  const now = dayStart(new Date());
  const firstDay = days[0] ?? now;
  const start = firstDay - 24 * 60 * 60 * 1000;
  const end = Math.max(now, days.at(-1) ?? now);

  let cumulative = 0;
  const points = [{ x: start, y: 0 }];

  for (const day of days) {
    cumulative += byDay.get(day);
    points.push({ x: day, y: cumulative });
  }

  if (points.at(-1).x < end) {
    points.push({ x: end, y: cumulative });
  }

  return { points, start, end, total: cumulative };
}

function tickValues(min, max, count) {
  if (min === max) {
    return [min];
  }

  return Array.from({ length: count }, (_, index) => {
    const value = min + ((max - min) * index) / (count - 1);
    return Math.round(value);
  });
}

function buildSvg({ repo, title, stars, themeName }) {
  const theme = THEMES[themeName];
  const width = 960;
  const height = 520;
  const margin = { top: 86, right: 54, bottom: 72, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const { points, start, end, total } = buildSeries(stars);
  const maxY = niceCeil(Math.max(total, 1));
  const xSpan = Math.max(end - start, 1);

  const x = (value) => margin.left + ((value - start) / xSpan) * plotWidth;
  const y = (value) => margin.top + plotHeight - (value / maxY) * plotHeight;
  const linePoints = points.map((point) => `${x(point.x).toFixed(1)},${y(point.y).toFixed(1)}`).join(" ");
  const areaPoints = [
    `${x(points[0].x).toFixed(1)},${y(0).toFixed(1)}`,
    ...points.map((point) => `${x(point.x).toFixed(1)},${y(point.y).toFixed(1)}`),
    `${x(points.at(-1).x).toFixed(1)},${y(0).toFixed(1)}`,
  ].join(" ");
  const xTicks = tickValues(start, end, 6);
  const yTicks = tickValues(0, maxY, 6);
  const generatedAt = formatDate(dayStart(new Date()));
  const firstStar = stars[0] ? formatDate(dayStart(stars[0])) : generatedAt;

  const grid = yTicks.map((tick) => {
    const yy = y(tick).toFixed(1);
    return `
      <line class="grid" x1="${margin.left}" x2="${width - margin.right}" y1="${yy}" y2="${yy}" />
      <text class="axis-label" x="${margin.left - 16}" y="${Number(yy) + 5}" text-anchor="end">${tick}</text>`;
  }).join("");

  const xAxis = xTicks.map((tick) => {
    const xx = x(tick).toFixed(1);
    return `
      <line class="tick" x1="${xx}" x2="${xx}" y1="${height - margin.bottom}" y2="${height - margin.bottom + 8}" />
      <text class="axis-label" x="${xx}" y="${height - margin.bottom + 32}" text-anchor="middle">${formatMonth(tick)}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(repo)} has ${total} GitHub stars from ${firstStar} to ${generatedAt}.</desc>
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: 0; }
    .title { font-size: 30px; font-weight: 800; fill: ${theme.text}; }
    .subtitle { font-size: 16px; font-weight: 600; fill: ${theme.muted}; }
    .metric { font-size: 22px; font-weight: 800; fill: ${theme.accent}; }
    .axis-label { font-size: 13px; font-weight: 600; fill: ${theme.muted}; }
    .grid { stroke: ${theme.grid}; stroke-width: 1; }
    .axis, .tick { stroke: ${theme.axis}; stroke-width: 1.5; }
    .line { fill: none; stroke: ${theme.line}; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
    .area { fill: ${theme.area}; }
    .dot { fill: ${theme.accent}; stroke: ${theme.background}; stroke-width: 4; }
  </style>

  <rect width="100%" height="100%" rx="18" fill="${theme.background}" />
  <text class="title" x="${margin.left}" y="46">${escapeXml(title)}</text>
  <text class="subtitle" x="${margin.left}" y="72">${escapeXml(repo)} | Updated ${generatedAt}</text>
  <text class="metric" x="${width - margin.right}" y="54" text-anchor="end">${total} stars</text>

  <g>
    ${grid}
    <line class="axis" x1="${margin.left}" x2="${width - margin.right}" y1="${height - margin.bottom}" y2="${height - margin.bottom}" />
    <line class="axis" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${height - margin.bottom}" />
    ${xAxis}
  </g>

  <polygon class="area" points="${areaPoints}" />
  <polyline class="line" points="${linePoints}" />
  <circle class="dot" cx="${x(points.at(-1).x).toFixed(1)}" cy="${y(points.at(-1).y).toFixed(1)}" r="6" />
</svg>
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const token = getToken();
  const stars = await fetchStargazers(options.repo, token);
  const outDir = path.resolve(options.outDir);

  await mkdir(outDir, { recursive: true });

  for (const themeName of Object.keys(THEMES)) {
    const svg = buildSvg({
      repo: options.repo,
      title: options.title,
      stars,
      themeName,
    });
    await writeFile(path.join(outDir, `star-history-${themeName}.svg`), svg, "utf8");
  }

  console.log(`Generated star history for ${options.repo}: ${stars.length} stars`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
