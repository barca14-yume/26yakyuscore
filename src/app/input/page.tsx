"use client";

/**
 * 試合入力 / CSVインポート / 選手管理 ページ
 * タブ切り替えで各機能を選択可能
 */
import React, { useState } from "react";
import GameInputForm from "@/components/input/GameInputForm";
import CsvImport from "@/components/input/CsvImport";
import PlayerCsvManager from "@/components/input/PlayerCsvManager";
import { ClipboardEdit, Upload, Users } from "lucide-react";

type TabType = "manual" | "csv" | "players";

export default function InputPage() {
    const [activeTab, setActiveTab] = useState<TabType>("manual");

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="animate-fade-in-up">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                    データ入力・管理
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                    試合データの入力や選手マスタの管理（CSV対応）
                </p>
            </div>

            {/* タブ切り替え */}
            <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <div className="flex gap-1 p-1 bg-muted/50 rounded-xl overflow-x-auto no-scrollbar">
                    {(["manual", "csv", "players"] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === tab
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {tab === "manual" ? (
                                <>
                                    <ClipboardEdit className="h-4 w-4" />
                                    試合入力
                                </>
                            ) : tab === "csv" ? (
                                <>
                                    <Upload className="h-4 w-4" />
                                    試合CSV
                                </>
                            ) : (
                                <>
                                    <Users className="h-4 w-4" />
                                    選手管理
                                </>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* タブコンテンツ */}
            <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                {activeTab === "manual" && <GameInputForm />}
                {activeTab === "csv" && <CsvImport />}
                {activeTab === "players" && <PlayerCsvManager />}
            </div>
        </div>
    );
}
