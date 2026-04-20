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
    LineupPattern,
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
    /** 指定した試合のすべての打席・投手成績を上書き（既存成績の編集用） */
    replaceGameStats: (gameId: string, pas: PlateAppearance[], pitchingStats: PitchingStats[]) => void;
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
    /** 試合データに紐づかない孤立した打席・投手データを一括削除する */
    cleanOrphanData: () => void;
    /** スタメンパターンを保存 */
    saveLineupPattern: (pattern: LineupPattern) => void;
    /** スタメンパターンを削除 */
    deleteLineupPattern: (id: string) => void;
    /** 試合を削除 */
    removeGame: (gameId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/** データプロバイダ */
export function DataProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{ data: AppData; isLoaded: boolean }>({
        data: dummyData,
        isLoaded: false,
    });

    const { data, isLoaded } = state;

    // 初回マウント時にlocalStorageからデータを読み込む
    useEffect(() => {
        try {
            const savedData = localStorage.getItem("yakyuscore-data");
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log("Loaded data from localStorage", parsed);
                // localStorageのデータが不完全な場合（過去の仕様変更などで配列が欠損している場合）に備え、
                // 不足しているプロパティはdummyDataで補完する
                setState({
                    data: {
                        players: Array.isArray(parsed.players) ? parsed.players : dummyData.players,
                        games: Array.isArray(parsed.games) ? parsed.games : dummyData.games,
                        plateAppearances: Array.isArray(parsed.plateAppearances) ? parsed.plateAppearances : dummyData.plateAppearances,
                        pitchingStats: Array.isArray(parsed.pitchingStats) ? parsed.pitchingStats : dummyData.pitchingStats,
                        lineupPatterns: Array.isArray(parsed.lineupPatterns) ? parsed.lineupPatterns : [],
                    },
                    isLoaded: true,
                });
            } else {
                console.log("No data in localStorage, using dummyData");
                setState((prev) => ({ ...prev, isLoaded: true }));
            }
        } catch (e) {
            console.error("Failed to parse local storage data", e);
            setState((prev) => ({ ...prev, isLoaded: true }));
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
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                games: [...prev.data.games, game],
            },
        }));
    }, []);

    /** 試合情報を更新 */
    const updateGame = useCallback((gameId: string, updates: Partial<GameMetadata>) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                games: prev.data.games.map((g) =>
                    g.id === gameId ? { ...g, ...updates } : g
                ),
            },
        }));
    }, []);

    /** 打席データを追加 */
    const addPlateAppearances = useCallback((pas: PlateAppearance[]) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                plateAppearances: [...prev.data.plateAppearances, ...pas],
            },
        }));
    }, []);

    /** 投手成績を追加 */
    const addPitchingStats = useCallback((stats: PitchingStats[]) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                pitchingStats: [...prev.data.pitchingStats, ...stats],
            },
        }));
    }, []);

    /** CSVインポート等で一括データ追加 */
    const importData = useCallback((newData: Partial<AppData>) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                players: [...prev.data.players, ...(newData.players || [])],
                games: [...prev.data.games, ...(newData.games || [])],
                plateAppearances: [
                    ...prev.data.plateAppearances,
                    ...(newData.plateAppearances || []),
                ],
                pitchingStats: [
                    ...prev.data.pitchingStats,
                    ...(newData.pitchingStats || []),
                ],
            },
        }));
    }, []);

    /** CSVインポート等で既存データを上書き */
    const overwriteImportData = useCallback((newData: Partial<AppData>) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                players: newData.players !== undefined ? newData.players : prev.data.players,
                games: newData.games !== undefined ? newData.games : prev.data.games,
                plateAppearances:
                    newData.plateAppearances !== undefined
                        ? newData.plateAppearances
                        : prev.data.plateAppearances,
                pitchingStats:
                    newData.pitchingStats !== undefined
                        ? newData.pitchingStats
                        : prev.data.pitchingStats,
            },
        }));
    }, []);

    /** 指定した試合のすべての打席・投手成績を上書き（既存成績の編集用） */
    const replaceGameStats = useCallback((gameId: string, pas: PlateAppearance[], pitching: PitchingStats[]) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                plateAppearances: [
                    ...prev.data.plateAppearances.filter((pa) => pa.gameId !== gameId),
                    ...pas,
                ],
                pitchingStats: [
                    ...prev.data.pitchingStats.filter((p) => p.gameId !== gameId),
                    ...pitching,
                ],
            },
        }));
    }, []);

    /** 選手を追加（重複名チェック付き） */
    const addPlayers = useCallback((newPlayers: Player[]) => {
        setState((prev) => {
            const existingNames = new Set(prev.data.players.map((p) => p.name));
            const unique = newPlayers.filter((p) => !existingNames.has(p.name));
            return {
                ...prev,
                data: {
                    ...prev.data,
                    players: [...prev.data.players, ...unique],
                },
            };
        });
    }, []);

    /** 選手を更新 */
    const updatePlayer = useCallback((player: Player) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                players: prev.data.players.map((p) =>
                    p.id === player.id ? player : p
                ),
            },
        }));
    }, []);

    /** 選手を削除 */
    const removePlayer = useCallback((playerId: string) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                players: prev.data.players.filter((p) => p.id !== playerId),
            },
        }));
    }, []);

    /** 選手一覧を丸ごと置換（CSVインポート） */
    const setPlayers = useCallback((players: Player[]) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                players,
            },
        }));
    }, []);

    /** データリセット（ダミーデータへ戻す） */
    const resetData = useCallback(() => {
        setState({ data: dummyData, isLoaded: true });
    }, []);

    /** データをすべて空にする（新規スタート用） */
    const clearAllData = useCallback(() => {
        setState({
            data: {
                players: [],
                games: [],
                plateAppearances: [],
                pitchingStats: [],
                lineupPatterns: [],
            },
            isLoaded: true,
        });
    }, []);

    /** 試合データに紐づかない孤立したデータを一括削除する */
    const cleanOrphanData = useCallback(() => {
        setState((prev) => {
            const validGameIds = new Set(prev.data.games.map((g) => g.id));
            const validPas = prev.data.plateAppearances.filter((pa) => validGameIds.has(pa.gameId));
            const validPitching = prev.data.pitchingStats.filter((ps) => validGameIds.has(ps.gameId));
            
            return {
                ...prev,
                data: {
                    ...prev.data,
                    plateAppearances: validPas,
                    pitchingStats: validPitching,
                },
            };
        });
    }, []);

    /** スタメンパターンを保存 */
    const saveLineupPattern = useCallback((pattern: LineupPattern) => {
        setState((prev) => {
            const patterns = prev.data.lineupPatterns || [];
            const existingIndex = patterns.findIndex(p => p.id === pattern.id);
            if (existingIndex !== -1) {
                // 上書き
                const newPatterns = [...patterns];
                newPatterns[existingIndex] = pattern;
                return { 
                    ...prev, 
                    data: { ...prev.data, lineupPatterns: newPatterns } 
                };
            } else {
                // 新規追加
                return { 
                    ...prev, 
                    data: { ...prev.data, lineupPatterns: [...patterns, pattern] } 
                };
            }
        });
    }, []);

    /** スタメンパターンを削除 */
    const deleteLineupPattern = useCallback((id: string) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                lineupPatterns: (prev.data.lineupPatterns || []).filter((p) => p.id !== id),
            },
        }));
    }, []);

    /** 試合を削除 */
    const removeGame = useCallback((gameId: string) => {
        setState((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                games: prev.data.games.filter((g) => g.id !== gameId),
                plateAppearances: prev.data.plateAppearances.filter((pa) => pa.gameId !== gameId),
                pitchingStats: prev.data.pitchingStats.filter((ps) => ps.gameId !== gameId),
            },
        }));
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
                replaceGameStats,
                addPlayers,
                updatePlayer,
                removePlayer,
                setPlayers,
                resetData,
                clearAllData,
                cleanOrphanData,
                saveLineupPattern,
                deleteLineupPattern,
                removeGame,
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
