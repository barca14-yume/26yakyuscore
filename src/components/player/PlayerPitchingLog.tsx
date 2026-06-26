"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PitchingStats, GameMetadata } from "@/lib/types";
import { Zap, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlayerPitchingLogProps {
    playerName: string;
    pitchingStats: PitchingStats[];
    games: GameMetadata[];
}

export default function PlayerPitchingLog({ playerName, pitchingStats, games }: PlayerPitchingLogProps) {
    const normalize = (n: string) => (n || "").replace(/[\s\u3000]/g, "");

    const groupedLog = useMemo(() => {
        if (!playerName) return [];
        const normalizedTarget = normalize(playerName);

        // 1. 投手の全登板データを抽出
        const playerStats = pitchingStats.filter(ps => normalize(ps.playerName) === normalizedTarget);

        // 2. 各試合情報を付与して日付の降順にソート
        const result = playerStats.map(ps => {
            const game = games.find(g => g.id === ps.gameId);
            return {
                stats: ps,
                game,
                date: game ? new Date(game.date).getTime() : 0,
            };
        });

        return result.sort((a, b) => b.date - a.date);
    }, [playerName, pitchingStats, games]);

    if (!playerName || groupedLog.length === 0) return null;

    return (
        <Card className="border-border/50 shadow-sm mt-4">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    全登板履歴
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0 sm:p-6 space-y-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse min-w-[600px] sm:min-w-0">
                        <thead>
                            <tr className="border-b border-border/50 text-muted-foreground text-[11px] font-semibold uppercase tracking-wider text-left bg-muted/20">
                                <th className="py-2.5 px-3">日程 / 対戦相手</th>
                                <th className="py-2.5 px-3 text-center">回</th>
                                <th className="py-2.5 px-3 text-center">球数</th>
                                <th className="py-2.5 px-3 text-center">ストライク率</th>
                                <th className="py-2.5 px-3 text-center">被安打</th>
                                <th className="py-2.5 px-3 text-center">与四球</th>
                                <th className="py-2.5 px-3 text-center">奪三振</th>
                                <th className="py-2.5 px-3 text-center">失点</th>
                                <th className="py-2.5 px-3 text-center">自責点</th>
                                <th className="py-2.5 px-3 text-center">防御率</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {groupedLog.map(({ stats, game }) => {
                                const strikeRate = stats.totalPitches > 0 ? (stats.strikes / stats.totalPitches) * 100 : 0;
                                const era = stats.inningsPitched > 0 ? (stats.earnedRuns * 7) / stats.inningsPitched : 0;

                                return (
                                    <tr key={stats.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="py-3 px-3">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{game ? game.date : "不明"}</span>
                                                </div>
                                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                                    <span>vs {game ? game.opponent : "不明"}</span>
                                                    {game && game.gameType === "official" && (
                                                        <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                            {game.officialGameName || "公式戦"}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center font-medium tabular-nums">{stats.inningsPitched}</td>
                                        <td className="py-3 px-3 text-center tabular-nums text-muted-foreground">
                                            <div className="flex flex-col items-center">
                                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{stats.totalPitches}</span>
                                                <span className="text-[9px]">({stats.strikes}-{stats.balls})</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-center tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                                            {strikeRate.toFixed(1)}%
                                        </td>
                                        <td className="py-3 px-3 text-center tabular-nums">{stats.hitsAllowed}</td>
                                        <td className="py-3 px-3 text-center tabular-nums">{stats.walksAllowed}</td>
                                        <td className="py-3 px-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{stats.strikeouts}</td>
                                        <td className="py-3 px-3 text-center tabular-nums text-red-500 font-medium">{stats.runsAllowed}</td>
                                        <td className="py-3 px-3 text-center tabular-nums text-red-600 dark:text-red-400 font-semibold">{stats.earnedRuns}</td>
                                        <td className={`py-3 px-3 text-center tabular-nums font-bold ${era <= 2 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-800 dark:text-zinc-200"}`}>
                                            {stats.inningsPitched > 0 ? era.toFixed(2) : "-"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
