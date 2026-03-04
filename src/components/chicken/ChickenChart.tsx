import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine, ReferenceDot } from "recharts";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Trade {
  action: "buy" | "sell";
  time: number;
  price: number;
}

interface ChickenChartProps {
  candles: Candle[];
  trades?: Trade[];
}

const BuyDot = (props: { cx?: number; cy?: number }) => {
  if (props.cx == null || props.cy == null) return null;
  return (
    <polygon
      points={`${props.cx},${props.cy - 6} ${props.cx - 5},${props.cy + 4} ${props.cx + 5},${props.cy + 4}`}
      fill="#22c55e"
      stroke="#15803d"
      strokeWidth={1}
    />
  );
};

const SellDot = (props: { cx?: number; cy?: number }) => {
  if (props.cx == null || props.cy == null) return null;
  return (
    <polygon
      points={`${props.cx},${props.cy + 6} ${props.cx - 5},${props.cy - 4} ${props.cx + 5},${props.cy - 4}`}
      fill="#ef4444"
      stroke="#b91c1c"
      strokeWidth={1}
    />
  );
};

const ChickenChart = ({ candles, trades = [] }: ChickenChartProps) => {
  const data = useMemo(
    () => candles.map((c) => ({ time: c.time, price: c.close })),
    [candles]
  );

  const { firstPrice, lastPrice, isUp, color } = useMemo(() => {
    if (candles.length === 0) return { firstPrice: 100, lastPrice: 100, isUp: true, color: "#22c55e" };
    const fp = candles[0].open;
    const lp = candles[candles.length - 1].close;
    const up = lp >= fp;
    return { firstPrice: fp, lastPrice: lp, isUp: up, color: up ? "#22c55e" : "#ef4444" };
  }, [candles]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 90, maxPrice: 110 };
    const prices = candles.flatMap((c) => [c.high, c.low]);
    return {
      minPrice: Math.min(...prices) * 0.98,
      maxPrice: Math.max(...prices) * 1.02,
    };
  }, [candles]);

  const visibleTrades = useMemo(() => {
    if (trades.length === 0 || candles.length === 0) return [];
    const minTime = candles[0].time;
    const maxTime = candles[candles.length - 1].time;
    return trades.filter((t) => t.time >= minTime && t.time <= maxTime);
  }, [trades, candles]);

  if (candles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Waiting for market data...
      </div>
    );
  }

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
          isAnimationActive={true}
          animationDuration={300}
          animationEasing="linear"
        />
        {visibleTrades.map((t, i) => (
          <ReferenceDot
            key={`trade-${i}`}
            x={t.time}
            y={t.price}
            shape={t.action === "buy" ? <BuyDot /> : <SellDot />}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ChickenChart;
