"use client";

import React, { useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useData } from "@/lib/data-context";
import { GameMetadata } from "@/lib/types";
import { Trophy, Swords, Calendar, ImageIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { inningsToOuts, outsToInnings } from "@/lib/calculations";

interface GameDetailsDialogProps {
    game: GameMetadata | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GameDetailsDialog({ game, open, onOpenChange }: GameDetailsDialogProps) {
    const { data } = useData();
    const [isImageOpen, setIsImageOpen] = React.useState(false);

    // 選択された試合の打撃・投手データを抽出・集計
    const stats = useMemo(() => {
        if (!game) return null;

        const gamePAs = data.plateAppearances.filter((pa) => pa.gameId === game.id);
        const gamePitching = data.pitchingStats.filter((ps) => ps.gameId === game.id);

        // 打撃成績のチーム合計
        const batting = {
            pa: gamePAs.length,
            ab: 0,
            hits: 0,
            doubles: 0,
            triples: 0,
            homeruns: 0,
            walks: 0,
            hbp: 0,
            strikeouts: 0,
            sacrifices: 0,
            rbi: 0,
            runs: 0,
            stolenBases: 0,
            errorsOnBase: 0,
        };

        gamePAs.forEach((pa) => {
            batting.rbi += pa.rbi || 0;
            batting.runs += pa.runs || 0;
            batting.stolenBases += pa.stolenBases || 0;

            const isAtBat = !["walk", "hbp", "sacrifice"].includes(pa.result);
            if (isAtBat) batting.ab += 1;

            switch (pa.result) {
                case "single":
                    batting.hits += 1;
                    break;
                case "double":
                    batting.hits += 1;
                    batting.doubles += 1;
                    break;
                case "triple":
                    batting.hits += 1;
                    batting.triples += 1;
                    break;
                case "homerun":
                    batting.hits += 1;
                    batting.homeruns += 1;
                    break;
                case "walk":
                    batting.walks += 1;
                    break;
                case "hbp":
                    batting.hbp += 1;
                    break;
                case "strikeout":
                    batting.strikeouts += 1;
                    break;
                case "sacrifice":
                    batting.sacrifices += 1;
                    break;
                case "error":
                    batting.errorsOnBase += 1;
                    break;
            }
        });

        // 投手成績のチーム合計
        const pitching = {
            inningsPitched: 0,
            runsAllowed: 0,
            earnedRuns: 0,
            hitsAllowed: 0,
            walksAllowed: 0,
            strikeouts: 0,
            totalPitches: 0,
        };

        let totalOuts = 0;

        gamePitching.forEach((ps) => {
            totalOuts += inningsToOuts(ps.inningsPitched || 0);
            pitching.runsAllowed += ps.runsAllowed || 0;
            pitching.earnedRuns += ps.earnedRuns || 0;
            pitching.hitsAllowed += ps.hitsAllowed || 0;
            pitching.walksAllowed += ps.walksAllowed || 0;
            pitching.strikeouts += ps.strikeouts || 0;
            pitching.totalPitches += ps.totalPitches || 0;
        });

        pitching.inningsPitched = outsToInnings(totalOuts);

        return { batting, pitching };
    }, [game, data]);

    if (!game || !stats) return null;

    const gameTypeLabel = game.gameType === "official" ? "公式戦" : "練習試合";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                    <DialogTitle className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                            <Calendar className="h-4 w-4" />
                            <span>{game.date}</span>
                            <Badge variant="outline" className="text-xs ml-2">{gameTypeLabel}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-2xl">
                            <Swords className="h-6 w-6 text-primary" />
                            <span>vs {game.opponent}</span>
                        </div>
                        <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl mt-2 border border-border/50">
                            <div className="text-center w-24">
                                <p className="text-sm font-medium text-muted-foreground mb-1">自チーム</p>
                                <p className="text-4xl font-bold tabular-nums text-primary">{game.scoreFor}</p>
                            </div>
                            <div className="text-xl font-bold text-muted-foreground">-</div>
                            <div className="text-center w-24">
                                <p className="text-sm font-medium text-muted-foreground mb-1">相手</p>
                                <p className="text-4xl font-bold tabular-nums text-destructive">{game.scoreAgainst}</p>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* チーム打撃成績 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <h3 className="font-semibold text-lg">チーム打撃成績</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <StatItem label="打席数 / 打数" value={`${stats.batting.pa} / ${stats.batting.ab}`} />
                            <StatItem label="安打" value={stats.batting.hits} />
                            <StatItem label="長打" value={stats.batting.doubles + stats.batting.triples + stats.batting.homeruns} />
                            <StatItem label="打点" value={stats.batting.rbi} />
                            <StatItem label="得点" value={stats.batting.runs} />
                            <StatItem label="四死球" value={stats.batting.walks + stats.batting.hbp} />
                            <StatItem label="三振" value={stats.batting.strikeouts} />
                            <StatItem label="盗塁" value={stats.batting.stolenBases} />
                            <StatItem label="犠打・犠飛" value={stats.batting.sacrifices} />
                            <StatItem label="エラー出塁" value={stats.batting.errorsOnBase} />
                        </div>
                    </div>

                    {/* チーム投手成績 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Trophy className="h-5 w-5 text-emerald-500" />
                            <h3 className="font-semibold text-lg">チーム投手成績</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <StatItem label="投球回" value={stats.pitching.inningsPitched} />
                            <StatItem label="総球数" value={stats.pitching.totalPitches} />
                            <StatItem label="失点" value={stats.pitching.runsAllowed} />
                            <StatItem label="自責点" value={stats.pitching.earnedRuns} />
                            <StatItem label="被安打" value={stats.pitching.hitsAllowed} />
                            <StatItem label="与四死球" value={stats.pitching.walksAllowed} />
                            <StatItem label="奪三振" value={stats.pitching.strikeouts} />
                        </div>
                    </div>
                </div>

                {/* スコアボード画像表示領域 */}
                {game.scoreboardImageUrl && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                        <div className="flex items-center gap-2 mb-3">
                            <ImageIcon className="h-5 w-5 text-indigo-500" />
                            <h3 className="font-semibold text-lg">スコアボード画像</h3>
                        </div>
                        <div
                            className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden cursor-pointer border shadow-sm group"
                            onClick={() => setIsImageOpen(true)}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={game.scoreboardImageUrl}
                                alt="スコアボード"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-medium bg-black/50 px-3 py-1.5 rounded-full text-sm">
                                    クリックで拡大表示
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>

            {/* 画像拡大表示用ダイアログ */}
            <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-1 bg-black/95 border-none flex flex-col justify-center">
                    <button
                        onClick={() => setIsImageOpen(false)}
                        className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    {game?.scoreboardImageUrl && (
                        <div className="relative w-full h-full flex items-center justify-center owerflow-hidden rounded-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={game.scoreboardImageUrl}
                                alt="스코アボード（拡大）"
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex flex-col bg-muted/20 p-3 rounded-lg border border-border/50">
            <span className="text-xs text-muted-foreground mb-1">{label}</span>
            <span className="text-lg font-semibold tabular-nums leading-none">{value}</span>
        </div>
    );
}
