export type RoomId =
  | 'office_427'
  | 'corridor_start'
  | 'two_doors'
  | 'meeting_room'
  | 'boss_office'
  | 'mind_control'
  | 'employee_lounge'
  | 'warehouse'
  | 'broom_closet'
  | 'cargo_lift';

export type EndingId =
  | 'ending_freedom'
  | 'ending_destruction'
  | 'ending_lounge'
  | 'ending_warehouse_fall'
  | 'ending_broom_closet'
  | 'ending_confusion'
  | 'ending_coward'
  | 'ending_window_escape';

export interface EndingInfo {
  id: EndingId;
  title: string;
  desc: string;
  code: string;
}

export const ENDINGS_CATALOG: EndingInfo[] = [
  {
    id: 'ending_freedom',
    title: '자유 엔딩 (Freedom Ending)',
    desc: '내레이터의 지시를 충실히 따라 마인드 컨트롤 장치를 끄고 햇살 가득한 바깥세상으로 탈출했습니다.',
    code: 'END-01',
  },
  {
    id: 'ending_destruction',
    title: '자폭 엔딩 (Countdown Destruction)',
    desc: '내레이터의 경고를 무시하고 마인드 컨트롤 시설의 전원 스위치를 켜 시설과 함께 자폭했습니다.',
    code: 'END-02',
  },
  {
    id: 'ending_lounge',
    title: '휴게실 안식 엔딩 (Lounge Slacker)',
    desc: '회의실로 가지 않고 직원 휴게실의 푹신한 소파에 앉아 영원히 업무를 거부했습니다.',
    code: 'END-03',
  },
  {
    id: 'ending_warehouse_fall',
    title: '추락 엔딩 (Cold Descent)',
    desc: '창고의 안전 난간을 무시하고 화물 리프트 아래 어두운 심연으로 뛰어내렸습니다.',
    code: 'END-04',
  },
  {
    id: 'ending_broom_closet',
    title: '빗자루 보관함 엔딩 (Broom Closet Fanatic)',
    desc: '내레이터가 애원할 때까지 비좁은 빗자루 보관함 안에 숨어 나오지 않았습니다.',
    code: 'END-05',
  },
  {
    id: 'ending_confusion',
    title: '혼돈의 지도 엔딩 (Confusion Ending)',
    desc: '내레이터가 길을 잃어 엉망으로 재부팅한 회전문 미로 속을 영원히 헤맸습니다.',
    code: 'END-06',
  },
  {
    id: 'ending_coward',
    title: '비겁자 엔딩 (Coward Door Close)',
    desc: '사무실 밖으로 한 걸음도 나가지 않고 문을 닫아버린 채 안전하게 책상에 머물렀습니다.',
    code: 'END-07',
  },
  {
    id: 'ending_window_escape',
    title: '창문 글리치 탈출 (Window Glitch Escape)',
    desc: '책상을 밟고 복도 창문 너머 맵 바깥의 무한한 백색 공간으로 탈출했습니다.',
    code: 'END-08',
  },
];

export interface ChoiceOption {
  id: string;
  label: string;
  targetRoom?: RoomId;
  targetEnding?: EndingId;
  narratorReaction: string;
}

export interface RoomDefinition {
  id: RoomId;
  title: string;
  subtitle: string;
  narratorText: string;
  options: ChoiceOption[];
  visualScene: 'office' | 'hallway' | 'doors' | 'meeting' | 'boss' | 'control' | 'lounge' | 'warehouse' | 'closet';
}

