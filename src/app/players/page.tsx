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
    aggregateTeamBatting,
    aggregateTeamPitching,
    calcRecentBattingTrend,
} from "@/lib/calculations";
import { getDisplayName } from "@/lib/utils";

import BattingBreakdown from "@/components/player/BattingBreakdown";
import TrendChart from "@/components/player/TrendChart";
import PlayerAtBatLog from "@/components/player/PlayerAtBatLog";
import MetricsExplanationDialog from "@/components/shared/MetricsExplanationDialog";
import {
    Users,
    User,
    TrendingUp,
    Zap,
    ChevronRight,
    Sparkles,
} from "lucide-react";
import Link from "next/link";

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
        if (filter === "all") {
            // "すべて"の場合は孤立データ(gameIdが存在しない等)も救済して全件合算
            return {
                filteredPA: data.plateAppearances,
                filteredPitching: data.pitchingStats,
            };
        }

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
        () => aggregateBatting(filteredPA, data.players, undefined, data.games),
        [filteredPA, data.players, data.games]
    );

    // チーム全体の打撃集計
    const teamBattingStats = useMemo(
        () => aggregateTeamBatting(filteredPA),
        [filteredPA]
    );

    // 全選手の投球集計
    const allPitchingStats = useMemo(
        () => aggregatePitching(filteredPitching, data.players),
        [filteredPitching, data.players]
    );

    // チーム全体の投球集計
    const teamPitchingStats = useMemo(
        () => aggregateTeamPitching(filteredPitching),
        [filteredPitching]
    );

    // 選択された選手のデータ（未選択ならチーム全体）
    const playerBatting = useMemo(() => {
        if (!selectedPlayer) return teamBattingStats;
        return allBattingStats.find((b) => b.playerName === selectedPlayer);
    }, [allBattingStats, teamBattingStats, selectedPlayer]);

    const playerPitching = useMemo(() => {
        if (!selectedPlayer) return teamPitchingStats;
        return allPitchingStats.find((p) => p.playerName === selectedPlayer);
    }, [allPitchingStats, teamPitchingStats, selectedPlayer]);

    // 打率推移
    const trendData = useMemo(
        () =>
            selectedPlayer
                ? calcRecentBattingTrend(
                    filteredPA,
                    data.games,
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
                            {/* チーム全体ボタン */}
                            <button
                                onClick={() => setSelectedPlayer("")}
                                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all duration-200 ${!selectedPlayer
                                    ? "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300 dark:ring-emerald-700 shadow-sm"
                                    : "bg-muted/30 hover:bg-muted/60"
                                    }`}
                            >
                                <div
                                    className={`flex items-center justify-center w-9 h-9 rounded-full ${!selectedPlayer
                                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                                        : "bg-muted text-muted-foreground"
                                        }`}
                                >
                                    <Users className="h-4 w-4" />
                                </div>
                                <span
                                    className={`text-[11px] font-medium text-center leading-tight ${!selectedPlayer
                                        ? "text-emerald-700 dark:text-emerald-400"
                                        : "text-muted-foreground"
                                        }`}
                                >
                                    チーム全体
                                </span>
                                <span className="text-[10px] tabular-nums text-muted-foreground">
                                    .{(teamBattingStats.avg * 1000).toFixed(0).padStart(3, "0")}
                                </span>
                            </button>

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
                                            {getDisplayName(name, playerNames)}
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

            {/* 選手・チーム詳細 */}
            {playerBatting && (
                <div
                    className="space-y-4 animate-fade-in-up"
                    style={{ animationDelay: "0.15s" }}
                >
                    {/* ヘッダー */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                            {selectedPlayer ? <User className="h-6 w-6" /> : <Users className="h-6 w-6" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{selectedPlayer || "チーム全体"}</h2>
                            <p className="text-xs text-muted-foreground">
                                {playerBatting.plateAppearances}打席 |{" "}
                                {playerBatting.atBats}打数 | {playerBatting.hits}安打
                            </p>
                        </div>
                    </div>

                    {/* 打撃基本成績 */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    打撃成績
                                </div>
                                <MetricsExplanationDialog />
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
                                    {
                                        label: "OPS",
                                        value: playerBatting.ops.toFixed(3),
                                        highlight: true,
                                    },
                                    {
                                        label: "長打率",
                                        value: `.${(playerBatting.slg * 1000)
                                            .toFixed(0)
                                            .padStart(3, "0")}`,
                                    },
                                    {
                                        label: "得点圏打率",
                                        value: `.${(playerBatting.rispAvg * 1000)
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
                                    {
                                        label: "三振率",
                                        value: `${(playerBatting.strikeoutRate * 100).toFixed(1)}%`,
                                        highlight: true,
                                    },
                                    {
                                        label: "BB/K",
                                        value: playerBatting.bbK.toFixed(2),
                                    },
                                    {
                                        label: "BB%",
                                        value: `${(playerBatting.bbPercentage * 100).toFixed(1)}%`,
                                    },
                                    {
                                        label: "IsoP",
                                        value: playerBatting.isop.toFixed(3),
                                    },
                                    {
                                        label: "BABIP",
                                        value: `.${(playerBatting.babip * 1000).toFixed(0).padStart(3, "0")}`,
                                    },
                                    {
                                        label: "RC",
                                        value: playerBatting.rc.toFixed(2),
                                        highlight: true,
                                    },
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

                    {/* 全打席履歴 */}
                    <PlayerAtBatLog 
                        playerName={selectedPlayer}
                        plateAppearances={filteredPA}
                        games={data.games}
                    />

                    {/* 投手成績（投手の場合） */}
                    {playerPitching && playerPitching.games > 0 && (
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

            {/* 選手詳細が閉じられた */}
            {!playerBatting && (
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
                                データがありません
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* おすすめスタメンへのリンク */}
            <div className="animate-fade-in-up pt-4" style={{ animationDelay: "0.2s" }}>
                <Link href="/lineup/recommend" className="block">
                    <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-900/40 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                        <CardContent className="p-4 sm:p-5 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm sm:text-base text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                                        AIおすすめスタメン生成
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[9px] px-1.5 py-0">New</Badge>
                                    </h3>
                                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                                        直近5試合の成績から最適な打順を提案します
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white/50 dark:bg-black/20 p-2 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
