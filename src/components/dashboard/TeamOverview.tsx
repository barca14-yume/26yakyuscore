"use client";

/**
 * チーム打撃ランキングコンポーネント
 * ダッシュボードに表示する選手打率ランキング
 */
import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BattingAggregation } from "@/lib/types";
import { BarChart3, ChevronRight, ArrowUpDown } from "lucide-react";
import { useData } from "@/lib/data-context";
import { getDisplayName } from "@/lib/utils";

/** ソート可能な打撃指標のキーとラベル */
type SortOption = {
    key: keyof BattingAggregation;
    label: string;
    format: "avg" | "number" | "ops";
};

const SORT_OPTIONS: SortOption[] = [
    { key: "avg", label: "打率", format: "avg" },
    { key: "ops", label: "OPS", format: "ops" },
    { key: "homeruns", label: "本塁打", format: "number" },
    { key: "rbi", label: "打点", format: "number" },
    { key: "runs", label: "得点", format: "number" },
    { key: "obp", label: "出塁率", format: "avg" },
    { key: "hits", label: "安打", format: "number" },
    { key: "stolenBases", label: "盗塁", format: "number" },
    { key: "walks", label: "四球", format: "number" },
    { key: "sacrifices", label: "犠打", format: "number" },
];

interface TeamOverviewProps {
    battingStats: BattingAggregation[];
    limit?: number;
}

export default function TeamOverview({ battingStats, limit = 8 }: TeamOverviewProps) {
    const { playerNames } = useData();
    const [sortBy, setSortBy] = React.useState<keyof BattingAggregation>("avg");

    // 選択された指標でソートし、上位を取得
    const topBatters = [...battingStats]
        .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number))
        .slice(0, limit);

    // 選択中のオプション情報を取得
    const currentOption = SORT_OPTIONS.find((opt) => opt.key === sortBy) || SORT_OPTIONS[0];

    // プログレスバーの最大値計算
    const maxValue = topBatters.length > 0 ? Math.max(...topBatters.map((b) => b[sortBy] as number)) : 1;

    // 値のフォーマット関数
    const formatValue = (value: number, format: "avg" | "number" | "ops") => {
        if (format === "avg") return `.${(value * 1000).toFixed(0).padStart(3, "0")}`;
        if (format === "ops") return value.toFixed(3);
        return value.toString();
    };

    return (
        <Card className="border-border/50 shadow-sm flex flex-col h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    打撃ランキング
                </CardTitle>
                <div className="flex items-center gap-1.5 ml-2">
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as keyof BattingAggregation)}
                        className="h-7 text-xs bg-muted border-none rounded-md px-2 font-medium cursor-pointer hover:bg-muted/80 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
                {topBatters.map((batter, index) => {
                    // バーの幅（最大値を100%とした相対値）
                    const statValue = batter[sortBy] as number;
                    const barWidth = maxValue > 0 ? (statValue / maxValue) * 100 : 0;

                    return (
                        <Link
                            key={batter.playerName}
                            href={`/players?name=${encodeURIComponent(batter.playerName)}`}
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
                                    {getDisplayName(batter.playerName, playerNames)}
                                </p>
                                <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>

                            {/* 値 */}
                            <div className="text-right">
                                <p className="text-sm font-bold tabular-nums">
                                    {formatValue(statValue, currentOption.format)}
                                </p>
                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {currentOption.key !== "avg" && `打率 .${(batter.avg * 1000).toFixed(0).padStart(3, "0")} `}
                                    {currentOption.key === "avg" && `${batter.rbi}点 ${batter.runs}得 ${batter.stolenBases}盗`}
                                </p>
                            </div>

                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                    );
                })}

                {topBatters.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        打撃データがありません
                    </div>
                )}
            </CardContent>
        </Card >
    );
}
