"use client";

/**
 * 打球方向ブレイクダウンチャート（円グラフ）
 * 引っ張り / センター / 流し打ちの割合を可視化
 */
import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BattingAggregation } from "@/lib/types";
import { Target } from "lucide-react";

interface BattingBreakdownProps {
    stats: BattingAggregation;
}

/** 打球方向の色 */
const DIRECTION_COLORS = {
    pull: "#10b981",     // エメラルドグリーン（引っ張り）
    center: "#3b82f6",   // ブルー（センター）
    opposite: "#f59e0b", // アンバー（流し）
};

/** 打球方向の日本語ラベル */
const DIRECTION_LABELS = {
    pull: "引っ張り(左)",
    center: "センター",
    opposite: "流し(右)",
};

/** 打球タイプの色 */
const TYPE_COLORS = {
    grounder: "#8b5cf6", // パープル
    liner: "#ef4444",    // レッド
    fly: "#06b6d4",      // シアン
};

/** 打球タイプの日本語ラベル */
const TYPE_LABELS = {
    grounder: "ゴロ",
    liner: "ライナー",
    fly: "フライ",
};

/** カスタムツールチップ */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { percent: number } }> }) {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
                <p className="text-xs font-medium">{data.name}</p>
                <p className="text-sm font-bold">
                    {data.value}回 ({(data.payload.percent * 100).toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
}

export default function BattingBreakdown({ stats }: BattingBreakdownProps) {
    const { directionBreakdown, battedBallBreakdown } = stats;

    // 打球方向データ
    const directionData = Object.entries(directionBreakdown)
        .filter(([, val]) => val > 0)
        .map(([key, val]) => ({
            name: DIRECTION_LABELS[key as keyof typeof DIRECTION_LABELS],
            value: val,
            color: DIRECTION_COLORS[key as keyof typeof DIRECTION_COLORS],
        }));

    // 打球タイプデータ
    const typeData = Object.entries(battedBallBreakdown)
        .filter(([, val]) => val > 0)
        .map(([key, val]) => ({
            name: TYPE_LABELS[key as keyof typeof TYPE_LABELS],
            value: val,
            color: TYPE_COLORS[key as keyof typeof TYPE_COLORS],
        }));

    const totalDirection = Object.values(directionBreakdown).reduce(
        (sum, v) => sum + v,
        0
    );
    const totalType = Object.values(battedBallBreakdown).reduce(
        (sum, v) => sum + v,
        0
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 打球方向 */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-500" />
                        打球方向分布
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                        引っ張りが多いか流し打ちが多いかを可視化
                    </p>
                </CardHeader>
                <CardContent>
                    {totalDirection > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={directionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {directionData.map((entry, index) => (
                                        <Cell
                                            key={`dir-${index}`}
                                            fill={entry.color}
                                            strokeWidth={0}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={30}
                                    formatter={(value: string) => (
                                        <span className="text-xs text-foreground">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                            データなし
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 打球タイプ */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        打球タイプ分布
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                        ゴロ/ライナー/フライの割合
                    </p>
                </CardHeader>
                <CardContent>
                    {totalType > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={typeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    animationBegin={200}
                                    animationDuration={800}
                                >
                                    {typeData.map((entry, index) => (
                                        <Cell
                                            key={`type-${index}`}
                                            fill={entry.color}
                                            strokeWidth={0}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={30}
                                    formatter={(value: string) => (
                                        <span className="text-xs text-foreground">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
                            データなし
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
