export interface HSKWord {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  level: number;
}

export const HSK_DATA: HSKWord[] = [
  // HSK 1
  { id: 'hsk1-1', hanzi: '爱', pinyin: 'ài', translation: 'love', level: 1 },
  { id: 'hsk1-2', hanzi: '八', pinyin: 'bā', translation: 'eight', level: 1 },
  { id: 'hsk1-3', hanzi: '爸爸', pinyin: 'bàba', translation: 'dad / father', level: 1 },
  { id: 'hsk1-4', hanzi: '杯子', pinyin: 'bēizi', translation: 'cup / glass', level: 1 },
  { id: 'hsk1-5', hanzi: '北京', pinyin: 'Běijīng', translation: 'Beijing', level: 1 },
  { id: 'hsk1-6', hanzi: '本', pinyin: 'běn', translation: 'measure word for books', level: 1 },
  { id: 'hsk1-7', hanzi: '不客气', pinyin: 'búkèqi', translation: 'you are welcome', level: 1 },
  { id: 'hsk1-8', hanzi: '不', pinyin: 'bù', translation: 'no / not', level: 1 },
  { id: 'hsk1-9', hanzi: '菜', pinyin: 'cài', translation: 'dish / vegetable', level: 1 },
  { id: 'hsk1-10', hanzi: '茶', pinyin: 'chá', translation: 'tea', level: 1 },
  { id: 'hsk1-11', hanzi: '吃', pinyin: 'chī', translation: 'eat', level: 1 },
  { id: 'hsk1-12', hanzi: '出租车', pinyin: 'chūzūchē', translation: 'taxi', level: 1 },
  { id: 'hsk1-13', hanzi: '打电话', pinyin: 'dǎdiànhuà', translation: 'make a phone call', level: 1 },
  { id: 'hsk1-14', hanzi: '大', pinyin: 'dà', translation: 'big', level: 1 },
  { id: 'hsk1-15', hanzi: '的', pinyin: 'de', translation: 'possessive particle', level: 1 },
  { id: 'hsk1-16', hanzi: '点', pinyin: 'diǎn', translation: 'o\'clock', level: 1 },
  { id: 'hsk1-17', hanzi: '电脑', pinyin: 'diànnǎo', translation: 'computer', level: 1 },
  { id: 'hsk1-18', hanzi: '电视', pinyin: 'diànshì', translation: 'television', level: 1 },
  { id: 'hsk1-19', hanzi: '电影', pinyin: 'diànyǐng', translation: 'movie', level: 1 },
  { id: 'hsk1-20', hanzi: '东西', pinyin: 'dōngxi', translation: 'thing / stuff', level: 1 },
  { id: 'hsk1-21', hanzi: '都', pinyin: 'dōu', translation: 'all / both', level: 1 },
  { id: 'hsk1-22', hanzi: '读', pinyin: 'dú', translation: 'read', level: 1 },
  { id: 'hsk1-23', hanzi: '对不起', pinyin: 'duìbuqǐ', translation: 'sorry', level: 1 },
  { id: 'hsk1-24', hanzi: '多', pinyin: 'duō', translation: 'many / much', level: 1 },
  { id: 'hsk1-25', hanzi: '多少', pinyin: 'duōshao', translation: 'how many / how much', level: 1 },
  { id: 'hsk1-26', hanzi: '儿子', pinyin: 'érzi', translation: 'son', level: 1 },
  { id: 'hsk1-27', hanzi: '二', pinyin: 'èr', translation: 'two', level: 1 },
  { id: 'hsk1-28', hanzi: '饭店', pinyin: 'fàndiàn', translation: 'restaurant', level: 1 },
  { id: 'hsk1-29', hanzi: '飞机', pinyin: 'fēijī', translation: 'airplane', level: 1 },
  { id: 'hsk1-30', hanzi: '分钟', pinyin: 'fēnzhōng', translation: 'minute', level: 1 },
  { id: 'hsk1-31', hanzi: '高兴', pinyin: 'gāoxìng', translation: 'happy', level: 1 },
  { id: 'hsk1-32', hanzi: '个', pinyin: 'gè', translation: 'generic measure word', level: 1 },
  { id: 'hsk1-33', hanzi: '工作', pinyin: 'gōngzuò', translation: 'job / work', level: 1 },
  { id: 'hsk1-34', hanzi: '狗', pinyin: 'gǒu', translation: 'dog', level: 1 },
  { id: 'hsk1-35', hanzi: '汉语', pinyin: 'Hànyǔ', translation: 'Chinese language', level: 1 },
  { id: 'hsk1-36', hanzi: '好', pinyin: 'hǎo', translation: 'good', level: 1 },
  { id: 'hsk1-37', hanzi: '喝', pinyin: 'hē', translation: 'drink', level: 1 },
  { id: 'hsk1-38', hanzi: '和', pinyin: 'hé', translation: 'and', level: 1 },
  { id: 'hsk1-39', hanzi: '很', pinyin: 'hěn', translation: 'very', level: 1 },
  { id: 'hsk1-40', hanzi: '后面', pinyin: 'hòumian', translation: 'behind / back', level: 1 },
  // HSK 2 Sample
  { id: 'hsk2-1', hanzi: '吧', pinyin: 'ba', translation: 'suggestion particle', level: 2 },
  { id: 'hsk2-2', hanzi: '白', pinyin: 'bái', translation: 'white', level: 2 },
  { id: 'hsk2-3', hanzi: '百', pinyin: 'bǎi', translation: 'hundred', level: 2 },
  { id: 'hsk2-4', hanzi: '帮助', pinyin: 'bāngzhù', translation: 'help', level: 2 },
  { id: 'hsk2-5', hanzi: '报纸', pinyin: 'bàozhǐ', translation: 'newspaper', level: 2 },
  { id: 'hsk2-6', hanzi: '比', pinyin: 'bǐ', translation: 'compare / than', level: 2 },
  { id: 'hsk2-7', hanzi: '别', pinyin: 'bié', translation: 'do not', level: 2 },
  { id: 'hsk2-8', hanzi: '长', pinyin: 'cháng', translation: 'long', level: 2 },
  { id: 'hsk2-9', hanzi: '唱歌', pinyin: 'chànggē', translation: 'sing', level: 2 },
  { id: 'hsk2-10', hanzi: '出', pinyin: 'chū', translation: 'go out', level: 2 },
  // HSK 3 Sample
  { id: 'hsk3-1', hanzi: '阿姨', pinyin: 'āyí', translation: 'aunt', level: 3 },
  { id: 'hsk3-2', hanzi: '啊', pinyin: 'a', translation: 'ah', level: 3 },
  { id: 'hsk3-3', hanzi: '矮', pinyin: 'ǎi', translation: 'short (height)', level: 3 },
  { id: 'hsk3-4', hanzi: '爱好', pinyin: 'àihào', translation: 'hobby', level: 3 },
  { id: 'hsk3-5', hanzi: '安静', pinyin: 'ānjìng', translation: 'quiet', level: 3 },
];
