"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlateAppearance, GameMetadata, AtBatResult } from "@/lib/types";
import { History, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlayerAtBatLogProps {
    playerName: string;
    plateAppearances: PlateAppearance[];
    games: GameMetadata[];
}

const AT_BAT_LABELS: Record<AtBatResult, string> = {
    single: "単打",
    double: "二塁打",
    triple: "三塁打",
    homerun: "本塁打",
    walk: "四球",
    hbp: "死球",
    error: "エラー",
    sacrifice: "犠打・犠飛",
    out: "アウト",
    strikeout_swinging: "空振三振",
    strikeout_looking: "見逃三振",
    strikeout: "三振",
    groundout: "ゴロ",
    flyout: "フライ",
};

const BATTED_BALL_LABELS: Record<string, string> = {
    grounder: "ゴロ",
    liner: "ライナー",
    fly: "フライ",
};

const DIRECTION_LABELS: Record<string, string> = {
    "1": "投", "2": "捕", "3": "一", "4": "二", "5": "三", "6": "遊", "7": "左", "8": "中", "9": "右",
};

const isHit = (result: AtBatResult) => ["single", "double", "triple", "homerun"].includes(result);

export default function PlayerAtBatLog({ playerName, plateAppearances, games }: PlayerAtBatLogProps) {
    const normalize = (n: string) => (n || "").replace(/[\s\u3000]/g, "");

    const groupedLog = useMemo(() => {
        if (!playerName) return [];
        const normalizedTarget = normalize(playerName);

        // 1. 選手の全打席を抽出
        const playerPAs = plateAppearances.filter(pa => normalize(pa.playerName) === normalizedTarget);

        // 2. 試合ごとにグループ化
        const map = new Map<string, PlateAppearance[]>();
        playerPAs.forEach(pa => {
            if (!map.has(pa.gameId)) map.set(pa.gameId, []);
            map.get(pa.gameId)!.push(pa);
        });

        // 3. 各試合情報を付与して日付の降順にソート
        const result = Array.from(map.entries()).map(([gameId, pas]) => {
            const game = games.find(g => g.id === gameId);
            // 同一試合内ではイニングと作成順でソート（作成順はID内のtimestamp等に基づく）
            // PAには打順もイニングも入っているので基本はイニング順
            pas.sort((a, b) => {
                if (a.inning !== b.inning) return a.inning - b.inning;
                // イニングが同じならIDでソート（だいたいは時間順になっている）
                return a.id.localeCompare(b.id);
            });
            return {
                gameId,
                game,
                date: game ? new Date(game.date).getTime() : 0,
                pas,
            };
        });

        return result.sort((a, b) => b.date - a.date);
    }, [playerName, plateAppearances, games]);

    if (!playerName || groupedLog.length === 0) return null;

    return (
        <Card className="border-border/50 shadow-sm mt-4">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4 text-emerald-500" />
                    全打席履歴
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0 sm:p-6 space-y-6">
                {groupedLog.map(({ gameId, game, pas }) => (
                    <div key={gameId} className="space-y-3 px-4 sm:px-0">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">
                                {game ? `${game.date} vs ${game.opponent}` : "不明な試合"}
                            </span>
                            {game && game.gameType === "official" && (
                                <Badge variant="secondary" className="text-[10px] py-0 ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                    {game.officialGameName || "公式戦"}
                                </Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {pas.map((pa, index) => {
                                const hit = isHit(pa.result);
                                const isOut = ["out", "strikeout_swinging", "strikeout_looking", "strikeout", "groundout", "flyout"].includes(pa.result);
                                
                                return (
                                    <div 
                                        key={pa.id} 
                                        className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                                            hit ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20" :
                                            isOut ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30" :
                                            "border-blue-100 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20"
                                        }`}
                                    >
                                        <div className="flex justify-between items-center text-[11px] text-muted-foreground font-medium">
                                            <span>第{index + 1}打席 ({pa.inning}回)</span>
                                            {(pa.rbi > 0 || pa.runs > 0) && (
                                                <div className="flex gap-1">
                                                    {pa.rbi > 0 && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-200 text-orange-600">打点{pa.rbi}</Badge>}
                                                    {pa.runs > 0 && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-200 text-blue-600">得点{pa.runs}</Badge>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-sm font-bold ${hit ? "text-emerald-700 dark:text-emerald-400" : isOut ? "text-zinc-600 dark:text-zinc-400" : "text-blue-700 dark:text-blue-400"}`}>
                                                {AT_BAT_LABELS[pa.result] || pa.result}
                                            </span>
                                            {(pa.battedBallDirection || pa.battedBallType) && (
                                                <span className="text-[11px] text-muted-foreground">
                                                    (
                                                    {[
                                                        pa.battedBallType ? BATTED_BALL_LABELS[pa.battedBallType] : "",
                                                        pa.battedBallDirection ? DIRECTION_LABELS[pa.battedBallDirection] : ""
                                                    ].filter(Boolean).join(" / ")}
                                                    )
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
