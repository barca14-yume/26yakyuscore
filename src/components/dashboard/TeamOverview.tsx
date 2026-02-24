"use client";

/**
 * チーム打撃ランキングコンポーネント
 * ダッシュボードに表示する選手打率ランキング
 */
import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BattingAggregation } from "@/lib/types";
import { BarChart3, ChevronRight } from "lucide-react";

interface TeamOverviewProps {
    battingStats: BattingAggregation[];
    limit?: number;
}

export default function TeamOverview({ battingStats, limit = 8 }: TeamOverviewProps) {
    const topBatters = battingStats.slice(0, limit);
    const maxAvg = topBatters.length > 0 ? Math.max(...topBatters.map((b) => b.avg)) : 1;

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    打撃ランキング
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
                {topBatters.map((batter, index) => {
                    // 打率バーの幅（最大打率を100%とした相対値）
                    const barWidth = maxAvg > 0 ? (batter.avg / maxAvg) * 100 : 0;

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

                            {/* 選手名と打率バー */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {batter.playerName}
                                </p>
                                <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>

                            {/* 打率 */}
                            <div className="text-right">
                                <p className="text-sm font-bold tabular-nums">
                                    .{(batter.avg * 1000).toFixed(0).padStart(3, "0")}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    {batter.hits}/{batter.atBats}
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
        </Card>
    );
}
