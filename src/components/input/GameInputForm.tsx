"use client";

/**
 * 試合入力フォームコンポーネント
 * 試合メタデータ + 打席データ + 投手成績を入力
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/lib/data-context";
import {
    GameMetadata,
    PlateAppearance,
    PitchingStats,
    AtBatResult,
    BattedBallType,
    BattedBallDirection,
    GameResult,
    GameType,
} from "@/lib/types";

import {
    Plus,
    Save,
    Trash2,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

/** 打席結果の選択肢 */
const AT_BAT_OPTIONS: { value: AtBatResult; label: string }[] = [
    { value: "single", label: "単打" },
    { value: "double", label: "二塁打" },
    { value: "triple", label: "三塁打" },
    { value: "homerun", label: "本塁打" },
    { value: "walk", label: "四球" },
    { value: "hbp", label: "死球" },
    { value: "strikeout", label: "三振" },
    { value: "groundout", label: "ゴロ" },
    { value: "flyout", label: "フライ" },
    { value: "error", label: "エラー" },
    { value: "sacrifice", label: "犠打" },
];

/** 打球タイプ選択肢 */
const BATTED_BALL_OPTIONS: { value: BattedBallType; label: string }[] = [
    { value: "grounder", label: "ゴロ" },
    { value: "liner", label: "ライナー" },
    { value: "fly", label: "フライ" },
];

/** 打球方向選択肢（守備位置） */
const DIRECTION_OPTIONS: { value: BattedBallDirection; label: string }[] = [
    { value: "1", label: "投" },
    { value: "2", label: "捕" },
    { value: "3", label: "一" },
    { value: "4", label: "二" },
    { value: "5", label: "三" },
    { value: "6", label: "遊" },
    { value: "7", label: "左" },
    { value: "8", label: "中" },
    { value: "9", label: "右" },
];

/** 打席入力1行分の型 */
interface PAInput {
    playerName: string;
    inning: number;
    result: AtBatResult;
    battedBallType: BattedBallType | "";
    battedBallDirection: BattedBallDirection | "";
    rbi: number;
    runs: number;
    stolenBases: number;
}

