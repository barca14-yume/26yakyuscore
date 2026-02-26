"use client";

/**
 * ダッシュボード（ホーム）ページ
 * チーム全体のサマリーと最近の試合結果を表示
 */
import React, { useState, useMemo } from "react";
import { useData } from "@/lib/data-context";
import {
  calcTeamBattingAvg,
  calcTeamERA,
  calcWinLossRecord,
  aggregateBatting,
} from "@/lib/calculations";
import StatCard from "@/components/dashboard/StatCard";
import RecentGames from "@/components/dashboard/RecentGames";
import TeamOverview from "@/components/dashboard/TeamOverview";
import { Activity, Trophy, BarChart3, Shield } from "lucide-react";

type GameFilter = "all" | "official" | "practice";

export default function DashboardPage() {
  const { data } = useData();
  const [filter, setFilter] = useState<GameFilter>("all");

  // フィルター適用後のデータ
  const { filteredGames, filteredPA, filteredPitching } = useMemo(() => {
    if (filter === "all") {
      // "すべて"の場合は孤立データも合算する
      return {
        filteredGames: data.games,
        filteredPA: data.plateAppearances,
        filteredPitching: data.pitchingStats,
      };
    }

    let fGames = data.games;
    if (filter === "official") {
      fGames = data.games.filter(g => g.gameType === "official");
    } else if (filter === "practice") {
      fGames = data.games.filter(g => g.gameType === "practice");
    }

    const filteredGameIds = new Set(fGames.map(g => g.id));

    return {
      filteredGames: fGames,
      filteredPA: data.plateAppearances.filter(pa => filteredGameIds.has(pa.gameId)),
      filteredPitching: data.pitchingStats.filter(ps => filteredGameIds.has(ps.gameId))
    };
  }, [data, filter]);

  // KPI計算
  const teamAvg = calcTeamBattingAvg(filteredPA);
  const teamERA = calcTeamERA(filteredPitching);
  const winLoss = calcWinLossRecord(filteredGames);
  const battingStats = aggregateBatting(filteredPA, data.players);

  // 勝率
  const totalGames = winLoss.wins + winLoss.losses + winLoss.ties;
  const winRate =
    totalGames > 0 ? ((winLoss.wins / totalGames) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-6">
      {/* ヘッダーとフィルター */}
      <div className="animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 md:hidden">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              ダッシュボード
            </h1>
            <p className="text-xs text-muted-foreground">
              チーム全体のパフォーマンスサマリー
            </p>
          </div>
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

      {/* KPIカード群 */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <StatCard
          title="チーム打率"
          value={`.${(teamAvg * 1000).toFixed(0).padStart(3, "0")}`}
          subtitle={`${data.plateAppearances.length} 打席`}
          icon={BarChart3}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-100 dark:bg-emerald-900/40"
        />

        <StatCard
          title="チーム防御率"
          value={teamERA.toFixed(2)}
          subtitle="少年野球7回制"
          icon={Shield}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/40"
        />

        <StatCard
          title="勝敗"
          value={`${winLoss.wins}勝${winLoss.losses}敗${winLoss.ties > 0 ? winLoss.ties + "分" : ""}`}
          subtitle={`勝率 ${winRate}%`}
          icon={Trophy}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-100 dark:bg-amber-900/40"
          trend={
            winLoss.wins > winLoss.losses
              ? { value: "勝ち越し", positive: true }
              : winLoss.wins < winLoss.losses
                ? { value: "負け越し", positive: false }
                : undefined
          }
        />

        <StatCard
          title="試合数"
          value={`${filteredGames.length}`}
          subtitle={`公式: ${filteredGames.filter((g) => g.gameType === "official").length} / 練習: ${filteredGames.filter((g) => g.gameType === "practice").length}`}
          icon={Activity}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/40"
        />
      </div>

      {/* コンテンツエリア */}
      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <RecentGames games={filteredGames} />
        <TeamOverview battingStats={battingStats} />
      </div>
    </div>
  );
}
