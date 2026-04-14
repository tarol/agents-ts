import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 股票代码格式参考：
 * - 美股：AAPL, MSFT, GOOGL
 * - 港股：0700.HK, 9988.HK
 * - A股（上证）：600519.SS
 * - A股（深证）：000858.SZ
 */

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  currency: string;
  exchange: string;
}

/**
 * 通过 Yahoo Finance API 获取股票实时报价
 */
async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  const result = data?.chart?.result?.[0];

  if (!result) {
    return null;
  }

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];

  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
  const currentPrice = meta.regularMarketPrice ?? 0;
  const change = currentPrice - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol: meta.symbol,
    name: meta.shortName ?? meta.symbol,
    price: currentPrice,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    previousClose,
    open: quote?.open?.[0] ?? 0,
    dayHigh: quote?.high?.[0] ?? 0,
    dayLow: quote?.low?.[0] ?? 0,
    volume: quote?.volume?.[0] ?? 0,
    currency: meta.currency ?? "USD",
    exchange: meta.exchangeName ?? "",
  };
}

/**
 * 常见中文股票名 → Yahoo Finance 代码映射
 */
const STOCK_ALIASES: Record<string, string> = {
  // 美股
  苹果: "AAPL", 微软: "MSFT", 谷歌: "GOOGL", 亚马逊: "AMZN",
  特斯拉: "TSLA", 英伟达: "NVDA", 脸书: "META", meta: "META",
  奈飞: "NFLX", 网飞: "NFLX", 英特尔: "INTC", 高通: "QCOM",
  // 港股
  腾讯: "0700.HK", 阿里巴巴: "9988.HK", 美团: "3690.HK",
  小米: "1810.HK", 比亚迪港股: "1211.HK", 京东港股: "9618.HK",
  // A股
  茅台: "600519.SS", 贵州茅台: "600519.SS",
  五粮液: "000858.SZ",
  宁德时代: "300750.SZ",
  比亚迪: "002594.SZ",
  中国平安: "601318.SS",
  招商银行: "600036.SS",
  工商银行: "601398.SS",
};

/**
 * 解析用户输入的股票标识（支持中文名和代码）
 */
function resolveSymbol(input: string): string {
  const trimmed = input.trim();
  // 先查中文别名
  if (STOCK_ALIASES[trimmed]) {
    return STOCK_ALIASES[trimmed];
  }
  // 已经是代码格式，直接返回（统一大写）
  return trimmed.toUpperCase();
}

/**
 * 股票查询工具 —— 调用 Yahoo Finance API 获取实时股价数据（免费，无需 API Key）
 */
export const getStockPrice = tool(
  async ({ stock }) => {
    const symbol = resolveSymbol(stock);
    const quote = await fetchStockQuote(symbol);

    if (!quote) {
      return JSON.stringify({
        error: true,
        message: `无法查询股票 "${stock}"（代码: ${symbol}），请检查股票名称或代码是否正确。`,
      });
    }

    const direction = quote.change >= 0 ? "📈 上涨" : "📉 下跌";

    return JSON.stringify({
      symbol: quote.symbol,
      name: quote.name,
      price: `${quote.price} ${quote.currency}`,
      change: `${quote.change >= 0 ? "+" : ""}${quote.change} ${quote.currency}`,
      changePercent: `${quote.change >= 0 ? "+" : ""}${quote.changePercent}%`,
      direction,
      previousClose: `${quote.previousClose} ${quote.currency}`,
      open: `${quote.open} ${quote.currency}`,
      dayRange: `${quote.dayLow} - ${quote.dayHigh} ${quote.currency}`,
      volume: quote.volume.toLocaleString(),
      exchange: quote.exchange,
      source: "Yahoo Finance（实时数据）",
    });
  },
  {
    name: "get_stock_price",
    description:
      "查询指定股票的实时价格信息，包括当前价格、涨跌幅、成交量等。支持美股、港股、A股，可用中文名称或股票代码查询。",
    schema: z.object({
      stock: z
        .string()
        .describe(
          '要查询的股票名称或代码，例如：苹果、AAPL、腾讯、0700.HK、茅台、600519.SS'
        ),
    }),
  },
);
