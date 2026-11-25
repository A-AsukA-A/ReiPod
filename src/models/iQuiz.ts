import { gameRandom, gameShuffle } from "./classicGames";

export type QuizCategory = "library" | "music" | "movies" | "tv";
export type QuizQuestion = { prompt: string; answers: string[]; correct: number; artwork?: string };
export type QuizTrack = { id: string; title: string; artist?: string; album?: string; artwork?: string; year?: number };
type Fact = readonly [string, string, string, string, string];
// Independently authored question packs; no Apple trivia database or game assets.
const facts: Record<Exclude<QuizCategory, "library">, readonly Fact[]> = {
  music: [
    ["标准钢琴通常有多少个琴键？", "88", "61", "76", "96"],
    ["小提琴通常有几根弦？", "4", "3", "5", "6"],
    ["五线谱有几条横线？", "5", "4", "6", "7"],
    ["音符C通常对应哪个唱名？", "Do", "Re", "Mi", "Sol"],
    ["下列哪种乐器属于木管乐器？", "单簧管", "小号", "长号", "圆号"],
    ["节拍标记BPM描述什么？", "每分钟拍数", "声音大小", "歌曲时长", "音高范围"],
    ["哪个符号表示升高半音？", "♯", "♭", "♮", "休止符"],
    ["《四季》的作曲者是谁？", "维瓦尔第", "莫扎特", "肖邦", "德彪西"],
    ["哪种乐器通过琴槌敲击琴弦发声？", "钢琴", "小提琴", "竖琴", "吉他"],
    ["哪个速度术语表示慢板？", "Adagio", "Presto", "Allegro", "Vivace"],
    ["六根弦是下列哪种乐器的常见配置？", "吉他", "小提琴", "大提琴", "中提琴"],
    ["十二平均律中，一个八度分成几个半音？", "12", "7", "8", "10"],
  ],
  movies: [
    ["电影《千与千寻》的导演是谁？", "宫崎骏", "新海诚", "今敏", "细田守"],
    ["《玩具总动员》中的牛仔玩具叫什么？", "胡迪", "巴斯", "安迪", "雷克斯"],
    ["《星球大战》中尤达的光剑通常是什么颜色？", "绿色", "红色", "紫色", "黄色"],
    ["《指环王》中负责携带魔戒的霍比特人是谁？", "弗罗多", "甘道夫", "阿拉贡", "莱戈拉斯"],
    ["《海底总动员》中尼莫是什么鱼？", "小丑鱼", "金鱼", "鲨鱼", "神仙鱼"],
    ["电影《泰坦尼克号》的导演是谁？", "詹姆斯·卡梅隆", "史蒂文·斯皮尔伯格", "克里斯托弗·诺兰", "彼得·杰克逊"],
    ["《哈利·波特》中霍格沃茨是一所什么学校？", "魔法学校", "音乐学校", "航海学校", "体育学校"],
    ["《狮子王》中小狮子主角的名字是什么？", "辛巴", "木法沙", "丁满", "彭彭"],
    ["《机器人总动员》的英文片名是什么？", "WALL·E", "Up", "Cars", "Brave"],
    ["《龙猫》中两姐妹搬到了哪里？", "乡村", "海岛", "太空站", "沙漠"],
    ["《寻梦环游记》围绕哪种艺术展开？", "音乐", "雕塑", "摄影", "建筑"],
    ["《侏罗纪公园》中的主题公园以什么为特色？", "恐龙", "机器人", "海盗", "外星人"],
  ],
  tv: [
    ["《老友记》的主要故事发生在哪座城市？", "纽约", "伦敦", "芝加哥", "西雅图"],
    ["《神秘博士》中TARDIS外形像什么？", "蓝色警亭", "红色电话亭", "巴士", "火车"],
    ["《海绵宝宝》中主角住在什么形状的房子里？", "菠萝", "椰子", "西瓜", "贝壳"],
    ["《哆啦A梦》中哆啦A梦来自哪个世纪？", "22世纪", "20世纪", "21世纪", "23世纪"],
    ["《名侦探柯南》中柯南原本的名字是什么？", "工藤新一", "服部平次", "黑羽快斗", "毛利小五郎"],
    ["《西游记》中孙悟空的武器是什么？", "金箍棒", "宝剑", "长枪", "弓箭"],
    ["《猫和老鼠》中杰瑞是哪种动物？", "老鼠", "猫", "狗", "鸭子"],
    ["《宝可梦》中皮卡丘主要是什么属性？", "电", "水", "火", "草"],
    ["《辛普森一家》中家庭姓氏是什么？", "辛普森", "格里芬", "史密斯", "约翰逊"],
    ["《夏洛克》中福尔摩斯的搭档是谁？", "华生", "雷斯垂德", "莫里亚蒂", "麦考夫"],
    ["电视节目中的字幕通常帮助观众获得什么？", "对白文字", "相机参数", "节目源码", "屏幕亮度"],
    ["连续剧的一季通常由什么组成？", "多集节目", "一个镜头", "一张照片", "一首歌曲"],
  ],
};
export function quizQuestions(category: QuizCategory, tracks: readonly QuizTrack[], seed: number): QuizQuestion[] {
  const random = gameRandom(seed);
  const arrange = (prompt: string, correct: string, wrong: string[], artwork?: string): QuizQuestion => {
    const answers = gameShuffle([correct, ...gameShuffle([...new Set(wrong)].filter(value => value && value !== correct), random).slice(0, 3)], random);
    return { prompt, answers, correct: answers.indexOf(correct), ...(artwork ? { artwork } : {}) };
  };
  const artists = [...new Set(tracks.map(item => item.artist ?? "").filter(Boolean))];
  const albums = [...new Set(tracks.map(item => item.album ?? "").filter(Boolean))];
  // Sample before deriving questions: large libraries must not produce an O(n²) deck.
  const sample = gameShuffle(tracks, random).slice(0, 128);
  const questions: QuizQuestion[] = category === "library" ? sample.flatMap(track => {
    const result: QuizQuestion[] = [];
    if (track.artist && artists.length >= 2)
      result.push(arrange(`「${track.title}」的艺人是？`, track.artist, artists, track.artwork));
    if (track.album && albums.length >= 2)
      result.push(arrange(`「${track.title}」出自哪张专辑？`, track.album, albums, track.artwork));
    const otherAlbumTitles = sample.filter(item => item.album && item.album !== track.album).map(item => item.title);
    if (track.album && otherAlbumTitles.length)
      result.push(arrange(`哪首歌曲来自「${track.album}」？`, track.title, otherAlbumTitles, track.artwork));
    const other = sample.find(item => item.title !== track.title);
    if (other && track.artist) {
      const truth = random() > 0.5, title = truth ? track.title : other.title;
      const correct = title === track.title || other.artist === track.artist;
      result.push({ prompt: `「${title}」的艺人是${track.artist}，对吗？`, answers: ["正确", "错误"], correct: correct ? 0 : 1 });
    }
    if (other) {
      result.push({ prompt: `「${track.title}」和「${other.title}」的歌名相同，对吗？`, answers: ["正确", "错误"], correct: 1 });
      if (track.album) result.push({ prompt: `「${track.title}」收录在「${track.album}」，对吗？`, answers: ["正确", "错误"], correct: 0, artwork: track.artwork });
    }
    return result.filter(question => question.answers.length >= 2);
  }) : facts[category].map(([prompt, correct, ...wrong]) => arrange(prompt, correct, wrong));
  return gameShuffle(questions, random).slice(0, category === "library" ? 8 : 10);
}
export type QuizState = { category: QuizCategory; seed: number; round: number; index: number;
  score: number; strikes: number; remaining: number; phase: "question" | "answer" | "bonus" | "wager" | "result";
  questions: QuizQuestion[]; chosen: number | null; bonus: boolean; wager: number; bonusKind?: "lightning" | "match" };
