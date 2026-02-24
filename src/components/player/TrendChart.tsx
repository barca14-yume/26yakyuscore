"use client";

/**
 * 打率推移チャート（折れ線グラフ）
 * 直近5試合の打率トレンドを可視化
 */
import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface TrendChartProps {
    data: { gameLabel: string; avg: number; date: string }[];
    playerAvg: number;
}

/** カスタムツールチップ */
function CustomTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{ value: number; payload: { date: string } }>;
    label?: string;
}) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
                <p className="text-sm font-bold mt-0.5">
                    打率 .{(payload[0].value * 1000).toFixed(0).padStart(3, "0")}
                </p>
            </div>
        );
    }
    return null;
}

/** カスタムドット */
function CustomDot(props: { cx?: number; cy?: number; value?: number }) {
    const { cx = 0, cy = 0 } = props;
    return (
        <circle
            cx={cx}
            cy={cy}
            r={5}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth={2}
            className="drop-shadow-sm"
        />
    );
}

export default function TrendChart({ data, playerAvg }: TrendChartProps) {
    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    直近5試合の打率推移
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                    赤い点線は通算打率（.
                    {(playerAvg * 1000).toFixed(0).padStart(3, "0")}）
                </p>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart
                            data={data}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                opacity={0.5}
                            />
                            <XAxis
                                dataKey="gameLabel"
                                className="text-[10px]"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={{ stroke: "hsl(var(--border))" }}
                            />
                            <YAxis
                                domain={[0, 1]}
                                tickFormatter={(val: number) =>
                                    `.${(val * 1000).toFixed(0).padStart(3, "0")}`
                                }
                                className="text-[10px]"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                axisLine={{ stroke: "hsl(var(--border))" }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine
                                y={playerAvg}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                            />
                            <Line
                                type="monotone"
                                dataKey="avg"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                dot={<CustomDot />}
                                activeDot={{ r: 7, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                                animationDuration={1200}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                        試合データがありません
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
