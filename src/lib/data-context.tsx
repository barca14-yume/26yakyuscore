"use client";

/**
 * Baseball Ops Dashboard - データコンテキスト
 * アプリ全体でデータを共有するためのContext API実装
 */
import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import {
    AppData,
    GameMetadata,
    PlateAppearance,
    PitchingStats,
    Player,
} from "./types";
import { dummyData } from "./dummy-data";

/** コンテキストの型 */
interface DataContextType {
    data: AppData;
    /** 選手名一覧（選手セレクト用） */
    playerNames: string[];
    addGame: (game: GameMetadata) => void;
    updateGame: (gameId: string, updates: Partial<GameMetadata>) => void;
    addPlateAppearances: (pas: PlateAppearance[]) => void;
    addPitchingStats: (stats: PitchingStats[]) => void;
    importData: (newData: Partial<AppData>) => void;
    overwriteImportData: (newData: Partial<AppData>) => void;
    /** 選手を追加 */
    addPlayers: (players: Player[]) => void;
    /** 選手を更新 */
    updatePlayer: (player: Player) => void;
    /** 選手を削除 */
    removePlayer: (playerId: string) => void;
    /** 選手一覧を丸ごと置換（CSVインポート用） */
    setPlayers: (players: Player[]) => void;
    /** データリセット（ダミーデータへ戻す） */
    resetData: () => void;
    /** データをすべて空にする（新規スタート用） */
    clearAllData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/** データプロバイダ */
export function DataProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<AppData>(dummyData);
    const [isLoaded, setIsLoaded] = useState(false);

    // 初回マウント時にlocalStorageからデータを読み込む
    useEffect(() => {
        try {
            const savedData = localStorage.getItem("yakyuscore-data");
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log("Loaded data from localStorage", parsed);
                // localStorageのデータが不完全な場合（過去の仕様変更などで配列が欠損している場合）に備え、
                // 不足しているプロパティはdummyDataで補完する
                setData({
                    players: Array.isArray(parsed.players) ? parsed.players : dummyData.players,
                    games: Array.isArray(parsed.games) ? parsed.games : dummyData.games,
                    plateAppearances: Array.isArray(parsed.plateAppearances) ? parsed.plateAppearances : dummyData.plateAppearances,
                    pitchingStats: Array.isArray(parsed.pitchingStats) ? parsed.pitchingStats : dummyData.pitchingStats,
                });
            } else {
                console.log("No data in localStorage, using dummyData");
            }
        } catch (e) {
            console.error("Failed to parse local storage data", e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // データが変更されたらlocalStorageに保存する（初回ロード後のみ）
    useEffect(() => {
        if (isLoaded) {
            console.log("Saving data to localStorage", data);
            localStorage.setItem("yakyuscore-data", JSON.stringify(data));
        }
    }, [data, isLoaded]);

    /** 選手名一覧をメモ化 */
    const playerNames = useMemo(
        () => data.players.map((p) => p.name),
        [data.players]
    );

    /** 試合を追加 */
    const addGame = useCallback((game: GameMetadata) => {
        setData((prev) => ({
            ...prev,
            games: [...prev.games, game],
        }));
    }, []);

    /** 試合情報を更新 */
    const updateGame = useCallback((gameId: string, updates: Partial<GameMetadata>) => {
        setData((prev) => ({
            ...prev,
            games: prev.games.map((g) =>
                g.id === gameId ? { ...g, ...updates } : g
            ),
        }));
    }, []);

    /** 打席データを追加 */
    const addPlateAppearances = useCallback((pas: PlateAppearance[]) => {
        setData((prev) => ({
            ...prev,
            plateAppearances: [...prev.plateAppearances, ...pas],
        }));
    }, []);

    /** 投手成績を追加 */
    const addPitchingStats = useCallback((stats: PitchingStats[]) => {
        setData((prev) => ({
            ...prev,
            pitchingStats: [...prev.pitchingStats, ...stats],
        }));
    }, []);

    /** CSVインポート等で一括データ追加 */
    const importData = useCallback((newData: Partial<AppData>) => {
        setData((prev) => ({
            players: [...prev.players, ...(newData.players || [])],
            games: [...prev.games, ...(newData.games || [])],
            plateAppearances: [
                ...prev.plateAppearances,
                ...(newData.plateAppearances || []),
            ],
            pitchingStats: [
                ...prev.pitchingStats,
                ...(newData.pitchingStats || []),
            ],
        }));
    }, []);

    /** CSVインポート等で既存データを上書き */
    const overwriteImportData = useCallback((newData: Partial<AppData>) => {
        setData((prev) => ({
            players: newData.players !== undefined ? newData.players : prev.players,
            games: newData.games !== undefined ? newData.games : prev.games,
            plateAppearances:
                newData.plateAppearances !== undefined
                    ? newData.plateAppearances
                    : prev.plateAppearances,
            pitchingStats:
                newData.pitchingStats !== undefined
                    ? newData.pitchingStats
                    : prev.pitchingStats,
        }));
    }, []);

    /** 選手を追加（重複名チェック付き） */
    const addPlayers = useCallback((newPlayers: Player[]) => {
        setData((prev) => {
            const existingNames = new Set(prev.players.map((p) => p.name));
            const unique = newPlayers.filter((p) => !existingNames.has(p.name));
            return {
                ...prev,
                players: [...prev.players, ...unique],
            };
        });
    }, []);

    /** 選手を更新 */
    const updatePlayer = useCallback((player: Player) => {
        setData((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
                p.id === player.id ? player : p
            ),
        }));
    }, []);

    /** 選手を削除 */
    const removePlayer = useCallback((playerId: string) => {
        setData((prev) => ({
            ...prev,
            players: prev.players.filter((p) => p.id !== playerId),
        }));
    }, []);

    /** 選手一覧を丸ごと置換（CSVインポート） */
    const setPlayers = useCallback((players: Player[]) => {
        setData((prev) => ({
            ...prev,
            players,
        }));
    }, []);

    /** データリセット（ダミーデータへ戻す） */
    const resetData = useCallback(() => {
        setData(dummyData);
    }, []);

    /** データをすべて空にする（新規スタート用） */
    const clearAllData = useCallback(() => {
        setData({
            players: [],
            games: [],
            plateAppearances: [],
            pitchingStats: [],
        });
    }, []);

    if (!isLoaded) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">データを読み込み中...</p>
                </div>
            </div>
        );
    }

    return (
        <DataContext.Provider
            value={{
                data,
                playerNames,
                addGame,
                updateGame,
                addPlateAppearances,
                addPitchingStats,
                importData,
                overwriteImportData,
                addPlayers,
                updatePlayer,
                removePlayer,
                setPlayers,
                resetData,
                clearAllData,
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

/** データコンテキストのカスタムフック */
export function useData(): DataContextType {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
}
