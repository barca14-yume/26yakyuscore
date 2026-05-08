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
    Player,
    BattedBallDirection,
    LineupStrategy,
    RecommendedLineup,
    RecommendedBatter,
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
 * 守備位置と打者の利き腕から打球方向カテゴリ（プル/センター/オポジット）を判定する
 */
function getPositionCategory(pos: BattedBallDirection, batHand: string): "pull" | "center" | "opposite" {
    const p = parseInt(pos);
    if (isNaN(p)) return "center"; // 万が一数値以外のデータがあった場合

    if (batHand === "左") {
        // 左打者: 3(一), 4(二), 9(右) が引っ張り
        if ([3, 4, 9].includes(p)) return "pull";
        if ([1, 2, 8].includes(p)) return "center";
        return "opposite"; // 5, 6, 7
    } else {
        // 右打者: 5(三), 6(遊), 7(左) が引っ張り
        if ([5, 6, 7].includes(p)) return "pull";
        if ([1, 2, 8].includes(p)) return "center";
        return "opposite"; // 3, 4, 9
    }
}

/**
 * 選手ごとの打撃成績を集計する
 */
export function aggregateBatting(
    plateAppearances: PlateAppearance[],
    players: Player[] = [],
    playerName?: string,
    games: GameMetadata[] = []
): BattingAggregation[] {
    // 選手マスタをMap化
    const playerMap = new Map<string, Player>();
    for (const p of players) {
        playerMap.set(p.name, p);
    }

    // 選手名でグループ化する際、表記揺れ（スペースの有無、異体字など）を吸収する
    const normalizeName = (name: string) => {
        if (!name) return "";
        return name
            .replace(/[\s\u3000]/g, "")
            .replace(/澤/g, "沢")
            .replace(/髙/g, "高")
            .replace(/﨑|崎/g, "崎")
            .replace(/齊|齋/g, "斉")
            .replace(/邊|邉/g, "辺")
            .replace(/廣/g, "広")
            .replace(/嶋/g, "島")
            .replace(/櫻/g, "桜")
            .replace(/濱/g, "浜")
            .replace(/瀧/g, "滝")
            .replace(/國/g, "国")
            .replace(/彌/g, "弥")
            .replace(/眞|真/g, "真");
    };

    const resolvePlayerName = (paName: string): string => {
        if (!paName) return "不明";
        const resolved = (() => {
            // 1. 完全一致
            if (playerMap.has(paName)) return paName;

            const normalizedPaName = normalizeName(paName);
            if (!normalizedPaName) return paName; // <-- Safety check: if PA name is only spaces, don't fuzzy map

            for (const p of players) {
                if (normalizeName(p.name) === normalizedPaName) return p.name;
            }
            // 3. 前方一致（双方向）
            for (const p of players) {
                const normalizedPName = normalizeName(p.name);
                if (!normalizedPName) continue; // <-- Safety check: if master name is empty, don't hijack matches
                if (normalizedPName.startsWith(normalizedPaName) || normalizedPaName.startsWith(normalizedPName)) {
                    return p.name;
                }
            }
            // 4. 部分一致（名字のみ入力などのケース）
            for (const p of players) {
                const normalizedPName = normalizeName(p.name);
                if (!normalizedPName) continue; // <-- Safety check
                if (normalizedPName.includes(normalizedPaName) || normalizedPaName.includes(normalizedPName)) {
                    return p.name;
                }
            }
            return paName; // 一致しなければ元の文字列
        })();

        return resolved;
    };

    // 直近4試合のゲームIDを取得
    const teamRecent4GameIds = new Set<string>();
    if (games && games.length > 0) {
        const sortedGames = [...games].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const recent4 = sortedGames.slice(-4);
        recent4.forEach(g => teamRecent4GameIds.add(g.id));
    }

    // 選手ごとに打席をグループ化
    const grouped = new Map<string, PlateAppearance[]>();

    // まず全選手を初期化（成績が0でも表示されるようにする）
    for (const p of players) {
        grouped.set(p.name, []);
    }

    for (const pa of plateAppearances) {
        if (playerName && pa.playerName !== playerName) continue;

        const resolvedName = resolvePlayerName(pa.playerName);
        const existing = grouped.get(resolvedName) || [];
        existing.push(pa);
        grouped.set(resolvedName, existing);
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
        const strikeouts = appearances.filter((pa) => ["strikeout", "strikeout_swinging", "strikeout_looking"].includes(pa.result));
        const sacrifices = appearances.filter((pa) => pa.result === "sacrifice");
        const totalRbi = appearances.reduce((sum, pa) => sum + pa.rbi, 0);
        const totalRuns = appearances.reduce((sum, pa) => sum + (pa.runs || 0), 0);
        const totalStolenBases = appearances.reduce((sum, pa) => sum + (pa.stolenBases || 0), 0);

        // 打率 = 安打 / 打数
        const avg = atBats.length > 0 ? hits.length / atBats.length : 0;

        // 出塁率 = (安打 + 四死球) / (打数 + 四死球 + 犠飛) ※今回は犠飛(sacrifice)を含めて計算
        const obpDenominator = atBats.length + walks.length + hbp.length + sacrifices.length;
        const obp =
            obpDenominator > 0
                ? (hits.length + walks.length + hbp.length) / obpDenominator
                : 0;

        // 長打率 = (単打 + 二塁打*2 + 三塁打*3 + 本塁打*4) / 打数
        const totalBases =
            (hits.length - doubles.length - triples.length - homeruns.length) +
            doubles.length * 2 +
            triples.length * 3 +
            homeruns.length * 4;
        const slg = atBats.length > 0 ? totalBases / atBats.length : 0;

        // OPS = 出塁率 + 長打率
        const ops = obp + slg;

        // 直近4試合の打率
        const recentAppearances = appearances.filter(pa => teamRecent4GameIds.has(pa.gameId));
        const recentAtBats = recentAppearances.filter(pa => isAtBat(pa.result));
        const recentHits = recentAppearances.filter(pa => isHit(pa.result));
        const recentAvg = recentAtBats.length > 0 ? recentHits.length / recentAtBats.length : 0;
        
        let hasRecent4GamesData = true;
        if (teamRecent4GameIds.size > 0) {
            hasRecent4GamesData = appearances.some(pa => teamRecent4GameIds.has(pa.gameId));
        }

        // --- セイバーメトリクス指標の追加計算 ---
        const bbK = strikeouts.length > 0 ? walks.length / strikeouts.length : walks.length;
        const bbPercentage = appearances.length > 0 ? walks.length / appearances.length : 0;
        const isop = slg - avg;

        const babipDenominator = atBats.length - strikeouts.length - homeruns.length + sacrifices.length;
        const babip = babipDenominator > 0 ? (hits.length - homeruns.length) / babipDenominator : 0;

        const rcDenominator = atBats.length + walks.length + hbp.length;
        const rc = rcDenominator > 0 ? ((hits.length + walks.length + hbp.length) * totalBases) / rcDenominator : 0;

        // 得点圏打率 = 得点圏での安打 / 得点圏での打数
        const rispAppearances = appearances.filter((pa) => pa.isRisp);
        const rispAtBats = rispAppearances.filter((pa) => isAtBat(pa.result));
        const rispHits = rispAppearances.filter((pa) => isHit(pa.result));
        const rispAvg = rispAtBats.length > 0 ? rispHits.length / rispAtBats.length : 0;

        // 三振率 = 三振 / 打席数 (K%)
        const strikeoutRate = appearances.length > 0 ? strikeouts.length / appearances.length : 0;

        // 打球方向分布 (1-9の守備位置から プル/センター/オポジット に変換)
        const directionBreakdown = { pull: 0, center: 0, opposite: 0 };
        const player = playerMap.get(name);
        const batHand = player?.batHand || "右";

        for (const pa of appearances) {
            if (pa.battedBallDirection) {
                const category = getPositionCategory(pa.battedBallDirection, batHand);
                directionBreakdown[category]++;
            }
        }

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
            slg,
            ops,
            recentAvg,
            hasRecent4GamesData,
            bbK,
            bbPercentage,
            isop,
            babip,
            rc,
            rispAvg,
            strikeoutRate,
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
    players: Player[] = [],
    playerName?: string
): PitchingAggregation[] {
    const playerMap = new Map<string, Player>();
    for (const p of players) {
        playerMap.set(p.name, p);
    }

    const normalizeName = (name: string) => {
        if (!name) return "";
        return name
            .replace(/[\s\u3000]/g, "")
            .replace(/澤/g, "沢")
            .replace(/髙/g, "高")
            .replace(/﨑|崎/g, "崎")
            .replace(/齊|齋/g, "斉")
            .replace(/邊|邉/g, "辺")
            .replace(/廣/g, "広")
            .replace(/嶋/g, "島")
            .replace(/櫻/g, "桜")
            .replace(/濱/g, "浜")
            .replace(/瀧/g, "滝")
            .replace(/國/g, "国")
            .replace(/彌/g, "弥")
            .replace(/眞|真/g, "真");
    };

    const resolvePlayerName = (paName: string): string => {
        if (!paName) return "不明";
        if (playerMap.has(paName)) return paName;

        const normalizedPaName = normalizeName(paName);
        if (!normalizedPaName) return paName;

        for (const p of players) {
            if (normalizeName(p.name) === normalizedPaName) return p.name;
        }
        for (const p of players) {
            const normalizedPName = normalizeName(p.name);
            if (!normalizedPName) continue;
            if (normalizedPName.startsWith(normalizedPaName) || normalizedPaName.startsWith(normalizedPName)) {
                return p.name;
            }
        }
        for (const p of players) {
            const normalizedPName = normalizeName(p.name);
            if (!normalizedPName) continue;
            if (normalizedPName.includes(normalizedPaName) || normalizedPaName.includes(normalizedPName)) {
                return p.name;
            }
        }
        return paName;
    };

    const grouped = new Map<string, PitchingStats[]>();

    // まず全選手を初期化（成績が0でも集計に含める）
    for (const p of players) {
        grouped.set(p.name, []);
    }

    for (const ps of pitchingStats) {
        if (playerName && ps.playerName !== playerName) continue;
        const resolvedName = resolvePlayerName(ps.playerName);
        const existing = grouped.get(resolvedName) || [];
        existing.push(ps);
        grouped.set(resolvedName, existing);
    }

    const results: PitchingAggregation[] = [];

    for (const [name, stats] of grouped) {
        // 全アウト数を計算してから投球回数表記に戻す
        const totalOuts = stats.reduce((sum, s) => sum + inningsToOuts(s.inningsPitched), 0);
        const totalIP = outsToInnings(totalOuts);

        const totalER = stats.reduce((sum, s) => sum + s.earnedRuns, 0);
        const totalRuns = stats.reduce((sum, s) => sum + s.runsAllowed, 0);
        const totalHits = stats.reduce((sum, s) => sum + s.hitsAllowed, 0);
        const totalWalks = stats.reduce((sum, s) => sum + s.walksAllowed, 0);
        const totalK = stats.reduce((sum, s) => sum + s.strikeouts, 0);
        const totalPitches = stats.reduce((sum, s) => sum + s.totalPitches, 0);
        const totalStrikes = stats.reduce((sum, s) => sum + s.strikes, 0);
        const totalBalls = stats.reduce((sum, s) => sum + s.balls, 0);

        // 防御率（少年野球7回制、アウトベースで正確に計算する）
        const era = totalOuts > 0 ? (totalER * 7 * 3) / totalOuts : 0;

        // ストライク率
        const strikePercentage = totalPitches > 0 ? (totalStrikes / totalPitches) * 100 : 0;
        
        // WHIP = (与四球 + 被安打) / 投球回
        // 投球回に直すときは 投球アウト数 / 3 とする。0アウトの場合は便宜上0とするか回避する
        const whip = totalOuts > 0 ? (totalWalks + totalHits) / (totalOuts / 3) : 0;

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
            whip,
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
 * 投球回数（0.1 = 1/3回、0.2 = 2/3回）をアウト数に変換する
 */
export const inningsToOuts = (ip: number): number => {
    const fullInnings = Math.floor(ip);
    const fraction = Math.round((ip - fullInnings) * 10);
    return fullInnings * 3 + fraction;
};

/**
 * アウト数を投球回数表記に戻す（例: 4アウト -> 1.1）
 */
export const outsToInnings = (outs: number): number => {
    const fullInnings = Math.floor(outs / 3);
    const fraction = outs % 3;
    return fullInnings + fraction / 10;
};

/**
 * チームERA（少年野球7回制）
 */
export function calcTeamERA(pitchingStats: PitchingStats[]): number {
    const totalOuts = pitchingStats.reduce((sum, s) => sum + inningsToOuts(s.inningsPitched), 0);
    const totalER = pitchingStats.reduce((sum, s) => sum + s.earnedRuns, 0);
    return totalOuts > 0 ? (totalER * 7 * 3) / totalOuts : 0;
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

export function aggregateRecentBatting(
    plateAppearances: PlateAppearance[],
    games: GameMetadata[],
    players: Player[],
    recentGamesCount: number = 5
): BattingAggregation[] {
    // チームの直近N試合を取得
    const sortedGames = [...games].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const recentGames = sortedGames.slice(-recentGamesCount);
    const recentGameIds = new Set(recentGames.map((g) => g.id));

    // その試合の打席データだけを抽出
    const recentPAs = plateAppearances.filter((pa) => recentGameIds.has(pa.gameId));

    // aggregateBattingで計算
    return aggregateBatting(recentPAs, players, undefined, recentGames);
}

export function generateRecommendedLineup(
    recentStats: BattingAggregation[],
    strategy: LineupStrategy
): RecommendedLineup {
    // 特別ルール1: 「松下」は退団済みのためスタメン候補から除外
    const activeStats = recentStats.filter(s => !s.playerName.includes("松下"));

    // まず、直近で打席に立っている選手（2打席以上）をフィルタリング
    const candidates = activeStats.filter(s => s.plateAppearances >= 2);
    // もし候補が9人に満たない場合は、除外されていない全選手から選ぶ
    const pool = candidates.length >= 9 ? candidates : activeStats;

    let batters: RecommendedBatter[] = [];
    let strategyName = "";
    let description = "";

    if (strategy === "rc_focused") {
        strategyName = "超攻撃型 (RC優先)";
        description = "得点創出能力(RC)が最も高い選手を上位から並べた、とにかく点を取るための攻撃的な打順です。";
        const sorted = [...pool].sort((a, b) => b.rc - a.rc);
        batters = sorted.slice(0, 9).map((stats, i) => ({
            order: i + 1,
            playerName: stats.playerName,
            reason: `RC ${stats.rc.toFixed(2)} / 打率 .${(stats.avg * 1000).toFixed(0).padStart(3, "0")}`,
            stats
        }));
    } else if (strategy === "obp_focused") {
        strategyName = "チャンスメイク (出塁率優先)";
        description = "出塁率(OBP)を最優先しつつ、盗塁（足の速さ）も加味してランナーを溜めることに特化した打順です。";
        const sorted = [...pool].sort((a, b) => {
            const scoreA = a.obp + (a.stolenBases * 0.05);
            const scoreB = b.obp + (b.stolenBases * 0.05);
            return scoreB - scoreA;
        });
        batters = sorted.slice(0, 9).map((stats, i) => ({
            order: i + 1,
            playerName: stats.playerName,
            reason: `出塁率 .${(stats.obp * 1000).toFixed(0).padStart(3, "0")} / 盗塁 ${stats.stolenBases}`,
            stats
        }));
    } else if (strategy === "risp_focused") {
        strategyName = "勝負強さ (得点圏打率優先)";
        description = "得点圏打率や打点の多さを重視し、チャンスで確実に点を取ることを狙った打順です。";
        const sorted = [...pool].sort((a, b) => {
            if (b.rispAvg !== a.rispAvg) return b.rispAvg - a.rispAvg;
            return b.rbi - a.rbi; // 同点なら打点でソート
        });
        batters = sorted.slice(0, 9).map((stats, i) => ({
            order: i + 1,
            playerName: stats.playerName,
            reason: `得点圏打率 .${(stats.rispAvg * 1000).toFixed(0).padStart(3, "0")}`,
            stats
        }));
    } else {
        // balanced
        strategyName = "総合バランス";
        description = "上位に出塁率が高い選手、中軸に長打力・得点創出能力(RC)が高い選手を配置した伝統的でバランスの良い打順です。";
        
        // RC上位9名を選抜
        const top9 = [...pool].sort((a, b) => b.rc - a.rc).slice(0, 9);
        const assigned = new Set<string>();
        const lineup: RecommendedBatter[] = [];

        const assignBest = (order: number, sortFn: (a: BattingAggregation, b: BattingAggregation) => number, reasonFn: (s: BattingAggregation) => string) => {
            const available = top9.filter(p => {
                if (assigned.has(p.playerName)) return false;
                // 特別ルール2: 「岡﨑」は足が遅いため、1番、2番には配置しない
                if ((order === 1 || order === 2) && (p.playerName.includes("岡﨑") || p.playerName.includes("岡崎"))) return false;
                return true;
            });
            if (available.length === 0) return;
            const best = available.sort(sortFn)[0];
            assigned.add(best.playerName);
            lineup.push({ order, playerName: best.playerName, reason: reasonFn(best), stats: best });
        };

        assignBest(1, (a, b) => {
            const scoreA = a.obp + (a.stolenBases * 0.05);
            const scoreB = b.obp + (b.stolenBases * 0.05);
            return scoreB - scoreA;
        }, s => `出塁率 .${(s.obp * 1000).toFixed(0).padStart(3, "0")} + 盗塁 ${s.stolenBases} (1番適正)`);

        assignBest(2, (a, b) => {
            const scoreA = a.obp + (a.stolenBases * 0.02);
            const scoreB = b.obp + (b.stolenBases * 0.02);
            return scoreB - scoreA;
        }, s => `出塁率 .${(s.obp * 1000).toFixed(0).padStart(3, "0")} (2番適正)`);

        assignBest(3, (a, b) => b.rc - a.rc, s => `RC ${s.rc.toFixed(2)} / 打率 .${(s.avg * 1000).toFixed(0).padStart(3, "0")} (中軸)`);
        assignBest(4, (a, b) => {
            // OPS(70%) と 打率(30%) のバランスで評価（四球だけでなくヒットを打てる人を優先）
            const scoreA = (a.ops * 0.7) + (a.avg * 0.3);
            const scoreB = (b.ops * 0.7) + (b.avg * 0.3);
            return scoreB - scoreA;
        }, s => `OPS ${s.ops.toFixed(3)} / 打率 .${(s.avg * 1000).toFixed(0).padStart(3, "0")} (4番適正)`);
        assignBest(5, (a, b) => b.rispAvg - a.rispAvg, s => `得点圏 .${(s.rispAvg * 1000).toFixed(0).padStart(3, "0")}`);
        
        for (let i = 6; i <= 9; i++) {
            assignBest(i, (a, b) => b.rc - a.rc, s => `RC ${s.rc.toFixed(2)}`);
        }

        batters = lineup;
    }

    // 各戦略共通の事後処理 (特別ルール2: 岡﨑の配置調整)
    // 岡﨑がもし1番か2番にいる場合は、下位打線(一番最後尾)の選手と入れ替える
    const okazakiIndex = batters.findIndex(b => b.playerName.includes("岡﨑") || b.playerName.includes("岡崎"));
    if (okazakiIndex === 0 || okazakiIndex === 1) {
        const swapIndex = batters.length - 1; // 候補の中で一番下
        if (swapIndex > okazakiIndex) {
            const temp = batters[okazakiIndex];
            batters[okazakiIndex] = batters[swapIndex];
            batters[swapIndex] = temp;
            
            // 打順(order)を再設定
            batters.forEach((b, i) => b.order = i + 1);
            // 理由を追記
            batters[swapIndex].reason += " ※出塁率は高いが足が遅いため下位に配置";
        }
    }

    return {
        strategy,
        strategyName,
        description,
        batters: batters.sort((a, b) => a.order - b.order)
    };
}

