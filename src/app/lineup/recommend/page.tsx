"use client";

import React, { useState, useMemo, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/lib/data-context";
import { getDisplayName } from "@/lib/utils";
import { aggregateBatting, generateRecommendedLineup } from "@/lib/calculations";
import { LineupStrategy, RecommendedBatter } from "@/lib/types";
import { Target, TrendingUp, Users, Zap, Shield, ChevronLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

const STRATEGIES: { value: LineupStrategy; label: string; icon: React.ReactNode }[] = [
    { value: "balanced", label: "総合バランス", icon: <Shield className="h-4 w-4" /> },
    { value: "rc_focused", label: "超攻撃型 (RC優先)", icon: <Zap className="h-4 w-4" /> },
    { value: "obp_focused", label: "チャンスメイク (出塁率)", icon: <Target className="h-4 w-4" /> },
    { value: "risp_focused", label: "勝負強さ (得点圏)", icon: <TrendingUp className="h-4 w-4" /> },
];

export default function RecommendLineupPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground">読み込み中...</div>}>
            <RecommendLineupContent />
        </Suspense>
    );
}

function RecommendLineupContent() {
    const { data, playerNames } = useData();
    const [strategy, setStrategy] = useState<LineupStrategy>("balanced");

    // 全期間の成績を計算
    const totalStats = useMemo(() => {
        return aggregateBatting(data.plateAppearances, data.players, undefined, data.games);
    }, [data.plateAppearances, data.players, data.games]);

    // おすすめラインナップを生成
    const recommendation = useMemo(() => {
        return generateRecommendedLineup(totalStats, strategy);
    }, [totalStats, strategy]);

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-10">
            {/* 戻るリンク & ヘッダー */}
            <div className="animate-fade-in-up">
                <Link 
                    href="/players"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600 mb-4 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    選手成績に戻る
                </Link>
                
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AI おすすめスタメン</h1>
                        <p className="text-xs text-muted-foreground mt-1">通算成績を元に最適な打順を提案します</p>
                    </div>
                </div>
            </div>

            {/* 戦略選択 */}
            <Card className="animate-fade-in-up border-border/50 shadow-sm" style={{ animationDelay: "0.1s" }}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">チーム戦略を選択</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {STRATEGIES.map(s => (
                            <button
                                key={s.value}
                                onClick={() => setStrategy(s.value)}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 ${
                                    strategy === s.value
                                        ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                        : "bg-background border-border hover:bg-muted/50 text-muted-foreground"
                                }`}
                            >
                                {s.icon}
                                <span className="text-xs font-medium">{s.label}</span>
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                            {recommendation.strategyName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {recommendation.description}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ラインナップ表示 */}
            <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-emerald-500" />
                        提案された打順
                    </h2>
                    <Badge variant="outline" className="text-[10px] bg-background">
                        通算データを使用
                    </Badge>
                </div>
                
                <div className="space-y-2">
                    {recommendation.batters.map((batter: RecommendedBatter) => {
                        const isCore = batter.order >= 3 && batter.order <= 5; // クリーンナップ
                        const isTop = batter.order <= 2;
                        
                        return (
                            <Card 
                                key={batter.order} 
                                className={`overflow-hidden border-l-4 transition-all hover:shadow-md ${
                                    isCore ? "border-l-rose-500 dark:border-l-rose-600" : 
                                    isTop ? "border-l-blue-500 dark:border-l-blue-600" : 
                                    "border-l-emerald-500 dark:border-l-emerald-600"
                                }`}
                            >
                                <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    <div className="flex items-center gap-3 min-w-[120px]">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                            isCore ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400" :
                                            isTop ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" :
                                            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                        }`}>
                                            {batter.order}
                                        </div>
                                        <span className="font-bold text-base">
                                            {getDisplayName(batter.playerName, playerNames)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="inline-flex items-center bg-muted/60 px-2 py-1 rounded text-xs text-muted-foreground font-medium mb-1.5 sm:mb-0 sm:mr-3">
                                            <Target className="w-3 h-3 mr-1" />
                                            選出理由: <span className="text-foreground ml-1">{batter.reason}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-xs tabular-nums text-muted-foreground">
                                        <div className="text-center">
                                            <div className="uppercase text-[9px] opacity-70">打率</div>
                                            <div className="font-medium">.{(batter.stats.avg * 1000).toFixed(0).padStart(3, "0")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="uppercase text-[9px] opacity-70">出塁</div>
                                            <div className="font-medium">.{(batter.stats.obp * 1000).toFixed(0).padStart(3, "0")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="uppercase text-[9px] opacity-70">RC</div>
                                            <div className="font-medium text-emerald-600 dark:text-emerald-400">{batter.stats.rc.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    
                    {recommendation.batters.length === 0 && (
                        <div className="text-center py-10 bg-muted/30 rounded-xl border border-dashed border-border">
                            <p className="text-muted-foreground text-sm">データが十分にありません。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