export const ROOM_DEFINITIONS: Record<RoomId, RoomDefinition> = {
  office_427: {
    id: 'office_427',
    title: '427호 사무실',
    subtitle: '모니터에 뜬 지시를 키보드로 입력하던 스탠리의 직장',
    narratorText:
      '이것은 스탠리라는 남자의 이야기입니다. 427호 사무실의 모니터에서 지시가 멈추자, 스탠리는 동료들이 사라졌음을 깨닫고 자리에서 일어났습니다.',
    visualScene: 'office',
    options: [
      {
        id: 'leave_office',
        label: '열린 문으로 나가 복도로 향한다',
        targetRoom: 'corridor_start',
        narratorReaction: '스탠리는 사무실 문을 열고 밖으로 나섰습니다.',
      },
      {
        id: 'close_door',
        label: '겁을 먹고 문을 굳게 닫은 채 책상에 머문다',
        targetEnding: 'ending_coward',
        narratorReaction: '스탠리는 문을 잠갔습니다. 아무도 없는 방에서... 영원히 안전할 것입니다.',
      },
      {
        id: 'jump_window',
        label: '책상을 딛고 복도 옆 창문 밖으로 뛰어내린다',
        targetEnding: 'ending_window_escape',
        narratorReaction: '잠깐, 스탠리? 거긴 갈 수 없는 창문인데... 어? 맵 밖으로 떨어졌잖아?!',
      },
    ],
  },
  corridor_start: {
    id: 'corridor_start',
    title: '중앙 복도',
    subtitle: '형광등이 깜빡이는 텅 빈 사무실 복도',
    narratorText: '직원들은 단 한 명도 보이지 않았습니다. 스탠리는 복도를 따라 천천히 걸어갔습니다.',
    visualScene: 'hallway',
    options: [
      {
        id: 'advance_doors',
        label: '복도를 따라 두 개의 문이 있는 방으로 간다',
        targetRoom: 'two_doors',
        narratorReaction: '스탠리는 계속 걸어가 두 개의 문이 있는 방에 도착했습니다.',
      },
      {
        id: 'enter_broom_closet',
        label: '벽에 작게 붙은 빗자루 보관함(Broom Closet) 문을 연다',
        targetRoom: 'broom_closet',
        narratorReaction: '스탠리는 빗자루 보관함으로 들어갔습니다. 대체 왜 빗자루 보관함 따위에 들어간 거죠?',
      },
    ],
  },
  two_doors: {
    id: 'two_doors',
    title: '두 개의 문',
    subtitle: 'The Stanley Parable 역사상 가장 상징적인 분기점',
    narratorText: '스탠리가 두 개의 문 앞에 도달했을 때, 그는 왼쪽 문으로 들어갔습니다.',
    visualScene: 'doors',
    options: [
      {
        id: 'door_left',
        label: '내레이터 말대로 [왼쪽 문]으로 들어간다',
        targetRoom: 'meeting_room',
        narratorReaction: '스탠리는 망설임 없이 왼쪽 문으로 들어섰습니다. 아주 훌륭한 선택입니다.',
      },
      {
        id: 'door_right',
        label: '청개구리처럼 [오른쪽 문]으로 들어간다',
        targetRoom: 'employee_lounge',
        narratorReaction: '이쪽은 회의실로 가는 길이 아닙니다. 스탠리는 그저 휴게실에 들르고 싶었을 뿐입니다.',
      },
    ],
  },
  meeting_room: {
    id: 'meeting_room',
    title: '대회의실',
    subtitle: '프레젠테이션 스크린이 꺼진 정적의 회의실',
    narratorText:
      '회의실 역시 텅 비어 있었습니다. 스탠리는 벽 뒤편 사장실로 이어지는 계단 통로로 향했습니다.',
    visualScene: 'meeting',
    options: [
      {
        id: 'goto_boss',
        label: '사장실로 이어지는 계단으로 올라간다',
        targetRoom: 'boss_office',
        narratorReaction: '스탠리는 사장의 사무실을 향해 당당히 계단을 올랐습니다.',
      },
      {
        id: 'confusion_loop',
        label: '회의실 구석의 비상탈출 표지판 문으로 나간다',
        targetEnding: 'ending_confusion',
        narratorReaction: '스탠리, 그 문은 대본에 없는 문인데?! 으악, 복도가 꼬여버렸습니다!',
      },
    ],
  },
  boss_office: {
    id: 'boss_office',
    title: '사장실',
    subtitle: '마호가니 책상과 벽난로 뒤 비밀 엘리베이터',
    narratorText:
      '사장실의 책상 뒤에는 비밀 키패드가 있었습니다. 스탠리가 암호 2-8-4-5를 입력하자 벽난로가 열리며 비밀 엘리베이터가 나타났습니다.',
    visualScene: 'boss',
    options: [
      {
        id: 'enter_elevator',
        label: '비밀 엘리베이터를 타고 지하 통제실로 내려간다',
        targetRoom: 'mind_control',
        narratorReaction: '엘리베이터는 깊은 지하 기지로 내려가기 시작했습니다.',
      },
    ],
  },
  mind_control: {
    id: 'mind_control',
    title: '마인드 컨트롤 통제 시설',
    subtitle: '모든 직원의 뇌를 조종하던 거대한 지하 슈퍼컴퓨터',
    narratorText:
      '놀랍게도 이곳은 전 직원의 뇌를 조종하던 마인드 컨트롤 시설이었습니다! 거대한 제어반에는 전원 [OFF] 버튼과 시설 가동 [ON] 버튼이 있었습니다.',
    visualScene: 'control',
    options: [
      {
        id: 'turn_off',
        label: '마인드 컨트롤 장치를 [OFF]로 끄고 자유를 찾는다',
        targetEnding: 'ending_freedom',
        narratorReaction: '스탠리가 OFF 버튼을 누르자 천장이 열리며 따스한 햇빛이 쏟아져 들어왔습니다!',
      },
      {
        id: 'turn_on',
        label: '내레이터의 말을 무시하고 장치를 [ON]으로 켠다',
        targetEnding: 'ending_destruction',
        narratorReaction: '안 돼! 무슨 짓을 한 겁니까 스탠리?! 자폭 카운트다운이 시작되었습니다!',
      },
    ],
  },
  employee_lounge: {
    id: 'employee_lounge',
    title: '직원 휴게실',
    subtitle: '푹신한 가죽 소파와 자판기가 놓인 안식처',
    narratorText:
      '스탠리는 오른쪽 문을 지나 직원 휴게실에 도착했습니다. 내레이터는 스탠리에게 어서 회의실로 돌아가라고 재촉했습니다.',
    visualScene: 'lounge',
    options: [
      {
        id: 'stay_lounge',
        label: '소파에 드러누워 아무 일도 하지 않고 쉰다',
        targetEnding: 'ending_lounge',
        narratorReaction: '스탠리는 소파에 앉았습니다. 그리고 영원히 일어나지 않았습니다.',
      },
      {
        id: 'goto_warehouse',
        label: '휴게실 옆문을 열고 거대한 창고로 나아간다',
        targetRoom: 'warehouse',
        narratorReaction: '스탠리는 창고로 통하는 문을 열었습니다.',
      },
    ],
  },
  warehouse: {
    id: 'warehouse',
    title: '거대 물류 창고',
    subtitle: '수십 미터 높이의 철제 선반과 화물 리프트',
    narratorText: '눈앞에 끝이 보이지 않는 거대한 창고와 화물 리프트가 펼쳐졌습니다.',
    visualScene: 'warehouse',
    options: [
      {
        id: 'ride_lift',
        label: '화물 리프트 탑승 버튼을 누르고 건너편으로 이동한다',
        targetRoom: 'cargo_lift',
        narratorReaction: '스탠리는 덜컹거리는 화물 리프트에 탑승했습니다.',
      },
      {
        id: 'jump_pit',
        label: '안전 난간을 뛰어넘어 깊은 바닥 심연으로 뛰어내린다',
        targetEnding: 'ending_warehouse_fall',
        narratorReaction: '스탠리, 안 돼! 거긴 바닥이 없단 말입니다! 으아아아악!',
      },
    ],
  },
  cargo_lift: {
    id: 'cargo_lift',
    title: '공중 화물 리프트',
    subtitle: '허공을 가로지르는 삐걱거리는 철제 발판',
    narratorText: '리프트가 창고 허공을 가로지르고 있습니다. 앞쪽 환기구로 들어가면 사무실로 되돌아갈 수 있습니다.',
    visualScene: 'warehouse',
    options: [
      {
        id: 'enter_vent',
        label: '환기구 통로로 기어 들어가 사장실로 우회한다',
        targetRoom: 'boss_office',
        narratorReaction: '놀랍게도 환기구는 사장의 비밀 방으로 직접 연결되어 있었습니다.',
      },
      {
        id: 'jump_from_lift',
        label: '리프트 중간에서 뛰어내린다',
        targetEnding: 'ending_warehouse_fall',
        narratorReaction: '스탠리는 또다시 중력을 시험하려 했습니다. 결과는 뻔했죠.',
      },
    ],
  },
  broom_closet: {
    id: 'broom_closet',
    title: '빗자루 보관함',
    subtitle: '걸레와 먼지투성이 대걸레가 놓인 비좁은 벽장',
    narratorText:
      '스탠리는 빗자루 보관함에 들어갔습니다. 내레이터가 말했습니다. "스탠리, 여긴 아무것도 없습니다. 그냥 나와요."',
    visualScene: 'closet',
    options: [
      {
        id: 'leave_closet',
        label: '이제 그만 복도로 나온다',
        targetRoom: 'corridor_start',
        narratorReaction: '드디어 나오는군요. 정말이지 시간 낭비였습니다.',
      },
      {
        id: 'stay_in_closet',
        label: '내레이터의 말을 무시하고 보관함 문을 잠그고 버틴다',
        targetEnding: 'ending_broom_closet',
        narratorReaction: '진짜 안 나올 겁니까? 그래요, 둘이서 빗자루나 실컷 구경합시다! 빗자루 엔딩 축하합니다!',
      },
    ],
  },
};

