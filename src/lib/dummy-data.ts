/**
 * Baseball Ops Dashboard - ダミーデータ
 * UIデモ用のサンプルデータ
 */
import {
    GameMetadata,
    PlateAppearance,
    PitchingStats,
    Player,
    AppData,
} from "./types";

/** ダミー選手データ */
const PLAYERS: Player[] = [
    { id: "p-001", name: "田中 翔太", number: 1, grade: "6年", position: "投手", throwHand: "右", batHand: "右" },
    { id: "p-002", name: "佐藤 大翔", number: 2, grade: "6年", position: "捕手", throwHand: "右", batHand: "右" },
    { id: "p-003", name: "鈴木 陽向", number: 3, grade: "6年", position: "一塁手", throwHand: "左", batHand: "左" },
    { id: "p-004", name: "高橋 蒼空", number: 4, grade: "5年", position: "二塁手", throwHand: "右", batHand: "右" },
    { id: "p-005", name: "伊藤 悠真", number: 5, grade: "5年", position: "遊撃手", throwHand: "右", batHand: "左" },
    { id: "p-006", name: "渡辺 湊", number: 6, grade: "5年", position: "三塁手", throwHand: "右", batHand: "右" },
    { id: "p-007", name: "中村 颯太", number: 7, grade: "4年", position: "左翼手", throwHand: "左", batHand: "左" },
    { id: "p-008", name: "小林 蓮", number: 8, grade: "4年", position: "中堅手", throwHand: "右", batHand: "右" },
    { id: "p-009", name: "加藤 大和", number: 9, grade: "4年", position: "右翼手", throwHand: "右", batHand: "右" },
    { id: "p-010", name: "山田 樹", number: 10, grade: "6年", position: "投手", throwHand: "左", batHand: "左" },
    { id: "p-011", name: "松本 朝陽", number: 11, grade: "3年", position: "遊撃手", throwHand: "右", batHand: "右" },
    { id: "p-012", name: "井上 瑛太", number: 12, grade: "3年", position: "捕手", throwHand: "右", batHand: "右" },
];

/** 選手名リスト（ダミーデータ生成用） */
const PLAYER_NAMES = PLAYERS.map(p => p.name);


/** ID生成ユーティリティ */
let idCounter = 0;
function generateId(): string {
    idCounter++;
    return `dummy-${idCounter}`;
}

/** ダミー試合データ */
const games: GameMetadata[] = [
    {
        id: "game-001",
        date: "2026-01-12",
        opponent: "東町タイガース",
        result: "win",
        scoreFor: 8,
        scoreAgainst: 3,
        gameType: "official",
    },
    {
        id: "game-002",
        date: "2026-01-19",
        opponent: "南海ドルフィンズ",
        result: "loss",
        scoreFor: 2,
        scoreAgainst: 5,
        gameType: "official",
    },
    {
        id: "game-003",
        date: "2026-01-26",
        opponent: "西山イーグルス",
        result: "win",
        scoreFor: 6,
        scoreAgainst: 4,
        gameType: "practice",
    },
    {
        id: "game-004",
        date: "2026-02-02",
        opponent: "北風ファイターズ",
        result: "win",
        scoreFor: 10,
        scoreAgainst: 2,
        gameType: "official",
    },
    {
        id: "game-005",
        date: "2026-02-09",
        opponent: "中央ライオンズ",
        result: "tie",
        scoreFor: 4,
        scoreAgainst: 4,
        gameType: "practice",
    },
    {
        id: "game-006",
        date: "2026-02-16",
        opponent: "三河スターズ",
        result: "win",
        scoreFor: 7,
        scoreAgainst: 1,
        gameType: "official",
    },
    {
        id: "game-007",
        date: "2026-02-23",
        opponent: "港町シーガルズ",
        result: "loss",
        scoreFor: 3,
        scoreAgainst: 6,
        gameType: "official",
    },
];

