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
    playerName?: string
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

        if (paName.includes("米") || paName.includes("沢") || paName.includes("澤")) {
            console.log(`[DEBUG resolvePlayerName] paName: "${paName}" -> resolved: "${resolved}"`);
        }
        return resolved;
    };

    // 選手名でグループ化
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