/** 投手入力の型 */
interface PitchingInput {
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

/** 空の打席データ */
function emptyPA(): PAInput {
    return {
        playerName: "",
        inning: 1,
        result: "single",
        battedBallType: "",
        battedBallDirection: "",
        rbi: 0,
        runs: 0,
        stolenBases: 0,
    };
}

/** 空の投手データ */
function emptyPitching(): PitchingInput {
    return {
        playerName: "",
        inningsPitched: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        hitsAllowed: 0,
        walksAllowed: 0,
        strikeouts: 0,
        totalPitches: 0,
        strikes: 0,
        balls: 0,
    };
}

export default function GameInputForm() {
    const { data, addGame, addPlateAppearances, addPitchingStats, playerNames } = useData();
    const [submitted, setSubmitted] = useState(false);

    // 入力モード: "new" (新規試合) | "existing" (既存試合に成績追加)
    const [inputMode, setInputMode] = useState<"new" | "existing">("new");
    const [selectedGameId, setSelectedGameId] = useState<string>("");

    // 試合データ
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [opponent, setOpponent] = useState("");
    const [result, setResult] = useState<GameResult>("win");
    const [scoreFor, setScoreFor] = useState(0);
    const [scoreAgainst, setScoreAgainst] = useState(0);
    const [gameType, setGameType] = useState<GameType>("official");

    // 打席データ
    const [paInputs, setPaInputs] = useState<PAInput[]>([emptyPA()]);

    // 投手データ
    const [pitchingInputs, setPitchingInputs] = useState<PitchingInput[]>([
        emptyPitching(),
    ]);

    // セクション表示切替
    const [showPitching, setShowPitching] = useState(false);

    // 既存試合が選択されたら、その試合の情報を反映（任意）またはIDだけ保持
    const handleGameSelect = (id: string) => {
        setSelectedGameId(id);
        const game = data.games.find(g => g.id === id);
        if (game) {
            setDate(game.date);
            setOpponent(game.opponent);
            setResult(game.result);
            setScoreFor(game.scoreFor);
            setScoreAgainst(game.scoreAgainst);
            setGameType(game.gameType);
        }
    };

    /** 打数行追加 */
    const addPARow = () => setPaInputs((prev) => [...prev, emptyPA()]);

    /** 打席行削除 */
    const removePARow = (index: number) => {
        setPaInputs((prev) => prev.filter((_, i) => i !== index));
    };

    /** 打席データ更新 */
    const updatePA = (index: number, field: keyof PAInput, value: string | number) => {
        setPaInputs((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    /** 投手行追加 */
    const addPitchingRow = () =>
        setPitchingInputs((prev) => [...prev, emptyPitching()]);

    /** 投手行削除 */
    const removePitchingRow = (index: number) => {
        setPitchingInputs((prev) => prev.filter((_, i) => i !== index));
    };

    /** 投手データ更新 */
    const updatePitching = (
        index: number,
        field: keyof PitchingInput,
        value: string | number
    ) => {
        setPitchingInputs((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    /** フォーム送信 */
    const handleSubmit = () => {
        // 新規の場合は相手名必須、既存の場合は試合選択必須
        if (inputMode === "new" && !opponent.trim()) return;
        if (inputMode === "existing" && !selectedGameId) return;

        const gameId = inputMode === "existing" ? selectedGameId : `game-${Date.now()}`;

        // 新規作成時のみ試合メタデータを追加
        if (inputMode === "new") {
            const game: GameMetadata = {
                id: gameId,
                date,
                opponent: opponent.trim(),
                result,
                scoreFor,
                scoreAgainst,
                gameType,
            };
            addGame(game);
        }

        // 打席データ（空の名前は除外）
        const pas: PlateAppearance[] = paInputs
            .filter((pa) => pa.playerName.trim())
            .map((pa, i) => ({
                id: `pa-${Date.now()}-${i}`,
                gameId,
                playerName: pa.playerName.trim(),
                inning: pa.inning,
                result: pa.result,
                battedBallType: pa.battedBallType || undefined,
                battedBallDirection: pa.battedBallDirection || undefined,
                rbi: pa.rbi,
                runs: pa.runs,
                stolenBases: pa.stolenBases,
            }));

        // 投手成績
        const pitching: PitchingStats[] = pitchingInputs
            .filter((p) => p.playerName.trim())
            .map((p, i) => ({
                id: `pitch-${Date.now()}-${i}`,
                gameId,
                playerName: p.playerName.trim(),
                inningsPitched: p.inningsPitched,
                runsAllowed: p.runsAllowed,
                earnedRuns: p.earnedRuns,
                hitsAllowed: p.hitsAllowed,
                walksAllowed: p.walksAllowed,
                strikeouts: p.strikeouts,
                totalPitches: p.totalPitches,
                strikes: p.strikes,
                balls: p.balls,
            }));

        if (pas.length > 0) addPlateAppearances(pas);
        if (pitching.length > 0) addPitchingStats(pitching);

        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            // フォームリセット
            setOpponent("");
            setScoreFor(0);
            setScoreAgainst(0);
            setSelectedGameId("");
            setPaInputs([emptyPA()]);
            setPitchingInputs([emptyPitching()]);
        }, 2000);
    };

    if (submitted) {
        return (
            <Card className="border-emerald-200 dark:border-emerald-800">
                <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        試合データを保存しました！
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* 入力モード切り替え */}
            <div className="flex gap-2">
                {(["new", "existing"] as const).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setInputMode(mode)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${inputMode === mode
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                    >
                        {mode === "new" ? "新規試合を登録" : "既存の試合を選択"}
                    </button>
                ))}
            </div>

            {/* 試合情報 */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">試合情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {inputMode === "existing" && (
                        <div className="space-y-1.5 pb-2">
                            <Label className="text-xs font-semibold text-emerald-600">試合を選択</Label>
                            <select
                                value={selectedGameId}
                                onChange={(e) => handleGameSelect(e.target.value)}
                                className="w-full h-10 rounded-md border-2 border-emerald-100 bg-background px-3 text-sm focus:border-emerald-500 outline-none transition-all"
                            >
                                <option value="">追加する試合を選んでください...</option>
                                {data.games
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.date} - vs {g.opponent} ({g.scoreFor}-{g.scoreAgainst})
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">日付</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                disabled={inputMode === "existing"}
                                className="h-9 text-sm disabled:opacity-70 disabled:bg-muted"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">対戦相手</Label>
                            <Input
                                placeholder="チーム名"
                                value={opponent}
                                onChange={(e) => setOpponent(e.target.value)}
                                disabled={inputMode === "existing"}
                                className="h-9 text-sm disabled:opacity-70 disabled:bg-muted"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">結果</Label>
                            <select
                                value={result}
                                onChange={(e) => setResult(e.target.value as GameResult)}
                                disabled={inputMode === "existing"}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70 disabled:bg-muted"
                            >
                                <option value="win">勝ち</option>
                                <option value="loss">負け</option>
                                <option value="tie">引分</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">自チーム得点</Label>
                            <Input
                                type="number"
                                min={0}
                                value={scoreFor}
                                onChange={(e) => setScoreFor(Number(e.target.value))}
                                disabled={inputMode === "existing"}
                                className="h-9 text-sm disabled:opacity-70 disabled:bg-muted"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">相手得点</Label>
                            <Input
                                type="number"
                                min={0}
                                value={scoreAgainst}
                                onChange={(e) => setScoreAgainst(Number(e.target.value))}
                                disabled={inputMode === "existing"}
                                className="h-9 text-sm disabled:opacity-70 disabled:bg-muted"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">試合種別</Label>
                        <div className="flex gap-2">
                            {(["official", "practice"] as GameType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setGameType(type)}
                                    disabled={inputMode === "existing"}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${gameType === type
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        } ${inputMode === "existing" && gameType !== type ? "opacity-30" : ""}`}
                                >
                                    {type === "official" ? "公式戦" : "練習試合"}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 打席データ */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                            打席データ
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                                {paInputs.length}件
                            </Badge>
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={addPARow}>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            追加
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {paInputs.map((pa, index) => (
                        <div
                            key={index}
                            className="p-3 rounded-xl bg-muted/30 space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                    打席 #{index + 1}
                                </span>
                                {paInputs.length > 1 && (
                                    <button
                                        onClick={() => removePARow(index)}
                                        className="text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        選手名
                                    </Label>
                                    <select
                                        value={pa.playerName}
                                        onChange={(e) =>
                                            updatePA(index, "playerName", e.target.value)
                                        }
                                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                        <option value="">選択...</option>
                                        {playerNames.map((name) => (
                                            <option key={name} value={name}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        イニング
                                    </Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={9}
                                        value={pa.inning}
                                        onChange={(e) =>
                                            updatePA(index, "inning", Number(e.target.value))
                                        }
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">
                                    打席結果
                                </Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {AT_BAT_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updatePA(index, "result", opt.value)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${pa.result === opt.value
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 打球詳細（ゴロ、フライアウト等のときだけ表示） */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        打球種
                                    </Label>
                                    <select
                                        value={pa.battedBallType}
                                        onChange={(e) =>
                                            updatePA(index, "battedBallType", e.target.value)
                                        }
                                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                        <option value="">-</option>
                                        {BATTED_BALL_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        打球方向
                                    </Label>
                                    <select
                                        value={pa.battedBallDirection}
                                        onChange={(e) =>
                                            updatePA(index, "battedBallDirection", e.target.value)
                                        }
                                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                        <option value="">-</option>
                                        {DIRECTION_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        打点
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={4}
                                        value={pa.rbi}
                                        onChange={(e) =>
                                            updatePA(index, "rbi", Number(e.target.value))
                                        }
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        得点
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={1}
                                        value={pa.runs}
                                        onChange={(e) =>
                                            updatePA(index, "runs", Number(e.target.value))
                                        }
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        盗塁
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={3}
                                        value={pa.stolenBases}
                                        onChange={(e) =>
                                            updatePA(index, "stolenBases", Number(e.target.value))
                                        }
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 投手成績 */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <button
                        onClick={() => setShowPitching(!showPitching)}
                        className="flex items-center justify-between w-full"
                    >
                        <CardTitle className="text-base">
                            投手成績
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                                {pitchingInputs.length}人
                            </Badge>
                        </CardTitle>
                        {showPitching ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>
                </CardHeader>

                {showPitching && (
                    <CardContent className="space-y-3">
                        <div className="flex justify-end">
                            <Button variant="outline" size="sm" onClick={addPitchingRow}>
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                投手追加
                            </Button>
                        </div>

                        {pitchingInputs.map((p, index) => (
                            <div
                                key={index}
                                className="p-3 rounded-xl bg-muted/30 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        投手 #{index + 1}
                                    </span>
                                    {pitchingInputs.length > 1 && (
                                        <button
                                            onClick={() => removePitchingRow(index)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            投手名
                                        </Label>
                                        <select
                                            value={p.playerName}
                                            onChange={(e) =>
                                                updatePitching(index, "playerName", e.target.value)
                                            }
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                                        >
                                            <option value="">選択...</option>
                                            {playerNames.map((name) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            投球回数
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.1}
                                            value={p.inningsPitched}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "inningsPitched",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            失点
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={p.runsAllowed}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "runsAllowed",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            自責点
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={p.earnedRuns}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "earnedRuns",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            被安打
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={p.hitsAllowed}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "hitsAllowed",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            与四球
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={p.walksAllowed}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "walksAllowed",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            奪三振
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={p.strikeouts}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "strikeouts",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            総球数
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={p.totalPitches}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "totalPitches",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            ストライク
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={p.strikes}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "strikes",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">
                                            ボール
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={p.balls}
                                            onChange={(e) =>
                                                updatePitching(
                                                    index,
                                                    "balls",
                                                    Number(e.target.value)
                                                )
                                            }
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                )}
            </Card>

            {/* 送信ボタン */}
            <Button
                onClick={handleSubmit}
                disabled={!opponent.trim()}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300"
            >
                <Save className="h-5 w-5 mr-2" />
                試合データを保存
            </Button>
        </div>
    );
}
