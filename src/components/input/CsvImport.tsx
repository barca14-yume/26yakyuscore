"use client";

/**
 * CSVインポートコンポーネント
 * PapaParseを使ったCSVファイルの読み込みとプレビュー機能
 */
import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Download,
    X,
} from "lucide-react";

/** CSVの種別 */
type CsvType = "games" | "batting" | "pitching";

/** CSVタイプ設定 */
const CSV_TYPES: { value: CsvType; label: string; description: string }[] = [
    {
        value: "games",
        label: "試合データ",
        description: "id, date, opponent, result, scoreFor, scoreAgainst, gameType",
    },
    {
        value: "batting",
        label: "打席データ",
        description:
            "gameId, playerName, inning, result, battedBallType, battedBallDirection, rbi, runs, stolenBases",
    },
    {
        value: "pitching",
        label: "投手成績",
        description:
            "gameId, playerName, ip, runsAllowed, earnedRuns, hits, walks, strikeouts, totalPitches, strikes, balls",
    },
];

export default function CsvImport() {
    const { data, importData, overwriteImportData } = useData();
    const [csvType, setCsvType] = useState<CsvType>("games");
    const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [imported, setImported] = useState(false);
    const [importMode, setImportMode] = useState<"add" | "overwrite">("add");
    /** ファイル選択時のパース処理 */
    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            setError("");
            setFileName(file.name);
            setImported(false);

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => {
                    // Excel等のBOMや余分な空白を除去する
                    return header.replace(/^\uFEFF/, "").trim();
                },
                complete: (results) => {
                    if (results.errors.length > 0) {
                        setError(
                            `解析エラー: ${results.errors.map((e) => e.message).join(", ")}`
                        );
                        return;
                    }
                    setPreview(results.data as Record<string, string>[]);
                },
                error: (err) => {
                    setError(`ファイル読み込みエラー: ${err.message}`);
                },
            });
        },
        []
    );

    /** データをインポート */
    const handleImport = useCallback(() => {
        if (!preview) return;

        const executeImport = importMode === "add" ? importData : overwriteImportData;

        try {
            // ヘッダーの存在チェック（種類を間違えてインポートしていないか確認）
            if (preview.length > 0) {
                const sampleRow = preview[0];
                const keysStr = Object.keys(sampleRow).join(" ").toLowerCase();

                if (csvType === "games" && (keysStr.includes("inning") || keysStr.includes("rbi") || keysStr.includes("打点") || keysStr.includes("pitch"))) {
                    alert("【エラー】打撃や投手のエクセルを「試合データ」として読み込もうとしています。上のタブで正しい種類を選択してください！");
                    return;
                }
                if (csvType === "batting" && (keysStr.includes("pitch") || keysStr.includes("strike") || keysStr.includes("球数"))) {
                    alert("【エラー】投手のエクセルを「打席データ」として読み込もうとしています。上のタブで正しい種類を選択してください！");
                    return;
                }
                if (csvType === "pitching" && (keysStr.includes("rbi") || keysStr.includes("batted") || keysStr.includes("打点"))) {
                    alert("【エラー】打撃のエクセルを「投手成績」として読み込もうとしています。上のタブで正しい種類を選択してください！");
                    return;
                }
            }

            // より厳密なデータ取得関数
            const createGetVal = (row: Record<string, string>) => (keywords: string[]) => {
                const keys = Object.keys(row);
                // 1. 完全一致（大文字小文字無視）を探す
                for (const key of keys) {
                    if (keywords.some(kw => key.toLowerCase() === kw.toLowerCase())) return row[key];
                }
                // 2. 前方一致を探す
                for (const key of keys) {
                    if (keywords.some(kw => key.toLowerCase().startsWith(kw.toLowerCase()))) return row[key];
                }
                // 3. 部分一致を探す
                for (const key of keys) {
                    if (keywords.some(kw => key.toLowerCase().includes(kw.toLowerCase()))) return row[key];
                }
                return undefined;
            };

            switch (csvType) {
                case "games": {
                    const games: GameMetadata[] = preview.map((row, i) => {
                        const getVal = createGetVal(row);
                        return {
                            id: getVal(["id", "アイディ"]) || `csv-game-${Date.now()}-${i}`,
                            date: getVal(["date", "日付", "日時"]) || "",
                            opponent: getVal(["opponent", "相手", "対戦"]) || "",
                            result: (getVal(["result", "結果", "勝敗"]) as GameResult) || "win",
                            scoreFor: Number(getVal(["scorefor", "得点", "自チーム得点", "自チーム"])) || 0,
                            scoreAgainst: Number(getVal(["scoreagainst", "失点", "相手チーム得点", "相手チーム"])) || 0,
                            gameType: (getVal(["type", "game", "種類", "種別", "gametype"]) as GameType) || "official",
                        };
                    });
                    executeImport({ games });
                    break;
                }

                case "batting": {
                    const pas: PlateAppearance[] = preview.map((row, i) => {
                        const getVal = createGetVal(row);

                        // battedBallType と battedBallDirection が同名カラムになってしまった場合の対策
                        let bType = getVal(["battedballtype", "battedball", "type", "球種"]) || undefined;
                        let bDir = getVal(["battedballdirection", "direction", "方向"]) || undefined;

                        // もし見つからなかった場合、すべての値を走査して推測する
                        if (!bType || !bDir) {
                            for (const key of Object.keys(row)) {
                                const val = String(row[key] || "").toLowerCase();
                                if (["grounder", "fly", "liner", "ゴロ", "フライ", "ライナー"].includes(val)) {
                                    bType = val;
                                } else if (!isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 9 && key.toLowerCase().includes("bat")) {
                                    bDir = val;
                                }
                            }
                        }

                        return {
                            id: getVal(["id", "アイディ"]) || `csv-pa-${Date.now()}-${i}`,
                            gameId: getVal(["gameid", "game", "試合"]) || "",
                            playerName: getVal(["playername", "player", "name", "選手", "名前", "nam"]) || "",
                            inning: Number(getVal(["inning", "回", "イニング"])) || 1,
                            result: (getVal(["result", "結果", "res"]) as AtBatResult) || "single",
                            battedBallType: (bType as BattedBallType) || undefined,
                            battedBallDirection: (bDir as BattedBallDirection) || undefined,
                            rbi: Number(getVal(["rbi", "打点"])) || 0,
                            runs: Number(getVal(["run", "得点"])) || 0,
                            stolenBases: Number(getVal(["stolenbases", "stolen", "stolenbase", "盗塁"])) || 0,
                        };
                    });
                    executeImport({ plateAppearances: pas });
                    break;
                }

                case "pitching": {
                    const stats: PitchingStats[] = preview.map((row, i) => {
                        const getVal = createGetVal(row);

                        return {
                            id: getVal(["id", "アイディ"]) || `csv-pitch-${Date.now()}-${i}`,
                            gameId: getVal(["gameid", "game", "試合"]) || "",
                            playerName: getVal(["playername", "player", "name", "選手", "名前", "nam"]) || "",
                            inningsPitched: Number(getVal(["ip", "inning", "回"])) || 0,
                            runsAllowed: Number(getVal(["runsallowed", "run", "失点"])) || 0,
                            earnedRuns: Number(getVal(["earnedruns", "earned", "er", "自責"])) || 0,
                            hitsAllowed: Number(getVal(["hitsallowed", "hit", "安打", "被安打"])) || 0,
                            walksAllowed: Number(getVal(["walksallowed", "walk", "bb", "四球", "四死球"])) || 0,
                            strikeouts: Number(getVal(["strikeout", "so", "k", "三振", "奪三振"])) || 0,
                            totalPitches: Number(getVal(["totalpitches", "pitch", "球数"])) || 0,
                            strikes: Number(getVal(["strikes", "strike", "ストライク"]) && !getVal(["strikeout", "so", "k", "三振", "奪三振"]) ? getVal(["strikes", "strike", "ストライク"]) : 0) || 0,
                            balls: Number(getVal(["balls", "ball", "ボール"])) || 0,
                        };
                    });
                    executeImport({ pitchingStats: stats });
                    break;
                }
            }

            setImported(true);
            setTimeout(() => {
                setPreview(null);
                setFileName("");
                setImported(false);
            }, 2500);
        } catch {
            setError("データのインポートに失敗しました");
        }
    }, [csvType, preview, importMode, importData, overwriteImportData]);

    /** データをエクスポート */
    const handleExport = useCallback(() => {
        let csvContent = "";
        let fileName = "";

        switch (csvType) {
            case "games":
                csvContent = Papa.unparse(data.games);
                fileName = "games_export.csv";
                break;
            case "batting":
                csvContent = Papa.unparse(data.plateAppearances);
                fileName = "batting_export.csv";
                break;
            case "pitching":
                // カラム名をインポート形式に合わせる
                const pStats = data.pitchingStats.map(s => ({
                    gameId: s.gameId,
                    playerName: s.playerName,
                    ip: s.inningsPitched,
                    runsAllowed: s.runsAllowed,
                    earnedRuns: s.earnedRuns,
                    hits: s.hitsAllowed,
                    walks: s.walksAllowed,
                    strikeouts: s.strikeouts,
                    totalPitches: s.totalPitches,
                    strikes: s.strikes,
                    balls: s.balls
                }));
                csvContent = Papa.unparse(pStats);
                fileName = "pitching_export.csv";
                break;
        }

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }, [csvType, data]);

    /** プレビューをクリア */
    const clearPreview = () => {
        setPreview(null);
        setFileName("");
        setError("");
        setImported(false);
    };

    /** サンプルCSVのダウンロード */
    const downloadSample = () => {
        let csvContent = "";

        switch (csvType) {
            case "games":
                csvContent =
                    "id,date,opponent,result,scoreFor,scoreAgainst,gameType\ngame-001,2026-03-01,サンプルチーム,win,5,3,official";
                break;
            case "batting":
                csvContent =
                    "gameId,playerName,inning,result,battedBallType,battedBallDirection,rbi,runs,stolenBases\ngame-001,田中 翔太,1,single,liner,center,1,1,1";
                break;
            case "pitching":
                csvContent =
                    "gameId,playerName,ip,runsAllowed,earnedRuns,hits,walks,strikeouts,totalPitches,strikes,balls\ngame-001,田中 翔太,7,3,2,5,2,6,85,55,30";
                break;
        }

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sample_${csvType}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* CSVタイプ選択 */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">データ種別を選択</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {CSV_TYPES.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => {
                                setCsvType(type.value);
                                clearPreview();
                            }}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 ${csvType === type.value
                                ? "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300 dark:ring-emerald-700"
                                : "bg-muted/30 hover:bg-muted/60"
                                }`}
                        >
                            <FileSpreadsheet
                                className={`h-5 w-5 mt-0.5 ${csvType === type.value
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                                    }`}
                            />
                            <div>
                                <p
                                    className={`text-sm font-medium ${csvType === type.value
                                        ? "text-emerald-700 dark:text-emerald-400"
                                        : ""
                                        }`}
                                >
                                    {type.label}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                                    {type.description}
                                </p>
                            </div>
                        </button>
                    ))}
                </CardContent>
            </Card>

            {/* 現在のデータのエクスポート */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <button
                        onClick={handleExport}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-muted/50 hover:bg-muted font-medium text-sm transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        選択中のデータをCSVでエクスポート
                    </button>
                </CardContent>
            </Card>

            {/* ファイルアップロード */}
            <Card className="border-border/50 shadow-sm">
                <CardContent className="py-6">
                    <div className="flex flex-col items-center gap-4">
                        <label className="w-full cursor-pointer">
                            <div className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-dashed border-border hover:border-emerald-400 transition-colors duration-200">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <div className="text-center">
                                    <p className="text-sm font-medium">
                                        CSVファイルをクリックして選択
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        UTF-8エンコードのCSVファイルを使用してください
                                    </p>
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>

                        <Button variant="outline" size="sm" onClick={downloadSample}>
                            <Download className="h-3.5 w-3.5 mr-1" />
                            サンプルCSVをダウンロード
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* エラー表示 */}
            {error && (
                <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="flex items-center gap-3 py-3">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* プレビュー */}
            {preview && !imported && (
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                プレビュー
                                <Badge variant="secondary" className="text-[10px]">
                                    {preview.length}行
                                </Badge>
                            </CardTitle>
                            <button onClick={clearPreview}>
                                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">{fileName}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/50">
                                        {Object.keys(preview[0] || {}).map((key) => (
                                            <th
                                                key={key}
                                                className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                                            >
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.slice(0, 10).map((row, i) => (
                                        <tr
                                            key={i}
                                            className="border-t border-border hover:bg-muted/30"
                                        >
                                            {Object.values(row).map((val, j) => (
                                                <td
                                                    key={j}
                                                    className="px-3 py-2 whitespace-nowrap"
                                                >
                                                    {val}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {preview.length > 10 && (
                            <p className="text-[11px] text-muted-foreground mt-2 text-center">
                                {preview.length - 10}行が省略されています
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">インポート設定</Label>
                                <select
                                    value={importMode}
                                    onChange={(e) => setImportMode(e.target.value as "add" | "overwrite")}
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="add">既存データに追加</option>
                                    <option value="overwrite">既存データを削除して上書き</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={handleImport}
                                    className={`w-full h-10 shadow-lg shadow-emerald-500/20 ${importMode === "overwrite"
                                        ? "bg-amber-600 hover:bg-amber-700"
                                        : "bg-emerald-600 hover:bg-emerald-700"
                                        } text-white`}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {preview.length}件を実行
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* インポート成功 */}
            {imported && (
                <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
                        <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                            インポートが完了しました！
                        </p>
                    </CardContent>
                </Card>
            )}
        </div >
    );
}