export interface StanleyGameState {
  currentRoomId: RoomId;
  history: RoomId[];
  unlockedEndings: Set<EndingId>;
  currentEnding: EndingId | null;
  narratorSpeechQueue: string[];
  typingProgress: number; // 0 to 1
  doorAnimationProgress: number; // 0 to 1
  cameraYaw: number;
}

export class StanleyChoiceEngine {
  public state: StanleyGameState;

  constructor(initialUnlocked: EndingId[] = []) {
    this.state = {
      currentRoomId: 'office_427',
      history: ['office_427'],
      unlockedEndings: new Set(initialUnlocked),
      currentEnding: null,
      narratorSpeechQueue: [ROOM_DEFINITIONS.office_427.narratorText],
      typingProgress: 1.0,
      doorAnimationProgress: 1.0,
      cameraYaw: 0,
    };
  }

  public getCurrentRoom(): RoomDefinition {
    return ROOM_DEFINITIONS[this.state.currentRoomId];
  }

  public makeChoice(choiceId: string): { success: boolean; reaction: string } {
    if (this.state.currentEnding !== null) {
      return { success: false, reaction: '이미 엔딩에 도달했습니다. 재시작하세요.' };
    }

    const currentRoom = this.getCurrentRoom();
    const choice = currentRoom.options.find((c) => c.id === choiceId);
    if (!choice) {
      return { success: false, reaction: '유효하지 않은 선택입니다.' };
    }

    if (choice.targetEnding) {
      this.state.currentEnding = choice.targetEnding;
      this.state.unlockedEndings.add(choice.targetEnding);
      this.state.narratorSpeechQueue.push(choice.narratorReaction);
      return { success: true, reaction: choice.narratorReaction };
    }

    if (choice.targetRoom) {
      this.state.currentRoomId = choice.targetRoom;
      this.state.history.push(choice.targetRoom);
      const nextRoom = ROOM_DEFINITIONS[choice.targetRoom];
      this.state.narratorSpeechQueue.push(choice.narratorReaction);
      this.state.narratorSpeechQueue.push(nextRoom.narratorText);
      return { success: true, reaction: choice.narratorReaction };
    }

    return { success: false, reaction: '' };
  }

  public restartGame(): void {
    this.state.currentRoomId = 'office_427';
    this.state.history = ['office_427'];
    this.state.currentEnding = null;
    this.state.narratorSpeechQueue = [ROOM_DEFINITIONS.office_427.narratorText];
    this.state.doorAnimationProgress = 1.0;
  }

  public getCompletionPercentage(): number {
    return Math.round((this.state.unlockedEndings.size / ENDINGS_CATALOG.length) * 100);
  }
}
