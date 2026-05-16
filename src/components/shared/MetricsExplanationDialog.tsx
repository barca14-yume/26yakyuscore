"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

interface MetricsExplanationDialogProps {
  children?: React.ReactNode;
}

export default function MetricsExplanationDialog({ children }: MetricsExplanationDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 transition-colors bg-muted/50 px-2 py-1 rounded-md border border-border/50">
            <Info className="h-3.5 w-3.5" />
            指標の解説
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-emerald-500" />
            指標の解説
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-2">
          {/* 打撃指標セクション */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="h-px w-4 bg-emerald-300 dark:bg-emerald-700"></span>
              打撃指標
            </h2>
            
            {/* BB/K */}
            <div>
              <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs font-mono">BB/K</span>
                四球/三振比率
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-1">
                計算式: 四球 ÷ 三振
              </p>
              <p className="text-sm leading-relaxed">
                <strong>選球眼の良さ</strong>と<strong>コンタクト能力</strong>を測る指標です。1.0を超えれば「三振よりも四球が多い」優秀な打者と言えます。
              </p>
            </div>

            {/* BB% */}
            <div>
              <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs font-mono">BB%</span>
                四球率
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-1">
                計算式: 四球 ÷ 打席数
              </p>
              <p className="text-sm leading-relaxed">
                全打席のうち、四球を選んだ割合です。打率が低くてもBB%が高い選手は<strong>「出塁してチャンスを作っている」</strong>ことがわかります。
              </p>
            </div>

            {/* IsoP */}
            <div>
              <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs font-mono">IsoP</span>
                純粋長打率
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-1">
                計算式: 長打率 − 打率
              </p>
              <p className="text-sm leading-relaxed">
                単打の影響を排除した、<strong>純粋な「長打力」</strong>を測る指標です。0.150を超えれば長打力がある打者と評価されます。
              </p>
            </div>

            {/* BABIP */}
            <div>
              <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs font-mono">BABIP</span>
                インプレー打率
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-1">
                計算式: (安打−本塁打) ÷ (打数−三振−本塁打＋犠飛)
              </p>
              <p className="text-sm leading-relaxed">
                グラウンド内に飛んだ打球がヒットになった確率です。少年野球では<strong>足の速さや打球の強さ</strong>が反映されやすい指標です。
              </p>
            </div>

            {/* RC */}
            <div>
              <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs font-mono">RC</span>
                得点創出 (Runs Created)
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-1">
                計算式: (安打＋四死球) × 塁打 ÷ (打数＋四死球)
              </p>
              <p className="text-sm leading-relaxed">
                その選手が<strong>「何点分の得点をチームにもたらしたか」</strong>を測る指標です。打順を考える際の最も重要な参考になります。
              </p>
            </div>
          </section>

          {/* 投手指標セクション */}
          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="h-px w-4 bg-blue-300 dark:bg-blue-700"></span>
              投手指標
            </h2>

            {/* WHIP */}
            <div>
              <h3 className="font-bold text-sm text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <span className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs font-mono">WHIP</span>
                1回あたりの許出塁数
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-1">
                計算式: (与四死球 ＋ 被安打) ÷ 投球回
              </p>
              <p className="text-sm leading-relaxed">
                <strong>1イニングに平均して何人の走者を出したか</strong>を示します。1.20以下なら優秀、1.00未満ならエース級とされます。
              </p>
            </div>

            {/* K/BB */}
            <div>
              <h3 className="font-bold text-sm text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <span className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs font-mono">K/BB</span>
                奪三振/与四球比率
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-1">
                計算式: 奪三振 ÷ 与四死球
              </p>
              <p className="text-sm leading-relaxed">
                <strong>制球力の良さと制圧力のバランス</strong>を測る指標です。四球1つを出すまでにいくつ三振を奪えるかを示し、3.50を超えると非常に優秀です。
              </p>
            </div>

            {/* P/IP */}
            <div>
              <h3 className="font-bold text-sm text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <span className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs font-mono">P/IP</span>
                1回あたりの投球数
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-1">
                計算式: 総投球数 ÷ 投球回
              </p>
              <p className="text-sm leading-relaxed">
                1イニングをアウト3つ取るのに要した平均球数です。球数制限がある中で、<strong>効率よくイニングを稼ぐ「省エネ投球」</strong>の目安になります。
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
