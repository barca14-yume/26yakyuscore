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

    // 直近5試合のゲームIDを取得
    const teamRecent5GameIds = new Set<string>();
    if (games && games.length > 0) {
        const sortedGames = [...games].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const recent5 = sortedGames.slice(-5);
        recent5.forEach(g => teamRecent5GameIds.add(g.id));
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


        const recentAppearances = appearances.filter(pa => teamRecent5GameIds.has(pa.gameId));
        const recentAtBats = recentAppearances.filter(pa => isAtBat(pa.result));
        const recentHits = recentAppearances.filter(pa => isHit(pa.result));
        const recentAvg = recentAtBats.length > 0 ? recentHits.length / recentAtBats.length : 0;
        
        let hasRecent5GamesData = true;
        if (teamRecent5GameIds.size > 0) {
            hasRecent5GamesData = appearances.some(pa => teamRecent5GameIds.has(pa.gameId));
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
            hasRecent5GamesData,
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

        // 奪三振率 (K/7)
        const strikeoutRate = totalOuts > 0 ? (totalK * 7 * 3) / totalOuts : 0;
        
        // 与四死球率 (BB/7)
        const walkRate = totalOuts > 0 ? (totalWalks * 7 * 3) / totalOuts : 0;

        // K/BB (奪三振 ÷ 与四死球)
        const kbb = totalWalks > 0 ? totalK / totalWalks : totalK;

        // P/IP (1イニングあたりの投球数)
        const pip = totalOuts > 0 ? totalPitches / (totalOuts / 3) : 0;

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
            strikeoutRate,
            walkRate,
            kbb,
            pip,
        });
    }

    return results.sort((a, b) => a.era - b.era);
}

/**
 * チーム全体の打撃成績を集計する
 */
export function aggregateTeamBatting(
    plateAppearances: PlateAppearance[]
): BattingAggregation {
    const appearances = plateAppearances;
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

    const avg = atBats.length > 0 ? hits.length / atBats.length : 0;
    const obpDenominator = atBats.length + walks.length + hbp.length + sacrifices.length;
    const obp = obpDenominator > 0 ? (hits.length + walks.length + hbp.length) / obpDenominator : 0;

    const totalBases = (hits.length - doubles.length - triples.length - homeruns.length) +
        doubles.length * 2 + triples.length * 3 + homeruns.length * 4;
    const slg = atBats.length > 0 ? totalBases / atBats.length : 0;
    const ops = obp + slg;

    const bbK = strikeouts.length > 0 ? walks.length / strikeouts.length : walks.length;
    const bbPercentage = appearances.length > 0 ? walks.length / appearances.length : 0;
    const isop = slg - avg;
    const babipDenominator = atBats.length - strikeouts.length - homeruns.length + sacrifices.length;
    const babip = babipDenominator > 0 ? (hits.length - homeruns.length) / babipDenominator : 0;
    const rcDenominator = atBats.length + walks.length + hbp.length;
    const rc = rcDenominator > 0 ? ((hits.length + walks.length + hbp.length) * totalBases) / rcDenominator : 0;

    const rispAppearances = appearances.filter((pa) => pa.isRisp);
    const rispAtBats = rispAppearances.filter((pa) => isAtBat(pa.result));
    const rispHits = rispAppearances.filter((pa) => isHit(pa.result));
    const rispAvg = rispAtBats.length > 0 ? rispHits.length / rispAtBats.length : 0;
    const strikeoutRate = appearances.length > 0 ? strikeouts.length / appearances.length : 0;

    const directionBreakdown = { pull: 0, center: 0, opposite: 0 };
    
    // 打球タイプ分布
    const withType = appearances.filter((pa) => pa.battedBallType);
    const battedBallBreakdown = {
        grounder: withType.filter((pa) => pa.battedBallType === "grounder").length,
        liner: withType.filter((pa) => pa.battedBallType === "liner").length,
        fly: withType.filter((pa) => pa.battedBallType === "fly").length,
    };

    return {
        playerName: "チーム全体",
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
        bbK,
        bbPercentage,
        isop,
        babip,
        rc,
        rispAvg,
        strikeoutRate,
        directionBreakdown,
        battedBallBreakdown,
    };
}

/**
 * チーム全体の投手成績を集計する
 */
