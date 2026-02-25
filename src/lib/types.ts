/**
 * Baseball Ops Dashboard - データ型定義
 * 少年野球チームのスコア管理・分析に必要な全型を定義
 */

/** 試合タイプ */
export type GameType = "official" | "practice";

/** 試合結果 */
export type GameResult = "win" | "loss" | "tie";

/** 打席結果 */
export type AtBatResult =
    | "single"    // 単打
    | "double"    // 二塁打
    | "triple"    // 三塁打
    | "homerun"   // 本塁打
    | "walk"      // 四球
    | "hbp"       // 死球
    | "strikeout" // 三振
    | "groundout" // ゴロアウト
    | "flyout"    // フライアウト
    | "error"     // エラー出塁
    | "sacrifice";// 犠打・犠飛

/** 打球タイプ */
export type BattedBallType = "grounder" | "liner" | "fly";

/** 打球方向（守備位置） */
export type BattedBallDirection = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/** 選手マスタ */
export interface Player {
    id: string;
    name: string;
    number: number;
    grade: string;
    position: string;
    throwHand: string;
    batHand: string;
}

/** 試合メタデータ */
export interface GameMetadata {
    id: string;
    date: string;
    opponent: string;
    result: GameResult;
    scoreFor: number;
    scoreAgainst: number;
    gameType: GameType;
    scoreboardImageUrl?: string;
}

/** 打席データ（1打席ごと） */
export interface PlateAppearance {
    id: string;
    gameId: string;
    playerName: string;
    inning: number;
    result: AtBatResult;
    battedBallType?: BattedBallType;
    battedBallDirection?: BattedBallDirection;
    rbi: number;
    runs: number;
    stolenBases: number;
}

/** 投手成績（試合ごと） */
export interface PitchingStats {
    id: string;
    gameId: string;
    playerName: string;
    inningsPitched: number;
    runsAllowed: number;
    earnedRuns: number;
    hitsAllowed: number;
    walksAllowed: number;
    strikeouts: number;
    totalPitches: number;
    strikes: number;
    balls: number;
}

/** アプリ全体のデータストア */
export interface AppData {
    players: Player[];
    games: GameMetadata[];
    plateAppearances: PlateAppearance[];
    pitchingStats: PitchingStats[];
}

/** 打撃集計（選手単位） */
export interface BattingAggregation {
    playerName: string;
    plateAppearances: number;
    atBats: number;
    hits: number;
    doubles: number;
    triples: number;
    homeruns: number;
    walks: number;
    hbp: number;
    strikeouts: number;
    sacrifices: number;
    rbi: number;
    runs: number;
    stolenBases: number;
    avg: number;
    obp: number;
    /** 打球方向分布 */
    directionBreakdown: {
        pull: number;
        center: number;
        opposite: number;
    };
    /** 打球タイプ分布 */
    battedBallBreakdown: {
        grounder: number;
        liner: number;
        fly: number;
    };
}

/** 投手成績集計（選手単位） */
export interface PitchingAggregation {
    playerName: string;
    games: number;
    inningsPitched: number;
    runsAllowed: number;
    earnedRuns: number;
    hitsAllowed: number;
    walksAllowed: number;
    strikeouts: number;
    totalPitches: number;
    strikes: number;
    balls: number;
    era: number;
    strikePercentage: number;
}
