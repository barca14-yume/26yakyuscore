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
        description: "date, opponent, result, scoreFor, scoreAgainst, gameType",
    },
    {
        value: "batting",
        label: "打席データ",
        description:
            "gameId, playerName, inning, result, battedBallType, battedBallDirection, rbi",
    },
    {
        value: "pitching",
        label: "投手成績",
        description:
            "gameId, playerName, ip, runsAllowed, earnedRuns, hits, walks, strikeouts, totalPitches, strikes, balls",
    },
];

export default function CsvImport() {
    const { importData } = useData();
    const [csvType, setCsvType] = useState<CsvType>("games");
    const [preview, setPreview] = useState<Record<string, string>[] | null>(null);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [imported, setImported] = useState(false);

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

        try {
            switch (csvType) {
                case "games": {
                    const games: GameMetadata[] = preview.map((row, i) => ({
                        id: `csv-game-${Date.now()}-${i}`,
                        date: row.date || "",
                        opponent: row.opponent || "",
                        result: (row.result as GameResult) || "win",
                        scoreFor: Number(row.scoreFor) || 0,
                        scoreAgainst: Number(row.scoreAgainst) || 0,
                        gameType: (row.gameType as GameType) || "official",
                    }));
                    importData({ games });
                    break;
                }

                case "batting": {
                    const pas: PlateAppearance[] = preview.map((row, i) => ({
                        id: `csv-pa-${Date.now()}-${i}`,
                        gameId: row.gameId || "",
                        playerName: row.playerName || "",
                        inning: Number(row.inning) || 1,
                        result: (row.result as AtBatResult) || "single",
                        battedBallType:
                            (row.battedBallType as BattedBallType) || undefined,
                        battedBallDirection:
                            (row.battedBallDirection as BattedBallDirection) || undefined,
                        rbi: Number(row.rbi) || 0,
                    }));
                    importData({ plateAppearances: pas });
                    break;
                }

                case "pitching": {
                    const stats: PitchingStats[] = preview.map((row, i) => ({
                        id: `csv-pitch-${Date.now()}-${i}`,
                        gameId: row.gameId || "",
                        playerName: row.playerName || "",
                        inningsPitched: Number(row.ip) || 0,
                        runsAllowed: Number(row.runsAllowed) || 0,
                        earnedRuns: Number(row.earnedRuns) || 0,
                        hitsAllowed: Number(row.hits) || 0,
                        walksAllowed: Number(row.walks) || 0,
                        strikeouts: Number(row.strikeouts) || 0,
                        totalPitches: Number(row.totalPitches) || 0,
                        strikes: Number(row.strikes) || 0,
                        balls: Number(row.balls) || 0,
                    }));
                    importData({ pitchingStats: stats });
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
    }, [csvType, preview, importData]);

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
                    "date,opponent,result,scoreFor,scoreAgainst,gameType\n2026-03-01,サンプルチーム,win,5,3,official";
                break;
            case "batting":
                csvContent =
                    "gameId,playerName,inning,result,battedBallType,battedBallDirection,rbi\ngame-001,田中 翔太,1,single,liner,center,1";
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

                        <Button
                            onClick={handleImport}
                            className="w-full mt-4 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {preview.length}件のデータをインポート
                        </Button>
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
        </div>
    );
}
