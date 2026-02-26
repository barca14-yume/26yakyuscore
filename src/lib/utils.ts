import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 選手名から表示用の短い名前（通常は苗字のみ）を取得します。
 * 苗字が被っている選手がいる場合は、下の名前の1文字目を追加して返します。（例: "田中" -> 同姓がいれば "田中 翔", "田中 大"）
 * 
 * @param fullName 判定対象の表示したいフルネーム（例: "田中 翔太"）
 * @param allPlayerNames 全選手のフルネームのリスト
 * @returns 表示用ネーム
 */
export function getDisplayName(fullName: string, allPlayerNames: string[]): string {
  if (!fullName) return "";

  const nameParts = fullName.split(/[\s\u3000]+/);
  // 名前の区切り（スペース）がない場合はそのまま返す
  if (nameParts.length < 2) return fullName;

  const lastName = nameParts[0];
  const firstName = nameParts[1];

  // 同じ苗字を持つ他の選手がいるか確認
  const hasDuplicateLastName = allPlayerNames.some(
    name => name !== fullName && name.split(/[\s\u3000]+/)[0] === lastName
  );

  if (hasDuplicateLastName) {
    // 同姓がいる場合は「田中 翔」のように名の一文字目をつける
    return `${lastName} ${firstName.charAt(0)}`;
  }

  // 同姓がいない場合は「田中」のみ
  return lastName;
}
