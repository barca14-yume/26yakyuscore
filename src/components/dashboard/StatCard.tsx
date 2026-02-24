"use client";

/**
 * 統計カードコンポーネント
 * ダッシュボード上部に表示するKPIカード
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: LucideIcon;
    iconColor: string;
    iconBgColor: string;
    trend?: {
        value: string;
        positive: boolean;
    };
}

export default function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    iconColor,
    iconBgColor,
    trend,
}: StatCardProps) {
    return (
        <Card className="relative overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {title}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                            {value}
                        </p>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground">{subtitle}</p>
                        )}
                        {trend && (
                            <p
                                className={`text-xs font-medium ${trend.positive
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-red-500 dark:text-red-400"
                                    }`}
                            >
                                {trend.positive ? "↑" : "↓"} {trend.value}
                            </p>
                        )}
                    </div>
                    <div
                        className={`flex items-center justify-center w-11 h-11 rounded-xl ${iconBgColor}`}
                    >
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                </div>
            </CardContent>
            {/* 装飾グラデーション */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-0 hover:opacity-100 transition-opacity" />
        </Card>
    );
}
