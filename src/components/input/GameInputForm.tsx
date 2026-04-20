"use client";

/**
 * 試合入力フォームコンポーネント
 * 試合メタデータ + 打席データ + 投手成績を入力
 */
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/lib/data-context";
import { useSearchParams } from "next/navigation";
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
import { getDisplayName } from "@/lib/utils";

import {
    Plus,
    Save,
    Trash2,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ImageIcon,
} from "lucide-react";

/** 打席結果の選択肢 */
const AT_BAT_OPTIONS: { value: AtBatResult; label: string }[] = [
    { value: "single", label: "単打" },
    { value: "double", label: "二塁打" },
    { value: "triple", label: "三塁打" },
    { value: "homerun", label: "本塁打" },
    { value: "walk", label: "四球" },
    { value: "hbp", label: "死球" },
    { value: "error", label: "エラー" },
    { value: "sacrifice", label: "犠打・犠飛" },
    { value: "out", label: "アウト" },
    { value: "strikeout_swinging", label: "空振三振" },
    { value: "strikeout_looking", label: "見逃三振" },
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
    id?: string;
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
    id?: string;
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
    const { 
        data, 
        addGame, 
        updateGame, 
        replaceGameStats, 
        addPlateAppearances, 
        addPitchingStats, 
        playerNames,
        saveLineupPattern,
        deleteLineupPattern 
    } = useData();
    const searchParams = useSearchParams();
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
    const [officialGameName, setOfficialGameName] = useState("");
    const [imageBase64, setImageBase64] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // スタメンデータ (1番~9番以上、空文字可)
    const [startingLineup, setStartingLineup] = useState<string[]>(Array(9).fill(""));

    // 打席データ
    const [paInputs, setPaInputs] = useState<PAInput[]>([emptyPA()]);

    // 投手データ
    const [pitchingInputs, setPitchingInputs] = useState<PitchingInput[]>([
        emptyPitching(),
    ]);

    // セクション表示切替
    const [showPitching, setShowPitching] = useState(false);

    // スタメンパターンの選択用状態
    const [selectedPatternId, setSelectedPatternId] = useState<string>("");

    // URLパラメータによる初期編集データの読み込み
    useEffect(() => {
        const editId = searchParams.get("edit");
        if (editId) {
            setInputMode("existing");
            handleGameSelect(editId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // 投球回数補正処理
    const handleInningsChange = (index: number, newValue: number) => {
        if (isNaN(newValue) || newValue < 0) {
            updatePitching(index, "inningsPitched", 0);
            return;
        }
        const intPart = Math.floor(newValue);
        const decimalPart = Math.round((newValue - intPart) * 10);
        
        let adjustedValue = newValue;
        if (decimalPart === 3) {
            adjustedValue = intPart + 1; // e.g., 0.3 -> 1.0, 1.3 -> 2.0
        } else if (decimalPart === 9) {
            adjustedValue = Math.max(0, intPart + 0.2); // e.g., 0.9 -> 0.2, 1.9 -> 1.2
        } else if (decimalPart > 3 && decimalPart < 9) {
            // 直接入力で 0.4~0.8 になった場合は、キリよく補正するか許容するか。今回は0.2に戻す等でも良いが、基本的にはエラーにしないかそのまま。
            // ユーザーの入力しやすさを考慮し、ここではそのままにするか 0.2 に丸めるなどが考えられるが、
            // 上下ボタンによる操作を主眼としているためここでは3と9のみ特別扱い。
        }

        updatePitching(index, "inningsPitched", adjustedValue);
    };

    /** スタメンパターンとして保存 */
    const handleSavePattern = () => {
        const name = window.prompt("保存するスタメンパターンの名前を入力してください（例：パターン①、Aチーム等）");
        if (!name || name.trim() === "") return;
        
        saveLineupPattern({
            id: `pattern-${Date.now()}`,
            name: name.trim(),
            lineup: [...startingLineup]
        });
        alert(`スタメンパターン「${name}」を保存しました`);
    };

    /** 選択したスタメンパターンを読み込む */
    const handleLoadPattern = (patternId: string) => {
        setSelectedPatternId(patternId);
        if (!patternId) return;

        const pattern = data.lineupPatterns?.find(p => p.id === patternId);
        if (pattern) {
            // 現在のスタメン配列長に合わせる、あるいはパターンの長さに合わせる
            // パターンの長さが現在のスタメン（最低9人）より短ければ空文字パディング
            let newLineup = [...pattern.lineup];
            if (newLineup.length < 9) {
                const padding = Array(9 - newLineup.length).fill("");
                newLineup = [...newLineup, ...padding];
            }
            setStartingLineup(newLineup);

            // 最初の打席の選手名が空かつ打席データが1つの場合、読み込んだ1番打者をセットする
            if (paInputs.length === 1 && !paInputs[0].playerName && newLineup[0]) {
                updatePA(0, "playerName", newLineup[0]);
            }
        }
    };

    /** 選択したスタメンパターンを削除 */
    const handleDeletePattern = () => {
        if (!selectedPatternId) return;
        if (window.confirm("選択中のパターンを削除しますか？")) {
            deleteLineupPattern(selectedPatternId);
            setSelectedPatternId("");
        }
    };

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
            setOfficialGameName(game.officialGameName || "");
            setImageBase64(game.scoreboardImageUrl || "");

            // 既存の成績を読み込む
            const existingPas = data.plateAppearances.filter(pa => pa.gameId === id);
            if (existingPas.length > 0) {
                setPaInputs(existingPas.map(pa => ({
                    id: pa.id,
                    playerName: pa.playerName,
                    inning: pa.inning,
                    result: pa.result,
                    battedBallType: pa.battedBallType || "",
                    battedBallDirection: pa.battedBallDirection || "",
                    rbi: pa.rbi,
                    runs: pa.runs,
                    stolenBases: pa.stolenBases,
                })));
            } else {
                setPaInputs([emptyPA()]);
            }

            const existingPitching = data.pitchingStats.filter(p => p.gameId === id);
            if (existingPitching.length > 0) {
                setPitchingInputs(existingPitching.map(p => ({
                    id: p.id,
                    playerName: p.playerName,
                    inningsPitched: p.inningsPitched,
                    runsAllowed: p.runsAllowed,
                    earnedRuns: p.earnedRuns,
                    hitsAllowed: p.hitsAllowed,
                    walksAllowed: p.walksAllowed,
                    strikeouts: p.strikeouts,
                    totalPitches: p.totalPitches,
                    strikes: p.strikes,
                    balls: p.balls,
                })));
            } else {
                setPitchingInputs([emptyPitching()]);
            }
        } else {
            setPaInputs([emptyPA()]);
            setPitchingInputs([emptyPitching()]);
        }
    };

    /** 画像選択・リサイズ処理 */
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                // 最大幅/高さを1024pxに制限
                const MAX_SIZE = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    // JPEG/0.7の品質で圧縮
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    setImageBase64(dataUrl);
                }
            };
            if (event.target?.result) {
                img.src = event.target.result as string;
            }
        };
        reader.readAsDataURL(file);
    };

    /** 打数行追加 */
    const addPARow = () => {
        setPaInputs((prev) => {
            const lastPA = prev[prev.length - 1];
            let nextPlayerName = "";
            let nextInning = 1;

            if (lastPA) {
                // インニングは最後の打席を継承し、もし3アウトなら次のイニングへ
                const currentInning = lastPA.inning;
                const paInThisInning = prev.filter((pa) => pa.inning === currentInning);
                const outsInThisInning = paInThisInning.reduce((outs, pa) => {
                    if (["out", "strikeout_swinging", "strikeout_looking", "strikeout", "groundout", "flyout", "sacrifice"].includes(pa.result)) {
                        return outs + 1;
                    }
                    return outs;
                }, 0);

                if (outsInThisInning >= 3) {
                    nextInning = currentInning + 1;
                } else {
                    nextInning = currentInning;
                }

                // スタメンから次の打者を探す
                if (lastPA.playerName) {
                    let lastKnownIndex = -1;

                    // 直前の打者がスタメンにいるか確認
                    lastKnownIndex = startingLineup.indexOf(lastPA.playerName);

                    // 有効なスタメンの人数を計算（末尾の空欄を無視）
                    let activeLineupSize = startingLineup.length;
                    for (let i = startingLineup.length - 1; i >= 0; i--) {
                        if (startingLineup[i].trim() !== "") {
                            activeLineupSize = i + 1;
                            break;
                        }
                    }
                    if (activeLineupSize === 0) activeLineupSize = 1;

                    // 直前の打者がスタメンにいない（代打等）場合、過去の打席をさかのぼってスタメンを探す
                    if (lastKnownIndex === -1) {
                        for (let i = prev.length - 2; i >= 0; i--) {
                            const pastIdx = startingLineup.indexOf(prev[i].playerName);
                            if (pastIdx !== -1) {
                                // 見つかった場合は、その選手から数えて（現在の打席数 - 過去の打席数）分進んだ打順とみなす
                                lastKnownIndex = (pastIdx + (prev.length - 1 - i)) % activeLineupSize;
                                break;
                            }
                        }
                    }

                    if (lastKnownIndex !== -1) {
                        // 次の打者のインデックス（最後まで行ったら1番に戻る）
                        const nextIndex = (lastKnownIndex + 1) % activeLineupSize;
                        nextPlayerName = startingLineup[nextIndex] || "";
                    }
                }
            } else if (startingLineup[0]) {
                // 最初の打席なら1番バッター
                nextPlayerName = startingLineup[0];
            }

            return [...prev, { ...emptyPA(), inning: nextInning, playerName: nextPlayerName }];
        });
    };

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

        // 新規作成時のみ試合メタデータを追加、既存の場合はアップデート
        if (inputMode === "new") {
            const game: GameMetadata = {
                id: gameId,
                date,
                opponent: opponent.trim(),
                result,
                scoreFor,
                scoreAgainst,
                gameType,
                officialGameName: gameType === "official" ? officialGameName.trim() : undefined,
                scoreboardImageUrl: imageBase64 || undefined,
            };
            addGame(game);
        } else {
            // 既存試合の画像のみ更新、他の情報はそのまま（フォームの値で上書き可能にする場合などに応じて要調整、今回は画像も更新対象に含める）
            updateGame(gameId, {
                date,
                opponent: opponent.trim(),
                result,
                scoreFor,
                scoreAgainst,
                gameType,
                officialGameName: gameType === "official" ? officialGameName.trim() : undefined,
                scoreboardImageUrl: imageBase64 || undefined,
            });
        }

        // 打席データ（空の名前は除外）
        const pas: PlateAppearance[] = paInputs
            .filter((pa) => pa.playerName.trim())
            .map((pa, i) => ({
                id: pa.id || `pa-${Date.now()}-${i}`,
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
                id: p.id || `pitch-${Date.now()}-${i}`,
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

        if (inputMode === "new") {
            if (pas.length > 0) addPlateAppearances(pas);
            if (pitching.length > 0) addPitchingStats(pitching);
        } else {
            replaceGameStats(gameId, pas, pitching);
        }

        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            // フォームリセット
            setOpponent("");
            setScoreFor(0);
            setScoreAgainst(0);
            setOfficialGameName("");
            setSelectedGameId("");
            setImageBase64("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            setStartingLineup(Array(9).fill(""));
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
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">対戦相手</Label>
                            <Input
                                placeholder="チーム名"
                                value={opponent}
                                onChange={(e) => setOpponent(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">結果</Label>
                            <select
                                value={result}
                                onChange={(e) => setResult(e.target.value as GameResult)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
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
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">相手得点</Label>
                            <Input
                                type="number"
                                min={0}
                                value={scoreAgainst}
                                onChange={(e) => setScoreAgainst(Number(e.target.value))}
                                className="h-9 text-sm"
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
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${gameType === type
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                            >
                                    {type === "official" ? "公式戦" : "練習試合"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {gameType === "official" && (
                        <div className="space-y-1.5 animate-fade-in-up transition-all duration-300">
                            <Label className="text-xs">大会名（フリー記述）</Label>
                            <Input
                                placeholder="例：秋季大会 1回戦"
                                value={officialGameName}
                                onChange={(e) => setOfficialGameName(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                    )}

                    <Separator />

                    <div className="space-y-1.5">
                        <Label className="text-xs">スコアボード（画像）</Label>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 border-dashed"
                            >
                                <ImageIcon className="h-4 w-4 mr-2" />
                                {imageBase64 ? "画像を変更" : "画像を選択"}
                            </Button>
                            <Input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                            />
                            {imageBase64 && (
                                <div className="h-10 w-10 relative rounded-md overflow-hidden border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imageBase64} alt="アップロードプレビュー" className="absolute inset-0 w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">※自動で圧縮して保存されます</p>
                    </div>
                </CardContent>
            </Card>

            {/* スタメン（打順）登録 */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                        <span>スターティングメンバー（打順）</span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStartingLineup((prev) => [...prev, ""])}
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                打順追加
                            </Button>
                            {startingLineup.length > 9 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setStartingLineup((prev) => prev.slice(0, prev.length - 1))}
                                    className="text-red-500 hover:text-red-600"
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    削除
                                </Button>
                            )}
                        </div>
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground mt-2">
                        <p>
                            ここで打順を登録しておくと、打席入力時に自動で次の打者がセットされます。
                        </p>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedPatternId}
                                onChange={(e) => handleLoadPattern(e.target.value)}
                                className="h-7 rounded border border-input bg-background px-2 text-xs"
                            >
                                <option value="">パターンを選択...</option>
                                {(data.lineupPatterns || []).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {selectedPatternId && (
                                <button onClick={handleDeletePattern} className="text-red-500 hover:text-red-700 underline text-xs">
                                    削除
                                </button>
                            )}
                            <Button variant="secondary" size="sm" onClick={handleSavePattern} className="h-7 text-xs px-2">
                                <Save className="h-3 w-3 mr-1" />
                                現在の打順を保存
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {startingLineup.map((player, index) => (
                            <div key={index} className="space-y-1.5 flex items-center gap-2">
                                <Label className="text-xs font-medium w-8 text-center shrink-0">
                                    {index + 1}番
                                </Label>
                                <select
                                    value={player}
                                    onChange={(e) => {
                                        const newLineup = [...startingLineup];
                                        newLineup[index] = e.target.value;
                                        setStartingLineup(newLineup);

                                        // 最初の打席の選手名が空なら、1番バッターをセットする
                                        if (index === 0 && paInputs.length === 1 && !paInputs[0].playerName) {
                                            updatePA(0, "playerName", e.target.value);
                                        }
                                    }}
                                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                                >
                                    <option value="">選択...</option>
                                    {playerNames.map((name) => (
                                        <option key={name} value={name}>
                                            {getDisplayName(name, playerNames)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
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
                                                {getDisplayName(name, playerNames)}
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
                    <div className="pt-2 flex justify-center">
                        <Button variant="outline" size="sm" onClick={addPARow} className="w-full max-w-xs border-dashed text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-400">
                            <Plus className="h-4 w-4 mr-1" />
                            次の打席を追加
                        </Button>
                    </div>
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
                                                    {getDisplayName(name, playerNames)}
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
                                                handleInningsChange(index, Number(e.target.value))
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
