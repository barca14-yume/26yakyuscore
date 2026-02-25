"use client";

/**
 * ナビゲーションコンポーネント
 * モバイルファーストのボトムナビゲーション + デスクトップ用サイドバー
 */
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    ClipboardEdit,
    Users,
    Activity,
} from "lucide-react";

/** ナビゲーション項目 */
const NAV_ITEMS = [
    { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
    { href: "/input", label: "試合入力", icon: ClipboardEdit },
    { href: "/players", label: "選手成績", icon: Users },
];

export default function Navigation() {
    const pathname = usePathname();

    return (
        <>
            {/* モバイルボトムナビゲーション */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-xl md:hidden">
                <div className="flex items-center justify-around py-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${isActive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Icon
                                    className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""
                                        }`}
                                />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* デスクトップサイドバー */}
            <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 md:left-0 md:z-40 border-r border-border bg-background">
                {/* ロゴエリア */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">Baseball Ops</h1>
                        <p className="text-[11px] text-muted-foreground">Dashboard</p>
                    </div>
                </div>

                {/* ナビリンク */}
                <div className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                <Icon className="h-4.5 w-4.5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* アクション: データリセット */}
                <div className="px-4 py-4 mt-auto space-y-2">
                    <button
                        onClick={() => {
                            if (window.confirm("現在のデータをすべて消去して、一から入力を始めますか？\n（現在保存されているデータは失われます）")) {
                                const emptyData = {
                                    players: [],
                                    games: [],
                                    plateAppearances: [],
                                    pitchingStats: [],
                                };
                                localStorage.setItem("yakyuscore-data", JSON.stringify(emptyData));
                                window.location.reload();
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                        全データを消去（新規作成）
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm("サンプルデータ（デモ用）を復元しますか？\n（現在保存されているデータは失われます）")) {
                                localStorage.removeItem("yakyuscore-data");
                                window.location.reload();
                            }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50 text-muted-foreground text-[10px] font-medium hover:bg-muted transition-colors"
                    >
                        サンプルデータを復元
                    </button>
                </div>

                {/* フッター */}
                <div className="px-6 py-4 border-t border-border mt-0">
                    <p className="text-[11px] text-muted-foreground">
                        © 2026 Baseball Ops
                    </p>
                </div>
            </aside>
        </>
    );
}
