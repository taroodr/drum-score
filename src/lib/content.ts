export type LocalizedText = {
  title: string;
  description: string;
};

export type TutorialArticle = {
  slug: string;
  updatedAt: string;
  en: LocalizedText & {
    intro: string;
    steps: string[];
  };
  ja: LocalizedText & {
    intro: string;
    steps: string[];
  };
};

export type SampleScore = {
  slug: string;
  updatedAt: string;
  bpm: number;
  style: string;
  musicXmlPath?: string;
  en: LocalizedText & {
    pattern: string[];
    tips: string[];
  };
  ja: LocalizedText & {
    pattern: string[];
    tips: string[];
  };
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const tutorialArticles: TutorialArticle[] = [
  {
    slug: "drum-notation-reading",
    updatedAt: "2026-02-06",
    en: {
      title: "How to Read Drum Notation",
      description:
        "A beginner-friendly tutorial for reading drum notation, understanding note heads, and counting subdivisions.",
      intro:
        "If you are searching for drum notation basics, start with staff layout and note positions before speed practice.",
      steps: [
        "Read the five-line staff top-down: cymbals on top, snare in the middle, kick on the bottom space.",
        "Count one beat as 1 e + a for 16th notes, or 1-trip-let for triplets.",
        "Start at 60 BPM and loop one bar until hand and foot timing is stable.",
        "Use accent marks to shape groove dynamics instead of only playing louder.",
      ],
    },
    ja: {
      title: "ドラム譜の読み方ガイド",
      description:
        "ドラム譜の読み方を初心者向けに解説。音符の位置、記号、カウント方法を短時間で理解できます。",
      intro:
        "「ドラム譜 読み方」を学ぶなら、まずは譜面上の配置とカウントをセットで覚えるのが最短です。",
      steps: [
        "五線譜は上がシンバル、中央がスネア、下側がキックの位置として読む。",
        "16分は「1 e + a」、三連符は「1-trip-let」でカウントする。",
        "最初は60 BPM程度で1小節を繰り返し、手足の同期を優先する。",
        "アクセント記号を意識して、強弱でグルーヴを作る。",
      ],
    },
  },
  {
    slug: "8beat-practice",
    updatedAt: "2026-02-06",
    en: {
      title: "8 Beat Drum Practice Routine",
      description:
        "A practical 8 beat drum practice plan with hi-hat timing, kick placement, and fill transitions.",
      intro:
        "For players searching 8 beat practice ideas, this plan builds consistency before adding fills.",
      steps: [
        "Play hi-hat 8th notes steadily with a metronome and keep each stroke even.",
        "Add snare on beats 2 and 4 while maintaining relaxed stick height.",
        "Place kick on beats 1 and 3 first, then add syncopation on the and of 3.",
        "Finish with a one-beat fill and return to groove without tempo drift.",
      ],
    },
    ja: {
      title: "8ビート練習メニュー",
      description:
        "8ビートの基礎練習を段階的に進めるチュートリアル。ハイハット、キック、フィルのつなぎまで解説。",
      intro:
        "「8ビート 練習」で安定した演奏を目指すなら、シンプルな反復とテンポ管理が重要です。",
      steps: [
        "メトロノームに合わせてハイハット8分を均等に刻む。",
        "スネアを2拍目と4拍目に置き、力みのないフォームを保つ。",
        "キックを1拍目・3拍目から始め、慣れたら3拍裏を追加する。",
        "1拍の短いフィルを入れて、テンポを崩さずグルーヴに戻る。",
      ],
    },
  },
];

export const sampleScores: SampleScore[] = [
  {
    slug: "power-grunge-intro",
    updatedAt: "2026-02-06",
    bpm: 117,
    style: "Grunge Rock",
    musicXmlPath: "/samples/power-grunge-intro.musicxml",
    en: {
      title: "Power Grunge Intro Drum Score (Sample Groove)",
      description:
        "Public sample drum score for a 90s-style grunge intro groove with beginner-friendly sticking notes.",
      pattern: [
        "Closed hat: steady 8th notes with medium accents",
        "Snare: strong backbeat on 2 and 4",
        "Kick: 1, 1+, 3, 3+ (repeat for intro drive)",
      ],
      tips: [
        "Keep backbeat height consistent before increasing tempo.",
        "Use compact kick motion to avoid rushing the and-counts.",
      ],
    },
    ja: {
      title: "パワーグランジ・イントロ ドラム譜（サンプル）",
      description:
        "90年代グランジ系イントロを想定した公開用サンプル譜面。既存曲名なしで練習に使えます。",
      pattern: [
        "クローズドハット: 8分を一定に刻む",
        "スネア: 2拍目と4拍目を強く置く",
        "キック: 1拍、1拍裏、3拍、3拍裏（イントロで反復）",
      ],
      tips: [
        "先にバックビートの高さをそろえると安定します。",
        "キックは小さく踏んで裏拍の走りを防ぎます。",
      ],
    },
  },
  {
    slug: "seven-nation-army",
    updatedAt: "2026-02-06",
    bpm: 124,
    style: "Garage Rock",
    en: {
      title: "Seven Nation Army Drum Score (Sample Groove)",
      description:
        "Sample drum notation inspired by Seven Nation Army groove for timing and dynamic control practice.",
      pattern: [
        "Hi-hat: closed 8th notes",
        "Snare: backbeat with occasional ghost notes",
        "Kick: simple downbeat support",
      ],
      tips: [
        "Leave space between notes and avoid overplaying fills.",
        "Focus on consistency over volume.",
      ],
    },
    ja: {
      title: "Seven Nation Army ドラム譜（サンプル）",
      description:
        "Seven Nation Army風グルーヴのサンプル譜面。シンプルなビートの安定化に最適です。",
      pattern: [
        "ハイハット: クローズの8分",
        "スネア: バックビート中心、必要に応じてゴースト",
        "キック: ダウンビートを支える配置",
      ],
      tips: [
        "詰め込みすぎず音価の余白を意識する。",
        "音量よりタイムの安定を優先する。",
      ],
    },
  },
  {
    slug: "uptown-funk",
    updatedAt: "2026-02-06",
    bpm: 115,
    style: "Funk",
    en: {
      title: "Uptown Funk Drum Score (Sample Groove)",
      description:
        "Sample drum score inspired by Uptown Funk style pocket groove, focusing on 16th-note feel.",
      pattern: [
        "Hi-hat: tight 16th with slight accents",
        "Snare: 2 and 4 plus ghost-note texture",
        "Kick: syncopated pattern around beat 1 and 3",
      ],
      tips: [
        "Mute hi-hat ring with foot pressure for clean pocket.",
        "Practice ghost notes at low velocity first.",
      ],
    },
    ja: {
      title: "Uptown Funk ドラム譜（サンプル）",
      description:
        "Uptown Funk風ポケットグルーヴのサンプル譜面。16分フィールの練習向け。",
      pattern: [
        "ハイハット: タイトな16分に軽いアクセント",
        "スネア: 2拍目/4拍目＋ゴースト",
        "キック: 1拍・3拍周辺のシンコペーション",
      ],
      tips: [
        "左足でハイハットの余韻を抑えて輪郭を出す。",
        "ゴーストは小さい音量で先にコントロールする。",
      ],
    },
  },
];

export const faqContent = {
  en: {
    title: "FAQ",
    updated: "Last updated: 2026-02-06",
    items: [
      {
        question: "How do I write drum notation?",
        answer:
          "Select a division, click the grid to place notes, and use preview to confirm. Then export PDF or MIDI.",
      },
      {
        question: "How do I read drum notation quickly?",
        answer:
          "Start by mapping cymbals, snare, and kick positions on the staff, then count 8th and 16th subdivisions with a metronome.",
      },
      {
        question: "How should I practice 8 beat grooves?",
        answer:
          "Keep hi-hat and snare steady first, then add kick variations. Raise BPM only after you can loop one minute with no timing drift.",
      },
      {
        question: "Can I export drum scores as PDF and MIDI?",
        answer:
          "Yes. Use the export controls to download PDF, image, or MIDI directly from the editor.",
      },
      {
        question: "Can I save my drum scores?",
        answer:
          "You can save locally in your browser, and signed-in users can save and load scores from cloud storage.",
      },
      {
        question: "What is the difference between 16th notes and triplets?",
        answer:
          "16th notes split one beat into four equal parts. Triplets split one beat into three equal parts and create a swing-like feel.",
      },
    ] as FaqItem[],
  },
  ja: {
    title: "よくある質問",
    updated: "最終更新日: 2026-02-06",
    items: [
      {
        question: "ドラム譜の書き方は？",
        answer:
          "Divisionを選択し、グリッドをクリックして音符を配置します。プレビュー確認後にPDF/MIDIを書き出せます。",
      },
      {
        question: "ドラム譜の読み方を最短で覚えるには？",
        answer:
          "まずシンバル・スネア・キックの位置対応を覚え、8分/16分のカウントをメトロノームで反復するのが効果的です。",
      },
      {
        question: "8ビート練習は何から始めるべき？",
        answer:
          "ハイハットとスネアの安定を先に作り、次にキックの配置を増やします。1分間崩れないまでテンポは上げません。",
      },
      {
        question: "PDFやMIDIに書き出せますか？",
        answer:
          "可能です。エディタのエクスポート操作からPDF・画像・MIDIを保存できます。",
      },
      {
        question: "譜面データの保存はできますか？",
        answer:
          "ブラウザのローカル保存に対応しています。ログイン時はクラウド保存と読み込みも使えます。",
      },
      {
        question: "16分音符と三連符の違いは？",
        answer:
          "16分音符は1拍を4等分、三連符は1拍を3等分します。三連符の方が跳ねるニュアンスになります。",
      },
    ] as FaqItem[],
  },
} as const;

export function getTutorialBySlug(slug: string) {
  return tutorialArticles.find((item) => item.slug === slug);
}

export function getSampleScoreBySlug(slug: string) {
  return sampleScores.find((item) => item.slug === slug);
}
