interface TickerItem {
  symbol: string;
  price: string;
  change: number;
}

const TICKER_ITEMS: TickerItem[] = [
  { symbol: "AAPL", price: "315.32", change: 1.8 },
  { symbol: "NVDA", price: "742.10", change: -2.4 },
  { symbol: "TSLA", price: "248.50", change: 3.1 },
  { symbol: "PLTR", price: "126.79", change: 5.6 },
  { symbol: "MSFT", price: "521.90", change: 0.9 },
  { symbol: "OPEN", price: "18.45", change: -1.2 },
  { symbol: "SPCE", price: "412.33", change: 2.7 },
  { symbol: "STRP", price: "88.20", change: -0.5 },
];

function TickerRow() {
  return (
    <div className="flex items-center shrink-0" aria-hidden>
      {TICKER_ITEMS.map((item, i) => {
        const isUp = item.change >= 0;
        return (
          <div key={i} className="flex items-center gap-2 px-6 border-r-2 border-ink/15">
            <span className="text-xs font-bold">{item.symbol}</span>
            <span className="text-xs text-ink/60">${item.price}</span>
            <span
              className={`text-xs font-bold flex items-center gap-0.5 ${
                isUp ? "text-riso-green" : "text-riso-red"
              }`}
            >
              {isUp ? "▲" : "▼"} {Math.abs(item.change).toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TickerFooter() {
  return (
    <footer className="border-t-2 border-ink bg-paper-dim overflow-hidden py-2.5">
      <div
        className="flex w-max animate-ticker hover:[animation-play-state:paused] motion-reduce:animate-none"
        role="marquee"
        aria-label="Sample stock ticker (decorative)"
      >
        <TickerRow />
        <TickerRow />
      </div>
    </footer>
  );
}
