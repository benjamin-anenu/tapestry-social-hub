import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine } from "recharts";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChickenChartProps {
  candles: Candle[];
}

const ChickenChart = ({ candles }: ChickenChartProps) => {
  if (candles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Waiting for market data...
      </div>
    );
  }

  const data = candles.map((c) => ({
    time: c.time,
    price: c.close,
    high: c.high,
    low: c.low,
  }));

  const firstPrice = candles[0].open;
  const lastPrice = candles[candles.length - 1].close;
  const isUp = lastPrice >= firstPrice;
  const color = isUp ? "#22c55e" : "#ef4444";

  const prices = candles.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis domain={[minPrice, maxPrice]} hide />
        <ReferenceLine y={firstPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.3} />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill="url(#chartGrad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ChickenChart;
