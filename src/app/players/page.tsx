"use client";

/**
 * 選手成績ページ
 * 選手を選択して打撃・投手の詳細成績とグラフを表示
 */
import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/lib/data-context";
import {
    aggregateBatting,
    aggregatePitching,
    calcRecentBattingTrend,
} from "@/lib/calculations";

import BattingBreakdown from "@/components/player/BattingBreakdown";
import TrendChart from "@/components/player/TrendChart";
import {
    Users,
    User,
    TrendingUp,
    Zap,
    ChevronRight,
} from "lucide-react";

/** Suspenseラッパー */
export default function PlayersPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground">読み込み中...</div>}>
            <PlayersPageContent />
        </Suspense>
    );
}

function PlayersPageContent() {
    const searchParams = useSearchParams();
    const initialPlayer = searchParams.get("name") || "";
    const [selectedPlayer, setSelectedPlayer] = useState(initialPlayer);
    const { data, playerNames } = useData();

    type GameFilter = "all" | "official" | "practice";
    const [filter, setFilter] = useState<GameFilter>("all");

    // フィルター適用後のデータ
    const { filteredPA, filteredPitching } = useMemo(() => {
        let fGames = data.games;
        if (filter === "official") {
            fGames = data.games.filter((g) => g.gameType === "official");
        } else if (filter === "practice") {
            fGames = data.games.filter((g) => g.gameType === "practice");
        }

        const filteredGameIds = new Set(fGames.map((g) => g.id));

        return {
            filteredPA: data.plateAppearances.filter((pa) => filteredGameIds.has(pa.gameId)),
            filteredPitching: data.pitchingStats.filter((ps) => filteredGameIds.has(ps.gameId)),
        };
    }, [data, filter]);

    // 全選手の打撃集計
    const allBattingStats = useMemo(
        () => aggregateBatting(filteredPA, data.players),
        [filteredPA, data.players]
    );

    // 全選手の投球集計
    const allPitchingStats = useMemo(
        () => aggregatePitching(filteredPitching, data.players),
        [filteredPitching, data.players]
    );

    // 選択された選手のデータ
    const playerBatting = useMemo(
        () => allBattingStats.find((b) => b.playerName === selectedPlayer),
        [allBattingStats, selectedPlayer]
    );

    const playerPitching = useMemo(
        () => allPitchingStats.find((p) => p.playerName === selectedPlayer),
        [allPitchingStats, selectedPlayer]
    );

    // 打率推移
    const trendData = useMemo(
        () =>
            selectedPlayer
                ? calcRecentBattingTrend(
                    filteredPA,
                    data.games, // calcRecentBattingTrend は内部でゲーム情報を探すため全ゲームを渡すが、打席はフィルタ済
                    selectedPlayer,
                    5
                )
                : [],
        [filteredPA, data.games, selectedPlayer]
    );

    return (
        <div className="space-y-6">
            {/* ヘッダーとフィルター */}
            <div className="animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                        選手成績
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        選手を選択して詳細な成績を確認
                    </p>
                </div>

                {/* フィルタータブ */}
                <div className="flex bg-muted/50 p-1 rounded-xl w-full sm:w-auto">
                    {(["all", "official", "practice"] as GameFilter[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${filter === f
                                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                }`}
                        >
                            {f === "all" ? "すべて" : f === "official" ? "公式戦" : "練習試合"}
                        </button>
                    ))}
                </div>
            </div>

            {/* 選手選択 */}
            <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            選手を選択
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {playerNames.map((name) => {
                                const isActive = selectedPlayer === name;
                                const stats = allBattingStats.find(
                                    (b) => b.playerName === name
                                );

                                return (
                                    <button
                                        key={name}
                                        onClick={() => setSelectedPlayer(name)}
                                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all duration-200 ${isActive
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300 dark:ring-emerald-700 shadow-sm"
                                            : "bg-muted/30 hover:bg-muted/60"
                                            }`}
                                    >
                                        <div
                                            className={`flex items-center justify-center w-9 h-9 rounded-full ${isActive
                                                ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                                                : "bg-muted text-muted-foreground"
                                                }`}
                                        >
                                            <User className="h-4 w-4" />
                                        </div>
                                        <span
                                            className={`text-[11px] font-medium text-center leading-tight ${isActive
                                                ? "text-emerald-700 dark:text-emerald-400"
                                                : "text-muted-foreground"
                                                }`}
                                        >
                                            {name.split(" ")[0]}
                                        </span>
                                        {stats && (
                                            <span className="text-[10px] tabular-nums text-muted-foreground">
                                                .{(stats.avg * 1000).toFixed(0).padStart(3, "0")}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 選手詳細 */}
            {selectedPlayer && playerBatting && (
                <div
                    className="space-y-4 animate-fade-in-up"
                    style={{ animationDelay: "0.15s" }}
                >
                    {/* 選手名ヘッダー */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{selectedPlayer}</h2>
                            <p className="text-xs text-muted-foreground">
                                {playerBatting.plateAppearances}打席 |{" "}
                                {playerBatting.atBats}打数 | {playerBatting.hits}安打
                            </p>
                        </div>
                    </div>

                    {/* 打撃基本成績 */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                                打撃成績
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                {[
                                    {
                                        label: "打率",
                                        value: `.${(playerBatting.avg * 1000)
                                            .toFixed(0)
                                            .padStart(3, "0")}`,
                                        highlight: true,
                                    },
                                    {
                                        label: "出塁率",
                                        value: `.${(playerBatting.obp * 1000)
                                            .toFixed(0)
                                            .padStart(3, "0")}`,
                                        highlight: true,
                                    },
                                    { label: "打点", value: `${playerBatting.rbi}` },
                                    { label: "得点", value: `${playerBatting.runs}`, highlight: true },
                                    { label: "盗塁", value: `${playerBatting.stolenBases}`, highlight: true },
                                    { label: "二塁打", value: `${playerBatting.doubles}` },
                                    { label: "三塁打", value: `${playerBatting.triples}` },
                                    { label: "本塁打", value: `${playerBatting.homeruns}` },
                                    { label: "四球", value: `${playerBatting.walks}` },
                                    { label: "死球", value: `${playerBatting.hbp}` },
                                    { label: "三振", value: `${playerBatting.strikeouts}` },
                                    { label: "犠打", value: `${playerBatting.sacrifices}` },
                                    { label: "安打", value: `${playerBatting.hits}` },
                                    { label: "打数", value: `${playerBatting.atBats}` },
                                ].map((stat) => (
                                    <div
                                        key={stat.label}
                                        className={`text-center p-2.5 rounded-lg ${stat.highlight
                                            ? "bg-emerald-50 dark:bg-emerald-950/30"
                                            : "bg-muted/30"
                                            }`}
                                    >
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                            {stat.label}
                                        </p>
                                        <p
                                            className={`text-lg font-bold tabular-nums mt-0.5 ${stat.highlight
                                                ? "text-emerald-700 dark:text-emerald-400"
                                                : ""
                                                }`}
                                        >
                                            {stat.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* グラフ: 打球方向・タイプブレイクダウン */}
                    <BattingBreakdown stats={playerBatting} />

                    {/* グラフ: 打率推移 */}
                    <TrendChart data={trendData} playerAvg={playerBatting.avg} />

                    {/* 投手成績（投手の場合） */}
                    {playerPitching && (
                        <>
                            <Separator className="my-2" />
                            <Card className="border-border/50 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-blue-500" />
                                        投手成績
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                        {[
                                            {
                                                label: "防御率",
                                                value: playerPitching.era.toFixed(2),
                                                highlight: true,
                                            },
                                            {
                                                label: "ストライク率",
                                                value: `${playerPitching.strikePercentage.toFixed(1)}%`,
                                                highlight: true,
                                            },
                                            {
                                                label: "登板",
                                                value: `${playerPitching.games}`,
                                            },
                                            {
                                                label: "投球回",
                                                value: `${playerPitching.inningsPitched}`,
                                            },
                                            {
                                                label: "奪三振",
                                                value: `${playerPitching.strikeouts}`,
                                            },
                                            {
                                                label: "自責点",
                                                value: `${playerPitching.earnedRuns}`,
                                            },
                                            {
                                                label: "被安打",
                                                value: `${playerPitching.hitsAllowed}`,
                                            },
                                            {
                                                label: "与四球",
                                                value: `${playerPitching.walksAllowed}`,
                                            },
                                            {
                                                label: "総球数",
                                                value: `${playerPitching.totalPitches}`,
                                            },
                                            {
                                                label: "S/B",
                                                value: `${playerPitching.strikes}/${playerPitching.balls}`,
                                            },
                                        ].map((stat) => (
                                            <div
                                                key={stat.label}
                                                className={`text-center p-2.5 rounded-lg ${stat.highlight
                                                    ? "bg-blue-50 dark:bg-blue-950/30"
                                                    : "bg-muted/30"
                                                    }`}
                                            >
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                                    {stat.label}
                                                </p>
                                                <p
                                                    className={`text-lg font-bold tabular-nums mt-0.5 ${stat.highlight
                                                        ? "text-blue-700 dark:text-blue-400"
                                                        : ""
                                                        }`}
                                                >
                                                    {stat.value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* ストライク率ビジュアルバー */}
                                    <div className="mt-4 p-3 rounded-xl bg-muted/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium">ストライク率</span>
                                            <span className="text-sm font-bold tabular-nums">
                                                {playerPitching.strikePercentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000"
                                                style={{
                                                    width: `${playerPitching.strikePercentage}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[10px] text-muted-foreground">
                                                ストライク: {playerPitching.strikes}球
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                ボール: {playerPitching.balls}球
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {/* 未選択時 */}
            {!selectedPlayer && (
                <div
                    className="animate-fade-in-up"
                    style={{ animationDelay: "0.15s" }}
                >
                    <Card className="border-border/50 shadow-sm">
                        <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted">
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                上から選手を選択してください
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <ChevronRight className="h-3 w-3" />
                                タップすると詳細成績が表示されます
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
