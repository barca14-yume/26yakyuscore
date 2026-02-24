/**
 * Baseball Ops Dashboard - セイバーメトリクス計算ロジック
 * 少年野球用に7回制を基準とした計算を行う
 */
import {
    PlateAppearance,
    PitchingStats,
    BattingAggregation,
    PitchingAggregation,
    AtBatResult,
    GameMetadata,
} from "./types";

/** 安打に該当する打席結果 */
const HIT_RESULTS: AtBatResult[] = ["single", "double", "triple", "homerun"];

/** 打数から除外する結果（四球・死球・犠打） */
const NON_AT_BAT_RESULTS: AtBatResult[] = ["walk", "hbp", "sacrifice"];

/**
 * ヒット判定
 */
function isHit(result: AtBatResult): boolean {
    return HIT_RESULTS.includes(result);
}

/**
 * 打数判定（打数に含まれる打席かどうか）
 */
function isAtBat(result: AtBatResult): boolean {
    return !NON_AT_BAT_RESULTS.includes(result);
}

/**
 * 選手ごとの打撃成績を集計する
 */
export function aggregateBatting(
    plateAppearances: PlateAppearance[],
    playerName?: string
): BattingAggregation[] {
    // 選手名でグループ化
    const grouped = new Map<string, PlateAppearance[]>();

    for (const pa of plateAppearances) {
        if (playerName && pa.playerName !== playerName) continue;
        const existing = grouped.get(pa.playerName) || [];
        existing.push(pa);
        grouped.set(pa.playerName, existing);
    }

    const results: BattingAggregation[] = [];

    for (const [name, appearances] of grouped) {
        const atBats = appearances.filter((pa) => isAtBat(pa.result));
        const hits = appearances.filter((pa) => isHit(pa.result));
        const doubles = appearances.filter((pa) => pa.result === "double");
        const triples = appearances.filter((pa) => pa.result === "triple");
        const homeruns = appearances.filter((pa) => pa.result === "homerun");
        const walks = appearances.filter((pa) => pa.result === "walk");
        const hbp = appearances.filter((pa) => pa.result === "hbp");
        const strikeouts = appearances.filter((pa) => pa.result === "strikeout");
        const sacrifices = appearances.filter((pa) => pa.result === "sacrifice");
        const totalRbi = appearances.reduce((sum, pa) => sum + pa.rbi, 0);
        const totalRuns = appearances.reduce((sum, pa) => sum + (pa.runs || 0), 0);
        const totalStolenBases = appearances.reduce((sum, pa) => sum + (pa.stolenBases || 0), 0);

        // 打率 = 安打 / 打数
        const avg = atBats.length > 0 ? hits.length / atBats.length : 0;

        // 出塁率 = (安打 + 四死球) / (打数 + 四死球 + 犠飛)
        const obpDenominator = atBats.length + walks.length + hbp.length + sacrifices.length;
        const obp =
            obpDenominator > 0
                ? (hits.length + walks.length + hbp.length) / obpDenominator
                : 0;

        // 打球方向分布
        const withDirection = appearances.filter((pa) => pa.battedBallDirection);
        const directionBreakdown = {
            pull: withDirection.filter((pa) => pa.battedBallDirection === "pull").length,
            center: withDirection.filter((pa) => pa.battedBallDirection === "center").length,
            opposite: withDirection.filter((pa) => pa.battedBallDirection === "opposite").length,
        };

        // 打球タイプ分布
        const withType = appearances.filter((pa) => pa.battedBallType);
        const battedBallBreakdown = {
            grounder: withType.filter((pa) => pa.battedBallType === "grounder").length,
            liner: withType.filter((pa) => pa.battedBallType === "liner").length,
            fly: withType.filter((pa) => pa.battedBallType === "fly").length,
        };

        results.push({
            playerName: name,
            plateAppearances: appearances.length,
            atBats: atBats.length,
            hits: hits.length,
            doubles: doubles.length,
            triples: triples.length,
            homeruns: homeruns.length,
            walks: walks.length,
            hbp: hbp.length,
            strikeouts: strikeouts.length,
            sacrifices: sacrifices.length,
            rbi: totalRbi,
            runs: totalRuns,
            stolenBases: totalStolenBases,
            avg,
            obp,
            directionBreakdown,
            battedBallBreakdown,
        });
    }

    // 打率降順でソート
    return results.sort((a, b) => b.avg - a.avg);
}

