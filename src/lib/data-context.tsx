"use client";

/**
 * Baseball Ops Dashboard - データコンテキスト
 * アプリ全体でデータを共有するためのContext API実装
 */
import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
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
    resetData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/** データプロバイダ */
export function DataProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<AppData>(dummyData);

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

    /** データリセット */
    const resetData = useCallback(() => {
        setData(dummyData);
    }, []);

    return (
        <DataContext.Provider
            value={{
                data,
                playerNames,
                addGame,
                addPlateAppearances,
                addPitchingStats,
                importData,
                overwriteImportData,
                addPlayers,
                updatePlayer,
                removePlayer,
                setPlayers,
                resetData,
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
