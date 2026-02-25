"use client";

/**
 * 最近の試合結果リストコンポーネント
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameMetadata } from "@/lib/types";
import { Calendar, Trophy, Swords, ImageIcon } from "lucide-react";
import { GameDetailsDialog } from "./GameDetailsDialog";

interface RecentGamesProps {
    games: GameMetadata[];
    limit?: number;
}

/** 試合結果のバッジ色 */
function getResultBadge(result: GameMetadata["result"]) {
    switch (result) {
        case "win":
            return {
                label: "勝ち",
                className:
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
            };
        case "loss":
            return {
                label: "負け",
                className:
                    "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800",
            };
        case "tie":
            return {
                label: "引分",
                className:
                    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-amber-200 dark:border-amber-800",
            };
    }

    // フォールバック
    return {
        label: "不明",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    };
}

/** 試合タイプのラベル */
function getGameTypeLabel(type: GameMetadata["gameType"]) {
    return type === "official" ? "公式戦" : "練習試合";
}

export default function RecentGames({ games, limit = 5 }: RecentGamesProps) {
    const [selectedGame, setSelectedGame] = useState<GameMetadata | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const sortedGames = [...games]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

    const handleGameClick = (game: GameMetadata) => {
        setSelectedGame(game);
        setIsDialogOpen(true);
    };

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Swords className="h-4 w-4 text-muted-foreground" />
                    最近の試合結果
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {sortedGames.map((game) => {
                    const badge = getResultBadge(game.result);
                    return (
                        <div
                            key={game.id}
                            onClick={() => handleGameClick(game)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors duration-200 cursor-pointer"
                        >
                            {/* 結果アイコン */}
                            <div
                                className={`flex items-center justify-center w-9 h-9 rounded-lg ${game.result === "win"
                                    ? "bg-emerald-100 dark:bg-emerald-900/40"
                                    : game.result === "loss"
                                        ? "bg-red-100 dark:bg-red-900/40"
                                        : "bg-amber-100 dark:bg-amber-900/40"
                                    }`}
                            >
                                <Trophy
                                    className={`h-4 w-4 ${game.result === "win"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : game.result === "loss"
                                            ? "text-red-500 dark:text-red-400"
                                            : "text-amber-600 dark:text-amber-400"
                                        }`}
                                />
                            </div>

                            {/* 試合情報 */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold truncate">
                                        vs {game.opponent}
                                    </p>
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] px-1.5 py-0 ${badge.className}`}
                                    >
                                        {badge.label}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {game.date}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        {getGameTypeLabel(game.gameType)}
                                    </span>
                                </div>
                            </div>

                            {/* スコア */}
                            <div className="text-right flex flex-col items-end gap-1">
                                <p className="text-lg font-bold tabular-nums">
                                    {game.scoreFor} - {game.scoreAgainst}
                                </p>
                                {game.scoreboardImageUrl && (
                                    <div className="flex items-center gap-1 text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                                        <ImageIcon className="h-3 w-3" />
                                        <span>画像あり</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {sortedGames.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        試合データがありません
                    </div>
                )}
            </CardContent>

            <GameDetailsDialog
                game={selectedGame}
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />
        </Card>
    );
}
