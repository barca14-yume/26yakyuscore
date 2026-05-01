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
    /** 選手マスタに存在しない選手名の打席・投手データを削除する */
    purgeOrphanPlateAppearances: () => { removedPA: number; removedPitching: number };
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
        data: {
            players: [],
            games: [],
            plateAppearances: [],
            pitchingStats: [],
            lineupPatterns: [],
        },
        isLoaded: false,
    });

    const { data, isLoaded } = state;

    /**
     * 初回ロード直後の保存をスキップするためのフラグ。
     * trueのとき、保存Effectは何もせずfalseに変える。
     * これにより「空データ/dummyDataでlocalStorageを上書き」を防ぐ。
     */
    const skipNextSave = useRef(true);

    // 初回マウント時にlocalStorageからデータを読み込む
    useEffect(() => {
        try {
            const savedData = localStorage.getItem("yakyuscore-data");
            if (savedData) {
                const parsed = JSON.parse(savedData);
                console.log("localStorageからデータを読み込みました", parsed);
                // 各配列が欠損している場合は空配列で補完する
                setState({
                    data: {
                        players: Array.isArray(parsed.players) ? parsed.players : [],
                        games: Array.isArray(parsed.games) ? parsed.games : [],
                        plateAppearances: Array.isArray(parsed.plateAppearances) ? parsed.plateAppearances : [],
                        pitchingStats: Array.isArray(parsed.pitchingStats) ? parsed.pitchingStats : [],
                        lineupPatterns: Array.isArray(parsed.lineupPatterns) ? parsed.lineupPatterns : [],
                    },
                    isLoaded: true,
                });
            } else {
                // localStorageにデータなし（初回起動・ポート変更・キャッシュクリア等）
                // dummyDataを保存しないよう空配列で初期化する
                console.warn("localStorageにデータが見つかりません。CSVからインポートしてください。");
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
            }
        } catch (e) {
            // JSON解析失敗時：壊れたデータを空データで上書きしないようskipNextSaveは変更しない
            console.error("localStorageのデータ解析に失敗しました。データをリセットします。", e);
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
        }
    }, []);

    // データが変更されたらlocalStorageに保存する（初回ロード直後はスキップ）
    useEffect(() => {
        if (isLoaded) {
            if (skipNextSave.current) {
                // 初回ロード直後の保存をスキップ（空データ/dummyDataの上書き防止）
                skipNextSave.current = false;
                return;
            }
            console.log("localStorageにデータを保存します", data);
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

    /** CSVインポート等で既存データを上書き（lineupPatternsは保持する） */
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
                // lineupPatternsは上書きしない（打順パターンを保持するため）
                lineupPatterns: prev.data.lineupPatterns,
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

    /**
     * 選手マスタに存在しない選手名の打席・投手データを削除する
     * 名前の揺れ（スペース有無・旧字体等）も考慮して判定する
     * @returns 削除した打席数と投手数
     */
    const purgeOrphanPlateAppearances = useCallback((): { removedPA: number; removedPitching: number } => {
        let removedPA = 0;
        let removedPitching = 0;

        setState((prev) => {
            const playerNames = new Set(prev.data.players.map((p) => p.name));

            // 名前正規化（表記揺れ吸収）
            const normalize = (name: string) =>
                name
                    .replace(/[\s\u3000]/g, "")
                    .replace(/澤/g, "沢").replace(/髙/g, "高")
                    .replace(/﨑|崎/g, "崎").replace(/齊|齋/g, "斉")
                    .replace(/邊|邉/g, "辺").replace(/廣/g, "広")
                    .replace(/嶋/g, "島").replace(/櫻/g, "桜")
                    .replace(/濱/g, "浜").replace(/瀧/g, "滝")
                    .replace(/國/g, "国").replace(/彌/g, "弥")
                    .replace(/眞|真/g, "真");

            // 正規化済みの選手名セット
            const normalizedPlayerNames = new Set(
                prev.data.players.map((p) => normalize(p.name))
            );

            // 名前が選手マスタに存在するかチェック（完全一致・正規化一致・前方一致）
            const isKnownPlayer = (name: string): boolean => {
                if (!name) return false;
                if (playerNames.has(name)) return true;
                const normalized = normalize(name);
                if (normalizedPlayerNames.has(normalized)) return true;
                // 前方一致（姓のみ入力などに対応）
                for (const pName of normalizedPlayerNames) {
                    if (pName.startsWith(normalized) || normalized.startsWith(pName)) return true;
                }
                return false;
            };

            const validPas = prev.data.plateAppearances.filter((pa) => isKnownPlayer(pa.playerName));
            const validPitching = prev.data.pitchingStats.filter((ps) => isKnownPlayer(ps.playerName));

            removedPA = prev.data.plateAppearances.length - validPas.length;
            removedPitching = prev.data.pitchingStats.length - validPitching.length;

            return {
                ...prev,
                data: {
                    ...prev.data,
                    plateAppearances: validPas,
                    pitchingStats: validPitching,
                },
            };
        });

        return { removedPA, removedPitching };
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
                purgeOrphanPlateAppearances,
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