/** 打席結果の候補とその重み */
const AT_BAT_RESULTS = [
    { result: "single" as const, weight: 25 },
    { result: "double" as const, weight: 8 },
    { result: "triple" as const, weight: 2 },
    { result: "homerun" as const, weight: 1 },
    { result: "walk" as const, weight: 12 },
    { result: "hbp" as const, weight: 3 },
    { result: "strikeout" as const, weight: 18 },
    { result: "groundout" as const, weight: 15 },
    { result: "flyout" as const, weight: 12 },
    { result: "error" as const, weight: 2 },
    { result: "sacrifice" as const, weight: 2 },
];

const BATTED_BALL_TYPES = ["grounder", "liner", "fly"] as const;
const BATTED_BALL_DIRS = ["pull", "center", "opposite"] as const;

/** シード付き擬似乱数（再現性ありのダミーデータ生成用） */
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

/**
 * 重み付きランダム選択
 */
function weightedRandom<T>(items: { result: T; weight: number }[], rand: () => number): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let r = rand() * totalWeight;
    for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item.result;
    }
    return items[items.length - 1].result;
}

/** ダミーの打席データを生成 */
function generatePlateAppearances(): PlateAppearance[] {
    const pas: PlateAppearance[] = [];
    const rand = seededRandom(42);

    for (const game of games) {
        // 各試合で9人が3-4打席
        const lineup = PLAYER_NAMES.slice(0, 9);

        for (const player of lineup) {
            const numPAs = 3 + Math.floor(rand() * 2);
            for (let i = 0; i < numPAs; i++) {
                const result = weightedRandom(AT_BAT_RESULTS, rand);
                const hasBattedBall = ["single", "double", "triple", "homerun", "groundout", "flyout", "error"].includes(result);

                pas.push({
                    id: generateId(),
                    gameId: game.id,
                    playerName: player,
                    inning: i + 1,
                    result,
                    battedBallType: hasBattedBall
                        ? BATTED_BALL_TYPES[Math.floor(rand() * 3)]
                        : undefined,
                    battedBallDirection: hasBattedBall
                        ? BATTED_BALL_DIRS[Math.floor(rand() * 3)]
                        : undefined,
                    rbi: result === "homerun" ? 1 + Math.floor(rand() * 2) :
                        ["single", "double", "triple"].includes(result) ? (rand() > 0.6 ? 1 : 0) : 0,
                });
            }
        }
    }

    return pas;
}

/** ダミー投手成績データ */
function generatePitchingStats(): PitchingStats[] {
    const stats: PitchingStats[] = [];
    const pitchers = ["田中 翔太", "佐藤 大翔", "鈴木 陽向", "高橋 蒼空"];
    const rand = seededRandom(99);

    for (const game of games) {
        // 各試合で1-2人が投げる
        const numPitchers = 1 + Math.floor(rand() * 2);
        const gamePitchers = pitchers.slice(0, numPitchers);
        const totalInnings = 7;
        const ipPerPitcher = totalInnings / numPitchers;

        for (const pitcher of gamePitchers) {
            const ip = Math.round(ipPerPitcher * 10) / 10;
            const totalPitches = Math.floor(40 + rand() * 40);
            const strikeRatio = 0.5 + rand() * 0.2;
            const pitcherStrikes = Math.floor(totalPitches * strikeRatio);

            stats.push({
                id: generateId(),
                gameId: game.id,
                playerName: pitcher,
                inningsPitched: ip,
                runsAllowed: Math.floor(rand() * 4),
                earnedRuns: Math.floor(rand() * 3),
                hitsAllowed: Math.floor(rand() * 6),
                walksAllowed: Math.floor(rand() * 3),
                strikeouts: Math.floor(rand() * 6),
                totalPitches,
                strikes: pitcherStrikes,
                balls: totalPitches - pitcherStrikes,
            });
        }
    }

    return stats;
}

/** エクスポートするダミーデータ */
export const dummyData: AppData = {
    players: PLAYERS,
    games,
    plateAppearances: generatePlateAppearances(),
    pitchingStats: generatePitchingStats(),
};

/** 全選手名を取得する（後方互換用に残す） */
export const allPlayerNames = PLAYER_NAMES;