/**
 * 選手ごとの投手成績を集計する
 * 少年野球は7回制のため ERA = (自責点 * 7) / 投球回数
 */
export function aggregatePitching(
    pitchingStats: PitchingStats[],
    playerName?: string
): PitchingAggregation[] {
    const grouped = new Map<string, PitchingStats[]>();

    for (const ps of pitchingStats) {
        if (playerName && ps.playerName !== playerName) continue;
        const existing = grouped.get(ps.playerName) || [];
        existing.push(ps);
        grouped.set(ps.playerName, existing);
    }

    const results: PitchingAggregation[] = [];

    for (const [name, stats] of grouped) {
        const totalIP = stats.reduce((sum, s) => sum + s.inningsPitched, 0);
        const totalER = stats.reduce((sum, s) => sum + s.earnedRuns, 0);
        const totalRuns = stats.reduce((sum, s) => sum + s.runsAllowed, 0);
        const totalHits = stats.reduce((sum, s) => sum + s.hitsAllowed, 0);
        const totalWalks = stats.reduce((sum, s) => sum + s.walksAllowed, 0);
        const totalK = stats.reduce((sum, s) => sum + s.strikeouts, 0);
        const totalPitches = stats.reduce((sum, s) => sum + s.totalPitches, 0);
        const totalStrikes = stats.reduce((sum, s) => sum + s.strikes, 0);
        const totalBalls = stats.reduce((sum, s) => sum + s.balls, 0);

        // 防御率（少年野球7回制）
        const era = totalIP > 0 ? (totalER * 7) / totalIP : 0;

        // ストライク率
        const strikePercentage = totalPitches > 0 ? (totalStrikes / totalPitches) * 100 : 0;

        results.push({
            playerName: name,
            games: stats.length,
            inningsPitched: totalIP,
            runsAllowed: totalRuns,
            earnedRuns: totalER,
            hitsAllowed: totalHits,
            walksAllowed: totalWalks,
            strikeouts: totalK,
            totalPitches,
            strikes: totalStrikes,
            balls: totalBalls,
            era,
            strikePercentage,
        });
    }

    return results.sort((a, b) => a.era - b.era);
}

/**
 * チーム打率を計算する
 */
export function calcTeamBattingAvg(plateAppearances: PlateAppearance[]): number {
    const atBats = plateAppearances.filter((pa) => isAtBat(pa.result));
    const hits = plateAppearances.filter((pa) => isHit(pa.result));
    return atBats.length > 0 ? hits.length / atBats.length : 0;
}

/**
 * チームERA（少年野球7回制）
 */
export function calcTeamERA(pitchingStats: PitchingStats[]): number {
    const totalIP = pitchingStats.reduce((sum, s) => sum + s.inningsPitched, 0);
    const totalER = pitchingStats.reduce((sum, s) => sum + s.earnedRuns, 0);
    return totalIP > 0 ? (totalER * 7) / totalIP : 0;
}

/**
 * 勝敗レコード
 */
export function calcWinLossRecord(games: GameMetadata[]): {
    wins: number;
    losses: number;
    ties: number;
} {
    return {
        wins: games.filter((g) => g.result === "win").length,
        losses: games.filter((g) => g.result === "loss").length,
        ties: games.filter((g) => g.result === "tie").length,
    };
}

/**
 * 選手の直近N試合の打率推移を計算する
 */
export function calcRecentBattingTrend(
    plateAppearances: PlateAppearance[],
    games: GameMetadata[],
    playerName: string,
    recentCount: number = 5
): { gameLabel: string; avg: number; date: string }[] {
    // 日付順にソートした試合を取得
    const sortedGames = [...games].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 該当選手が出場した試合のみフィルタ
    const playerGames = sortedGames.filter((game) =>
        plateAppearances.some(
            (pa) => pa.gameId === game.id && pa.playerName === playerName
        )
    );

    // 直近N試合
    const recentGames = playerGames.slice(-recentCount);

    return recentGames.map((game) => {
        const gamePAs = plateAppearances.filter(
            (pa) => pa.gameId === game.id && pa.playerName === playerName
        );
        const atBats = gamePAs.filter((pa) => isAtBat(pa.result));
        const hits = gamePAs.filter((pa) => isHit(pa.result));
        const avg = atBats.length > 0 ? hits.length / atBats.length : 0;

        return {
            gameLabel: `vs ${game.opponent}`,
            avg: Math.round(avg * 1000) / 1000,
            date: game.date,
        };
    });
}
