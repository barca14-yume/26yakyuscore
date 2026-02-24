"use client";

/**
 * 選手CSVマネージャーコンポーネント
 * CSVでの一括インポートとエクスポート、選手一覧管理を提供
 */
import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/lib/data-context";
import { Player } from "@/lib/types";
import {
    Upload,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    X,
    UserPlus,
    Trash2,
    Users,
    Pencil,
} from "lucide-react";

/** CSVの行データ型 */
interface PlayerCsvRow {
    name: string;
    number: string;
    grade: string;
    position: string;
    throwHand: string;
    batHand: string;
}

export default function PlayerCsvManager() {
    const { data, addPlayers, setPlayers, removePlayer, updatePlayer } = useData();
    const [preview, setPreview] = useState<PlayerCsvRow[] | null>(null);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [imported, setImported] = useState(false);
    const [importMode, setImportMode] = useState<"add" | "replace">("add");

    // 手動追加フォーム
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newNumber, setNewNumber] = useState(0);
    const [newGrade, setNewGrade] = useState("");
    const [newPosition, setNewPosition] = useState("");
    const [newThrow, setNewThrow] = useState("右");
    const [newBat, setNewBat] = useState("右");

    // 編集中の選手
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Player | null>(null);

    /** CSVファイルをパース */
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

                    const rows = results.data as Record<string, string>[];

                    // 最低限 name カラムが必要
                    if (rows.length > 0 && !("name" in rows[0])) {
                        setError(
                            "CSVに 'name' カラムが見つかりません。ヘッダーを確認してください。"
                        );
                        return;
                    }

                    const parsed: PlayerCsvRow[] = rows.map((row) => ({
                        name: row.name || "",
                        number: row.number || "0",
                        grade: row.grade || "",
                        position: row.position || "",
                        throwHand: row.throwHand || "右",
                        batHand: row.batHand || "右",
                    }));

                    setPreview(parsed.filter((p) => p.name.trim()));
                },
                error: (err) => {
                    setError(`ファイル読み込みエラー: ${err.message}`);
                },
            });
        },
        []
    );

    /** プレビューデータをインポート */
    const handleImport = useCallback(() => {
        if (!preview) return;

        try {
            const players: Player[] = preview.map((row, i) => ({
                id: `csv-player-${Date.now()}-${i}`,
                name: row.name.trim(),
                number: Number(row.number) || 0,
                grade: row.grade,
                position: row.position,
                throwHand: row.throwHand,
                batHand: row.batHand,
            }));

            if (importMode === "replace") {
                setPlayers(players);
            } else {
                addPlayers(players);
            }

            setImported(true);
            setTimeout(() => {
                setPreview(null);
                setFileName("");
                setImported(false);
            }, 2000);
        } catch {
            setError("インポートに失敗しました");
        }
    }, [preview, importMode, addPlayers, setPlayers]);

    /** 選手データをCSVでエクスポート */
    const handleExport = useCallback(() => {
        const csvData = data.players.map((p) => ({
            name: p.name,
            number: p.number,
            grade: p.grade,
            position: p.position,
            throwHand: p.throwHand,
            batHand: p.batHand,
        }));

        const csv = Papa.unparse(csvData, {
            header: true,
        });

        // BOM付きUTF-8でダウンロード（Excel対応）
        const bom = "\uFEFF";
        const blob = new Blob([bom + csv], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `players_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [data.players]);

    /** サンプルCSVダウンロード */
    const downloadSample = useCallback(() => {
        const sampleCsv =
            "name,number,grade,position,throwHand,batHand\n田中 翔太,1,6年,投手,右,右\n佐藤 大翔,2,6年,捕手,右,右\n鈴木 陽向,3,5年,一塁手,左,左";

        const bom = "\uFEFF";
        const blob = new Blob([bom + sampleCsv], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sample_players.csv";
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    /** プレビュークリア */
    const clearPreview = () => {
        setPreview(null);
        setFileName("");
        setError("");
        setImported(false);
    };

    /** 手動で選手追加 */
    const handleAddPlayer = () => {
        if (!newName.trim()) return;

        const player: Player = {
            id: `player-${Date.now()}`,
            name: newName.trim(),
            number: newNumber,
            grade: newGrade,
            position: newPosition,
            throwHand: newThrow,
            batHand: newBat,
        };

        addPlayers([player]);
        setNewName("");
        setNewNumber(0);
        setNewGrade("");
        setNewPosition("");
        setShowAddForm(false);
    };

    /** 編集開始 */
    const startEdit = (player: Player) => {
        setEditingId(player.id);
        setEditForm({ ...player });
    };

    /** 編集保存 */
    const saveEdit = () => {
        if (editForm) {
            updatePlayer(editForm);
            setEditingId(null);
            setEditForm(null);
        }
    };

    /** 編集キャンセル */
    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(null);
    };

    return (
        <div className="space-y-4">
            {/* 現在の選手一覧 */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            選手一覧
                            <Badge variant="secondary" className="text-[10px]">
                                {data.players.length}人
                            </Badge>
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddForm(!showAddForm)}
                            >
                                <UserPlus className="h-3.5 w-3.5 mr-1" />
                                追加
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={data.players.length === 0}
                            >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                CSV書出
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    {/* 手動追加フォーム */}
                    {showAddForm && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-3 mb-3">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                新規選手
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        選手名 *
                                    </Label>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="山田 太郎"
                                        className="h-8 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        背番号
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={newNumber}
                                        onChange={(e) =>
                                            setNewNumber(Number(e.target.value))
                                        }
                                        className="h-8 text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        学年
                                    </Label>
                                    <select
                                        value={newGrade}
                                        onChange={(e) => setNewGrade(e.target.value)}
                                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                        <option value="">選択...</option>
                                        {["1年", "2年", "3年", "4年", "5年", "6年"].map(
                                            (g) => (
                                                <option key={g} value={g}>
                                                    {g}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        ポジション
                                    </Label>
                                    <select
                                        value={newPosition}
                                        onChange={(e) => setNewPosition(e.target.value)}
                                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                                    >
                                        <option value="">選択...</option>
                                        {[
                                            "投手",
                                            "捕手",
                                            "一塁手",
                                            "二塁手",
                                            "三塁手",
                                            "遊撃手",
                                            "左翼手",
                                            "中堅手",
                                            "右翼手",
                                        ].map((pos) => (
                                            <option key={pos} value={pos}>
                                                {pos}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        投
                                    </Label>
                                    <div className="flex gap-1.5">
                                        {["右", "左"].map((h) => (
                                            <button
                                                key={h}
                                                onClick={() => setNewThrow(h)}
                                                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${newThrow === h
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 ring-1 ring-emerald-300"
                                                        : "bg-muted text-muted-foreground"
                                                    }`}
                                            >
                                                {h}投
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">
                                        打
                                    </Label>
                                    <div className="flex gap-1.5">
                                        {["右", "左", "両"].map((h) => (
                                            <button
                                                key={h}
                                                onClick={() => setNewBat(h)}
                                                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${newBat === h
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 ring-1 ring-emerald-300"
                                                        : "bg-muted text-muted-foreground"
                                                    }`}
                                            >
                                                {h}打
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button
                                    size="sm"
                                    onClick={handleAddPlayer}
                                    disabled={!newName.trim()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    追加する
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAddForm(false)}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 選手テーブル */}
                    {data.players.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            #
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            選手名
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">
                                            学年
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">
                                            ポジション
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">
                                            投/打
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                            操作
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.players.map((player) => (
                                        <tr
                                            key={player.id}
                                            className="border-t border-border hover:bg-muted/30 transition-colors"
                                        >
                                            {editingId === player.id && editForm ? (
                                                /* 編集モード */
                                                <>
                                                    <td className="px-3 py-1.5">
                                                        <Input
                                                            type="number"
                                                            value={editForm.number}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    number: Number(
                                                                        e.target.value
                                                                    ),
                                                                })
                                                            }
                                                            className="h-7 w-14 text-xs"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <Input
                                                            value={editForm.name}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    name: e.target.value,
                                                                })
                                                            }
                                                            className="h-7 text-xs"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 hidden sm:table-cell">
                                                        <select
                                                            value={editForm.grade}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    grade: e.target.value,
                                                                })
                                                            }
                                                            className="h-7 rounded border border-input bg-background px-1 text-xs"
                                                        >
                                                            {[
                                                                "1年",
                                                                "2年",
                                                                "3年",
                                                                "4年",
                                                                "5年",
                                                                "6年",
                                                            ].map((g) => (
                                                                <option key={g} value={g}>
                                                                    {g}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-1.5 hidden sm:table-cell">
                                                        <select
                                                            value={editForm.position}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    position: e.target.value,
                                                                })
                                                            }
                                                            className="h-7 rounded border border-input bg-background px-1 text-xs"
                                                        >
                                                            {[
                                                                "投手",
                                                                "捕手",
                                                                "一塁手",
                                                                "二塁手",
                                                                "三塁手",
                                                                "遊撃手",
                                                                "左翼手",
                                                                "中堅手",
                                                                "右翼手",
                                                            ].map((pos) => (
                                                                <option key={pos} value={pos}>
                                                                    {pos}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-1.5 hidden md:table-cell">
                                                        <div className="flex gap-1">
                                                            <select
                                                                value={editForm.throwHand}
                                                                onChange={(e) =>
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        throwHand:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                className="h-7 rounded border border-input bg-background px-1 text-xs"
                                                            >
                                                                <option value="右">右投</option>
                                                                <option value="左">左投</option>
                                                            </select>
                                                            <select
                                                                value={editForm.batHand}
                                                                onChange={(e) =>
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        batHand:
                                                                            e.target.value,
                                                                    })
                                                                }
                                                                className="h-7 rounded border border-input bg-background px-1 text-xs"
                                                            >
                                                                <option value="右">右打</option>
                                                                <option value="左">左打</option>
                                                                <option value="両">両打</option>
                                                            </select>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right">
                                                        <div className="flex gap-1 justify-end">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2 text-[10px]"
                                                                onClick={saveEdit}
                                                            >
                                                                保存
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-[10px]"
                                                                onClick={cancelEdit}
                                                            >
                                                                取消
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                /* 表示モード */
                                                <>
                                                    <td className="px-3 py-2 tabular-nums font-medium">
                                                        {player.number}
                                                    </td>
                                                    <td className="px-3 py-2 font-medium">
                                                        {player.name}
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                                                        {player.grade}
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                                                        {player.position}
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                                                        {player.throwHand}投{player.batHand}打
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <div className="flex gap-1 justify-end">
                                                            <button
                                                                onClick={() =>
                                                                    startEdit(player)
                                                                }
                                                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                                                title="編集"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    removePlayer(player.id)
                                                                }
                                                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                                title="削除"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            選手が登録されていません
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CSVインポート */}
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        CSVインポート
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground">
                        CSV列: <code className="bg-muted px-1 rounded">name, number, grade, position, throwHand, batHand</code>
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* インポートモード選択 */}
                    <div className="space-y-1.5">
                        <Label className="text-xs">インポートモード</Label>
                        <div className="flex gap-2">
                            {(["add", "replace"] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setImportMode(mode)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${importMode === mode
                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                >
                                    {mode === "add" ? "追加（既存に追加）" : "置換（既存を上書き）"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ファイルアップロード */}
                    <label className="block cursor-pointer">
                        <div className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-emerald-400 transition-colors duration-200">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm font-medium">
                                選手CSVを選択
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                UTF-8 CSV
                            </p>
                        </div>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </label>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadSample}
                        className="w-full"
                    >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        サンプルCSVをダウンロード
                    </Button>
                </CardContent>
            </Card>

            {/* エラー */}
            {error && (
                <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                    <CardContent className="flex items-center gap-3 py-3">
                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
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
                                    {preview.length}人
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
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            選手名
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            #
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            学年
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            ポジション
                                        </th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                            投/打
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((row, i) => (
                                        <tr
                                            key={i}
                                            className="border-t border-border hover:bg-muted/30"
                                        >
                                            <td className="px-3 py-2 font-medium">
                                                {row.name}
                                            </td>
                                            <td className="px-3 py-2">
                                                {row.number}
                                            </td>
                                            <td className="px-3 py-2">
                                                {row.grade}
                                            </td>
                                            <td className="px-3 py-2">
                                                {row.position}
                                            </td>
                                            <td className="px-3 py-2">
                                                {row.throwHand}投{row.batHand}打
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {importMode === "replace" && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                置換モード: 既存の選手データはすべて上書きされます
                            </p>
                        )}

                        <Button
                            onClick={handleImport}
                            className="w-full mt-4 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {preview.length}人を
                            {importMode === "replace" ? "置換" : "追加"}インポート
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* 成功 */}
            {imported && (
                <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
                        <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                            選手データをインポートしました！
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
