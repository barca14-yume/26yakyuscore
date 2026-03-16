"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PitchingAggregation } from "@/lib/types";
import { Shield, ChevronRight, ArrowUpDown } from "lucide-react";
import { useData } from "@/lib/data-context";
import { getDisplayName } from "@/lib/utils";

/** ソート可能な投手指標のキーとラベル */
type SortOption = {
    key: keyof PitchingAggregation;
    label: string;
    format: "era" | "number" | "percentage" | "whip";
    /** 値が小さい方が優秀かどうか */
    isLowerBetter?: boolean;
};

const SORT_OPTIONS: SortOption[] = [
    { key: "era", label: "防御率", format: "era", isLowerBetter: true },
    { key: "inningsPitched", label: "投球回", format: "number" },
    { key: "strikeouts", label: "奪三振", format: "number" },
    { key: "whip", label: "WHIP", format: "whip", isLowerBetter: true },
    { key: "strikePercentage", label: "ストライク率", format: "percentage" },
    { key: "walksAllowed", label: "与四死球", format: "number", isLowerBetter: true },
    { key: "runsAllowed", label: "失点", format: "number", isLowerBetter: true },
    { key: "earnedRuns", label: "自責点", format: "number", isLowerBetter: true },
];

interface PitchingOverviewProps {
    pitchingStats: PitchingAggregation[];
    limit?: number;
}

export default function PitchingOverview({ pitchingStats, limit = 8 }: PitchingOverviewProps) {
    const { playerNames } = useData();
    const [sortBy, setSortBy] = React.useState<keyof PitchingAggregation>("era");

    const currentOption = SORT_OPTIONS.find((opt) => opt.key === sortBy) || SORT_OPTIONS[0];

    // 選択された指標でソートし、上位を取得
    const topPitchers = useMemo(() => {
        // デフォルトは数値が大きい方が上。isLowerBetterがtrueの場合は、数値が小さい方が上。
        return [...pitchingStats]
            .filter(p => {
                // 防御率やWHIP等の防御系指標で、0イニングの投手は除外する
                if (currentOption.isLowerBetter && p.inningsPitched === 0) return false;
                return true;
            })
            .sort((a, b) => {
                const valA = (a[sortBy] as number) || 0;
                const valB = (b[sortBy] as number) || 0;
                
                if (currentOption.isLowerBetter) {
                    return valA - valB;
                }
                return valB - valA;
            })
            .slice(0, limit);
    }, [pitchingStats, sortBy, limit, currentOption]);

    // プログレスバーの最大値計算（「大きい方が良い指標」の場合に使用）
    // 「小さい方が良い指標」の場合は、バーは表示しないか、視覚的表現を変えるアプローチをとる
    const maxValue = topPitchers.length > 0 ? Math.max(...topPitchers.map((p) => p[sortBy] as number)) : 1;

    // 値のフォーマット関数
    const formatValue = (value: number, format: "era" | "number" | "percentage" | "whip") => {
        if (format === "era" || format === "whip") return value.toFixed(2);
        if (format === "percentage") return `${value.toFixed(1)}%`;
        // イニングの場合 1.1などになるため
        if (currentOption.key === "inningsPitched") return value % 1 === 0 ? value.toString() : value.toFixed(1);
        return value.toString();
    };

    return (
        <Card className="border-border/50 shadow-sm flex flex-col h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    投手ランキング
                </CardTitle>
                <div className="flex items-center gap-1.5 ml-2">
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as keyof PitchingAggregation)}
                        className="h-7 text-xs bg-muted border-none rounded-md px-2 font-medium cursor-pointer hover:bg-muted/80 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </CardHeader>
            <CardContent className="space-y-1.5 flex-1">
                {topPitchers.map((pitcher, index) => {
                    const statValue = pitcher[sortBy] as number;
                    
                    // 防御率などはバーの表現が難しいため、上位者から「満タン」とするか、あるいは単純なバーにする
                    // ここでは、「多い方が良い指標」のみバーを表示し、「少ない方が良い指標」は非表示にする
                    const showBar = !currentOption.isLowerBetter;
                    const barWidth = showBar && maxValue > 0 ? (statValue / maxValue) * 100 : 0;

                    return (
                        <Link
                            key={pitcher.playerName}
                            href={`/players?name=${encodeURIComponent(pitcher.playerName)}`}
                            className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-all duration-200"
                        >
                            {/* 順位 */}
                            <span
                                className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${index === 0
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                    : index === 1
                                        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                        : index === 2
                                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                            >
                                {index + 1}
                            </span>

                            {/* 選手名とバー */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {getDisplayName(pitcher.playerName, playerNames)}
                                </p>
                                {showBar && (
                                    <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 値 */}
                            <div className="text-right">
                                <p className="text-sm font-bold tabular-nums">
                                    {formatValue(statValue, currentOption.format)}
                                </p>
                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {currentOption.key !== "era" && `防御率 ${pitcher.era.toFixed(2)} `}
                                    {currentOption.key === "era" && `${pitcher.inningsPitched}回 ${pitcher.strikeouts}奪三振`}
                                </p>
                            </div>

                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    );
                })}

                {topPitchers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center justify-center h-full">
                        投手データがありません
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