export function newQuiz(category: QuizCategory, tracks: readonly QuizTrack[], seed: number): QuizState {
  return { category, seed, round: 1, index: 0, score: 0, strikes: 0, remaining: 20,
    phase: "question", questions: quizQuestions(category, tracks, seed), chosen: null, bonus: false, wager: 10 };
}
export function answerQuiz(state: QuizState, answer: number): QuizState {
  if (state.phase !== "question" || !state.questions[state.index]) return state;
  const question = state.questions[state.index];
  const lightning = state.bonus && state.bonusKind !== "match";
  const correct = lightning ? question.correct === 0 && answer === 0 : question.correct === answer;
  const skippedFalse = lightning && question.correct === 1 && answer === -1;
  return { ...state, phase: "answer", chosen: answer,
    score: Math.max(0, state.score + (correct ? state.bonus ? state.wager : state.round * 10 : state.bonus && !skippedFalse ? -state.wager : 0)),
    strikes: state.strikes + (correct || state.bonus ? 0 : 1) };
}
export function advanceQuiz(state: QuizState, tracks: readonly QuizTrack[]): QuizState {
  if (state.phase !== "answer") return state;
  if (state.strikes >= 3) return { ...state, phase: "result" };
  if (state.index + 1 < state.questions.length)
    return { ...state, index: state.index + 1, phase: "question", chosen: null, remaining: state.bonus ? 10 : 20 };
  if (state.bonus) {
    if (state.round >= 5) return { ...state, phase: "result" };
    return { ...newQuiz(state.category, tracks, state.seed + state.round), seed: state.seed,
      round: state.round + 1, score: state.score, strikes: 0 };
  }
  return { ...state, phase: state.category === "library" ? "bonus" : "result" };
}
export function chooseQuizBonus(state: QuizState, kind: "lightning" | "match"): QuizState {
  return state.phase === "bonus" ? { ...state, phase: "wager", bonusKind: kind } : state;
}
export function startQuizBonus(state: QuizState, tracks: readonly QuizTrack[], wager: number): QuizState {
  if (!["bonus", "wager"].includes(state.phase) || ![10, 25, 50].includes(wager)) return state;
  const random = gameRandom(state.seed + state.round * 79);
  const pool = gameShuffle(tracks, random).slice(0, 128);
  const limit = wager === 10 ? 6 : wager === 25 ? 4 : 2;
  let questions: QuizQuestion[] = [];
  if (state.bonusKind === "match") {
    const fields = gameShuffle(["artist", "album", "year"] as const, random);
    for (const field of fields) {
      const labels = [...new Set(pool.map(track => track[field]).filter(value => value !== undefined && value !== ""))];
      if (labels.length < 2) continue;
      const pair = gameShuffle(labels, random).slice(0, 2);
      const answers = pair.map(String);
      questions = pool.filter(track => pair.includes(track[field]!)).map(track => ({
        prompt: `「${track.title}」${field === "artist" ? "的艺人是？" : field === "album" ? "来自哪张专辑？" : "发行于哪一年？"}`,
        answers, correct: pair.indexOf(track[field]!), artwork: track.artwork,
      })).slice(0, limit);
      break;
    }
  } else {
    // Lightning is Center for TRUE, silence for FALSE; no credit for skipping false.
    const artists = [...new Set(pool.map(track => track.artist).filter(Boolean))];
    questions = pool.filter(track => track.artist && artists.length > 1).map(track => {
      const claimed = random() < 0.5 ? track.artist! : artists.find(artist => artist !== track.artist)!;
      return { prompt: `「${track.title}」的艺人是${claimed}，对吗？`, answers: ["正确", "错误"],
        correct: claimed === track.artist ? 0 : 1, artwork: track.artwork };
    }).slice(0, limit);
    if (!questions.length) questions = quizQuestions("library", pool, state.seed + state.round)
      .filter(question => question.answers.length === 2).slice(0, limit);
  }
  // A sparse library may lack a pair; advance without inventing another account's music.
  if (!questions.length) return advanceQuiz({ ...state, phase: "answer", bonus: true, index: state.questions.length - 1 }, tracks);
  return { ...state, questions, phase: "question", bonus: true, bonusKind: state.bonusKind ?? "lightning", wager,
    index: 0, remaining: 10, chosen: null };
}
export function validQuiz(value: unknown): value is QuizState {
  if (!value || typeof value !== "object") return false;
  const state = value as QuizState;
  return ["library", "music", "movies", "tv"].includes(state.category) && Number.isSafeInteger(state.seed) &&
    Number.isInteger(state.round) && state.round >= 1 && state.round <= 5 && Number.isInteger(state.index) && state.index >= 0 && state.index < 10 &&
    Number.isFinite(state.score) && state.score >= 0 && Number.isInteger(state.strikes) && state.strikes >= 0 && state.strikes <= 3 &&
    Number.isFinite(state.remaining) && state.remaining >= 0 && state.remaining <= 20 && typeof state.bonus === "boolean" &&
    Number.isFinite(state.wager) && state.wager >= 0 && ["question", "answer", "bonus", "wager", "result"].includes(state.phase) &&
    (state.bonusKind === undefined || ["lightning", "match"].includes(state.bonusKind)) &&
    Array.isArray(state.questions) && state.questions.length <= (state.category === "library" ? 8 : 10) && state.questions.every(question => question && typeof question.prompt === "string" &&
      question.prompt.length <= 500 && Array.isArray(question.answers) && question.answers.length >= 2 && question.answers.length <= 4 &&
      question.answers.every(answer => typeof answer === "string" && answer.length <= 500) && Number.isInteger(question.correct) &&
      question.correct >= 0 && question.correct < question.answers.length &&
      (question.artwork === undefined || typeof question.artwork === "string" && question.artwork.length <= 3000)) &&
    (state.questions.length === 0 ? state.index === 0 : state.index < state.questions.length) &&
    (state.chosen === null || Number.isInteger(state.chosen) && state.chosen >= -1 && state.chosen < 4);
}
