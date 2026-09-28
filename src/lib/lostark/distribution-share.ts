import { cleanChar } from './distribution';

// 2026-09-28 SEO P0 (9/22 진단 "lostark-raid KO: 결과·공유 문구 정비, 제목 동결"):
// 복사한 파티표가 디스코드·카톡에서 무엇인지, 어디서 만들었는지 알 수 있게 머리줄과 도구 주소를 붙인다.
// 플레이어 줄 형식("1-1 ㄷㄷㄷㅍ")은 이미 쓰는 사람들이 있으므로 그대로 둔다.
export function formatDistributionShare({ result, header, url, room, roomLine }: {
  result: string[][];
  header: string;
  url: string;
  room?: { roomCode: string; password: string } | null;
  roomLine?: string;
}): string {
  const lines = [`[${header}]`, ...result.map((player, i) => `${Math.floor(i / 4) + 1}-${(i % 4) + 1} ${player.map(cleanChar).join('')}`)];
  if (room && roomLine) lines.push(roomLine.replace('{room}', room.roomCode).replace('{pw}', room.password));
  lines.push('', url);
  return lines.join('\n');
}