export function aggregateTeamPitching(
    pitchingStats: PitchingStats[]
): PitchingAggregation {
    const totalOuts = pitchingStats.reduce((sum, s) => sum + inningsToOuts(s.inningsPitched), 0);
    const totalIP = outsToInnings(totalOuts);
    const totalER = pitchingStats.reduce((sum, s) => sum + s.earnedRuns, 0);
    const totalRuns = pitchingStats.reduce((sum, s) => sum + s.runsAllowed, 0);
    const totalHits = pitchingStats.reduce((sum, s) => sum + s.hitsAllowed, 0);
    const totalWalks = pitchingStats.reduce((sum, s) => sum + s.walksAllowed, 0);
    const totalK = pitchingStats.reduce((sum, s) => sum + s.strikeouts, 0);
    const totalPitches = pitchingStats.reduce((sum, s) => sum + s.totalPitches, 0);
    const totalStrikes = pitchingStats.reduce((sum, s) => sum + s.strikes, 0);
    const totalBalls = pitchingStats.reduce((sum, s) => sum + s.balls, 0);

    const era = totalOuts > 0 ? (totalER * 7 * 3) / totalOuts : 0;
    const strikePercentage = totalPitches > 0 ? (totalStrikes / totalPitches) * 100 : 0;
    const whip = totalOuts > 0 ? (totalWalks + totalHits) / (totalOuts / 3) : 0;
    const strikeoutRate = totalOuts > 0 ? (totalK * 7 * 3) / totalOuts : 0;
    const walkRate = totalOuts > 0 ? (totalWalks * 7 * 3) / totalOuts : 0;
    const kbb = totalWalks > 0 ? totalK / totalWalks : totalK;
    const pip = totalOuts > 0 ? totalPitches / (totalOuts / 3) : 0;

    return {
        playerName: "チーム全体",
        games: Array.from(new Set(pitchingStats.map(s => s.gameId))).length,
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
        strikeoutRate,
        walkRate,
        kbb,
        pip,
    };
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

/**
 * ベイズ回帰による率指標の補正（リグレッション・トゥー・ザ・ミーン）
 *
 * 打席数が少ない選手の率が過大/過小評価されるのを防ぐ。
 * 推定値 = (実打席数 × 実打率 + 信頼度定数 × チーム平均) / (実打席数 + 信頼度定数)
 *
 * @param rawRate   - 実際の率（打率、出塁率など）
 * @param sampleSize - この選手のサンプルサイズ（打席数 or 打数）
 * @param leagueMean - チーム全体の平均値（事前分布の中心）
 * @param regressionK - 信頼度定数（この打席数で50%チーム平均に回帰する）。
 *                      少年野球では試合数が少ないため10が適切。
 */
function bayesianRegression(
    rawRate: number,
    sampleSize: number,
    leagueMean: number,
    regressionK: number = 10
): number {
    if (sampleSize <= 0) return leagueMean;
    return (sampleSize * rawRate + regressionK * leagueMean) / (sampleSize + regressionK);
}

/**
 * 打席数に基づく信頼度ボーナス（0.0〜1.0）
 * 打席が多い選手ほどスコアにボーナスが乗り、実績の信頼性を反映する。
 * minPA未満は0、maxPA以上は1.0、その間は線形補間。
 */
function confidenceWeight(plateAppearances: number, minPA: number = 3, maxPA: number = 15): number {
    if (plateAppearances <= minPA) return 0;
    if (plateAppearances >= maxPA) return 1.0;
    return (plateAppearances - minPA) / (maxPA - minPA);
}

/**
 * 率指標のフォーマット（.xxx 形式）
 */
function formatRate(rate: number): string {
    return `.${(rate * 1000).toFixed(0).padStart(3, "0")}`;
}

export function generateRecommendedLineup(
    recentStats: BattingAggregation[],
    strategy: LineupStrategy
): RecommendedLineup {
    // 特別ルール1: 「松下」は退団済みのためスタメン候補から除外
    const activeStats = recentStats.filter(s => !s.playerName.includes("松下"));

    // --- チーム平均を計算（ベイズ回帰の事前分布として使用） ---
    // 打席が1以上の選手のみを対象に、打席数で加重平均を取る
    const activeBatters = activeStats.filter(s => s.plateAppearances >= 1);
    const totalPA = activeBatters.reduce((sum, s) => sum + s.plateAppearances, 0);
    const totalAB = activeBatters.reduce((sum, s) => sum + s.atBats, 0);

    const teamAvg = totalAB > 0
        ? activeBatters.reduce((sum, s) => sum + s.hits, 0) / totalAB
        : 0.250;
    const teamObp = totalPA > 0
        ? activeBatters.reduce((sum, s) => sum + (s.obp * s.plateAppearances), 0) / totalPA
        : 0.300;
    const teamSlg = totalAB > 0
        ? activeBatters.reduce((sum, s) => sum + (s.slg * s.atBats), 0) / totalAB
        : 0.300;
    const teamOps = teamObp + teamSlg;
    // 得点圏打率のチーム平均（得点圏打席がある選手のみ）
    const rispBatters = activeBatters.filter(s => s.rispAvg > 0 || s.plateAppearances >= 5);
    const teamRispAvg = rispBatters.length > 0
        ? rispBatters.reduce((sum, s) => sum + s.rispAvg, 0) / rispBatters.length
        : teamAvg;

    // --- 信頼度定数: 少年野球では打席数が少ないため、10打席で50%回帰 ---
    const REGRESSION_K = 10;

    // 候補フィルタリング: 打席が3以上の選手を候補とする
    // (2打席以下では信頼性が低すぎるため候補から除外)
    const candidates = activeStats.filter(s => s.plateAppearances >= 3);
    // もし候補が9人に満たない場合は、1打席以上の全選手から選ぶ
    const pool = candidates.length >= 9 ? candidates : activeBatters.length >= 9 ? activeBatters : activeStats;

    // --- 各選手に補正済みスコアを付与する拡張型 ---
    interface ScoredPlayer {
        stats: BattingAggregation;
        /** 補正済み打率 */
        adjAvg: number;
        /** 補正済み出塁率 */
        adjObp: number;
        /** 補正済み長打率 */
        adjSlg: number;
        /** 補正済みOPS */
        adjOps: number;
        /** 補正済み得点圏打率 */
        adjRispAvg: number;
        /** 打席数ベースの信頼度 (0-1) */
        confidence: number;
        /** 補正済みRC（打席数で正規化したRC/打席に信頼度を加味） */
        adjRcScore: number;
    }

    const scoredPool: ScoredPlayer[] = pool.map(s => {
        const adjAvg = bayesianRegression(s.avg, s.atBats, teamAvg, REGRESSION_K);
        const adjObp = bayesianRegression(s.obp, s.plateAppearances, teamObp, REGRESSION_K);
        const adjSlg = bayesianRegression(s.slg, s.atBats, teamSlg, REGRESSION_K);
        const adjOps = adjObp + adjSlg;
        const adjRispAvg = bayesianRegression(s.rispAvg, s.plateAppearances, teamRispAvg, REGRESSION_K);
        const conf = confidenceWeight(s.plateAppearances, 3, 15);

        // RC は累積指標なので、打席あたりRC (RC/PA) をベースに信頼度補正する
        const rcPerPA = s.plateAppearances > 0 ? s.rc / s.plateAppearances : 0;
        const teamRcPerPA = totalPA > 0
            ? activeBatters.reduce((sum, p) => sum + p.rc, 0) / totalPA
            : 0;
        const adjRcPerPA = bayesianRegression(rcPerPA, s.plateAppearances, teamRcPerPA, REGRESSION_K);
        // 補正済みRCスコア = 補正済みRC/PA × 打席数（信頼度で傾斜）
        const adjRcScore = adjRcPerPA * (s.plateAppearances * (0.7 + 0.3 * conf));

        return { stats: s, adjAvg, adjObp, adjSlg, adjOps, adjRispAvg, confidence: conf, adjRcScore };
    });

    let batters: RecommendedBatter[] = [];
    let strategyName = "";
    let description = "";

    // 候補から上位9名を選出
    const top9 = [...scoredPool].sort((a, b) => b.adjRcScore - a.adjRcScore).slice(0, 9);

    // 打順割り当てヘルパー関数
    const buildLineupWithRoles = (
        assignments: {
            order: number;
            sortFn: (a: ScoredPlayer, b: ScoredPlayer) => number;
            filterFn?: (p: ScoredPlayer) => boolean;
            reasonFn: (p: ScoredPlayer) => string;
        }[]
    ): RecommendedBatter[] => {
        const assigned = new Set<string>();
        const lineup: RecommendedBatter[] = [];

        for (const assign of assignments) {
            const available = top9.filter(p => {
                if (assigned.has(p.stats.playerName)) return false;
                if (assign.filterFn && !assign.filterFn(p)) return false;
                return true;
            });
            // 条件を満たす候補がいない場合は、未割り当ての全員から選出
            const candidatesToUse = available.length > 0 ? available : top9.filter(p => !assigned.has(p.stats.playerName));
            if (candidatesToUse.length === 0) continue;

            const best = candidatesToUse.sort(assign.sortFn)[0];
            assigned.add(best.stats.playerName);
            lineup.push({
                order: assign.order,
                playerName: best.stats.playerName,
                reason: assign.reasonFn(best),
                stats: best.stats,
            });
        }
        return lineup;
    };

    const isOkazaki = (p: ScoredPlayer) => p.stats.playerName.includes("岡﨑") || p.stats.playerName.includes("岡崎");

    if (strategy === "rc_focused") {
        strategyName = "超攻撃型 (RC優先)";
        description = "得点創出能力(RC)が最も高い選手を上位から並べた攻撃的な打順です。打席数による信頼度を加味し、少ない打席での好成績の過大評価を抑制しています。";
        const sorted = [...top9].sort((a, b) => b.adjRcScore - a.adjRcScore);
        batters = sorted.map((p, i) => ({
            order: i + 1,
            playerName: p.stats.playerName,
            reason: `RC ${p.stats.rc.toFixed(2)} (補正スコア ${p.adjRcScore.toFixed(2)}) / 打率 ${formatRate(p.stats.avg)} (${p.stats.plateAppearances}打席)`,
            stats: p.stats
        }));
    } else if (strategy === "obp_focused") {
        strategyName = "チャンスメイク (出塁率優先)";
        description = "補正済み出塁率と走力を最優先した打順です。1・2番に確実に出塁できる選手を置き、中軸に返す打者を配置します。";
        batters = buildLineupWithRoles([
            // 1番: 出塁率最優先 + 俊足
            {
                order: 1,
                filterFn: p => !isOkazaki(p),
                sortFn: (a, b) => (b.adjObp + b.stats.stolenBases * 0.04) - (a.adjObp + a.stats.stolenBases * 0.04),
                reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}→補正${formatRate(p.adjObp)} + 盗塁 ${p.stats.stolenBases} (リードオフ)`
            },
            // 2番: 出塁率
            {
                order: 2,
                filterFn: p => !isOkazaki(p),
                sortFn: (a, b) => (b.adjObp + b.stats.stolenBases * 0.02) - (a.adjObp + a.stats.stolenBases * 0.02),
                reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}→補正${formatRate(p.adjObp)} (チャンス拡大)`
            },
            // 4番: 残りのうち長打力・OPSトップ
            {
                order: 4,
                sortFn: (a, b) => b.adjOps - a.adjOps,
                reasonFn: p => `OPS ${p.stats.ops.toFixed(3)}→補正${p.adjOps.toFixed(3)} (主砲)`
            },
            // 3番: 出塁率+総合打力
            {
                order: 3,
                sortFn: (a, b) => (b.adjObp * 0.6 + b.adjRcScore * 0.4) - (a.adjObp * 0.6 + a.adjRcScore * 0.4),
                reasonFn: p => `出塁率 ${formatRate(p.stats.obp)} / RC ${p.stats.rc.toFixed(2)}`
            },
            // 5番: 得点圏
            {
                order: 5,
                sortFn: (a, b) => b.adjRispAvg - a.adjRispAvg,
                reasonFn: p => `得点圏 ${formatRate(p.stats.rispAvg)}→補正${formatRate(p.adjRispAvg)}`
            },
            // 6-9番: 出塁率順
            { order: 6, sortFn: (a, b) => b.adjObp - a.adjObp, reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}` },
            { order: 7, sortFn: (a, b) => b.adjObp - a.adjObp, reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}` },
            { order: 8, sortFn: (a, b) => b.adjObp - a.adjObp, reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}` },
            { order: 9, sortFn: (a, b) => b.adjObp - a.adjObp, reasonFn: p => `出塁率 ${formatRate(p.stats.obp)} (下位チャンスメイク)` },
        ]);
    } else if (strategy === "risp_focused") {
        strategyName = "勝負強さ (得点圏打率優先)";
        description = "チャンスでランナーを返す得点圏打率を重視した打順です。1・2番が出塁し、3〜5番の勝負強いクリーンナップがランナーを一掃します。";
        // 得点圏重視でも1・2番は出塁できる打者！3〜5番に得点圏強打者を配置
        batters = buildLineupWithRoles([
            // まず4番: チーム最強の勝負強さ + 長打力
            {
                order: 4,
                sortFn: (a, b) => {
                    const scoreA = a.adjRispAvg * 0.5 + a.adjSlg * 0.3 + Math.min(a.stats.rbi / 20, 0.3) * 0.2;
                    const scoreB = b.adjRispAvg * 0.5 + b.adjSlg * 0.3 + Math.min(b.stats.rbi / 20, 0.3) * 0.2;
                    return scoreB - scoreA;
                },
                reasonFn: p => `得点圏 ${formatRate(p.stats.rispAvg)}→補正${formatRate(p.adjRispAvg)} / 打点 ${p.stats.rbi} (4番・主砲)`
            },
            // 3番: 得点圏打率 + 総合打率
            {
                order: 3,
                sortFn: (a, b) => (b.adjRispAvg * 0.6 + b.adjAvg * 0.4) - (a.adjRispAvg * 0.6 + a.adjAvg * 0.4),
                reasonFn: p => `得点圏 ${formatRate(p.stats.rispAvg)} / 打率 ${formatRate(p.stats.avg)} (3番)`
            },
            // 5番: 得点圏打率 + 打点
            {
                order: 5,
                sortFn: (a, b) => (b.adjRispAvg * 0.7 + Math.min(b.stats.rbi / 20, 0.3) * 0.3) - (a.adjRispAvg * 0.7 + Math.min(a.stats.rbi / 20, 0.3) * 0.3),
                reasonFn: p => `得点圏 ${formatRate(p.stats.rispAvg)} / 打点 ${p.stats.rbi} (5番)`
            },
            // 1番: ランナーを出すための高出塁率 + 走力
            {
                order: 1,
                filterFn: p => !isOkazaki(p),
                sortFn: (a, b) => (b.adjObp + b.stats.stolenBases * 0.04) - (a.adjObp + a.stats.stolenBases * 0.04),
                reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}→補正${formatRate(p.adjObp)} (1番・出塁役)`
            },
            // 2番: 出塁率
            {
                order: 2,
                filterFn: p => !isOkazaki(p),
                sortFn: (a, b) => b.adjObp - a.adjObp,
                reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}→補正${formatRate(p.adjObp)} (2番・繋ぎ)`
            },
            // 6-9番: 残りの打力順
            { order: 6, sortFn: (a, b) => b.adjRcScore - a.adjRcScore, reasonFn: p => `RC ${p.stats.rc.toFixed(2)}` },
            { order: 7, sortFn: (a, b) => b.adjRcScore - a.adjRcScore, reasonFn: p => `RC ${p.stats.rc.toFixed(2)}` },
            { order: 8, sortFn: (a, b) => b.adjRcScore - a.adjRcScore, reasonFn: p => `RC ${p.stats.rc.toFixed(2)}` },
            { order: 9, sortFn: (a, b) => b.adjRcScore - a.adjRcScore, reasonFn: p => `RC ${p.stats.rc.toFixed(2)}` },
        ]);
    } else {
        // balanced (総合バランス)
        strategyName = "総合バランス";
        description = "野球のセオリーに基づき、4番にチーム最高の長打力、3番に総合打力、5番に勝負強さを配置。1・2番には出塁力と走力のある選手を配置した王道打順です。";

        // ★最重要: 1番から順に選ぶのではなく、4番・中軸から先に決定する！
        // これにより「最強打者が1・2番の出塁率選抜に奪われる」問題を防ぐ
        batters = buildLineupWithRoles([
            // ①【4番】最優先選出: チーム最高の長打力・破壊力・OPS
            {
                order: 4,
                sortFn: (a, b) => {
                    // 長打率(50%) + OPS(35%) + 打点(15%) で真の4番を選抜
                    const scoreA = (a.adjSlg * 0.5) + (a.adjOps * 0.35) + Math.min(a.stats.rbi / 20, 0.3) * 0.15;
                    const scoreB = (b.adjSlg * 0.5) + (b.adjOps * 0.35) + Math.min(b.stats.rbi / 20, 0.3) * 0.15;
                    return scoreB - scoreA;
                },
                reasonFn: p => `長打率 ${formatRate(p.stats.slg)} / OPS ${p.stats.ops.toFixed(3)} (チーム最高長打力・4番主砲)`
            },

            // ②【3番】次に選出: チーム最高のアベレージ＆総合得点創出能力(RC)
            {
                order: 3,
                sortFn: (a, b) => {
                    const scoreA = a.adjRcScore + (a.adjAvg * 2.0);
                    const scoreB = b.adjRcScore + (b.adjAvg * 2.0);
                    return scoreB - scoreA;
                },
                reasonFn: p => `打率 ${formatRate(p.stats.avg)} / RC ${p.stats.rc.toFixed(2)} (総合打撃力・3番)`
            },

            // ③【5番】次に選出: 得点圏打率が高く、4番の後ろを打てる勝負強さ
            {
                order: 5,
                sortFn: (a, b) => {
                    const scoreA = (a.adjRispAvg * 0.65) + (a.adjOps * 0.35);
                    const scoreB = (b.adjRispAvg * 0.65) + (b.adjOps * 0.35);
                    return scoreB - scoreA;
                },
                reasonFn: p => `得点圏 ${formatRate(p.stats.rispAvg)}→補正${formatRate(p.adjRispAvg)} / OPS ${p.stats.ops.toFixed(3)} (勝負強さ・5番)`
            },

            // ④【1番】出塁率が高く、足が使えるチャンスメーカー（※岡﨑は除外）
            {
                order: 1,
                filterFn: p => !isOkazaki(p),
                sortFn: (a, b) => {
                    const scoreA = a.adjObp + (a.stats.stolenBases * 0.04);
                    const scoreB = b.adjObp + (b.stats.stolenBases * 0.04);
                    return scoreB - scoreA;
                },
                reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}→補正${formatRate(p.adjObp)} + 盗塁 ${p.stats.stolenBases} (リードオフ)`
            },

            // ⑤【2番】出塁率と小技・繋ぎ（※岡﨑は除外）
            {
                order: 2,
                filterFn: p => !isOkazaki(p),
                sortFn: (a, b) => {
                    const scoreA = (a.adjObp * 0.7) + (a.adjAvg * 0.3) + (a.stats.stolenBases * 0.02);
                    const scoreB = (b.adjObp * 0.7) + (b.adjAvg * 0.3) + (b.stats.stolenBases * 0.02);
                    return scoreB - scoreA;
                },
                reasonFn: p => `出塁率 ${formatRate(p.stats.obp)}→補正${formatRate(p.adjObp)} (チャンス拡大・繋ぎ)`
            },

            // ⑥【6〜9番】残りの選手を総合打力(RC)順に配置
            {
                order: 6,
                sortFn: (a, b) => b.adjRcScore - a.adjRcScore,
                reasonFn: p => `RC ${p.stats.rc.toFixed(2)} (下位打線の中軸)`
            },
            {
                order: 7,
                sortFn: (a, b) => b.adjRcScore - a.adjRcScore,
                reasonFn: p => `RC ${p.stats.rc.toFixed(2)}`
            },
            {
                order: 8,
                sortFn: (a, b) => b.adjRcScore - a.adjRcScore,
                reasonFn: p => `RC ${p.stats.rc.toFixed(2)}`
            },
            {
                order: 9,
                sortFn: (a, b) => (b.adjObp + b.stats.stolenBases * 0.02) - (a.adjObp + a.stats.stolenBases * 0.02),
                reasonFn: p => `出塁率 ${formatRate(p.stats.obp)} (セカンドリードオフ)`
            },
        ]);
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
