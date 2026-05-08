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
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-600 transition-colors bg-muted/50 px-2 py-1 rounded-md">
            <Info className="h-3.5 w-3.5" />
            指標の解説
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-emerald-500" />
            セイバーメトリクス指標の解説
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 mt-2">
          {/* BB/K */}
          <div>
            <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs">BB/K</span>
              四球/三振比率
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-1">
              計算式: 四球 ÷ 三振
            </p>
            <p className="text-sm leading-relaxed">
              <strong>選球眼の良さ</strong>と<strong>コンタクト能力</strong>を測る指標です。1.0を超えれば「三振よりも四球が多い」優秀な打者と言えます。少年野球でも「ボール球を振らず、しっかりバットに当てる」基礎能力の指標として役立ちます。
            </p>
          </div>

          {/* BB% */}
          <div>
            <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs">BB%</span>
              四球率
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-1">
              計算式: 四球 ÷ 打席数
            </p>
            <p className="text-sm leading-relaxed">
              全打席のうち、四球を選んだ割合です。打率が低くてもBB%が高い選手は<strong>「出塁してチームに貢献している」</strong>ことがわかり、出塁が重要なトップバッター候補などの評価に役立ちます。
            </p>
          </div>

          {/* IsoP */}
          <div>
            <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs">IsoP</span>
              純粋長打率 (アイソップ)
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-1">
              計算式: 長打率 − 打率
            </p>
            <p className="text-sm leading-relaxed">
              単打の影響を排除した、<strong>純粋な「長打力」</strong>を測る指標です。0.150を超えれば長打力があるとされます。同じ打率でも単打が多いのか長打が多いのかを区別でき、クリーンナップ候補を探すのに役立ちます。
            </p>
          </div>

          {/* BABIP */}
          <div>
            <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs">BABIP</span>
              インプレー打率 (バビップ)
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-1">
              計算式: (安打−本塁打) ÷ (打数−三振−本塁打＋犠飛)
            </p>
            <p className="text-sm leading-relaxed">
              グラウンド内に飛んだ打球が、どれくらいの確率でヒットになったかを示します。少年野球ではエラーや内野安打が多いため、<strong>足の速さや打球の強さ</strong>が反映されやすいです。極端に低い場合は「運が悪かった（正面を突いた）だけ」という解釈もできます。
            </p>
          </div>

          {/* RC */}
          <div>
            <h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-xs">RC</span>
              得点創出 (Runs Created) ※簡易版
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-1">
              計算式: (安打＋四死球) × 塁打 ÷ (打数＋四死球)
            </p>
            <p className="text-sm leading-relaxed">
              その選手が<strong>「何点分の得点をチームにもたらしたか」</strong>を測る総合評価指標です。打率やOPS以上に「実際の得点力」に直結するため、スタメンや打順を考える際の参考になります。
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
