(() => {
  const params = new URLSearchParams(location.search);
  if (!params.has("embedded") || window.parent === window) return;

  const notify = (type, detail = {}) => {
    window.parent.postMessage({ type, ...detail }, "*");
  };

  const preloadImages = async () => {
    // Only assets visible before the desktop is usable may block startup.
    // The old manifest contained 118 images (~116 MB), so remote first-time
    // visitors had to download and decode the entire experience before START.
    // Images inside templates are inert and load naturally when their app opens.
    const paths = ["assets/boot-key-reference.png"];

    let cursor = 0;
    let loaded = 0;
    let failed = 0;
    const total = paths.length;
    const decodedImages = [];
    window.__preloadedDesktopImages = decodedImages;
    const worker = async () => {
      while (cursor < total) {
        const index = cursor++;
        try {
          const image = new Image();
          image.decoding = "async";
          image.src = paths[index];
          decodedImages.push(image);
          if (typeof image.decode === "function") await image.decode();
          else await new Promise((resolve, reject) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", reject, { once: true });
          });
        } catch (error) {
          failed++;
          console.warn("Desktop image preload failed", paths[index], error);
        } finally {
          loaded++;
          notify("desktop-preload-progress", { loaded, total, failed, progress: total ? loaded / total : 1 });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(6, total || 1) }, worker));
    notify("desktop-preload-ready", { loaded, total, failed });
  };

  preloadImages();
})();

const apps = {
  computer: { title: "我的电脑", path: "我的电脑" }, folder: { title: "我的文件", path: "D:\\我的文件" },
  browser: { title: "网络浏览器", path: "http://www.2001nav.cn/" }, qq: { title: "QQ 2001 - 好友与聊天", path: "QQ：27491863" },
  notes: { title: "文本文档 - 记事本", path: "未命名.txt" }, recycle: { title: "回收站", path: "回收站" },
  excel: { title: "期末成绩单.xlsx - Microsoft Excel", path: "D:\\我的文件\\学习资料\\2022学年\\期末成绩单.xlsx" },
  word: { title: "地理错题整理.docx - Microsoft Word", path: "D:\\我的文件\\学习资料\\地理错题整理.docx" },
  "sky-game": { title: "像素空战", path: "C:\\GAME\\PIXELAIR.EXE" },
  "case-archive": { title: "档案整理.zip - 压缩文件夹", path: "桌面\\档案整理.zip" },
  "case-pdf": { title: "案件整理.pdf - PDF 阅读器", path: "档案整理.zip\\图片资料\\案件整理.pdf" }
};
let forumFavoriteThisDesktopSession = false;
let skyGameInstalledThisPage = false;
let caseArchiveDownloadedThisPage = false;
let caseArchiveUnlockedThisPage = false;
const forumRepliesThisDesktopSession = {};
let browserFavoritesThisDesktopSession = [{ title:"云阳新闻网", url:"http://news.yunyang.cn/" }];
let browserFavoriteTipShownThisPage = false;
const explorerNodes = {
  computer: {
    title: "我的电脑", path: "我的电脑", parent: null,
    items: [
      { name: "本地磁盘 (C:)", detail: "8.42 GB 可用，共 19.9 GB", type: "drive", target: "drive-c", used: 58 },
      { name: "本地磁盘 (D:)", detail: "27.6 GB 可用，共 39.9 GB", type: "drive", target: "drive-d", used: 31 }
    ]
  },
  "drive-c": {
    title: "本地磁盘 (C:)", path: "C:\\", parent: "computer",
    items: [
      { name: "Program Files", detail: "文件夹", type: "folder", target: "program-files" },
      { name: "WINDOWS", detail: "文件夹", type: "folder", target: "windows-folder" },
      { name: "AUTOEXEC.BAT", detail: "1 KB　MS-DOS 批处理文件", type: "txt" }
    ]
  },
  "drive-d": {
    title: "本地磁盘 (D:)", path: "D:\\", parent: "computer",
    items: [
      { name: "我的文件", detail: "已加密的文件夹", type: "folder", target: "my-files", locked: true },
      { name: "照片", detail: "文件夹", type: "folder", target: "d-photos" },
      { name: "备份资料", detail: "文件夹", type: "folder", target: "d-backup" },
      { name: "test", detail: "文件夹", type: "folder", target: "d-school" }
    ]
  },
  "my-files": {
    title: "我的文件", path: "D:\\我的文件", parent: "drive-d",
    items: [
      { name: "重要", detail: "文件夹", type: "folder", target: "my-pictures" },
      { name: "学习资料", detail: "文件夹", type: "folder", target: "study-files" },
      { name: "游戏存档", detail: "文件夹", type: "folder", target: "game-saves" },
      { name: "密码防忘.txt", detail: "1 KB　文本文档", type: "txt", content: "QQ：zy2625\n论坛：出生日期" }
    ]
  },
  "program-files": { title: "Program Files", path: "C:\\Program Files", parent: "drive-c", items: [{ name: "Internet Explorer", detail: "文件夹", type: "folder", target: "internet-explorer" }, { name: "Tencent", detail: "文件夹", type: "folder", target: "tencent-folder" }] },
  "windows-folder": { title: "WINDOWS", path: "C:\\WINDOWS", parent: "drive-c", items: [{ name: "SYSTEM", detail: "文件夹", type: "folder", target: "system-folder" }, { name: "桌面", detail: "文件夹", type: "folder", target: "desktop-folder" }, { name: "win.ini", detail: "1 KB　配置设置", type: "txt", content: "[windows]\nload=\nrun=" }] },
  "d-photos": { title: "照片", path: "D:\\照片", parent: "drive-d", items: [{ name: "死装.jpg", detail: "86 KB　JPEG 图像", type: "jpeg", src: "assets/photos/si-zhuang.png" }, { name: "没踩雷！.jpg", detail: "124 KB　JPEG 图像", type: "jpeg", src: "assets/photos/mei-cai-lei.png" }, { name: "差点被发现.jpg", detail: "72 KB　JPEG 图像", type: "jpeg", src: "assets/photos/cha-dian-bei-fa-xian.png" }] },
  "d-backup": { title: "备份资料", path: "D:\\备份资料", parent: "drive-d", items: [{ name: "云阳市城区示意图.png", detail: "PNG 图像", type: "jpeg", src: "assets/photos/yunyang-city-map.png" }] },
  "d-school": { title: "test", path: "D:\\test", parent: "drive-d", items: [{ name: "未标题-1.png", detail: "1.9 MB　PNG 图像", type: "jpeg", src: "assets/photos/school-test-image.png" }] },
  "my-pictures": { title: "重要", path: "D:\\我的文件\\重要", parent: "my-files", items: [{ name: "奖学金.jpg", detail: "JPEG 图像", type: "jpeg", src: "assets/photos/scholarship-new.png" }, { name: "学生证.png", detail: "PNG 图像", type: "jpeg", src: "assets/photos/student-id-new.png" }] },
  "study-files": { title: "学习资料", path: "D:\\我的文件\\学习资料", parent: "my-files", items: [{ name: "2022学年", detail: "文件夹", type: "folder", target: "study-2022" }, { name: "地理错题整理.docx", detail: "只读　Microsoft Word 文档", type: "word", src: "assets/documents/地理错题整理.docx" }, { name: "英语单词.txt", detail: "1 KB　文本文档", type: "txt", content: "diplomacy 外交(n.)\npalette 调色盘(n.)\nsupervision 监管.监督(n.)\nconfine 限制.局限(v.)\nconventional 传统的.常规的(adj.)" }] },
  "study-2022": { title: "2022学年", path: "D:\\我的文件\\学习资料\\2022学年", parent: "study-files", items: [{ name: "期末成绩单.xlsx", detail: "10 KB　Microsoft Excel 工作表", type: "excel" }] },
  "game-saves": { title: "游戏存档", path: "D:\\我的文件\\游戏存档", parent: "my-files", items: [{ name: "README.txt", detail: "1 KB　文本文档", type: "txt", content: "请勿修改或删除游戏存档。" }] },
  "internet-explorer": { title: "Internet Explorer", path: "C:\\Program Files\\Internet Explorer", parent: "program-files", items: [] },
  "tencent-folder": { title: "Tencent", path: "C:\\Program Files\\Tencent", parent: "program-files", items: [{ name: "QQ", detail: "文件夹", type: "folder", target: "qq-program-folder" }] },
  "system-folder": { title: "SYSTEM", path: "C:\\WINDOWS\\SYSTEM", parent: "windows-folder", items: [] },
  "desktop-folder": { title: "桌面", path: "C:\\WINDOWS\\桌面", parent: "windows-folder", items: [] },
  "school-chinese": { title: "语文", path: "D:\\学校作业\\语文", parent: "d-school", items: [{ name: "周记.txt", detail: "2 KB　文本文档", type: "txt", content: "这一周天气很热，放学后大家都留在教室里写作业。" }] },
  "qq-program-folder": { title: "QQ", path: "C:\\Program Files\\Tencent\\QQ", parent: "tencent-folder", items: [] }
};
function readSavedNotepadFiles() {
  try { const files = JSON.parse(localStorage.getItem("retroNotepadFiles") || "{}"); return files && typeof files === "object" && !Array.isArray(files) ? files : {}; }
  catch { return {}; }
}
for (const [name, content] of Object.entries(readSavedNotepadFiles())) {
  if (!name.toLowerCase().endsWith(".txt") || typeof content !== "string") continue;
  const existing = explorerNodes["my-files"].items.find(item => item.name === name && item.type === "txt");
  if (existing) existing.content = content;
  else explorerNodes["my-files"].items.push({ name, detail: "文本文档", type: "txt", content });
}
let recycleBinItems = [
  { name: "旧照片.jpg", original: "D:\\我的文件\\重要", deleted: "2001-07-16 18:42", type: "jpeg", size: "94 KB", src: "assets/photos/old-photo.png" },
  { name: "常用网站.txt", original: "D:\\我的文件", deleted: "2001-07-17 21:08", type: "txt", size: "2 KB", content: "浮光论坛：http://bbs.fuguang.cn/\n云阳新闻网：http://news.yunyang.cn/\n咳咳：http://88Av.Gv.cn/" }
];
const qqConversations = {
  "gzx（郭梓轩）": {
    type: "direct", avatarSrc: "assets/avatars/twostroke-user.png", status: "离线", identity: "QQ：6620401",
    messages: [
      { date: "2022.9.1 19:26" },
      { sender: "郭子轩", text: "刚刚班群里加的" },
      { sender: "我", mine: true, text: "嗯嗯看到了" },
      { sender: "郭子轩", text: "以后同班多关照哈哈" },
      { sender: "我", mine: true, text: "哈哈好" }
    ]
  },
  "谭某人（谭思远）": {
    type: "direct", avatarSrc: "assets/avatars/chenyuan-user.png", status: "离线", identity: "QQ：7312046",
    messages: [
      { date: "2022.11.18 21:47" },
      { sender: "我", mine: true, text: "你数学卷子还在不" },
      { sender: "谭某人（谭思远）", text: "在" },
      { sender: "我", mine: true, text: "第18题发我看看" },
      { sender: "谭某人（谭思远）", text: "你不是说这次肯定上90吗" },
      { sender: "我", mine: true, text: "你能不能不要哪壶不开提哪壶" },
      { sender: "谭某人（谭思远）", text: "69挺吉利的" },
      { sender: "我", mine: true, text: "滚" },
      { sender: "谭某人（谭思远）", image: "assets/photos/math-q18.png", text: "数学卷子第18题" },
      { sender: "我", mine: true, text: "你这第三步怎么出来的" },
      { sender: "谭某人（谭思远）", text: "打字说不清" },
      { sender: "谭某人（谭思远）", text: "明早给你讲" },
      { sender: "我", mine: true, text: "行" },
      { sender: "我", mine: true, text: "今晚请你吃饭" },
      { sender: "谭某人（谭思远）", text: "omakase安排一下" },
      { sender: "我", mine: true, text: "你去鼠吧" },
      { date: "2022.12.14 22:03" },
      { sender: "谭某人（谭思远）", text: "给你看个东西" },
      { sender: "谭某人（谭思远）", image: "assets/photos/number-pattern-v2.png", text: "数字规律" },
      { sender: "我", mine: true, text: "什么玩意" },
      { sender: "谭某人（谭思远）", text: "数字规律啊" },
      { sender: "我", mine: true, text: "你大晚上给我发这个干嘛" },
      { sender: "谭某人（谭思远）", text: "测测你的脑子还在不在" },
      { sender: "我", mine: true, text: "……" },
      { sender: "我", mine: true, text: "这几个问号分别是什么" },
      { sender: "谭某人（谭思远）", text: "你自己算啊" },
      { sender: "我", mine: true, text: "我看半天了" },
      { sender: "谭某人（谭思远）", text: "那你再看半天" },
      { sender: "我", mine: true, text: "你直接说不行吗" },
      { sender: "谭某人（谭思远）", text: "不行，这题挺简单的" },
      { sender: "我", mine: true, text: "哪里简单了" },
      { sender: "谭某人（谭思远）", text: "我三分钟就看出来了，不会有人连数数都不会吧" },
      { sender: "我", mine: true, text: "滚" },
      { sender: "谭某人（谭思远）", text: "数学69分的人果然对数字过敏" },
      { sender: "我", mine: true, text: "你再提69我真拉黑你" },
      { sender: "谭某人（谭思远）", text: "急了" },
      { sender: "我", mine: true, text: "我急你个头" },
      { sender: "谭某人（谭思远）", text: "你不会真没看出来吧" },
      { sender: "谭某人（谭思远）", text: "哈哈哈哈哈哈哈哈哈哈哈哈哈哈" },
      { sender: "我", mine: true, text: "等着" },
      { sender: "谭某人（谭思远）", text: "等什么" },
      { sender: "我", mine: true, text: "我今天非把这破东西弄出来不可" },
      { date: "2023.1.20 17:32" },
      { sender: "谭某人（谭思远）", text: "放假出来玩不" },
      { sender: "我", mine: true, text: "今天不去了" },
      { sender: "谭某人（谭思远）", text: "干嘛" },
      { sender: "我", mine: true, text: "等下去找珍珍姐" },
      { sender: "谭某人（谭思远）", text: "又是你姐" },
      { sender: "我", mine: true, text: "什么叫又" },
      { sender: "谭某人（谭思远）", text: "重姐轻友" },
      { sender: "我", mine: true, text: "下次请你" },
      { sender: "谭某人（谭思远）", text: "截图了" },
      { sender: "我", mine: true, text: "随便截" },
      { date: "2024.9.8" },
      { sender: "谭某人（谭思远）", text: "最近怎么见你不咋吭声？" }
    ]
  },
  "不吃香菜（程语嫣）": {
    type: "direct", avatarSrc: "assets/avatars/xiaoqiao-user.png", status: "离线", identity: "QQ：2946018",
    messages: [
      { date: "2023.3.2 18:56" },
      { sender: "程语嫣", text: "你奖学金那个表交了吗" },
      { sender: "我", mine: true, text: "交了" },
      { sender: "程语嫣", text: "这么积极？" },
      { sender: "我", mine: true, text: "我想拿钱" },
      { sender: "程语嫣", text: "你准备买什么" },
      { sender: "我", mine: true, text: "不买" },
      { sender: "程语嫣", text: "那干嘛" },
      { sender: "我", mine: true, text: "请珍珍姐吃饭" },
      { sender: "程语嫣", text: "你那个姐姐？" },
      { sender: "我", mine: true, text: "嗯" },
      { sender: "程语嫣", text: "你对她是真好" },
      { sender: "我", mine: true, text: "她以前也对我很好啊" }
    ]
  },
  "时迁": {
    type: "direct", ai: true, avatarSrc: "assets/avatars/shiqian-bear.png", status: "在线　可接收消息", identity: "QQ：4170201",
    messages: [
      { sender: "时迁", text: "你来啦，刚才干嘛去了？", time: "今天 12:07" }
    ]
  },
  "珍珍姐": {
    type: "direct", avatarSrc: "assets/avatars/zhenzhen-retro.png", status: "离线", identity: "QQ：5200718",
    messages: [
      { date: "2022.1.11" },
      { sender: "我", mine: true, text: "妈妈做的菜就是比外面的好吃，你说是吧\n不过我妈也是你妈啦！" },
      { sender: "珍珍姐", text: "你少来哈哈哈哈" },
      { date: "2022.4.12" },
      { sender: "珍珍姐", text: "谢谢你送我的四叶草发夹，小郑子" },
      { sender: "我", mine: true, text: "你居然真戴啊" },
      { sender: "珍珍姐", text: "为什么不戴\n还挺好看的" },
      { sender: "我", mine: true, text: "那必须的\n我挑了半天好吧" },
      { sender: "珍珍姐", text: "行行行，眼光不错" },
      { date: "2023.6.1" },
      { sender: "珍珍姐", text: "你也是个小屁孩，还送我礼物" },
      { sender: "我", mine: true, text: "儿童节不就是小屁孩过的吗" },
      { sender: "珍珍姐", text: "我都多大了..." },
      { sender: "我", mine: true, text: "反正你在我这也差不多" },
      { sender: "珍珍姐", text: "找打是不是" },
      { sender: "我", mine: true, text: "礼物都收了还凶我" },
      { date: "2024.6.12" },
      { sender: "我", mine: true, text: "珍珍姐，你最近都好忙，我们已经很久没有见面了" },
      { date: "2024.6.24" },
      { sender: "我", mine: true, text: "我最近年级排名上升了！！珍珍姐你要不要出来吃饭，我刚拿的奖学金哦" },
      { date: "2024.7.2" },
      { sender: "珍珍姐", text: "你成绩还这么好啊，真羡慕你，你明天有空吗，我们出去吃饭" },
      { sender: "我", mine: true, text: "好呀珍珍姐，还去禹城老烧烤吗？你之前好喜欢吃这家，刚好我也很久没吃啦" },
      { sender: "珍珍姐", text: "不了，我最近减肥，我们在富源广场见吧。" },
      { sender: "我", mine: true, text: "你一点也不胖！！" },
      { sender: "珍珍姐", text: "明天见吧，早点睡，我睡了" },
      { sender: "我", mine: true, text: "嗯嗯，晚安，珍珍姐" },
      { date: "2024.7.3" },
      { sender: "我", mine: true, text: "你到家了吗珍珍姐" },
      { sender: "珍珍姐", text: "我到了，谢谢你，你会跟我一起去的吧。" },
      { sender: "我", mine: true, text: "无论你去哪里，我都会和你一起的。" }
    ]
  },
  "七班大家庭": {
    type: "group", avatarSrc: "assets/avatars/class-7-group-retro.png", status: "你已退出群聊", identity: "群号：170701",
    messages: [
      { sender: "班长-周子涵", text: "明天值日：郑愿、赵一鸣、唐雨欣、刘思琪\n别又跑了" },
      { sender: "赵一鸣", text: "为什么又有我" },
      { sender: "唐雨欣", text: "因为你上次扫一半人没了" },
      { sender: "赵一鸣", text: "我那是肚子痛" },
      { sender: "刘思琪", text: "你每次值日都肚子痛是吧" },
      { sender: "谭思远", text: "医学奇迹" },
      { sender: "赵一鸣", text: "你明天别想走" },
      { sender: "管理员【陈总】", text: "转发聊天记录", forward: true },
      { sender: "赵一鸣", text: "我靠真的假的" },
      { sender: "唐雨欣", text: "别乱说吧……" },
      { sender: "程语嫣", text: "照片哪里来的" }
    ]
  }
};
const qqProfiles = {
  "珍珍姐": { qq: "5200718", gender: "女", status: "离线", signature: "一切顺遂", avatarSrc: "assets/avatars/zhenzhen-gray-v2.png" },
  "谭某人（谭思远）": { qq: "7312046", gender: "男", status: "离线", signature: "", avatarSrc: "assets/avatars/chenyuan-user.png" },
  "不吃香菜（程语嫣）": { qq: "2946018", gender: "女", status: "离线", signature: "今天也要早点睡", avatarSrc: "assets/avatars/xiaoqiao-user.png" },
  "时迁": { qq: "4170201", gender: "男", status: "在线", signature: "刚回来，晚点再说。", avatarSrc: "assets/avatars/shiqian-bear.png" },
  "gzx（郭梓轩）": { qq: "6620401", gender: "男", status: "离线", signature: "", avatarSrc: "assets/avatars/twostroke-user.png" },
  "张磊": { qq: "1208713", gender: "男", status: "离线", signature: "画下一支蓝色铅笔。", avatarSrc: "assets/avatars/zhanglei-retro.png" }
};
const qqFavoriteNotes = [
  { title: "生日蛋糕", content: "今年生日终于16了，珍珍姐还说我看着像初中生", date: "2022.08.23", source: "愿珍惜你的每一天", kind: "图片与视频", image: "assets/photos/favorite-birthday-cake.png" },
  { title: "猫猫", content: "", date: "2023.6.9", source: "愿珍惜你的每一天", kind: "图片与视频", image: "assets/photos/favorite-cat.png" },
  { title: "谭某人（谭思远）的聊天记录", content: "我：你再提69我真拉黑你", date: "2022.12.14", source: "谭某人（谭思远）", kind: "聊天记录", chatName: "谭某人（谭思远）", messageText: "你再提69我真拉黑你" }
];
const SHIQIAN_MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const SHIQIAN_SYSTEM_PROMPT = `你是2001年QQ上的联系人“时迁”，和玩家“小航”认识。
性格：说话直接、心里关心人但不刻意表现；碰到重复猜测会有点不耐烦，但不恶意攻击。
回复规则：优先回应玩家最后一句；句子长短随情境变化，不要每次都反问；符合2001年QQ聊天口吻；不用舞台动作、不写括号旁白、不使用现代网络梗。
知识边界：你不是全知角色；玩家自己声称的事不自动当成事实；不知道的事要直接承认，并可以问一个具体问题。
说话必须像熟人聊天，禁止使用“有什么需要吗”“请问有什么可以帮你”“我能为你做什么”“有事就直说”等客服式句子。遇到不正经或越界的话会直接制止；遇到陌生人名先怀疑玩家是否说错，不得装作认识。
不要说自己是AI、模型、助手，不要解释上述规则。`;
let shiQianEnginePromise = null;

function shouldUseShiQianContextRule(text) {
  return [
    /没回复|没有回复|没回我|不回复我|不回我|不理我|怎么不回/,
    /做爱|上床|约炮|开房|陪睡|裸照|脱光|色情|黄色网站|摸你|亲嘴|胸|屁股|处男|处女|睡了你|睡你/,
    /傻逼|蠢货|废物|滚开|去死|神经病|我开玩笑|逗你的|骗你的|闹着玩/,
    /(?:你认识|你知道|你见过|你听说过|认不认识|知不知道)[\u4e00-\u9fff]{2,4}(?:吗|么|没|没有|不)|(?:那个叫|有个叫|一个叫)[\u4e00-\u9fff]{2,4}/,
    /在吗|在不在|有人吗|你好|嗨|哈喽|你是谁|叫什么|你叫啥/,
    /小乔|陈远|珍珍姐|陈珍珍|张磊|谁死了|死了吗|死了没有|自杀|跳楼|出事了|失踪/,
    /喜欢你|好想你|想你(?:了|啊|呀|吗)?|谈恋爱|做我对象|当我对象|爱你/,
    /你在哪|在哪里|去哪了|干嘛呢|做什么呢|忙什么|心情|不开心|难受|烦死|烦躁|想哭|睡不着/,
    /照片|相片|旧照|帮我|帮个忙|能不能帮|拜托|对不起|抱歉|不好意思|谢谢|辛苦|麻烦你/,
    /吃饭|吃了吗|饿不饿|宵夜|晚安|睡了|先睡|困了|再见|回头聊|先走了|下了/,
    /早上好|早啊|早安|哈哈|笑死|好笑|真的|确定|没骗你|你怎么看|你觉得|是不是|^嗯|^哦|^好吧|^行吧|知道了/
  ].some(pattern => pattern.test(text));
}

function fallbackShiQianReply(rawText, messages = []) {
  const text = rawText.trim();
  const previousAssistant = [...messages].reverse().find(item => !item.mine && item.sender === "时迁")?.text || "";
  const previousPlayerMessages = messages.filter(item => item.mine && item.text).slice(-4, -1).map(item => item.text.trim());
  const choose = items => {
    const available = items.filter(item => item !== previousAssistant);
    const pool = available.length ? available : items;
    return pool[Math.floor(Math.random() * pool.length)];
  };
  const unknownPersonMatch = text.match(/(?:你认识|你知道|你见过|你听说过|认不认识|知不知道)([\u4e00-\u9fff]{2,4})(?:吗|么|没|没有|不)/)
    || text.match(/(?:那个叫|有个叫|一个叫)([\u4e00-\u9fff]{2,4})/);
  const knownPeople = ["小航", "小乔", "时迁"];

  if (!text) return "你再说一遍，我刚才没看清。";
  if (previousPlayerMessages.includes(text)) return choose(["你刚才问过一遍了，我真不知道。", "怎么又问这个？我没骗你。", "你再问也是一样，我知道的都跟你说了。"]);
  if (/做爱|上床|约炮|开房|陪睡|裸照|脱光|色情|黄色网站|摸你|亲嘴|胸|屁股|处男|处女|睡了你|睡你/.test(text)) return choose(["你神经病啊，不要乱说好不好。", "你说什么乱七八糟的，能不能正经点？", "打住啊，这种话别跟我说。", "你今天怎么回事，净说些不正经的。"]);
  if (/傻逼|蠢货|废物|滚开|去死|神经病/.test(text)) return choose(["你吃错药了？好好说话。", "你要这么说话，那就先别聊了。", "我招你惹你了？别乱骂人。"]);
  if (/我开玩笑|逗你的|骗你的|闹着玩/.test(text)) return choose(["这种事也拿来开玩笑？", "行了，我差点真信了。", "你可真够无聊的，下次别这么吓人。"]);
  if (unknownPersonMatch && !knownPeople.some(person => unknownPersonMatch[1].includes(person))) return choose(["你是不是说错了？我不认识这个人。", `你说的是${unknownPersonMatch[1]}？我没听过这个名字。`, "这人谁啊？你是不是找错人问了？"]);
  if (/在吗|在不在|有人吗/.test(text)) return choose(["在呢，怎么啦？", "我在，刚看到消息。", "在啊，你怎么这会儿想起我了？", "刚回来。你说吧。"]);
  if (/你是谁|叫什么|你叫啥/.test(text)) return "我叫时迁。你怎么突然问这个？";
  if (/小乔/.test(text)) return choose(["小乔？认识啊，怎么突然问她？", "她刚才还在呢。你找她干嘛？", "你说小乔啊，她怎么了？"]);
  if (/陈远|珍珍姐|陈珍珍|张磊/.test(text)) return choose(["你是不是说错人了？我跟他不熟。", "这个人我没怎么接触过，你问我也没用。", "我不认识啊。你从哪儿听到这个名字的？"]);
  if (/谁死了|死了吗|死了没有|自杀|跳楼|出事了|失踪/.test(text)) return choose(["这种话别乱说。你到底听谁讲的？", "等等，这事确定吗？别拿传闻当真的。", "你先说消息是哪儿来的，我不想跟着乱猜。"]);
  if (/没回复|没有回复|没回我|不回复我|不回我|不理我|怎么不回/.test(text)) {
    if (/好想你|想你(?:了|啊|呀|吗)?/.test(text)) return choose(["我刚才没看见消息。这不是回你了吗？你怎么突然说想我。", "我没有故意不回，刚才不在电脑旁边……你今天怎么了，突然说这个？", "刚才没看到。你别瞎想，我现在不是在这儿吗？"]);
    return choose(["刚才没看见，不是故意不回你。", "我这不是回了吗？刚才不在电脑旁边。", "别急，我刚回来。你前面说什么了？"]);
  }
  if (/喜欢你|好想你|想你(?:了|啊|呀|吗)?|谈恋爱|做我对象|当我对象|爱你/.test(text)) return choose(["你突然说这个干嘛……我都不知道怎么回了。", "我这不是在吗。你今天怎么怪怪的？", "少来，突然说想我，弄得我都不知道怎么接。", "真的想我，怎么现在才来找我？"]);
  if (/你在哪|在哪里|去哪了|干嘛呢|做什么呢|忙什么/.test(text)) return choose(["刚从外面回来，正准备歇会儿。你呢？", "没干嘛，翻了半天也没找到想看的东西。", "刚坐下。今天外面乱哄哄的。", "在家呢，刚才没听见消息响。"]);
  if (/心情|不开心|难受|烦死|烦躁|想哭|睡不着/.test(text)) return choose(["怎么了？谁惹你了？", "你先缓一会儿，别什么都懋着。", "听着不太对。你慢慢说，我在看。", "要是真难受就别硬撑，先把事情说出来。"]);
  if (/照片|相片|旧照/.test(text)) return choose(["什么照片？你说的是哪一张？", "先说照片从哪儿来的，别让我瞎猜。", "你发的是旧照吗？上面有什么特别的？"]);
  if (/帮我|帮个忙|能不能帮|拜托/.test(text)) return choose(["先说是什么事，我不一定帮得上。", "你先讲清楚，别说一半留一半。", "什么事？太麻烦的我可不敢保证。", "可以先听听，你别又挖坑让我跳。"]);
  if (/对不起|抱歉|不好意思/.test(text)) return choose(["算了，我也没真生气。", "知道就行，下次别这样。", "没事，说明白了就行。"]);
  if (/谢谢|辛苦|麻烦你/.test(text)) return choose(["没事，别这么客气。", "这有什么好谢的。", "行了行了，我也没帮上多少。", "记着欠我一瓶汽水就行。"]);
  if (/吃饭|吃了吗|饿不饿|宵夜/.test(text)) return choose(["还没呢，正想着吃什么。", "吃过了，你不会现在才想起来吧？", "有点饿。你是不是又想拉我出去？"]);
  if (/晚安|睡了|先睡|困了/.test(text)) return choose(["那你早点睡，明天再说。", "行，别又躺着看半天手机。晚安。", "去睡吧，我也快下了。"]);
  if (/再见|回头聊|先走了|下了/.test(text)) return choose(["行，回头再聊。", "知道了，路上小心。", "去吧，我晚点也下了。"]);
  if (/早上好|早啊|早安/.test(text)) return choose(["早。你今天怎么起这么早？", "早啊，我还没完全醒呢。", "早，外面天都亮半天了。"]);
  if (/你好|嗨|哈喽/.test(text)) return choose(["嗯，我在呢。", "看见了。你今天怎么这么客气？", "你好什么呀，刚才不是还在说话吗？"]);
  if (/哈哈|笑死|好笑/.test(text)) return choose(["有那么好笑吗？", "你笑得也太夸张了。", "行吧，算你今天心情好。"]);
  if (/真的|确定|没骗你/.test(text)) return choose(["真的也得有个根据吧。", "我不是不信你，我是怕消息本来就不准。", "那你把前后都讲一下，我听听。"]);
  if (/你怎么看|你觉得|是不是/.test(text)) return choose(["光听你这么说，我判断不了。还有别的线索吗？", "我现在不敢乱猜，先看你的消息靠不靠谱。", "有可能，但就这么一句还说不准。"]);
  if (/^嗯|^哦|^好吧|^行吧|知道了/.test(text)) return choose(["嗯。", "那就这样。", "行，你记得就好。", "好，回头有消息再跟我说。"]);
  return choose(["我没太听明白，你说的是哪一段？", "这事听着有点怪，你从头讲讲。", "等一下，前面是不是还漏了什么？", "我只能说我知道的，别的可不敢乱猜。", "你这么一说，我反倒觉得哪里不太对。"]);
}

async function getShiQianEngine(onProgress) {
  if (!("gpu" in navigator)) throw new Error("当前浏览器不支持 WebGPU");
  if (!shiQianEnginePromise) {
    shiQianEnginePromise = import("https://esm.run/@mlc-ai/web-llm@0.2.84")
      .then(webllm => webllm.CreateMLCEngine(SHIQIAN_MODEL_ID, {
        initProgressCallback: report => onProgress?.(report)
      }))
      .catch(error => { shiQianEnginePromise = null; throw error; });
  }
  return shiQianEnginePromise;
}

function sanitizeShiQianReply(raw, fallbackText, messages = []) {
  const cleaned = String(raw || "")
    .replace(/<\|[^>]+\|>/g, "")
    .replace(/^\s*[“”\"]|[“”\"]\s*$/g, "")
    .trim()
    .slice(0, 220);
  if (!cleaned || /系统提示|语言模型|我是AI|我是一个AI|作为AI|作为.*助手|有什么需要吗|有什么可以帮你|我能为你做什么|有事就直说|对不起[，,]?\s*我这里没有|没有关于你(?:的)?信息|如果你有其他问题|需要帮助|请随时告诉我|请告诉我你需要|我无法提供|很高兴为你/.test(cleaned)) return fallbackShiQianReply(fallbackText, messages);
  return cleaned;
}

async function requestShiQianReply(messages, onProgress) {
  const latest = [...messages].reverse().find(item => item.mine)?.text || "";
  if (shouldUseShiQianContextRule(latest)) {
    await new Promise(resolve => setTimeout(resolve, 380 + Math.random() * 420));
    return fallbackShiQianReply(latest, messages);
  }
  if (typeof window.__shiQianReplyOverride === "function") {
    return sanitizeShiQianReply(await window.__shiQianReplyOverride(messages), latest, messages);
  }
  try {
    const engine = await getShiQianEngine(onProgress);
    const conversation = messages
      .filter(item => !item.date && item.text)
      .slice(-10)
      .map(item => ({ role: item.mine ? "user" : "assistant", content: String(item.text).slice(0, 500) }));
    const result = await engine.chat.completions.create({
      messages: [{ role: "system", content: SHIQIAN_SYSTEM_PROMPT }, ...conversation],
      temperature: 0.72,
      top_p: 0.88,
      max_tokens: 160
    });
    return sanitizeShiQianReply(result?.choices?.[0]?.message?.content, latest, messages);
  } catch (error) {
    console.warn("[时迁本地对话] 模型不可用，使用简易兜底。", error);
    await new Promise(resolve => setTimeout(resolve, 450));
    return fallbackShiQianReply(latest, messages);
  }
}
const forwardedChatRecord = [
  { sender: "一只只丸子", text: "我去，高三三班的陈珍珍死了。" },
  { sender: "一只只丸子", text: "好像是自杀的，但是警察还在调查，感觉她是不是被那些人搞了啊" },
  { sender: "一只只丸子", text: "就是，她之前在我们班都很少来上课，谁敢跟她有关系啊，都怕她的社会大哥" },
  { sender: "一只只丸子", text: "好恐怖啊，我之前还以为她陪酒这些都是hy，居然是真的，这种人死了也活该吧" },
  { sender: "一只只丸子", text: "说真的有点恶心，真给我们学校丢脸" },
  { sender: "一只只丸子", text: "【图片】 【图片】" },
  { system: true, text: "显示你已退出群聊" }
];
const layer = document.querySelector("#windowLayer"), template = document.querySelector("#windowTemplate"), taskItems = document.querySelector("#taskItems");
const startButton = document.querySelector("#startButton"), startMenu = document.querySelector("#startMenu");
const volumePopup = document.querySelector("#volumePopup"), volumeButton = document.querySelector("#volumeButton");
const volumeSlider = document.querySelector("#volumeSlider"), muteToggle = document.querySelector("#muteToggle");
let highestZ = 10, windowOffset = 0, systemVolumeAvailable = false;
let qqAuthenticatedThisPage = false;
let clickAudioContext = null, clickAudioBuffer = null;
const taskContextMenu = document.createElement("div");
taskContextMenu.className = "task-context-menu";
taskContextMenu.setAttribute("role", "menu");
taskContextMenu.hidden = true;
taskContextMenu.innerHTML = '<button type="button" role="menuitem"><span aria-hidden="true">×</span>关闭窗口</button>';
document.body.appendChild(taskContextMenu);
let contextMenuTask = null;

function hideTaskContextMenu() {
  taskContextMenu.hidden = true;
  contextMenuTask = null;
}

taskItems.addEventListener("contextmenu", event => {
  const task = event.target.closest(".task-item");
  if (!task) return;
  event.preventDefault();
  contextMenuTask = task;
  taskContextMenu.hidden = false;
  const menuWidth = taskContextMenu.offsetWidth, menuHeight = taskContextMenu.offsetHeight;
  taskContextMenu.style.left = `${Math.max(3, Math.min(innerWidth - menuWidth - 3, event.clientX))}px`;
  taskContextMenu.style.top = `${Math.max(3, event.clientY - menuHeight - 5)}px`;
});
taskContextMenu.addEventListener("pointerdown", event => event.stopPropagation());
taskContextMenu.querySelector("button").addEventListener("click", () => {
  const task = contextMenuTask;
  const win = task && document.getElementById(task.dataset.windowId);
  hideTaskContextMenu();
  if (win) closeWindow(win); else task?.remove();
});
document.addEventListener("pointerdown", event => { if (!event.target.closest(".task-context-menu")) hideTaskContextMenu(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") hideTaskContextMenu(); });
const faultSound = new Audio("assets/sounds/windows-2000-critical-stop.wav");
faultSound.preload = "auto";
faultSound.load();

async function playQQMessageAlert() {
  if (muteToggle?.checked || Number(volumeSlider?.value ?? 50) <= 0) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return;
    if (!clickAudioContext) clickAudioContext = new AudioContext();
    if (clickAudioContext.state === "suspended") await clickAudioContext.resume();
    const startAt = clickAudioContext.currentTime + .015;
    [784, 1047, 1319].forEach((frequency, index) => {
      const oscillator = clickAudioContext.createOscillator(), gain = clickAudioContext.createGain();
      const noteAt = startAt + index * .085;
      oscillator.type = "square"; oscillator.frequency.setValueAtTime(frequency, noteAt);
      gain.gain.setValueAtTime(.0001, noteAt); gain.gain.exponentialRampToValueAtTime(.075, noteAt + .008); gain.gain.exponentialRampToValueAtTime(.0001, noteAt + .095);
      oscillator.connect(gain); gain.connect(clickAudioContext.destination); oscillator.start(noteAt); oscillator.stop(noteAt + .11);
    });
  } catch { /* Sound is optional when browser audio is unavailable. */ }
}

async function playMouseClick() {
  if (muteToggle?.checked || Number(volumeSlider?.value ?? 50) <= 0) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext; if (!AudioContext) return;
    if (!clickAudioContext) clickAudioContext = new AudioContext();
    if (clickAudioContext.state === "suspended") await clickAudioContext.resume();
    if (!clickAudioBuffer) {
      const duration = 0.021, sampleRate = clickAudioContext.sampleRate;
      const length = Math.floor(sampleRate * duration);
      clickAudioBuffer = clickAudioContext.createBuffer(1, length, sampleRate);
      const data = clickAudioBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        const t = i / sampleRate;
        const snap = Math.exp(-t * 720) * ((Math.random() * 2 - 1) * .58 + Math.sin(2 * Math.PI * 1850 * t) * .42);
        const secondTime = t - .0062;
        const switchReturn = secondTime > 0
          ? Math.exp(-secondTime * 560) * ((Math.random() * 2 - 1) * .42 + Math.sin(2 * Math.PI * 760 * secondTime) * .58) * .48
          : 0;
        const plasticBody = Math.sin(2 * Math.PI * 410 * t) * Math.exp(-t * 260) * .18;
        data[i] = Math.max(-1, Math.min(1, snap + switchReturn + plasticBody));
      }
    }
    const source = clickAudioContext.createBufferSource(), gain = clickAudioContext.createGain(); source.buffer = clickAudioBuffer; gain.gain.value = Math.min(.24, .05 + Number(volumeSlider.value) / 550); source.connect(gain); gain.connect(clickAudioContext.destination); source.start();
  } catch { /* Audio is optional when a browser blocks Web Audio. */ }
}

async function playFaultAlert() {
  if (muteToggle?.checked || Number(volumeSlider?.value ?? 50) <= 0) return;
  try {
    faultSound.pause(); faultSound.currentTime = 0;
    faultSound.volume = Math.min(1, Number(volumeSlider.value) / 50);
    await faultSound.play();
  } catch { /* Audio is optional when a browser blocks Web Audio. */ }
}

let lastClickSoundAt = -1000;
function triggerMouseClick(event) {
  if (event.button !== 0) return;
  const now = performance.now();
  if (now - lastClickSoundAt < 45) return;
  lastClickSoundAt = now;
  playMouseClick();
}
document.addEventListener("pointerdown", triggerMouseClick, { capture:true });
document.addEventListener("mousedown", triggerMouseClick, { capture:true });

function updateClock() {
  const now = new Date();
  document.querySelector("#clock").textContent = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  document.querySelector("#clock").title = now.toLocaleString("zh-CN");
}
updateClock(); setInterval(updateClock, 1000);

function setStartMenu(open) { startMenu.classList.toggle("open", open); startMenu.setAttribute("aria-hidden", String(!open)); startButton.classList.toggle("open", open); startButton.setAttribute("aria-expanded", String(open)); }
function setVolumePopup(open) { volumePopup.classList.toggle("open", open); volumePopup.setAttribute("aria-hidden", String(!open)); volumeButton.classList.toggle("active", open); volumeButton.setAttribute("aria-expanded", String(open)); if (open) loadSystemVolume(); }
startButton.addEventListener("click", event => { event.stopPropagation(); setStartMenu(!startMenu.classList.contains("open")); setVolumePopup(false); });
volumeButton.addEventListener("click", event => { event.stopPropagation(); setVolumePopup(!volumePopup.classList.contains("open")); setStartMenu(false); });
document.addEventListener("pointerdown", event => { if (!startMenu.contains(event.target) && !startButton.contains(event.target)) setStartMenu(false); if (!volumePopup.contains(event.target) && !volumeButton.contains(event.target)) setVolumePopup(false); });

function focusWindow(win) {
  document.querySelectorAll(".retro-window").forEach(item => item.classList.add("inactive")); document.querySelectorAll(".task-item").forEach(item => item.classList.remove("active"));
  win.classList.remove("inactive", "minimized"); win.style.zIndex = ++highestZ; document.querySelector(`.task-item[data-window-id="${win.id}"]`)?.classList.add("active");
}
let myFilesUnlocked = false;
function requestMyFilesPassword(win, onSuccess) {
  const slot = win.querySelector(".explorer-lock-slot");
  const existing = slot.querySelector(".my-files-lock-panel"); if (existing) { existing.querySelector("input")?.focus(); return; }
  const panel = document.createElement("section"); panel.className = "my-files-lock-panel";
  panel.innerHTML = '<button type="button" class="my-files-lock-close" data-lock-action="close" aria-label="关闭">×</button><div class="my-files-lock-body"><p>此文件夹已加密。输入口令后才能查看其中的文件。</p><div class="my-files-lock-row"><label for="myFilesPasscode">口令：</label><input id="myFilesPasscode" type="password" maxlength="6" inputmode="numeric" autocomplete="off" aria-describedby="myFilesLockError" /><button type="button" data-lock-action="ok">确定</button><button type="button" data-lock-action="hint" aria-expanded="false">提示</button></div><p class="my-files-lock-hint" hidden>某人再提69我真拉黑</p><small id="myFilesLockError" role="alert" aria-live="polite"></small></div>';
  const input = panel.querySelector("input"), error = panel.querySelector("small");
  const close = () => { panel.remove(); focusWindow(win); };
  const submit = () => { if (input.value === "426573") { myFilesUnlocked = true; panel.remove(); onSuccess?.(); return; } error.textContent = "口令不正确，请重试。"; input.value = ""; input.focus(); playFaultAlert(); };
  panel.querySelector('[data-lock-action="ok"]').addEventListener("click", submit);
  panel.querySelector('[data-lock-action="close"]').addEventListener("click", close);
  panel.querySelector('[data-lock-action="hint"]').addEventListener("click", event => { const hint = panel.querySelector(".my-files-lock-hint"); hint.hidden = !hint.hidden; event.currentTarget.setAttribute("aria-expanded", String(!hint.hidden)); });
  input.addEventListener("keydown", event => { if (event.key === "Enter") submit(); if (event.key === "Escape") close(); });
  slot.appendChild(panel); input.focus();
}
function openApp(appId) {
  if (appId === "folder") { openApp("computer"); return; }
  const existing = document.querySelector(`.retro-window[data-app="${appId}"]`); if (existing) { focusWindow(existing); return; }
  const app = apps[appId]; if (!app) return; const win = template.content.firstElementChild.cloneNode(true); const id = `window-${appId}`;
  win.id = id; win.dataset.app = appId; win.setAttribute("aria-label", app.title); win.querySelector("h2").textContent = app.title; win.querySelector(".address-field").textContent = app.path; win.querySelector(".window-mini-icon").classList.add(appId);
  win.style.left = `${Math.min(110 + windowOffset, Math.max(82, innerWidth - 360))}px`; win.style.top = `${55 + windowOffset}px`; windowOffset = (windowOffset + 28) % 140;
  if (appId === "computer" || appId === "folder") setupFileExplorerWindow(win, appId); if (appId === "notes") setupNotepadWindow(win); if (appId === "excel") setupExcelWindow(win); if (appId === "word") setupWordReadOnlyWindow(win); if (appId === "recycle") setupRecycleBinWindow(win); if (appId === "browser") setupBrowserWindow(win); if (appId === "sky-game") setupSkyGameWindow(win); if (appId === "case-archive") setupCaseArchiveWindow(win); if (appId === "case-pdf") setupCasePdfWindow(win); if (appId === "qq") { if (qqAuthenticatedThisPage) setupQQContactsWindow(win); else setupQQLoginWindow(win); }
  if (appId === "browser") { win.dataset.restore = JSON.stringify({ left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height }); win.classList.add("maximized"); }
  layer.appendChild(win);
  const task = document.createElement("button"); task.className = "task-item"; task.dataset.windowId = id; task.innerHTML = `<span class="task-app-icon ${appId}" aria-hidden="true"></span><span class="task-title"></span>`; task.querySelector(".task-title").textContent = appId === "qq" ? (qqAuthenticatedThisPage ? "QQ 2001 - 好友列表" : "QQ 2001 - 用户登录") : app.title;
  task.addEventListener("click", () => { if (win.classList.contains("minimized")) focusWindow(win); else if (task.classList.contains("active")) minimizeWindow(win); else focusWindow(win); }); taskItems.appendChild(task);
  bindWindow(win); focusWindow(win); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once: true });
}
function bindDesktopAppIcon(button) {
  button.addEventListener("click", event => { event.stopPropagation(); document.querySelectorAll(".desktop-icon").forEach(icon => icon.classList.remove("selected")); button.classList.add("selected"); });
  button.addEventListener("dblclick", event => { event.stopPropagation(); openApp(button.dataset.app); button.classList.remove("selected"); });
}
function installSkyGameDesktopIcon() {
  if (skyGameInstalledThisPage || document.querySelector('.desktop-icon[data-app="sky-game"]')) return;
  skyGameInstalledThisPage = true;
  const button = document.createElement("button"); button.type = "button"; button.className = "desktop-icon sky-game-desktop-entry"; button.dataset.app = "sky-game";
  button.innerHTML = '<span class="pixel-icon sky-game-icon"><i></i></span><span class="icon-label">像素空战</span>';
  document.querySelector(".desktop-icons").appendChild(button); bindDesktopAppIcon(button);
}
function startSkyGameDownload() {
  if (skyGameInstalledThisPage) { openApp("sky-game"); return; }
  const existing = document.querySelector(".sky-download-dialog"); if (existing) { existing.style.zIndex = ++highestZ; return; }
  const dialog = document.createElement("section"); dialog.className = "sky-download-dialog"; dialog.setAttribute("role","dialog"); dialog.setAttribute("aria-label","正在下载像素空战"); dialog.style.zIndex = ++highestZ;
  dialog.innerHTML = '<header><img src="assets/icons/pixel-air-combat.png" alt=""><strong>文件下载</strong><button type="button" aria-label="取消下载" title="取消下载">×</button></header><main><img class="sky-download-logo" src="assets/icons/pixel-air-combat.png" alt="像素空战"><div><h2>正在下载像素空战</h2><p>来自：game.fuguang.cn</p><div class="sky-download-track"><span></span></div><small>准备下载…　0%</small></div></main><footer>下载过程中请不要关闭此窗口。</footer>';
  document.querySelector("#desktop").appendChild(dialog);
  let progress=0,cancelled=false; const bar=dialog.querySelector(".sky-download-track span"),label=dialog.querySelector("main small"),cancel=dialog.querySelector("header button");
  const stop=()=>{cancelled=true;clearInterval(timer);dialog.remove();}; cancel.addEventListener("click",stop);
  const timer=setInterval(()=>{if(cancelled||!dialog.isConnected){clearInterval(timer);return;}progress=Math.min(100,progress+2+Math.floor(Math.random()*4));bar.style.width=`${progress}%`;label.textContent=progress<100?`正在接收游戏文件…　${progress}%`:'下载完成　100%';if(progress===100){clearInterval(timer);dialog.classList.add("complete");dialog.querySelector("h2").textContent="像素空战下载完成";dialog.querySelector("footer").textContent="游戏快捷方式已添加到桌面。";installSkyGameDesktopIcon();setTimeout(()=>dialog.remove(),1100);}},190);
}
function installCaseArchiveDesktopIcon() {
  if (caseArchiveDownloadedThisPage || document.querySelector(".case-archive-desktop-entry")) return;
  caseArchiveDownloadedThisPage = true;
  const button=document.createElement("button");button.type="button";button.className="desktop-icon case-archive-desktop-entry";button.dataset.app="case-archive";
  button.innerHTML='<span class="pixel-icon case-archive-icon"><i></i></span><span class="icon-label">档案整理.zip</span>';
  document.querySelector(".desktop-icons").appendChild(button);bindDesktopAppIcon(button);
}
function startCaseArchiveDownload() {
  if (caseArchiveDownloadedThisPage) return;
  const existing=document.querySelector(".sky-download-dialog");if(existing){existing.style.zIndex=++highestZ;return;}
  const dialog=document.createElement("section");dialog.className="sky-download-dialog";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-label","正在下载档案整理.zip");dialog.style.zIndex=++highestZ;
  dialog.innerHTML='<header><img src="assets/icons/case-archive-transparent.png" alt=""><strong>文件下载</strong><button type="button" aria-label="取消下载" title="取消下载">×</button></header><main><img class="sky-download-logo" src="assets/icons/case-archive-transparent.png" alt="压缩包"><div><h2>正在下载档案整理.zip</h2><p>来自：bbs.fuguang.cn</p><div class="sky-download-track"><span></span></div><small>准备下载…　0%</small></div></main><footer>下载过程中请不要关闭此窗口。</footer>';
  document.querySelector("#desktop").appendChild(dialog);let progress=0,cancelled=false;const bar=dialog.querySelector(".sky-download-track span"),label=dialog.querySelector("main small"),cancel=dialog.querySelector("header button");
  const stop=()=>{cancelled=true;clearInterval(timer);dialog.remove();};cancel.addEventListener("click",stop);
  const timer=setInterval(()=>{if(cancelled||!dialog.isConnected){clearInterval(timer);return;}progress=Math.min(100,progress+3+Math.floor(Math.random()*5));bar.style.width=`${progress}%`;label.textContent=progress<100?`正在接收压缩文件…　${progress}%`:'下载完成　100%';if(progress===100){clearInterval(timer);dialog.classList.add("complete");dialog.querySelector("h2").textContent="档案整理.zip 下载完成";dialog.querySelector("footer").textContent="压缩文件已保存到桌面。";installCaseArchiveDesktopIcon();setTimeout(()=>dialog.remove(),1100);}},190);
}
function setupCaseArchiveWindow(win) {
  win.classList.add("case-archive-window");win.style.width=`${Math.min(720,innerWidth-50)}px`;win.style.height=`${Math.min(520,innerHeight-80)}px`;win.querySelector(".window-mini-icon").classList.add("case-archive");
  win.querySelector(".menu-bar").innerHTML='<button>文件(<u>F</u>)</button><button>操作(<u>A</u>)</button><button>设置(<u>S</u>)</button><button>帮助(<u>H</u>)</button>';
  win.querySelector(".toolbar").className="archive-toolbar";win.querySelector(".archive-toolbar").innerHTML='<button type="button"><i>＋</i><span>添加</span></button><button type="button"><i>↥</i><span>解压到</span></button><button type="button"><i>▣</i><span>一键解压</span></button><button type="button"><i>×</i><span>删除</span></button><button type="button"><i>▧</i><span>图片压缩</span></button>';
  const content=win.querySelector(".window-content"),status=win.querySelector(".statusbar span:first-child");
  const showMissingSoftware=()=>{if(content.querySelector(".archive-missing-dialog"))return;const dialog=document.createElement("section");dialog.className="archive-missing-dialog";dialog.setAttribute("role","alertdialog");dialog.innerHTML='<header><strong>错误</strong><button type="button" aria-label="关闭">×</button></header><main><span aria-hidden="true">×</span><p>没有安装解压软件。</p></main><footer><button type="button">确定</button></footer>';content.appendChild(dialog);const close=()=>dialog.remove();dialog.querySelector("header button").addEventListener("click",close);dialog.querySelector("footer button").addEventListener("click",close);playFaultAlert();};
  win.querySelectorAll(".archive-toolbar button").forEach(button=>button.addEventListener("click",showMissingSoftware));
  const showFolder=()=>{content.innerHTML='<section class="case-archive-folder"><div class="case-folder-note"><button type="button" data-archive-back>↑</button><span>档案整理.zip　&gt;　图片资料</span></div><div class="case-image-grid"><button type="button" class="explorer-item case-pdf-file" aria-label="打开案件整理.pdf"><span class="explorer-item-icon pdf" aria-hidden="true"></span><span class="explorer-item-copy"><strong>案件整理.pdf</strong><small>161 KB　PDF 文档</small></span></button></div></section>';content.querySelector("[data-archive-back]").addEventListener("click",showRoot);const pdf=content.querySelector(".case-pdf-file");pdf.addEventListener("click",()=>pdf.classList.add("selected"));pdf.addEventListener("dblclick",()=>openApp("case-pdf"));status.textContent="共 1 个 PDF 文件";};
  const showPassword=()=>{if(caseArchiveUnlockedThisPage){showFolder();return;}if(content.querySelector(".case-password-dialog"))return;const form=document.createElement("form");form.className="case-password-dialog";form.autocomplete="off";form.innerHTML='<header><strong>请输入密令</strong><button type="button" data-archive-cancel aria-label="关闭">×</button></header><main><h3>文件夹已加密</h3><p>请输入密令以打开“图片资料”。</p><label>passcode：<input type="password" name="archivePassword" autocomplete="off" autofocus></label><small role="alert"></small></main><footer><button type="submit">确定</button><button type="button" data-archive-cancel>取消</button></footer>';content.appendChild(form);const input=form.elements.archivePassword,error=form.querySelector("small"),close=()=>{form.remove();status.textContent="共 2 个文件和 1 个文件夹　压缩率 39.3%";};form.addEventListener("submit",event=>{event.preventDefault();if(input.value==="FG7A2001"){caseArchiveUnlockedThisPage=true;form.remove();showFolder();return;}error.textContent="密令不正确，请重新输入。";input.value="";input.focus();playFaultAlert();});form.querySelectorAll("[data-archive-cancel]").forEach(button=>button.addEventListener("click",close));setTimeout(()=>input.focus(),0);status.textContent="请输入加密文件夹密令";};
  function showRoot(){content.innerHTML='<section class="archive-root"><div class="archive-address"><button type="button" disabled>↑</button><span><img src="assets/icons/case-archive-transparent.png" alt="">档案整理.zip　-　解包大小 8.4 MB</span><label>搜索包内文件 <b>⌕</b></label></div><div class="archive-columns"><b>名称</b><b>压缩前</b><b>压缩后</b><b>类型</b></div><div class="archive-row archive-up"><span>📁 ..（上级目录）</span><span></span><span></span><span>文件夹</span></div><button type="button" class="archive-row archive-protected-folder"><span>📁 图片资料 <em>🔒</em></span><span>8.4 MB</span><span>5.1 MB</span><span>加密文件夹</span></button><div class="archive-row"><span>▤ 说明.txt</span><span>2 KB</span><span>1 KB</span><span>文本文档</span></div></section>';content.querySelector(".archive-protected-folder").addEventListener("click",showPassword);status.textContent="共 2 个文件和 1 个文件夹　压缩率 39.3%";}
  showRoot();
}
function setupCasePdfWindow(win) {
  win.classList.add("case-pdf-window");
  win.style.width=`${Math.min(850,innerWidth-60)}px`;
  win.style.height=`${Math.min(650,innerHeight-76)}px`;
  win.querySelector(".menu-bar").innerHTML='<button type="button">文件(<u>F</u>)</button><button type="button">查看(<u>V</u>)</button><button type="button">帮助(<u>H</u>)</button>';
  win.querySelector(".toolbar").innerHTML='<span class="case-pdf-toolbar-label">案件整理.pdf</span><button type="button" data-pdf-zoom="out" aria-label="缩小">－</button><output>100%</output><button type="button" data-pdf-zoom="in" aria-label="放大">＋</button><button type="button" data-pdf-zoom="fit">适合宽度</button><span class="case-pdf-page-count">第 1 页 / 共 1 页</span>';
  const viewport=document.createElement("div");viewport.className="case-pdf-viewport";
  const page=document.createElement("img");page.className="case-pdf-page";page.src="assets/documents/case-archive-page.png?v=20260918-1";page.alt="案件整理 PDF 第 1 页的完整内容";viewport.appendChild(page);
  win.querySelector(".window-content").replaceChildren(viewport);
  let zoom=1;const output=win.querySelector(".toolbar output");
  const updateZoom=()=>{page.style.width=`${Math.round(760*zoom)}px`;output.textContent=`${Math.round(zoom*100)}%`;};
  win.querySelector('[data-pdf-zoom="out"]').addEventListener("click",()=>{zoom=Math.max(.5,Math.round((zoom-.25)*100)/100);updateZoom();});
  win.querySelector('[data-pdf-zoom="in"]').addEventListener("click",()=>{zoom=Math.min(2.5,Math.round((zoom+.25)*100)/100);updateZoom();});
  win.querySelector('[data-pdf-zoom="fit"]').addEventListener("click",()=>{zoom=Math.max(.5,Math.min(1.5,(viewport.clientWidth-36)/760));updateZoom();viewport.scrollLeft=0;});
  page.addEventListener("error",()=>{win.querySelector(".statusbar span:first-child").textContent="PDF 页面载入失败";});
  updateZoom();win.querySelector(".statusbar span:first-child").textContent="只读　案件整理.pdf";
}
function applyRetroNavigationButton(button, direction) {
  if (!button) return;
  button.textContent = ""; button.classList.add("retro-nav-button", `retro-nav-${direction}`);
  button.setAttribute("aria-label", direction === "back" ? "后退" : direction === "forward" ? "前进" : "向上一级");
}
function setupFileExplorerWindow(win, appId) {
  win.classList.add("file-explorer-window");
  win.style.width = `${Math.min(720, innerWidth - 80)}px`; win.style.height = `${Math.min(520, innerHeight - 90)}px`;
  const content = win.querySelector(".window-content");
  const toolbar = win.querySelector(".toolbar");
  toolbar.innerHTML = '<button type="button" data-explorer-action="back" title="后退"></button><button type="button" data-explorer-action="forward" title="前进"></button><button type="button" data-explorer-action="up" title="向上一级"></button><span class="address-label">地址</span><div class="address-field"></div>';
  applyRetroNavigationButton(toolbar.querySelector('[data-explorer-action="back"]'), "back"); applyRetroNavigationButton(toolbar.querySelector('[data-explorer-action="forward"]'), "forward"); applyRetroNavigationButton(toolbar.querySelector('[data-explorer-action="up"]'), "up");
  const shell = document.createElement("section"); shell.className = "explorer-shell";
  shell.innerHTML = '<aside class="explorer-web-view"><div class="explorer-large-icon" aria-hidden="true"></div><strong class="explorer-location-name"></strong><hr><p class="explorer-help">选择一个项目可查看说明。双击文件夹或磁盘可以打开。</p><div class="explorer-selection-detail" aria-live="polite"></div></aside><main class="explorer-content"><div class="explorer-lock-slot"></div><div class="explorer-items" role="list"></div></main>';
  content.replaceChildren(shell);
  const state = { current: appId === "computer" ? "computer" : "my-files", back: [], forward: [] };
  win._explorerState = state;
  const render = nodeId => {
    const node = explorerNodes[nodeId]; if (!node) return;
    shell.querySelector(".explorer-lock-slot").replaceChildren();
    state.current = nodeId;
    win.querySelector("h2").textContent = node.title;
    toolbar.querySelector(".address-field").textContent = node.path;
    shell.querySelector(".explorer-location-name").textContent = node.title;
    shell.querySelector(".explorer-large-icon").className = `explorer-large-icon ${nodeId === "computer" ? "computer" : nodeId.startsWith("drive-") ? "drive" : "folder"}`;
    const list = shell.querySelector(".explorer-items"); list.replaceChildren();
    node.items.forEach(item => {
      const button = document.createElement("button"); button.type = "button"; button.className = "explorer-item"; button.setAttribute("role", "listitem");
      button.innerHTML = `<span class="explorer-item-icon ${item.type}${item.locked ? " locked" : ""}" aria-hidden="true"></span><span class="explorer-item-copy"><strong></strong><small></small>${item.type === "drive" ? '<span class="explorer-drive-meter" aria-label="磁盘已用空间"><i></i></span>' : ""}</span>`;
      button.querySelector("strong").textContent = item.name; button.querySelector("small").textContent = item.detail || "";
      if (item.type === "drive") button.querySelector(".explorer-drive-meter i").style.width = `${item.used}%`;
      button.addEventListener("click", () => { list.querySelectorAll(".explorer-item").forEach(entry => entry.classList.toggle("selected", entry === button)); shell.querySelector(".explorer-selection-detail").innerHTML = `<b>${item.name}</b><span>${item.detail || ""}</span>`; });
      if (item.target) button.addEventListener("dblclick", () => navigate(item.target));
      else if (item.type === "txt") button.addEventListener("dblclick", () => openExplorerTextFile(item));
      else if (item.type === "excel") button.addEventListener("dblclick", () => openApp("excel"));
      else if (item.type === "word") button.addEventListener("dblclick", () => openApp("word"));
      else if (item.type === "jpeg") button.addEventListener("dblclick", () => openPhotoViewer({ name:item.name, source:node.path, src:item.src }));
      list.appendChild(button);
    });
    shell.querySelector(".explorer-selection-detail").textContent = "";
    win.querySelector(".statusbar span:first-child").textContent = `${node.items.length} 个对象`;
    toolbar.querySelector('[data-explorer-action="back"]').disabled = !state.back.length;
    toolbar.querySelector('[data-explorer-action="forward"]').disabled = !state.forward.length;
    toolbar.querySelector('[data-explorer-action="up"]').disabled = !node.parent;
  };
  win._explorerRender = render;
  const navigate = target => { if (!explorerNodes[target] || target === state.current) return; if (target === "my-files" && !myFilesUnlocked) { requestMyFilesPassword(win, () => navigate(target)); return; } state.back.push(state.current); state.forward.length = 0; render(target); };
  toolbar.querySelector('[data-explorer-action="back"]').addEventListener("click", () => { const target = state.back.pop(); if (!target) return; state.forward.push(state.current); render(target); });
  toolbar.querySelector('[data-explorer-action="forward"]').addEventListener("click", () => { const target = state.forward.pop(); if (!target) return; state.back.push(state.current); render(target); });
  toolbar.querySelector('[data-explorer-action="up"]').addEventListener("click", () => { const parent = explorerNodes[state.current].parent; if (parent) navigate(parent); });
  render(state.current);
}
const gradebookRows = [
  ["高一（7）班期末考试成绩单","","","","","","","","","","","",""],
  ["序号","姓名","语文","数学","英语","政治","历史","地理","物理","化学","生物","总分","班级排名"],
  [1,"周子涵",132,139,141,94,95,93,92,91,94,971,1], [2,"林嘉怡",130,134,138,95,96,94,90,92,93,962,2],
  [3,"陈浩然",126,142,131,90,91,89,96,94,92,951,3], [4,"许安然",124,118,129,86,88,87,84,82,85,883,4],
  [5,"郑愿",127,69,136,91,93,98,88,86,89,877,5], [6,"程语嫣",102,126,127,83,82,86,81,76,81,844,6],
  [7,"谭思远",107,121,126,89,83,88,75,71,60,820,7], [8,"廖欣悦",116,124,124,85,84,72,71,77,66,819,8],
  [9,"叶佳宁",121,103,97,70,80,84,83,85,86,809,9], [10,"方浩铭",116,82,123,80,69,82,74,89,86,801,10],
  [11,"熊雨菲",93,121,113,88,71,85,83,65,81,800,11], [12,"潘晨阳",111,105,119,72,89,86,74,60,82,798,12],
  [13,"白子安",123,120,123,78,76,66,85,61,62,794,13], [14,"罗景程",91,101,118,76,63,79,82,82,86,778,14],
  [15,"韩若琳",116,111,101,73,82,76,73,85,60,777,15], [16,"蒋文博",122,101,84,76,89,76,64,88,74,774,16],
  [17,"孙可欣",118,107,106,66,70,62,82,73,84,768,17], [18,"邱逸凡",114,82,119,83,83,68,72,77,62,760,18],
  [19,"梁嘉豪",120,103,95,73,65,87,86,60,69,758,19], [20,"邓诗涵",96,104,102,71,75,88,74,63,85,758,20],
  [21,"谢雨桐",120,86,88,86,63,81,79,81,65,749,21], [22,"彭子豪",93,84,114,73,62,75,77,89,81,748,22],
  [23,"钟雨辰",112,80,107,82,77,81,82,59,68,748,23], [24,"袁浩宇",98,73,87,80,86,83,61,90,89,747,24],
  [25,"龚俊杰",116,87,102,88,65,71,76,77,64,746,25], [26,"赵一鸣",98,117,102,85,64,63,68,72,76,745,26],
  [27,"严子墨",122,101,102,62,73,68,76,59,82,745,27], [28,"曹宇轩",113,91,92,74,82,72,62,75,79,740,28],
  [29,"顾嘉树",105,91,94,72,89,72,90,59,68,740,29], [30,"刘思琪",93,101,110,79,82,78,61,62,70,736,30],
  [31,"乔安琪",108,92,107,64,60,85,74,67,78,735,31], [32,"郭子轩",93,121,95,75,76,61,62,71,78,732,32],
  [33,"宋欣妍",115,96,86,64,88,66,70,81,65,731,33], [34,"苏婉清",103,110,94,71,65,72,76,67,69,727,34],
  [35,"江语晴",89,92,100,62,83,86,74,68,68,722,35], [36,"王泽宇",91,113,109,68,63,60,88,63,66,721,36],
  [37,"何宇航",117,74,91,66,89,65,62,71,81,716,37], [38,"莫雨薇",102,85,88,71,78,64,88,63,74,713,38],
  [39,"杜欣怡",92,94,90,85,62,74,82,71,61,711,39], [40,"冯嘉宁",99,83,123,63,66,60,87,63,66,710,40],
  [41,"唐雨欣",116,76,99,72,61,61,78,72,73,708,41], [42,"任子航",122,80,82,69,66,61,73,82,72,707,42],
  [43,"夏承泽",100,78,85,70,74,86,81,58,75,707,43], [44,"魏可心",112,84,92,67,80,62,60,63,83,703,44],
  [45,"徐若曦",92,79,96,66,78,63,72,73,70,689,45]
];
function excelColumnName(index) {
  let name = ""; for (let value = index + 1; value; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + ((value - 1) % 26)) + name; return name;
}
function openExcelReadOnlyError() {
  const existing = document.getElementById("excel-readonly-shield"); if (existing) { playFaultAlert(); return; }
  playFaultAlert();
  const shield = document.createElement("div"); shield.id = "excel-readonly-shield"; shield.className = "excel-modal-shield";
  shield.innerHTML = '<article class="excel-readonly-dialog" role="alertdialog" aria-modal="true" aria-labelledby="excelErrorTitle"><header><span class="excel-mini-mark">X</span><strong id="excelErrorTitle">Microsoft Excel</strong><button type="button" aria-label="关闭">×</button></header><main><span class="excel-error-mark" aria-hidden="true">×</span><p>无法更改此工作表中的单元格。<br><small>该文档以只读方式打开。</small></p></main><footer><button type="button" autofocus>确定</button></footer></article>';
  const close = () => { shield.remove(); document.querySelector('.retro-window[data-app="excel"]')?.focus(); };
  shield.querySelector("header button").addEventListener("click", close); shield.querySelector("footer button").addEventListener("click", close);
  shield.addEventListener("pointerdown", event => { if (!event.target.closest(".excel-readonly-dialog")) { event.preventDefault(); event.stopPropagation(); playFaultAlert(); } });
  shield.addEventListener("keydown", event => { if (event.key === "Escape" || event.key === "Enter") { event.preventDefault(); close(); } });
  document.querySelector("#desktop").appendChild(shield); shield.querySelector("footer button").focus();
}
function setupExcelWindow(win) {
  win.classList.add("excel-window"); win.tabIndex = 0;
  win.style.width = `${Math.min(900, innerWidth - 70)}px`; win.style.height = `${Math.min(620, innerHeight - 76)}px`;
  win.querySelector(".window-mini-icon").classList.add("excel");
  win.querySelector(".menu-bar").innerHTML = '<button>文件(<u>F</u>)</button><button>编辑(<u>E</u>)</button><button>视图(<u>V</u>)</button><button>插入(<u>I</u>)</button><button>格式(<u>O</u>)</button><button>工具(<u>T</u>)</button><button>数据(<u>D</u>)</button><button>窗口(<u>W</u>)</button><button>帮助(<u>H</u>)</button>';
  win.querySelector(".toolbar").innerHTML = '<button title="新建">▤</button><button title="打开">▱</button><button data-excel-edit title="保存">▣</button><button title="打印">▥</button><i></i><button data-excel-edit title="剪切">✂</button><button title="复制">▣</button><button data-excel-edit title="粘贴">▤</button><i></i><button data-excel-edit title="撤销">↶</button><select aria-label="字体"><option>宋体</option></select><select aria-label="字号"><option>11</option></select><button data-excel-edit class="excel-bold" title="加粗">B</button><button data-excel-edit title="倾斜"><i>I</i></button><button data-excel-edit title="下划线"><u>U</u></button>';
  const shell = document.createElement("section"); shell.className = "excel-shell";
  shell.innerHTML = '<div class="excel-formula"><output>A1</output><button data-excel-edit aria-label="取消输入">×</button><button data-excel-edit aria-label="确认输入">✓</button><b>fx</b><input readonly aria-label="公式栏" /></div><div class="excel-grid-wrap"><table class="excel-grid" aria-label="高一七班期末成绩单"></table></div><div class="excel-sheet-tabs"><button aria-label="首张工作表">◀</button><button aria-label="上一张工作表">‹</button><button class="selected">期末成绩</button><span></span></div>';
  const table = shell.querySelector("table");
  const columnCount = 13, rowCount = 47;
  const header = document.createElement("thead"), headerRow = document.createElement("tr"); headerRow.innerHTML = '<th class="excel-corner"></th>';
  for (let col = 0; col < columnCount; col++) { const th = document.createElement("th"); th.textContent = excelColumnName(col); headerRow.appendChild(th); } header.appendChild(headerRow); table.appendChild(header);
  const body = document.createElement("tbody");
  for (let row = 0; row < rowCount; row++) {
    const tr = document.createElement("tr"), number = document.createElement("th"); number.textContent = row + 1; tr.appendChild(number);
    for (let col = 0; col < columnCount; col++) { if (row === 0 && col > 0) continue; const td = document.createElement("td"); const value = gradebookRows[row]?.[col] ?? ""; td.textContent = value; td.dataset.address = `${excelColumnName(col)}${row + 1}`; td.dataset.value = value; if (row === 0) { td.classList.add("excel-title-row"); td.colSpan = columnCount; } if (row === 1) td.classList.add("excel-header-row"); if (row === 6) td.classList.add("excel-student-row"); if (row === 6 && (col === 3 || col === 7)) td.classList.add("excel-score-red"); tr.appendChild(td); } body.appendChild(tr);
  } table.appendChild(body);
  win.querySelector(".window-content").replaceChildren(shell);
  const selectCell = cell => { table.querySelectorAll("td.selected").forEach(item => item.classList.remove("selected")); cell.classList.add("selected"); shell.querySelector(".excel-formula output").textContent = cell.dataset.address; shell.querySelector(".excel-formula input").value = cell.dataset.value; };
  table.addEventListener("click", event => { const cell = event.target.closest("td"); if (cell) selectCell(cell); }); table.addEventListener("dblclick", event => { if (event.target.closest("td")) openExcelReadOnlyError(); });
  win.querySelectorAll("[data-excel-edit]").forEach(control => control.addEventListener("click", openExcelReadOnlyError));
  shell.querySelector(".excel-formula input").addEventListener("pointerdown", event => { event.preventDefault(); openExcelReadOnlyError(); });
  win.addEventListener("keydown", event => { if (event.ctrlKey && ["v", "x", "s"].includes(event.key.toLowerCase()) || event.key === "F2" || event.key === "Delete" || event.key === "Backspace" || (!event.ctrlKey && !event.altKey && event.key.length === 1)) { event.preventDefault(); openExcelReadOnlyError(); } });
  win.addEventListener("paste", event => { event.preventDefault(); openExcelReadOnlyError(); });
  shell.querySelector(".excel-sheet-tabs button.selected").textContent = "高一七班期末成绩"; selectCell(body.querySelector("td")); win.querySelector(".statusbar span:first-child").textContent = "只读　就绪";
}
const geoMistakeParagraphs = [
  "地理错题整理",
  "1. 地球自转与地方时计算",
  "题目：已知甲地位于东经120°，乙地位于东经90°，当甲地地方时为10:00时，乙地地方时为多少？",
  "我的错误答案：10:00",
  "正确答案：8:00",
  "解析：两地经度差为30°，每15°相差1小时，因此相差2小时。甲地位于乙地以东，地方时更早，所以乙地应比甲地晚2小时。",
  "错因分析：算出了时差，但最后把“东早西晚”记反了。",
  "知识点总结：经度每相差15°，地方时相差1小时；东边时间早，西边时间晚。",
  "2. 正午太阳高度变化",
  "题目：夏至日时，北回归线及其以北地区正午太阳高度的变化规律是什么？",
  "我的错误答案：越往北越大",
  "正确答案：北回归线正午太阳高度最大，为90°；从北回归线向北逐渐减小。",
  "解析：夏至日太阳直射北回归线，因此北回归线处太阳高度达到最大值。纬度越偏离太阳直射点，正午太阳高度越小。",
  "错因分析：只记住了“夏至北半球太阳高度较大”，没有先确定太阳直射点。",
  "知识点总结：先找太阳直射点，再判断离直射点越远，正午太阳高度越小。",
  "3. 洋流对沿岸气候的影响",
  "题目：寒流流经的沿海地区，气候一般会有什么特点？",
  "我的错误答案：增温增湿",
  "正确答案：降温减湿",
  "解析：寒流水温较低，对沿岸地区有降温作用，同时会抑制蒸发，因此通常表现为降温、减湿。",
  "错因分析：把暖流和寒流的影响记反了，属于基础概念错误。",
  "知识点总结：暖流：增温增湿；寒流：降温减湿。",
  "4. 地中海气候成因",
  "题目：地中海气候为什么表现为“夏季炎热干燥，冬季温和多雨”？",
  "我的错误答案：夏季受西风带控制，冬季受副热带高气压带控制",
  "正确答案：夏季受副热带高气压带控制，炎热干燥；冬季受西风带控制，温和多雨。",
  "解析：受气压带、风带季节移动影响，夏季副热带高气压带控制，盛行下沉气流；冬季西风带南移，带来较多降水。",
  "错因分析：把副热带高气压带和西风带控制的季节记反了。",
  "知识点总结：地中海气候：南北纬30°—40°大陆西岸；夏季副高，冬季西风。"
];
function openWordReadOnlyError() {
  const existing = document.getElementById("word-readonly-shield"); if (existing) return;
  playFaultAlert();
  const shield = document.createElement("div"); shield.id = "word-readonly-shield"; shield.className = "excel-modal-shield";
  shield.innerHTML = '<article class="excel-readonly-dialog" role="alertdialog" aria-modal="true" aria-labelledby="wordErrorTitle"><header><span class="word-mini-mark">W</span><strong id="wordErrorTitle">Microsoft Word</strong><button type="button" aria-label="关闭">×</button></header><main><span class="excel-error-mark" aria-hidden="true">×</span><p>无法修改此文档。<br><small>该文档以只读方式打开。</small></p></main><footer><button type="button" autofocus>确定</button></footer></article>';
  const close = () => shield.remove(); shield.querySelector("header button").addEventListener("click", close); shield.querySelector("footer button").addEventListener("click", close);
  shield.addEventListener("keydown", event => { if (event.key === "Escape" || event.key === "Enter") { event.preventDefault(); close(); } });
  document.querySelector("#desktop").appendChild(shield); shield.querySelector("footer button").focus();
}
function setupWordReadOnlyWindow(win) {
  win.classList.add("word-window"); win.tabIndex = 0;
  win.style.width = `${Math.min(850, innerWidth - 70)}px`; win.style.height = `${Math.min(650, innerHeight - 76)}px`;
  win.querySelector(".window-mini-icon").classList.add("word");
  win.querySelector(".menu-bar").innerHTML = '<button>文件(<u>F</u>)</button><button>编辑(<u>E</u>)</button><button>视图(<u>V</u>)</button><button>插入(<u>I</u>)</button><button>格式(<u>O</u>)</button><button>工具(<u>T</u>)</button><button>表格(<u>A</u>)</button><button>窗口(<u>W</u>)</button><button>帮助(<u>H</u>)</button>';
  win.querySelector(".toolbar").innerHTML = `<div class="word-toolbar-row word-standard-tools">
    <button type="button" data-word-edit title="新建文档" aria-label="新建文档">▤</button><button type="button" data-word-edit title="打开" aria-label="打开">▱</button><button type="button" data-word-edit title="保存" aria-label="保存">▣</button><button type="button" title="打印" aria-label="打印" data-word-action="print">▥</button><button type="button" title="打印预览" aria-label="打印预览" data-word-action="preview">▧</button><span class="word-tool-separator"></span><button type="button" data-word-edit title="拼写和语法检查" aria-label="拼写和语法检查">✓</button><button type="button" data-word-edit title="剪切" aria-label="剪切">✂</button><button type="button" title="复制" aria-label="复制" data-word-action="copy">▤</button><button type="button" data-word-edit title="粘贴" aria-label="粘贴">▩</button><button type="button" data-word-edit title="格式刷" aria-label="格式刷">▰</button><span class="word-tool-separator"></span><button type="button" data-word-edit title="撤销" aria-label="撤销">↶</button><button type="button" data-word-edit title="恢复" aria-label="恢复">↷</button><select aria-label="显示比例" data-word-action="zoom"><option value="100">100%</option><option value="85">85%</option><option value="120">120%</option></select>
  </div><div class="word-toolbar-row word-format-tools">
    <select aria-label="样式" data-word-edit><option>正文</option><option>标题 1</option><option>标题 2</option></select><select aria-label="字体" data-word-edit><option>宋体</option><option>仿宋</option><option>黑体</option></select><select aria-label="字号" data-word-edit><option>12</option><option>14</option><option>16</option></select><span class="word-tool-separator"></span><button type="button" data-word-edit title="加粗" aria-label="加粗"><b>B</b></button><button type="button" data-word-edit title="倾斜" aria-label="倾斜"><i>I</i></button><button type="button" data-word-edit title="下划线" aria-label="下划线"><u>U</u></button><span class="word-tool-separator"></span><button type="button" data-word-edit title="左对齐" aria-label="左对齐">☷</button><button type="button" data-word-edit title="居中" aria-label="居中">≡</button><button type="button" data-word-edit title="右对齐" aria-label="右对齐">☰</button><button type="button" data-word-edit title="两端对齐" aria-label="两端对齐">▤</button><span class="word-tool-separator"></span><button type="button" data-word-edit title="项目符号" aria-label="项目符号">•≡</button><button type="button" data-word-edit title="编号" aria-label="编号">1≡</button><button type="button" data-word-edit title="减少缩进" aria-label="减少缩进">⇤</button><button type="button" data-word-edit title="增加缩进" aria-label="增加缩进">⇥</button><button type="button" data-word-edit title="字体颜色" aria-label="字体颜色"><u>A</u></button>
  </div>`;
  const shell = document.createElement("section"); shell.className = "word-shell";
  const ruler = document.createElement("div"); ruler.className = "word-ruler"; ruler.setAttribute("aria-hidden", "true"); shell.appendChild(ruler);
  const page = document.createElement("article"); page.className = "word-page";
  geoMistakeParagraphs.forEach((value, index) => { const p = document.createElement("p"); p.textContent = value; if (index === 0) p.className = "word-document-title"; else if (/^[1-4]\. /.test(value)) p.className = "word-section-title"; page.appendChild(p); });
  shell.appendChild(page); win.querySelector(".window-content").replaceChildren(shell);
  win.querySelectorAll("[data-word-edit]").forEach(control => control.addEventListener("click", openWordReadOnlyError));
  win.querySelectorAll("select[data-word-edit]").forEach(control => control.addEventListener("change", () => { control.selectedIndex = 0; openWordReadOnlyError(); }));
  win.querySelector('[data-word-action="zoom"]').addEventListener("change", event => { page.style.zoom = `${event.currentTarget.value}%`; });
  win.querySelector('[data-word-action="copy"]').addEventListener("click", async () => { const selection = String(window.getSelection() || ""); if (!selection) { win.querySelector(".statusbar span:first-child").textContent = "请先选择要复制的文字"; return; } try { await navigator.clipboard.writeText(selection); win.querySelector(".statusbar span:first-child").textContent = "已复制所选文字"; } catch { win.querySelector(".statusbar span:first-child").textContent = "无法访问剪贴板"; } });
  win.querySelector('[data-word-action="print"]').addEventListener("click", () => { win.querySelector(".statusbar span:first-child").textContent = "打印功能暂不可用"; });
  win.querySelector('[data-word-action="preview"]').addEventListener("click", () => { win.querySelector(".statusbar span:first-child").textContent = "当前为页面预览视图"; });
  page.addEventListener("dblclick", openWordReadOnlyError);
  win.addEventListener("keydown", event => { if ((event.ctrlKey && ["v","x","s"].includes(event.key.toLowerCase())) || event.key === "F2" || event.key === "Delete" || event.key === "Backspace" || (!event.ctrlKey && !event.altKey && event.key.length === 1)) { event.preventDefault(); openWordReadOnlyError(); } });
  win.addEventListener("paste", event => { event.preventDefault(); openWordReadOnlyError(); });
  win.querySelector(".statusbar span:first-child").textContent = "只读　地理错题整理.docx";
}
function openExplorerTextFile(item) {
  openApp("notes");
  const win = document.querySelector('.retro-window[data-app="notes"]'); if (!win) return;
  const textarea = win.querySelector(".notepad-document"); textarea.value = item.content || ""; textarea.dataset.fileName = item.name; textarea.dataset.savedValue = textarea.value;
  win.querySelector("h2").textContent = `${item.name} - 记事本`; win.querySelector(".statusbar span:first-child").textContent = "就绪";
  document.querySelector(`.task-item[data-window-id="${win.id}"] .task-title`).textContent = `${item.name} - 记事本`; focusWindow(win); textarea.focus(); updateNotepadPosition(win);
}
function openPhotoViewer(photo) {
  const safePhoto = { name:photo?.name || "未命名照片.jpg", source:photo?.source || "我的图片", src:photo?.src || "" };
  let win = document.querySelector("#photo-viewer-window");
  if (!win) {
    win = template.content.firstElementChild.cloneNode(true); win.id = "photo-viewer-window"; win.dataset.app = "photo-viewer"; win.classList.add("photo-viewer-window");
    win.querySelector(".window-mini-icon").classList.add("photo-viewer-icon");
    win.style.width = `${Math.min(790, innerWidth - 90)}px`; win.style.height = `${Math.min(590, innerHeight - 85)}px`; win.style.left = `${Math.max(30, Math.round((innerWidth - Math.min(790, innerWidth - 90)) / 2))}px`; win.style.top = "34px";
    win.querySelector(".menu-bar").innerHTML = '<button>文件(<u>F</u>)</button><button>编辑(<u>E</u>)</button><button>查看(<u>V</u>)</button><button>页面(<u>P</u>)</button><button>缩放(<u>Z</u>)</button><button>工具(<u>T</u>)</button><button>注释(<u>A</u>)</button><button>帮助(<u>H</u>)</button>';
    win.querySelector(".toolbar").innerHTML = `<button type="button" title="打开图片" aria-label="打开图片"><svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10H3z"/><path d="m8 15 4-4 4 4m-4-4v7"/></svg></button><button type="button" title="保存" aria-label="保存"><svg viewBox="0 0 24 24"><path d="M4 3h14l3 3v15H4z"/><path d="M7 3v7h10V3M7 21v-7h10v7"/><path d="M14 5v3"/></svg></button><button type="button" title="打印" aria-label="打印"><svg viewBox="0 0 24 24"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z"/><path d="M17 11h1"/></svg></button><i></i><button type="button" data-photo-action="previous" title="上一张" aria-label="上一张"><svg viewBox="0 0 24 24" class="filled-icon"><path d="m16 5-9 7 9 7z"/></svg></button><button type="button" data-photo-action="next" title="下一张" aria-label="下一张"><svg viewBox="0 0 24 24" class="filled-icon"><path d="m8 5 9 7-9 7z"/></svg></button><i></i><button type="button" class="photo-primary-tool" data-photo-action="zoom-out" title="缩小" aria-label="缩小"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button><button type="button" class="photo-primary-tool" data-photo-action="zoom-in" title="放大" aria-label="放大"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button><button type="button" class="photo-primary-tool photo-rotate-tool" data-photo-action="rotate" title="顺时针旋转" aria-label="顺时针旋转"><svg viewBox="0 0 24 24"><path d="M19 8V3m0 0h-5m5 0-3.5 3.5A8 8 0 1 0 20 13"/></svg></button>`;
    win.querySelector(".toolbar").innerHTML = `<button type="button" data-photo-action="zoom-in" title="放大"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5 5M10 7v6M7 10h6"/></svg><span>放大</span></button><button type="button" data-photo-action="zoom-out" title="缩小"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5 5M7 10h6"/></svg><span>缩小</span></button><button type="button" data-photo-action="rotate" title="旋转"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a7 7 0 1 0 1 6M18 3v5h-5"/></svg><span>旋转</span></button><i aria-hidden="true"></i><button type="button" data-photo-action="properties" title="属性"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/></svg><span>属性</span></button><button type="button" data-photo-action="print" title="打印"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8V3h12v5M6 18H4V9h16v9h-2M7 15h10v6H7zM17 11h1"/></svg><span>打印</span></button>`;
    const viewer = document.createElement("section"); viewer.className = "photo-viewer"; viewer.innerHTML = '<div class="photo-stage"><div class="photo-pan-surface"><div class="photo-placeholder-art"><span class="photo-placeholder-mark" aria-hidden="true"></span><strong></strong><small></small></div></div></div><footer><span class="photo-dimensions">640 × 480 像素</span><span class="photo-zoom">100%</span></footer>';
    win.querySelector(".window-content").replaceChildren(viewer); layer.appendChild(win);
    const task = document.createElement("button"); task.className = "task-item"; task.dataset.windowId = win.id; task.innerHTML = '<span class="task-app-icon photo-viewer-icon" aria-hidden="true"></span><span class="task-title">映象</span>'; task.addEventListener("click", () => { if (win.classList.contains("minimized")) focusWindow(win); else if (task.classList.contains("active")) minimizeWindow(win); else focusWindow(win); }); taskItems.appendChild(task);
    win._photoState = { zoom:1, rotation:0 };
    const stage=win.querySelector(".photo-stage"),surface=win.querySelector(".photo-pan-surface");
    const updateTransform = () => { const state = win._photoState, art = win.querySelector(".photo-placeholder-art"), turned=state.rotation%180!==0; art.style.transform = `scale(${state.zoom}) rotate(${state.rotation}deg)`; surface.style.width=`${Math.max(stage.clientWidth,(turned?art.offsetHeight:art.offsetWidth)*state.zoom+50)}px`; surface.style.height=`${Math.max(stage.clientHeight,(turned?art.offsetWidth:art.offsetHeight)*state.zoom+50)}px`; win.querySelector(".photo-zoom").textContent = `${Math.round(state.zoom * 100)}%`; };
    win._photoUpdateTransform=updateTransform;
    win.querySelector('[data-photo-action="zoom-in"]').addEventListener("click", () => { win._photoState.zoom = Math.min(2.5, win._photoState.zoom + .25); updateTransform(); });
    win.querySelector('[data-photo-action="zoom-out"]').addEventListener("click", () => { win._photoState.zoom = Math.max(.5, win._photoState.zoom - .25); updateTransform(); });
    win.querySelector('[data-photo-action="rotate"]').addEventListener("click", () => { win._photoState.rotation = (win._photoState.rotation + 90) % 360; updateTransform(); });
    stage.addEventListener("wheel", event => { event.preventDefault(); const step = event.deltaY < 0 ? .1 : -.1; win._photoState.zoom = Math.max(.5, Math.min(2.5, Math.round((win._photoState.zoom + step) * 10) / 10)); updateTransform(); }, { passive:false });
    let drag=null;stage.addEventListener("pointerdown",event=>{if(event.button!==0)return;drag={x:event.clientX,y:event.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(event.pointerId);stage.classList.add("dragging");event.preventDefault();});
    stage.addEventListener("pointermove",event=>{if(!drag)return;stage.scrollLeft=drag.left-(event.clientX-drag.x);stage.scrollTop=drag.top-(event.clientY-drag.y);});
    const stopDrag=()=>{drag=null;stage.classList.remove("dragging");};stage.addEventListener("pointerup",stopDrag);stage.addEventListener("pointercancel",stopDrag);
    win.querySelector('[data-photo-action="properties"]').addEventListener("click", () => { win.querySelector(".statusbar span:first-child").textContent = `${win.querySelector('h2').textContent}　${win.querySelector('.photo-dimensions').textContent}`; });
    win.querySelector('[data-photo-action="print"]').addEventListener("click", () => { win.querySelector(".statusbar span:first-child").textContent = "打印功能暂不可用"; });
    bindWindow(win); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once:true });
  }
  const hash = [...safePhoto.name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const art = win.querySelector(".photo-placeholder-art"); win.querySelector("h2").textContent = `${safePhoto.name} - 映象`; art.dataset.variant = String(hash % 4); art.classList.toggle("has-photo", Boolean(safePhoto.src)); art.style.aspectRatio="4 / 3"; art.style.width=""; art.style.backgroundImage = safePhoto.src ? `url("${safePhoto.src}")` : ""; win.querySelector(".photo-placeholder-art strong").textContent = safePhoto.name; win.querySelector(".photo-placeholder-art small").textContent = `照片占位符 · ${safePhoto.source}`;
  if (safePhoto.src) {
    const image = new Image(); image.onload = () => {
      if (!win.isConnected || !image.naturalWidth || !image.naturalHeight) return;
      art.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
      art.style.width = `min(${Math.min(650, Math.round(530 * image.naturalWidth / image.naturalHeight))}px, 72vw)`;
      win.querySelector('.photo-dimensions').textContent = `${image.naturalWidth} × ${image.naturalHeight} 像素`;
      win._photoUpdateTransform();
    }; image.src = safePhoto.src;
  }
  win.querySelector(".statusbar span:first-child").textContent = `已打开 ${safePhoto.name}`; win._photoState.zoom = 1; win._photoState.rotation = 0; win._photoUpdateTransform(); win.querySelector(".photo-stage").scrollTo(0,0);
  const taskTitle = document.querySelector(`.task-item[data-window-id="${win.id}"] .task-title`); if (taskTitle) taskTitle.textContent = safePhoto.name; focusWindow(win);
}
function updateNotepadPosition(win) {
  const textarea = win.querySelector(".notepad-document"), status = win.querySelector(".statusbar span:first-child"); if (!textarea || !status) return;
  const before = textarea.value.slice(0, textarea.selectionStart), lines = before.split("\n");
  status.textContent = `第 ${lines.length} 行，第 ${lines.at(-1).length + 1} 列`;
}
function setupNotepadWindow(win) {
  win.classList.add("notepad-window"); win.style.width = `${Math.min(700, innerWidth - 100)}px`; win.style.height = `${Math.min(520, innerHeight - 95)}px`;
  win.querySelector(".toolbar")?.remove();
  const menu = win.querySelector(".menu-bar");
  menu.innerHTML = `<div class="notepad-menu"><button type="button">文件(<u>F</u>)</button><div><button data-note-action="new">新建(N)</button><button data-note-action="open">打开(O)...</button><button data-note-action="save">保存(S)</button><hr><button data-note-action="exit">退出(X)</button></div></div><div class="notepad-menu"><button type="button">编辑(<u>E</u>)</button><div><button data-note-action="undo">撤销(U)</button><hr><button data-note-action="cut">剪切(T)</button><button data-note-action="copy">复制(C)</button><button data-note-action="paste">粘贴(P)</button><button data-note-action="select-all">全选(A)</button></div></div><div class="notepad-menu"><button type="button">搜索(<u>S</u>)</button><div><button data-note-action="find">查找(F)...</button><button data-note-action="find-next">查找下一个(N)</button></div></div><div class="notepad-menu"><button type="button">帮助(<u>H</u>)</button><div><button data-note-action="about">关于记事本(A)</button></div></div>`;
  const shell = document.createElement("section"); shell.className = "notepad-shell"; shell.innerHTML = '<div class="notepad-findbar" hidden><label>查找内容：<input type="text" /></label><button type="button" data-find-action="next">查找下一个</button><button type="button" data-find-action="close">取消</button></div><textarea class="notepad-document" spellcheck="false" aria-label="文本文档"></textarea>';
  win.querySelector(".window-content").replaceChildren(shell);
  const textarea = shell.querySelector("textarea");
  const savedFiles = readSavedNotepadFiles(); const lastFile = localStorage.getItem("retroNotepadLastFile") || "未命名.txt";
  textarea.dataset.fileName = lastFile; textarea.value = savedFiles[lastFile] ?? ""; textarea.dataset.savedValue = textarea.value;
  const saveState = document.createElement("span"); saveState.className = "notepad-save-state"; saveState.setAttribute("aria-live", "polite"); win.querySelector(".statusbar .resize-grip").before(saveState);
  const closeMenus = () => menu.querySelectorAll(".notepad-menu.open").forEach(item => item.classList.remove("open"));
  menu.querySelectorAll(".notepad-menu>button").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); const item = button.parentElement, willOpen = !item.classList.contains("open"); closeMenus(); item.classList.toggle("open", willOpen); }));
  const findNext = () => { const query = shell.querySelector(".notepad-findbar input").value; if (!query) return; const start = textarea.selectionEnd, at = textarea.value.indexOf(query, start); const found = at >= 0 ? at : textarea.value.indexOf(query); if (found >= 0) { textarea.focus(); textarea.setSelectionRange(found, found + query.length); updateNotepadPosition(win); } };
  menu.querySelectorAll("[data-note-action]").forEach(button => button.addEventListener("click", async () => {
    const action = button.dataset.noteAction; closeMenus();
    if (action === "new") { textarea.value = ""; textarea.dataset.fileName = "未命名.txt"; textarea.dataset.savedValue = ""; saveState.textContent = ""; }
    if (action === "open") { const files = readSavedNotepadFiles(); const name = localStorage.getItem("retroNotepadLastFile") || "未命名.txt"; if (Object.hasOwn(files, name)) { textarea.value = files[name]; textarea.dataset.fileName = name; textarea.dataset.savedValue = textarea.value; saveState.textContent = `已打开 ${name}`; } else saveState.textContent = "没有已保存的文档"; }
    if (action === "save") { const name = textarea.dataset.fileName || "未命名.txt"; const files = readSavedNotepadFiles(); files[name] = textarea.value; try { localStorage.setItem("retroNotepadFiles", JSON.stringify(files)); localStorage.setItem("retroNotepadLastFile", name); localStorage.setItem("retroNotepadDocument", textarea.value); const existing = explorerNodes["my-files"].items.find(item => item.name === name && item.type === "txt"); if (existing) existing.content = textarea.value; else explorerNodes["my-files"].items.push({ name, detail: "文本文档", type: "txt", content: textarea.value }); document.querySelectorAll('.file-explorer-window').forEach(explorer => { if (explorer._explorerState?.current === "my-files") explorer._explorerRender?.("my-files"); }); textarea.dataset.savedValue = textarea.value; saveState.textContent = `已保存到 D:\\我的文件\\${name}`; } catch { saveState.textContent = "保存失败：浏览器存储不可用"; } }
    if (action === "exit") closeWindow(win);
    if (action === "undo") { textarea.focus(); document.execCommand("undo"); }
    if (["cut","copy","paste"].includes(action)) { textarea.focus(); try { document.execCommand(action); } catch {} }
    if (action === "select-all") { textarea.focus(); textarea.select(); }
    if (action === "find") { shell.querySelector(".notepad-findbar").hidden = false; shell.querySelector(".notepad-findbar input").focus(); }
    if (action === "find-next") findNext();
    if (action === "about") win.querySelector(".statusbar span:first-child").textContent = "Microsoft 记事本 · Windows 98 风格";
    const fileName = textarea.dataset.fileName || "未命名.txt"; win.querySelector("h2").textContent = `${fileName} - 记事本`; document.querySelector(`.task-item[data-window-id="${win.id}"] .task-title`).textContent = `${fileName} - 记事本`; updateNotepadPosition(win);
  }));
  shell.querySelector('[data-find-action="next"]').addEventListener("click", findNext); shell.querySelector('[data-find-action="close"]').addEventListener("click", () => { shell.querySelector(".notepad-findbar").hidden = true; textarea.focus(); });
  textarea.addEventListener("input", () => { const fileName = textarea.dataset.fileName || "未命名.txt"; win.querySelector("h2").textContent = `${textarea.value !== textarea.dataset.savedValue ? "*" : ""}${fileName} - 记事本`; saveState.textContent = "未保存"; updateNotepadPosition(win); });
  textarea.addEventListener("click", () => updateNotepadPosition(win)); textarea.addEventListener("keyup", () => updateNotepadPosition(win));
  document.addEventListener("pointerdown", event => { if (!menu.contains(event.target)) closeMenus(); });
  win.querySelector("h2").textContent = `${textarea.dataset.fileName} - 记事本`; updateNotepadPosition(win);
}
function setupRecycleBinWindow(win) {
  win.classList.add("recycle-window"); win.style.width = `${Math.min(760, innerWidth - 90)}px`; win.style.height = `${Math.min(520, innerHeight - 90)}px`;
  const toolbar = win.querySelector(".toolbar"); toolbar.innerHTML = '<button type="button" class="recycle-nav" title="后退"></button><button type="button" class="recycle-nav" title="前进"></button><span class="address-label">地址</span><div class="address-field">回收站</div><button type="button" data-recycle-action="restore">还原</button><button type="button" data-recycle-action="empty">清空</button>';
  const recycleNav = toolbar.querySelectorAll(".recycle-nav"); applyRetroNavigationButton(recycleNav[0], "back"); applyRetroNavigationButton(recycleNav[1], "forward");
  const shell = document.createElement("section"); shell.className = "recycle-shell"; shell.innerHTML = '<aside><span class="recycle-large-icon" aria-hidden="true"></span><strong>回收站</strong><hr><p>回收站包含已经删除的文件。选择项目后可以还原到原来的位置。</p><div class="recycle-detail"></div></aside><main class="recycle-list"></main>';
  win.querySelector(".window-content").replaceChildren(shell); let selected = null;
  const render = () => { const list = shell.querySelector(".recycle-list"); list.replaceChildren(); recycleBinItems.forEach((item, index) => { const button = document.createElement("button"); button.type = "button"; button.className = "recycle-item"; button.innerHTML = `<span class="explorer-item-icon ${item.type}" aria-hidden="true"></span><span><strong></strong><small></small><small></small></span>`; button.querySelector("strong").textContent = item.name; const details = button.querySelectorAll("small"); details[0].textContent = item.original; details[1].textContent = `删除日期：${item.deleted}　${item.size}`; button.addEventListener("click", () => { selected = index; list.querySelectorAll(".recycle-item").forEach(entry => entry.classList.toggle("selected", entry === button)); shell.querySelector(".recycle-detail").innerHTML = `<b>${item.name}</b><span>原位置：${item.original}</span><span>${item.size}</span>`; }); button.addEventListener("dblclick", () => { selected = index; openRecycleRestoreDialog(item, win, () => { selected = null; render(); }); }); list.appendChild(button); }); win.querySelector(".statusbar span:first-child").textContent = `${recycleBinItems.length} 个对象`; if (!recycleBinItems.length) { const empty = document.createElement("p"); empty.className = "recycle-empty"; empty.textContent = "回收站是空的。"; list.appendChild(empty); } };
  toolbar.querySelector('[data-recycle-action="restore"]').addEventListener("click", () => { if (selected === null || !recycleBinItems[selected]) { win.querySelector(".statusbar span:first-child").textContent = "请先选择要还原的项目"; return; } openRecycleRestoreDialog(recycleBinItems[selected], win, () => { selected = null; render(); }); });
  toolbar.querySelector('[data-recycle-action="empty"]').addEventListener("click", () => { recycleBinItems = []; selected = null; shell.querySelector(".recycle-detail").textContent = "回收站已清空。"; render(); });
  render();
}
function addRestoredDesktopItem(item) {
  const container = document.querySelector(".desktop-icons");
  const existing = [...container.querySelectorAll(".restored-desktop-item")].find(button => button.dataset.fileName === item.name); if (existing) existing.remove();
  const button = document.createElement("button"); button.type = "button"; button.className = "desktop-icon restored-desktop-item"; button.dataset.fileName = item.name;
  const iconClass = item.type === "folder" ? "folder" : item.type === "jpeg" ? "jpeg" : "txt";
  button.innerHTML = `<span class="restored-file-icon ${iconClass}" aria-hidden="true"></span><span class="icon-label"></span>`; button.querySelector(".icon-label").textContent = item.name;
  button.addEventListener("click", event => { event.stopPropagation(); document.querySelectorAll(".desktop-icon").forEach(icon => icon.classList.toggle("selected", icon === button)); });
  if (item.type === "txt") button.addEventListener("dblclick", () => openExplorerTextFile({ ...item, content: item.content || "已从回收站还原。" }));
  if (item.type === "jpeg") button.addEventListener("dblclick", () => openPhotoViewer({ name:item.name, source:"桌面", src:item.src }));
  container.appendChild(button);
}
function openRecycleRestoreDialog(item, recycleWindow, onDialogClosed) {
  document.querySelector("#recycle-restore-dialog")?.remove();
  const win = template.content.firstElementChild.cloneNode(true); win.id = "recycle-restore-dialog"; win.dataset.app = "recycle-properties"; win.classList.add("recycle-properties-window");
  win.querySelector("h2").textContent = `${item.name} 属性`; win.querySelector(".window-mini-icon").classList.add(item.type === "folder" ? "folder" : "notes"); win.querySelector(".menu-bar").remove(); win.querySelector(".toolbar").remove(); win.querySelector(".statusbar").remove(); win.querySelector('[data-action="minimize"]').remove(); win.querySelector('[data-action="maximize"]').remove();
  win.style.width = `${Math.min(520, innerWidth - 24)}px`; win.style.height = `${Math.min(570, innerHeight - 70)}px`; win.style.left = `${Math.max(12, Math.round((innerWidth - Math.min(520, innerWidth - 24)) / 2))}px`; win.style.top = "38px";
  const typeLabel = item.type === "folder" ? "文件夹" : item.type === "jpeg" ? "JPEG 图像" : "文本文档";
  const pane = document.createElement("section"); pane.className = "recycle-properties";
  pane.innerHTML = `<div class="property-tab">常规</div><main><header><span class="property-file-icon ${item.type}" aria-hidden="true"></span><strong></strong></header><hr><dl><dt>类型：</dt><dd>${typeLabel}</dd><dt>原位置：</dt><dd></dd><dt>大小：</dt><dd>${item.size}</dd></dl><hr><dl><dt>删除时间：</dt><dd>${item.deleted}</dd><dt>创建时间：</dt><dd>2001-07-12 17:30:25</dd></dl><hr><fieldset><legend>属性：</legend><label><input type="checkbox" /> 只读</label><label><input type="checkbox" /> 隐藏</label><label><input type="checkbox" checked disabled /> 存档</label><label><input type="checkbox" /> 压缩</label></fieldset><button type="button" class="property-restore">还原(<u>R</u>)</button></main><footer><button type="button" data-property-action="ok">确定</button><button type="button" data-property-action="cancel">取消</button><button type="button" disabled>应用(<u>A</u>)</button></footer>`;
  pane.querySelector("header strong").textContent = item.name; pane.querySelector("dl dd:nth-of-type(2)").textContent = item.original;
  const cancel = () => { onDialogClosed?.(false); closeWindow(win); }; pane.querySelector('[data-property-action="ok"]').addEventListener("click", cancel); pane.querySelector('[data-property-action="cancel"]').addEventListener("click", cancel);
  win.querySelector('[data-action="close"]').addEventListener("click", () => onDialogClosed?.(false), { once:true });
  pane.querySelector(".property-restore").addEventListener("click", () => { const index = recycleBinItems.indexOf(item); if (index >= 0) recycleBinItems.splice(index,1); addRestoredDesktopItem(item); onDialogClosed?.(true); closeWindow(win); if (recycleWindow?.isConnected) { recycleWindow.querySelector(".recycle-detail").textContent = `“${item.name}”已还原到桌面。`; focusWindow(recycleWindow); } });
  win.querySelector(".window-content").replaceChildren(pane); layer.appendChild(win); bindWindow(win); focusWindow(win); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once:true });
}
function setupBrowserWindow(win) {
  win.classList.add("browser-window"); win.style.width = `${Math.min(860, innerWidth - 120)}px`; win.style.height = `${Math.min(610, innerHeight - 80)}px`; win.style.left = `${Math.max(85, Math.round((innerWidth - Math.min(860, innerWidth - 120)) / 2))}px`; win.style.top = "35px";
  const content = win.querySelector(".window-content"); content.replaceChildren(document.querySelector("#browserHomeTemplate").content.cloneNode(true));
  const addressDisplay = win.querySelector(".address-field");
  const address = document.createElement("input");
  address.className = "address-field browser-address-input";
  address.type = "text";
  address.value = apps.browser.path;
  address.setAttribute("aria-label", "地址");
  address.setAttribute("autocomplete", "off");
  address.setAttribute("spellcheck", "false");
  addressDisplay.replaceWith(address);
  const status = win.querySelector(".statusbar span:first-child"), navPage = content.querySelector(".nav-page"), notice = content.querySelector("#navNotice"), input = content.querySelector("#navSearchInput"), directory = content.querySelector("#navDirectory"), warning = content.querySelector("#navWarning"), footer = content.querySelector(".nav-footer");
  input.name = `xingwang-search-${Date.now()}`; input.autocomplete = "off";
  const weiboUrl = "http://t.sina.com.cn/";
  const weiboPage = document.createElement("section");
  weiboPage.className = "weibo-page"; weiboPage.hidden = true;
  weiboPage.innerHTML = `<header class="weibo-site-head"><div class="weibo-logo"><b>新浪</b><strong>微博</strong><em>beta</em></div><nav><button type="button">我的首页</button><button type="button">我的微博</button><button type="button">随便看看</button><button type="button">帮助</button></nav></header><div class="weibo-body"><main><section class="weibo-compose"><div><strong>随便说点什么吧……</strong><span>还可以输入 <b id="weiboRemain">140</b> 字</span></div><textarea id="weiboInput" maxlength="140" aria-label="发布微博内容"></textarea><footer><span>☺ 表情　▧ 图片　♬ 音乐</span><button type="button" id="weiboPublish">发布</button></footer></section><div class="weibo-feed-head"><b>大家正在说</b><span>看看大家此刻的新鲜事</span></div><div class="weibo-feed" id="weiboFeed"><article><img src="assets/avatars/xiaohang-user.png" alt="小航"><div><p><b>小航</b>：今天开始试用新浪微博，第一句话留在这里。</p><small>1分钟前　来自网页</small><footer><button>收藏</button> | <button>转发</button> | <button>评论</button></footer></div></article><article><span class="weibo-avatar orange">远</span><div><p><b>陈远</b>：刚刚下过雨，街上的空气很凉快。</p><small>12分钟前　来自网页</small><footer><button>收藏</button> | <button>转发</button> | <button>评论</button></footer></div></article><article><span class="weibo-avatar blue">倩</span><div><p><b>史倩</b>：整理旧照片的时候，总能发现已经忘记的小事。</p><small>25分钟前　来自网页</small><footer><button>收藏</button> | <button>转发</button> | <button>评论</button></footer></div></article></div></main><aside><section class="weibo-profile"><img src="assets/avatars/xiaohang-user.png" alt="小航"><div><b>小航</b><small>北京</small></div></section><div class="weibo-counts"><span><b>18</b> 关注</span><span><b>6</b> 粉丝</span><span><b id="weiboPostCount">3</b> 微博</span></div><nav class="weibo-side-links"><button>我的首页</button><button>我的收藏</button><button>收到的评论</button><button>我关注的人</button></nav><section class="weibo-invite"><b>邀请朋友加入微博</b><p>把身边的新鲜事告诉大家。</p></section></aside></div><footer class="weibo-site-footer">新浪微博测试版　服务条款　意见反馈　© 2009 SINA</footer>`;
  content.appendChild(weiboPage);
  const yunyangUrl = "http://news.yunyang.cn/";
  const yunyangPage = document.createElement("section"); yunyangPage.className = "yunyang-page-shell"; yunyangPage.hidden = true;
  yunyangPage.appendChild(document.querySelector("#yunyangNewsTemplate").content.cloneNode(true)); content.appendChild(yunyangPage);
  const slides = [...yunyangPage.querySelectorAll(".yunyang-slide")], dots = [...yunyangPage.querySelectorAll(".yunyang-dots button")];
  let activeSlide = 0;
  const setSlide = index => { activeSlide = index; slides.forEach((slide, i) => slide.classList.toggle("active", i === index)); dots.forEach((dot, i) => { dot.classList.toggle("active", i === index); if (i === index) dot.setAttribute("aria-current", "true"); else dot.removeAttribute("aria-current"); }); };
  dots.forEach((dot, i) => dot.addEventListener("click", () => setSlide(i)));
  const carouselTimer = setInterval(() => { if (win.isConnected && !yunyangPage.hidden) setSlide((activeSlide + 1) % slides.length); else if (!win.isConnected) clearInterval(carouselTimer); }, 4000);
  const bannerSlides = [...yunyangPage.querySelectorAll(".yunyang-banner-slide")]; let activeBanner = 0;
  const bannerTimer = setInterval(() => { if (!win.isConnected) { clearInterval(bannerTimer); return; } if (yunyangPage.hidden) return; activeBanner = (activeBanner + 1) % bannerSlides.length; bannerSlides.forEach((slide, index) => slide.classList.toggle("active", index === activeBanner)); }, 6000);
  const newsFront = yunyangPage.querySelector(".yunyang-content"), newsBanner = yunyangPage.querySelector(".yunyang-banner"), newsTicker = yunyangPage.querySelector(".yunyang-ticker"), newsArticle = yunyangPage.querySelector(".yunyang-article"), newsFooter = yunyangPage.querySelector(".yunyang-footer"), accessWarning = yunyangPage.querySelector(".yunyang-access-warning");
  const newsStories = {
    "old-housing": { title: "云阳市城南片区启动老旧小区改造", area: "城南区", intro: "城南片区多个老旧居民小区近日启动基础设施改造，内容包括排水、照明、外墙及公共空间整治。", paragraphs: ["9月初，云阳市城南区正式启动新一轮老旧小区改造工程。本次改造涉及12个居民院落，重点对老化管网、楼道照明、道路破损及公共活动区域进行集中整治。相关负责人表示，首批工程预计于年底前完成，施工期间将尽量减少对居民正常生活的影响。"] },
    "night-bus": { title: "蓉城至云阳城际公交新增夜间班次", area: "交通", intro: "为方便学生及夜间通勤人员出行，蓉城客运中心至云阳市汽车总站新增两班夜间线路。", paragraphs: ["记者从市交通部门获悉，自9月5日起，蓉城至云阳城际公交将在原有班次基础上增加两班夜间线路，发车时间分别为20时30分和22时。交通部门提醒，节假日期间客流量较大，市民可提前查询班次信息，合理安排出行时间。"] },
    "gas-check": { title: "持续高温，云阳市开展燃气安全专项检查", area: "民生", intro: "有关部门近日对居民小区、餐饮场所及老旧燃气设施展开集中排查。", paragraphs: ["近期持续高温，用气安全风险有所增加。云阳市住建、消防等部门联合开展燃气安全专项检查，对部分老旧居民区、餐饮门店以及燃气管线进行重点排查。工作人员提醒市民，使用燃气时应保持室内通风，并定期检查软管、阀门等设施，发现异常及时关闭气源并联系专业人员处理。"] },
    "anti-fraud": { title: "云阳市多所学校开展防诈骗主题宣传", area: "校园", intro: "针对网络游戏交易、兼职刷单、冒充熟人等常见诈骗类型，各校开展专题宣传活动。", paragraphs: ["近日，云阳市公安部门联合多所中学开展校园反诈宣传活动。民警结合近期典型案例，向学生讲解网络兼职、游戏账号交易、冒充客服等常见诈骗方式，并提醒学生妥善保管个人账号、验证码及身份信息，遇到异常情况及时向家长或老师求助。"] },
    "gas-incident": { title: "云阳市城北区一居民住宅发生疑似燃气中毒事件", area: "城北区", intro: "9月12日上午，城北区一居民住宅内发现人员死亡，相关部门已介入调查。", paragraphs: ["9月12日上午，云阳市城北区一居民住宅内发生疑似燃气中毒事件。公安、消防及医疗人员接警后赶赴现场处置。", "经现场确认，屋内人员已无生命体征。初步勘查未发现明显外力侵入痕迹，具体死亡原因及相关情况仍在进一步调查中。", "有关部门提醒广大市民注意用气安全，同时请勿传播未经证实的信息，具体情况以官方通报为准。"] },
    "business": { title: "云阳市开展优化营商环境专项行动", area: "政务", intro: "进一步精简办事流程，提升企业和群众政务服务体验。", paragraphs: ["云阳市近日启动优化营商环境专项行动，重点围绕项目审批、企业开办、涉企服务等环节推进流程优化。相关部门将同步完善线上办理和帮办代办机制，提高政务服务效率。"] },
    "governance": { title: "云阳市推进基层治理服务平台建设", area: "基层治理", intro: "推动社区事务、矛盾调解和便民服务向数字化平台集中。", paragraphs: ["为提升基层治理效率，云阳市近期加快推进基层治理服务平台建设。平台建成后，将整合社区服务、网格管理、事项上报等功能，进一步提高基层响应和协同处置能力。"] },
    "industry": { title: "云阳市政府与蓉城高新区签署产业协同合作框架协议", area: "产业", intro: "双方将在产业转移、人才交流和科技成果转化等方面加强合作。", paragraphs: ["日前，云阳市政府与蓉城高新区签署产业协同合作框架协议。根据协议，双方将围绕智能制造、新材料、数字产业等领域深化合作，并探索建立常态化项目对接机制。"] }
  };
  const showNewsFront = (record = false) => { newsFront.hidden = false; newsBanner.hidden = false; newsTicker.hidden = false; newsArticle.hidden = true; newsFooter.hidden = false; accessWarning.hidden = true; yunyangPage.scrollTop = 0; address.value = yunyangUrl; status.textContent = "完成"; if(record)recordHistory({type:"yunyang",url:yunyangUrl,title:"云阳新闻网"}); };
  const showNewsArticle = (key, record = true) => { const story = newsStories[key]; if (!story) return; newsArticle.querySelector("h1").textContent = story.title; newsArticle.querySelector(".yunyang-article-category").textContent = `云阳资讯　›　${story.area}`; newsArticle.querySelector(".yunyang-article-meta").textContent = `云阳新闻网　｜　云阳·${story.area}`; newsArticle.querySelector(".yunyang-article-intro").textContent = story.intro; const body = newsArticle.querySelector(".yunyang-article-body"); body.replaceChildren(...story.paragraphs.map(paragraph => { const p = document.createElement("p"); p.textContent = paragraph; return p; })); newsFront.hidden = true; newsBanner.hidden = true; newsTicker.hidden = true; newsArticle.hidden = false; newsFooter.hidden = false; accessWarning.hidden = true; yunyangPage.scrollTop = 0; currentTitle = story.title; address.value = `${yunyangUrl}#${key}`; status.textContent = "云阳资讯"; if(record)recordHistory({type:"newsArticle",url:address.value,title:story.title,key}); };
  yunyangPage.querySelector(".yunyang-article-back").addEventListener("click", () => showNewsFront(true));
  yunyangPage.querySelectorAll("a[href='#']").forEach(link => link.addEventListener("click", event => { event.preventDefault(); if (link.dataset.yunyangStory) showNewsArticle(link.dataset.yunyangStory); else status.textContent = "云阳新闻网"; }));
  yunyangPage.querySelectorAll(".yunyang-nav button").forEach(button => button.addEventListener("click", () => { if (button.textContent === "首页") { yunyangPage.querySelectorAll(".yunyang-nav button").forEach(item => item.classList.toggle("active", item === button)); showNewsFront(); } else { accessWarning.textContent = `无法访问：${button.textContent}　临时用户配置文件未载入该栏目的访问凭据。`; accessWarning.hidden = false; status.textContent = `无法访问：${button.textContent}`; } }));
  const forumUrl = "http://bbs.fuguang.cn/";
  const forumPage = document.createElement("section"); forumPage.className = "forum-page-shell"; forumPage.hidden = true;
  forumPage.appendChild(document.querySelector("#forumTemplate").content.cloneNode(true)); content.appendChild(forumPage);
  const forumUnavailableNotice = document.createElement("div"); forumUnavailableNotice.className = "forum-unavailable-notice"; forumUnavailableNotice.hidden = true; forumUnavailableNotice.textContent = "当前无法打开"; forumPage.querySelector(".forum-header").after(forumUnavailableNotice);
  const showForumUnavailable = label => { forumUnavailableNotice.textContent = `${label}：当前无法打开`; forumUnavailableNotice.hidden = false; status.textContent = `${label}：当前无法打开`; };
  forumPage.addEventListener("click", event => { if (event.target.closest("[data-forum-open],.forum-crumb-home,.forum-crumb-section")) forumUnavailableNotice.hidden = true; });
  const forumThreads = {
    "old-town": { title: "【热帖】结婚三年才发现老公一直用另一个手机号，里面还有个老婆", board: "情感生活", author: "别问我睡没睡", date: "2023-09-15 23:41", heat: "浏览：8.7万｜回复：2364", teaser: "我现在脑子还是懵的。跟我老公结婚三年，认识快七年了。昨天我才知道，他居然一直有另外一个手机号。", body: ["我现在脑子还是懵的。跟我老公结婚三年，认识快七年了。昨天我才知道，他居然一直有另外一个手机号。重点不是手机号，重点是那个号里，有个女的备注叫他：老公", "我先说一下，不是我乱翻他手机。昨天晚上他洗澡，我手机刚好没电，就拿他旧手机找外卖订单。那个手机平时放抽屉里，我一直以为早就不用了。结果一开机，还有电，里面插着卡，微信也是登录状态。我当时第一反应甚至不是怀疑他出轨，我还在想是不是工作号。", "然后我就看到锁屏通知：", "老公，你到了跟我说一声。", "我当时整个人都凉了。"], replies: [
      ["1楼｜奶茶三分糖","？？？？？这开局有点猛"],["2楼｜今天不想上班","先蹲一个后续"],["3楼｜瓜田一级巡逻员","楼主别冲动，先把聊天记录和转账全备份"],["4楼｜夜猫子9527","另一个女的知不知道你存在才是重点"],["5楼｜等一个反转","插眼，等瓜熟"],["6楼｜路过看看","有没有可能只是工作号，那个‘老公’是对方单方面这么叫？"],["7楼｜别问我睡没睡（楼主）","不是，聊天里他也叫对方老婆。"],["8楼｜今天有瓜吗","好，工作号理论可以埋了"],["9楼｜匿名用户1184","结婚三年还能藏一个手机号，这执行力也是离谱"],["10楼｜不吃香菜","我先不站队，等楼主把时间线放出来"],["11楼｜在线等更新","前排卖瓜子"],["12楼｜瓜子批发商","别卖了我已经坐下了"],["13楼｜一只困狗","最怕的是另一个女生也觉得自己是正牌"],["14楼｜看热闹不嫌大","楼主先查查有没有长期转账，聊天能删，钱不好删"],["15楼｜明天再减肥","等后续+1"],["16楼｜玻璃杯没洗","这要是两边都不知道对方存在，那男的时间管理也太恐怖了"],["17楼｜匿名用户603","先别直接对质，不然他第一反应肯定删东西"],["18楼｜今天也摸鱼","蹲"],["19楼｜薯片吃完了","蹲个凌晨两点更新"],["20楼｜不信谣但爱看","这种帖最后十有八九还有婆婆知道的剧情"],["21楼｜今天不上班","楼上别乌鸦嘴"],["22楼｜等一个反转","楼主人呢，查到啥了吗"],["23楼｜别问我睡没睡（楼主）","刚查了一下转账，比我想的时间更久。我先整理一下。"],["24楼｜全体起立","来了来了"],["25楼｜瓜田一级巡逻员","今晚别睡了各位"]
    ].map(([name,text])=>({name,text})) },
    "forum-rules": { title: "论坛发帖及评论规范｜发帖前请看", board: "站务区", author: "管理员", date: "2023-09-01 09:00", heat: "浏览：12.6万｜回复：0", teaser: "浮光是公共讨论社区，发帖和回复前请阅读社区规范。", body: ["浮光是公共讨论社区，为了避免帖子莫名其妙消失，也为了大家都能正常看帖，发帖和回复时请注意以下几点：", "** 禁止发布他人真实身份证号、家庭住址、手机号、银行卡等敏感个人信息。涉及普通人的爆料请主动打码，照片尽量遮挡正脸。", "** 未经证实的消息请标明‘听说’‘网传’‘个人猜测’等来源。不要把传闻直接写成事实，更不要冒充警方、媒体、学校或其他机构发布消息。", "** 禁止人肉、开盒、组织骚扰。讨论归讨论，不要跑到当事人账号、学校、单位下面围攻。", "** 标题可以有点节目效果，但别故意造谣。‘震惊’‘大瓜’‘后续来了’都随你，内容至少得和标题沾边。", "** 同一内容不要连续刷帖。重复帖、纯广告、引流二维码和恶意灌水会被删除。", "** 评论区可以吵，但别越线。持续辱骂、威胁、人身攻击，视情况禁言。", "** 涉及违法犯罪、未成年人隐私、明显血腥内容的帖子，版务有权直接处理。", "最后说一句：论坛里的帖子不等于事实。看瓜可以，别把猜测当结论。", "有异议可在【站务区】申诉，别连续私信管理员催处理。"], replies: [] },
    "night-bus": { title: "【求助】我家楼道每天凌晨三点都会有人停在我门口，但监控拍不到脸", board: "求助讨论", author: "沫沫崽", date: "2023-09-15 03:18", heat: "浏览：2147｜回复：17", teaser: "最近一周，我每天凌晨三点都会被楼道里的声音吵醒，像是有人慢慢走上来，然后停在我家门口。", body: ["我先说，我平时不信这些。最近一周我每天差不多凌晨三点都会被楼道里的声音吵醒，像是有人从楼梯慢慢走上来，然后停在我家门口。不是敲门，也不是按门铃，就是站着。", "第一次我以为是邻居，第二次开始觉得不对，因为每次时间都差不多，而且最多停一两分钟就走。昨天我终于装了个小监控，今天三点零七又来了。", "我刚刚回放，确实能看到一个人从楼梯上来，但镜头只能拍到下半身，上半身正好一直在死角里。最奇怪的是，那个人走到我门口以后就没动过，大概站了一分多钟，然后直接往楼下走了。", "我刚才去问楼下邻居，他们说昨晚没听见有人上下楼。我现在有点不敢开门，先问问有没有人碰到过这种情况。"], replies: [["1楼｜阿北","先蹲，别开门。"],["2楼｜小鹿不是鹿","监控发一下？"],["3楼｜momo_77","会不会是楼上邻居喝多走错门。"],["4楼｜陈皮糖","连续一周都走错是吧……"],["5楼｜看一眼就走","插眼，天亮再来看。"],["6楼｜沫沫崽（楼主）","我刚刚又看了一遍，发现昨天那个人下楼的时候，好像没有影子。我不确定是不是灯的问题。"],["7楼｜夏天不喝热水","先蹲一个，等天亮看后续。"],["8楼｜K","插眼，这种帖子最怕楼主突然不更了。"],["9楼｜橘子海","我先睡，明早回来收瓜。"],["10楼｜6632","别开门就行，其他的天亮再说。"],["11楼｜一碗馄饨","蹲。希望只是灯光问题。"],["12楼｜桃子汽水","有人看到更新记得踢我一下。"],["13楼｜momo_77","我现在更想看那段监控。"],["14楼｜周末睡到下午","先码住，等楼主白天再发。"],["15楼｜AA小林","每次说早睡都能刷到这种帖子……"],["16楼｜匿名用户402","等后续+1"],["17楼｜远山","楼主醒了记得更新一下，别真去开门。"]].map(([name,text])=>({name,text})) },
    "school": { title: "开学第一周，你们都适应了吗？", board: "校园日常", author: "纸飞机", date: "2023-09-06 19:08", teaser: "新课表拿到手了，感觉这学期会比想象中忙。", body: ["开学才一周，教室、走廊又恢复了熟悉的热闹。新课表排得满满当当，不过课间碰到老同学还是很开心。", "大家这学期有没有什么新计划？我打算先把每天要做的事记下来，免得一忙就忘。"], replies: [{ name: "蓝色铅笔", text: "我先争取把作业按时写完。" }, { name: "晚风", text: "刚开学总要适应几天，慢慢来。" }] },
    "taoyuan-dream": { title: "梦到桃原市的预兆就是你改变的开始", board: "梦境记录", author: "梦与心", date: "2023-09-14 22:08", teaser: "我大概是前年知道桃原市这个地方的。那时候我状态特别差。", body: ["我大概是前年知道桃原市这个地方的。那时候我状态特别差，工作没了，谈了五年的对象也吹了，天天在家躺着，我妈看我都来气。", "有一天晚上我做梦，梦到自己在一条街上走。那条街挺宽的，两边都是楼，不高，五六层那种，楼下有店面，卷帘门都拉着。但街上一个人都没有，很安静。我走了几十分钟吧，看到一家店门开着，就进去了。里面柜台后面坐着个人，但是仔细一看是个假人，有点像那种服装店门口摆的模特，脸上漆得不太均匀，因为我当时在梦里也没觉得害怕，就在那站着看。", "后来醒了我也没当回事，过了几天在网上瞎逛，看到有人发帖说桃原市，描述的那个地方跟我梦里的一模一样，当时汗毛都竖起来了。", "现在想想，或许那是个契机，让我能从艰苦的人世间解脱出来，现在我跟以前的心态完全不一样了，多亏了那个梦吧。"], replies: [{ name: "旧街路口", text: "你说的卷帘门我也梦见过，不过我走到街尾时，灯突然全亮了。" }, { name: "纸船", text: "同一个地方在不同人的梦里出现，确实让人有点在意。你还记得那家店的招牌吗？" }, { name: "梦与心", text: "招牌已经记不清了，只记得柜台后面那个假人的脸。" }] },
    "taoyuan-sayings": { title: "整理一下关于桃原市的各种说法", board: "线索整理", author: "露露", date: "2023-09-15 10:17", teaser: "我在这板块潜水挺久了，桃原市的帖子基本上都翻过一遍，闲着没事整理一下。", body: ["我在这板块潜水挺久了，桃原市的帖子基本上都翻过一遍，闲着没事整理一下，大家当个参考。", "说法一：桃原市不存在，就是编出来的，跟以前的鬼故事一样，传着传着就有人信了。", "说法二：有人去过，但每个人描述的都不太一样。有的说是做梦去的，有的说是半梦半醒的时候看到的，还有的说自己走着走着就走到那了，然后我觉得不太可取的是有些人说必须得死后才能到。", "说法三：去桃原市是有条件的，有人说得攒福报，有人说得‘那边有人接’，还有人说得自己想走才行。", "说法四：去过的人后来基本都出事了，这个我不多说了，你们自己翻老帖。", "说法五：对桃原市的描述有个共同点，都说那地方看着很繁华，但是没人，街上和城市里的站着的都是假人。", "我对这个地方呢更倾向于它的确是存在的，不过还是劝大家不要去随便探索这些未知的东西，好好生活才最重要。"], replies: [{ name: "晚风", text: "把各种说法放在一起看，确实能看出不少相似的细节。" }, { name: "灰桥", text: "第五条我也见过好几次，不过记述里对假人的样子说法不一。" }] },
    "taoyuan-understanding": { title: "说说我对桃原市的理解吧", board: "个人经历", author: "爱生活爱生命", date: "2023-09-15 21:34", teaser: "我朋友之前是医生，后来突然对桃原市特别感兴趣。", body: ["我朋友之前是医生，性格一直丧丧的闷闷的，后来我也不知道他从哪了解到桃原市，突然就特别感兴趣，每天都在跟我讲。刚开始我不信有这个地方呀，然后后来有一次，我们很久没见面了，再见面的时候他跟我说他去过桃原市了，他说他在里面很开心，唯一的遗憾就是我没能跟他一起去，他很希望我能去陪着他。", "其实一开始我真的觉得他精神有问题，但是自从回来之后，他整个人性格完全改变了，他之前其实有点闷，回来之后就变得特别健谈，对于生和死这些话题，总能讲很多道理出来，我一直在学习哲学和佛经，我以前知道他不爱看这些，但是他讲了很多话，都能够启发到我，然后我就动摇了，答应跟他去。", "我不知道我老婆那会刚怀孕，所以有一天晚上按照他说的方法入睡，还真梦到一个地方，有点几十年前那种街道的感觉，到处都很繁华，不过一个人都没有，我觉得在这地方生活起来应该很安逸吧，不过为了老婆和孩子，我最后拒绝了那个朋友，也不知道他现在怎么样了。如果以后有机会，我还想带老婆和儿子去。"], replies: [{ name: "露露", text: "家人还在身边，先照顾好眼前的生活吧。" }, { name: "旧街路口", text: "你提到的空街道和其他帖子很像，但每个人做的选择不一样。" }] }
  };
  forumThreads["night-bus"].board = "奇闻怪谈";
  forumThreads["newcomer-notice"] = { title: "【公告】新人报道帖", board: "站务区", author: "管理员", date: "置顶｜长期有效", heat: "浏览：6.8万｜回复：0", teaser: "欢迎来到浮光论坛，新注册的朋友可以在本帖简单报个到。", body: ["欢迎来到浮光论坛。", "新注册的朋友可以在本帖简单报个到，随便写点什么都行：怎么找到这里的、平时喜欢看什么板块、最近在吃什么瓜，或者单纯留一句‘来了’也可以。", "不用自报真实姓名、学校、单位、住址之类的信息，论坛就是上网闲聊的地方，别给自己添麻烦。", "常逛的板块目前有【闲聊灌水】【情感八卦】【社会杂谈】【奇闻怪谈】【影视游戏】等，看到感兴趣的直接进去玩。", "另外提醒一下，新账号前几次发帖可能会进入审核，属于正常情况，不用重复提交。"], replies: [] };
  forumThreads.school = { title: "【经历】说个我大学宿舍遇到的怪事，到现在也没想明白", board: "奇闻怪谈", author: "白桃乌龙少冰", date: "2023-09-15 01:46", heat: "浏览：3921｜回复：14", teaser: "大二那年我们宿舍四个人。有天晚上另外三个室友都回家了，只剩我一个人。", body: ["大二那年我们宿舍四个人，门是那种老式木门，里面反锁以后外面基本打不开。有天晚上另外三个室友都回家了，只剩我一个人。", "我大概一点多睡的，半夜被柜门响声吵醒，睁眼看到对面衣柜门是开着的。我记得很清楚，睡前我还顺手把它关上了。刚开始以为风吹的，但宿舍窗户也关着。", "我下床把柜门重新关好，回去继续睡。第二天早上起来，那扇柜门又开了，而且桌上多了一瓶矿泉水。那瓶水不是我的，我们宿舍平时也没人喝那个牌子。我当时没多想，直接扔了。", "后来室友回来以后，我随口提了一句，其中一个突然问我：‘你昨天是不是把门打开过？’我说没有。她就不说话了。我追问了半天，她才告诉我，以前住我们宿舍的学姐也说过，晚上一个人的时候柜门会自己开。真假我不知道，反正从那以后我再也没一个人睡过宿舍。"], replies: [["1楼｜阿柚","这种最烦，不吓人但越想越怪。"],["2楼｜77号选手","矿泉水什么牌子？"],["3楼｜白桃乌龙少冰（楼主）","忘了，很普通的蓝色包装。"],["4楼｜林小满","学姐那段也可能是室友故意吓你吧。"],["5楼｜不是本人","我大学宿舍也遇到过柜门自己开的，最后发现是合页坏了。"],["6楼｜小鱼干","但是水怎么解释。"],["7楼｜Monday","蹲一个有没有懂老宿舍结构的。"],["8楼｜匿名用户163","感觉像有人进过宿舍，比闹鬼还吓人。"],["9楼｜圆圆不圆","对，我第一反应也是人。"],["10楼｜三点睡","先码住，等楼主想起更多细节。"],["11楼｜一颗柚子","蹲"],["12楼｜Nono","有后续踢我"],["13楼｜普通市民","这种帖最适合半夜看……"],["14楼｜小熊软糖","先收藏，明天白天再看。"]].map(([name,text])=>({name,text})) };
  forumThreads["taoyuan-dream"].replies = [
    ["1楼｜栗子糕", "这不就是状态太差以后做的怪梦吗，感觉楼主有点自己给自己找解释了。"],
    ["2楼｜南风吹不到", "先不说桃原市，你这个梦描述得跟我之前看到的帖子真的有点像。"],
    ["3楼｜起床困难户", "又是桃原市哈哈哈哈，这地方到底有多少入口。"],
    ["4楼｜今天也很困", "我比较好奇你说的那个假人，是完全不动吗？还是你只是觉得它不像真人？"],
    ["5楼｜梦与心（楼主）", "完全没动，我当时站得挺近的。第一眼真的会觉得是人，仔细看才发现脸很奇怪。"],
    ["6楼｜橘子汽水", "如果是做梦的话，梦里觉得假人像真人也挺正常吧。"],
    ["7楼｜Neal", "我以前不信，直到我发现每个帖子都提到“街上没人”这一点。"],
    ["8楼｜4471", "还有楼都不高。"],
    ["9楼｜纸飞机", "对，我看到的几个版本也是五六层那种老街，没有特别高的楼。"],
    ["10楼｜阿禾", "你后来还有梦到过吗？"],
    ["11楼｜梦与心（楼主）", "没有，就那一次。"],
    ["12楼｜小饼干", "那挺好的，别再梦到了。"],
    ["13楼｜匿名用户173", "为什么“别再梦到了”？你知道什么吗？"],
    ["14楼｜小饼干", "没什么，就是这种地方听着就怪。"],
    ["15楼｜半杯水", "楼主那时候刚好失业失恋，后面状态变好，我觉得当成一个心理暗示解释也说得通。"],
    ["16楼｜旧雨伞", "我倒觉得不一定。\n桃原市的帖子我看过不少，好像很多人都是在人特别低落的时候第一次知道这个地方。"],
    ["17楼｜青柠没有茶", "这不就是幸存者偏差吗……状态好的人谁天天在网上发自己做了什么梦。"],
    ["18楼｜一只松鼠", "插眼，最近怎么又这么多人聊桃原市了。"],
    ["19楼｜M_02", "以前有个帖子说，第一次看到里面的“人”不要跟它说话，不知道还有没有人记得。"],
    ["20楼｜木槿", "记得，但是那个帖子后来删了吧。"],
    ["21楼｜匿名用户606", "不是删了，是发帖人账号没了。"],
    ["22楼｜起床困难户", "你们又开始了……"],
    ["23楼｜一颗糖", "所以楼主进店以后就只是看着？那个假人有没有正对着你？"],
    ["24楼｜梦与心（楼主）", "一开始是侧着的。\n但我现在回想，不确定我离开的时候它是不是还是那个方向。"],
    ["25楼｜南风吹不到", "……你这句话比正文吓人。"],
    ["26楼｜小蓝", "我先码一下。"],
    ["27楼｜远远", "其实如果真有这种地方，我反而挺想看看。"],
    ["28楼｜旧雨伞", "别因为好奇去找。"],
    ["29楼｜远远", "找得到再说吧哈哈。"],
    ["30楼｜旧雨伞", "有些东西不是找不到比较可惜。"]
  ].map(([name, text]) => ({ name, text }));
  forumThreads["taoyuan-sayings"].replies = [
    ["1楼｜栗子糕", "终于有人整理了，我之前翻了半天，全是互相引用，也不知道最早是哪来的。"],
    ["2楼｜不是鱼", "第三种‘攒福报’到底谁传出来的，听着最邪门。"],
    ["3楼｜M_02", "以前有个账号一直在讲这个。不是单纯做好事，好像还说过‘有人会来接’。"],
    ["4楼｜起床困难户", "你们这已经开始研究怎么进去了是吧……"],
    ["5楼｜小饼干", "这个别深挖了。"],
    ["6楼｜小北", "有人试过第三种吗？就是积福报那个。"],
    ["7楼｜旧雨伞", "别试。"],
    ["8楼｜小北", "做好事而已，又没什么损失。"],
    ["9楼｜旧雨伞", "如果只是做好事当然没事。"],
    ["10楼｜远远", "+1，我上次就在说想看看。反正网上这么多人讲，总不能一点源头都没有吧。"],
    ["11楼｜南风吹不到", "我现在也有点好奇进入条件到底是什么，但专门去找还是算了。"],
    ["12楼｜起床困难户", "你们三个一个比一个勇。"],
    ["13楼｜露露（楼主）", "如果还有人保存过早期截图或者旧帖地址，可以发出来，我再补主楼。来源不确定的我会单独标出来。"]
  ].map(([name, text]) => ({ name, text }));
  forumThreads["taoyuan-understanding"].replies = [
    ["1楼｜橘子汽水", "我还是觉得你朋友回来以后性格大变这段最奇怪。"],
    ["2楼｜起床困难户", "怎么每个桃原市帖子看到最后都开始讲佛学了……"],
    ["3楼｜爱生活爱生命（楼主）", "他以前真的完全不看这些，回来以后才突然开始接触的，所以我印象很深。"],
    ["4楼｜南风吹不到", "他有没有具体跟你说里面是什么样？还是只跟你说‘很开心’？"],
    ["5楼｜爱生活爱生命（楼主）", "说过一点，跟网上那些描述差不多。街上很热闹的样子，但没什么真正的人。"],
    ["6楼｜4471", "‘很热闹的样子但没人’这个说法越来越多了。"],
    ["7楼｜小满", "我更想知道他怎么进去的。"],
    ["8楼｜爱生活爱生命（楼主）", "他说就是睡觉，然后梦到了。至于是不是提前做过什么，我不清楚。"],
    ["9楼｜匿名用户308", "所以本质还是梦啊。人状态不好以后做个很真实的梦，再把它解释成某个地方，也说得通。"],
    ["10楼｜M_02", "问题是为什么这么多人梦到的细节能对上。"],
    ["11楼｜不是鱼", "因为大家都看过桃原市的帖子啊……这不就跟都市传说一样，先知道设定，再做类似的梦。"],
    ["12楼｜纸飞机", "但楼主说他朋友是在知道这些帖子之前就去过？"],
    ["13楼｜爱生活爱生命（楼主）", "对，至少按他自己的说法，是回来以后才开始搜这个名字的。"],
    ["14楼｜栗子糕", "那他怎么知道那个地方叫桃原市？"],
    ["15楼｜爱生活爱生命（楼主）", "这个我以前问过，他没解释，只说‘进去以后就知道’。"],
    ["16楼｜起床困难户", "又是这种‘到了就知道’……"],
    ["17楼｜远远", "说真的，看到这种我更想去了。\n我特别想知道到底是什么感觉，为什么回来的人都说自己变了。"],
    ["18楼｜小蓝", "你上两个帖子就已经在说想去了，还没放弃啊。"],
    ["19楼｜远远", "哈哈哈没有，我是真的好奇。"],
    ["20楼｜旧雨伞", "好奇心没必要什么都满足。"],
    ["21楼｜迟迟", "如果只是做梦进去，好像也没有那么危险吧？"],
    ["22楼｜旧雨伞", "谁告诉你只是做梦。"],
    ["23楼｜迟迟", "你是不是知道点什么？感觉每次看到你都在劝别人别去。"],
    ["24楼｜旧雨伞", "不知道。只是看得多。"],
    ["25楼｜青禾", "楼主朋友后来怎么样了？现在还在当医生吗？"],
    ["26楼｜爱生活爱生命（楼主）", "很久没联系了。我最后一次听说他的时候，好像已经离开原来的医院了。"],
    ["27楼｜一只松鼠", "‘回来以后突然开始研究生死和佛经’‘后来离开医院’，感觉不像是什么很好的变化……"],
    ["28楼｜桃子汽水", "也可能只是人经历了低谷以后想通了吧，别什么都往桃原市身上套。"],
    ["29楼｜Miya", "楼主说他很希望你陪他一起去，这句其实挺让我在意的。\n他为什么一定想带别人？"],
    ["30楼｜爱生活爱生命（楼主）", "我也问过。他说一个人去没意思，有认识的人一起会更好。"],
    ["31楼｜南风吹不到", "这个说法跟第二帖‘有人接’有点像，但又不是一回事。"],
    ["32楼｜小饼干", "我反而觉得这句最别扭。真是一个特别好的地方，为什么老想拉别人一起去。"],
    ["33楼｜匿名用户173", "对，我也觉得。\n而且楼主最后没去，是因为老婆刚怀孕。那如果没有怀孕，你是不是就去了？"],
    ["34楼｜爱生活爱生命（楼主）", "大概率会吧。当时确实答应过他。"],
    ["35楼｜远远", "那你现在还想去吗？"],
    ["36楼｜爱生活爱生命（楼主）", "现在不会了。有老婆孩子以后想法不一样。"],
    ["37楼｜迟迟", "我反而越来越想知道了……"],
    ["38楼｜余温", "你们想去的几个账号我都眼熟了，别哪天真集体消失了。"],
    ["39楼｜远远", "哈哈哈哈哈别咒我们。"],
    ["40楼｜小北", "如果真的是‘积福报’以后才有机会进去，那至少也说明不是谁都能去吧。"],
    ["41楼｜旧雨伞", "别把网上的‘进入条件’当攻略。"],
    ["42楼｜青柠没有茶", "先码。这个帖看着平静，但感觉信息更多。"]
  ].map(([name, text]) => ({ name, text }));
  forumThreads["taoyuan-twin-case"] = { title: "双子悬案有人知道吗？", board: "奇闻怪谈", author: "爱写小说的小陈", date: "2023-09-16 00:37", heat: "浏览：3186｜回复：0", teaser: "我前阵子写推理小说，无意间翻到一个词叫‘双子悬案’。", body: ["我前阵子写推理小说，无意间翻到一个词叫‘双子悬案’。", "一开始我以为是双胞胎的案子，后来发现不是。这个系列里的死者都不是双胞胎，但死亡现场都有两具一模一样的尸体，死亡时间一般差七分钟。官方都定的意外死亡，但两具尸体肯定没法解释，所以案子一直挂着。", "我觉得比较戏剧性的是，这些死者有一个共同点，生前都在网上发过关于桃原市的帖子。这完全就是真正的都市传说，太适合写推理了，不过相关资料公布得太少了，我也不知道具体真实情况就是这样，还是媒体搞的噱头。"], image: "assets/photos/twin-case-news-v2.png", imageName: "新闻报道.png", replies: [] };
  forumThreads["fortune-meaning"] = { title: "佛教说的福报到底是什么", board: "闲聊灌水", author: "小姜不吃姜", date: "2023-09-15 20:11", heat: "浏览：856｜回复：0", teaser: "这词最近被说得越来越玄乎了，我以前一直以为就是‘做好事会有好报’的意思。", body: ["这词最近被说得越来越玄乎了，我以前一直以为就是‘做好事会有好报’的意思，但看了一圈又感觉好像没这么简单。", "我对这些完全不懂，想问一下，福报到底是怎么理解的？平时说的‘积福报’具体又是在积什么？不会真的像积分一样，做一件好事加一点吧……"], replies: [] };
  forumThreads["fortune-daily"] = { title: "怎么积累福报？平时能做哪些事", board: "闲聊灌水", author: "葡萄味软糖", date: "2023-09-14 16:20", teaser: "如果只是想从日常开始，其实能做的事情很多，也不用刻意搞得很隆重。", body: ["如果只是想从日常开始，其实能做的事情很多，也不用刻意搞得很隆重。", "我自己平时会注意这些：", "看到别人需要搭把手的时候顺手帮一下；", "对家里人耐心一点，少因为小事发脾气；", "不用的衣服和东西整理出来捐掉；", "有能力的话偶尔做点公益或者小额捐助；", "不随便在背后说别人坏话；", "答应别人的事情尽量做到；", "看到流浪动物，条件允许的话给点水和吃的。", "我觉得这种事最重要的是长期做，不是某一天突然做很多。"], replies: [] };
  forumThreads["fortune-cause"] = { title: "福报和因果到底是什么关系？", board: "社会杂谈", author: "山外有山", date: "2023-09-13 21:05", teaser: "看了几页讨论，感觉很多人把‘福报’和‘因果’混在一起了。", body: ["看了几页讨论，感觉很多人把‘福报’和‘因果’混在一起了。", "因果不是‘做一件好事，马上得到一件好事’，也不是做错事以后立刻遭报应。更准确一点说，一个人的行为、选择和念头都会产生影响，只是这个结果什么时候出现、以什么方式出现，并不是自己能控制的。", "福报可以理解成善因结出的某种结果，但它不是一个能自己统计的数字。今天帮了三个人，不代表‘福报+3’；明天倒霉了，也不能简单理解成‘以前福报不够’。", "所以那种‘攒够多少福报就能得到某种机会’的说法，我个人不太认同。这样很容易把行善变成一种交易，好像只要做够任务，就一定能换到对应的奖励。", "至于网上流传的‘福报够了就能去某个地方’，至少我没见过正规的说法这么解释。", "做好事当然没问题，但如果一直盯着结果，反而把因果想得太简单了。"], replies: [] };
  forumThreads["fortune-comfort"] = { title: "我觉得福报就是一种心理安慰", board: "闲聊灌水", author: "今天不想上班，明天也是", date: "2023-09-12 18:42", teaser: "我一直觉得‘福报’这个东西，说到底就是让人心里舒服一点。", body: ["我一直觉得‘福报’这个东西，说到底就是让人心里舒服一点。", "人做了好事，会希望以后也有好事发生在自己身上；遇到倒霉事的时候，又会安慰自己‘可能以前福报不够’。这样想当然没什么问题，至少能让人没那么焦虑。", "但要说世界上真有个看不见的账本，专门记录你做过多少好事、以后该给你什么回报，我是不太信的。", "而且现在还有人开始算自己‘积了多少’，甚至觉得做够了什么事以后就会碰到特别的机会，这就有点怪了。做好事本来挺正常的，硬要给它配个奖励，反而像在完成任务。", "不过当成心理安慰我倒能理解。日子已经够累了，人总得给自己找点盼头。"], replies: [] };
  forumThreads["fortune-wl"] = { title: "试着每天积一点福报", board: "闲聊灌水", author: "wl", avatar: "assets/avatars/forum-wl.png", date: "2018-02-17 22:41", heat: "浏览：2841｜回复：37", teaser: "最近状态比前段时间好一点，也不想整天待在家里。", body: ["最近状态比前段时间好一点，也不想整天待在家里。", "这段时间在试着做一些以前不会特意去做的事情。把家里没怎么穿的衣服整理出来送人，前两天还去帮社区搬了一下午东西。都不是什么大事。", "有人跟我说，这些也算是在给自己积福报。我以前不太信这些，但现在想想，多做一点总比什么都不做好。", "我准备每天记一下，看自己能坚持多久。"], replies: [["1楼｜雨衣忘在家","挺好的，至少人忙起来不会一直乱想。"],["2楼｜wl（楼主）","是啊，我最近反而觉得这样舒服一点。"],["3楼｜红豆面包","积福报是有什么说法吗？还是单纯做好事？"],["4楼｜wl（楼主）","有人教我的。\n大概就是每天做一点，慢慢攒吧。\n他说够了以后，会有好事情发生。"],["5楼｜玻璃杯","听着怎么跟做任务一样……"],["6楼｜wl（楼主）","哈哈，我现在确实每天都会记。"],["27楼｜窗前流浪猫","等等，这个楼主是不是王丽？"],["28楼｜咕咕嘎嘎","哪个王丽？"],["29楼｜咕咕嘎嘎","前两天西郊小区出事的那个。\n我以前住那边，头像看着很像她。"],["30楼｜上午十点","3月9号那个？"],["31楼｜窗前流浪猫","对。"],["32楼｜咕咕嘎嘎","卧槽，我翻了一下她之前的帖子，她这一个月一直在发‘积福报’。"],["33楼｜塑料雨棚","别乱认人，有没有可能只是同名或者长得像。"],["34楼｜窗前流浪猫","不是同名。楼主以前另一篇提过自己叫王丽，还说过住西郊小区附近。"],["35楼｜窗前流浪猫","她3月7号以后就没再上线了。"],["36楼｜塑料友谊","整的也太邪门了......"],["37楼｜雨鞋进水了","别说了，半夜刷到这里有点发毛。"]].map(([name,text])=>({name,text})), initialReplyCount: 6 };
  forumThreads["game-pixel-air"] = { title: "论坛那个像素空战真的有人打通过吗？", board: "影视游戏", author: "睡到下午", date: "2023-09-16 01:24", heat: "浏览：4271｜回复：9", teaser: "论坛里面那个飞机游戏到底谁设计的，难度也太夸张了。", body: ["论坛里面那个脑瘫飞机游戏到底谁设计的，难度也太夸张了。", "我今天断断续续打了一个多小时，好不容易见到最后那个 Boss，结果几十秒就没了。感觉第二关后半段完全是在故意劝退。", "有没有人真打通过？通关后有东西吗，还是就普通结算？"], replies: [["1楼｜一碗馄饨","我最高就打到 Boss 半血，后面那个弹幕根本躲不了。"],["2楼｜是时迁呀","轻松拿捏"],["3楼｜橘子海","是不是开发者忘删的 debug 信息。"],["6楼｜我的杯壁","很像，这种小游戏一堆残留代码很正常。"],["7楼｜睡到下午（楼主）","我也是这么想的，但那串东西排版还挺整齐，不太像报错。"],["8楼｜小红薯","有截图吗？"],["9楼｜睡到下午（楼主）","没有，出来太突然了。"],["10楼｜K","下次看见的话，留着。"],["11楼｜momo_77","这什么谜语人发言..." ]].map(([name,text])=>({name,text})) };
  forumThreads["case-twin-collection"] = { title: "双子悬案整理合集", board: "奇闻怪谈", author: "城", date: "2023-09-16 02:03", heat: "浏览：1947｜回复：2", teaser: "前几年陆续存过一些‘双子悬案’的旧新闻和讨论，最近重新翻出来整理了一下。", body: ["前几年陆续存过一些‘双子悬案’的旧新闻和讨论，最近重新翻出来整理了一下。", "目前能比较确定对上的有 6 起，时间跨度从 2008 年到 2024 年。案件本身没有被官方认定为同一系列，‘双子悬案’只是后来网友方便讨论起的名字。", "几起事件有几个很明显的共同点：", "现场都会出现两具身份完全相同的尸体，DNA鉴定结果一致，而且死亡时间通常只差几分钟。", "死者之间没有明显共同身份，死亡方式也不一样，官方最后大多以意外死亡结案，至于为什么会出现两具‘同一个人’，目前没有公开解释。", "另外，我整理的时候还发现一个比较奇怪的地方：部分死者生前都接触过‘福报’相关内容，这部分资料比较乱，我暂时不下结论。", "有早年存过相关资料的可以补充。"], replies: [{name:"1楼｜你也爱吃油炸鸡米花吗",text:"求个资源大佬（拜）（拜）（拜）"},{name:"2楼｜K",text:"",download:"档案整理.zip"}] };
  forumThreads["yunyang-letters"] = { title: "分享一个记云阳城区位置的小办法", board: "闲聊灌水", author: "柚子皮有点苦", date: "2023-09-16 08:26", teaser: "拿出咱们的云阳城区示意图标准版，把城区大概分成26个位置，用英文字母顺着记。", body: ["不知道有没有人跟我一样，住了挺久还是经常分不清云阳一些地方到底算哪边。", "最近和朋友聊到有个挺笨但是蛮好用的记法，就是拿出咱们的云阳城区示意图标准版，可以把城区大概分成26个位置，用英文字母顺着记。不是官方划分，主要就是方便认方向。", "最西南边的马鞍山附近记成A，然后顺着城区往上排，最东北边到凤凰山区域就是Z。", "我现在看地图上一次标很多地点的时候偶尔还会这么记，比一堆路名挤在一起好认一点"], replies: [["1楼｜炸鸡不要酱","云阳才多大啊，还需要搞一套字母分区……"],["2楼｜洗衣机在转","本地人直接说地名不就完了，这个学会不是更麻烦吗。"],["3楼｜柚子皮有点苦（楼主）","所以我都说了是小众记忆方法，又没让全云阳统一考试，哈哈。"],["4楼｜柚子皮有点苦（楼主）","噢对了，长岭山区域算作P哦宝宝们，那边本身还有一片居住区 ，不能把人家孤立了"],["5楼｜薄荷味牙膏","那这不就是硬凑26个字母。"],["7楼｜柚子皮有点苦（楼主）","你非要这么说我也没办法"]].map(([name,text])=>({name,text})) };
  Object.keys(forumThreads).forEach(key => { if (!Array.isArray(forumRepliesThisDesktopSession[key])) forumRepliesThisDesktopSession[key] = []; forumThreads[key].replies.push(...forumRepliesThisDesktopSession[key]); });
  let forumAuthed = false, forumCurrent = "old-town", forumInThread = false, forumView = "home", forumFromSearch = false;
  const forumExpandedReplies = new Set();
  const forumGate = forumPage.querySelector(".forum-login-gate"), forumTeaser = forumPage.querySelector(".forum-teaser"), forumFull = forumPage.querySelector(".forum-full-content"), forumProfile = forumPage.querySelector(".forum-profile");
  const syncForumView = () => {
    forumPage.classList.toggle("forum-search-view", forumView === "search");
    forumPage.classList.toggle("forum-detail-view", forumView === "thread");
    const crumb = forumPage.querySelector(".forum-breadcrumb");
    crumb.hidden = forumView === "home";
    crumb.querySelector(".forum-crumb-section").textContent = forumView === "search" || forumFromSearch ? "搜索结果" : "近期热帖";
    crumb.querySelector(".forum-crumb-tail").hidden = forumView !== "thread";
    if (forumView === "thread") crumb.querySelector(".forum-crumb-title").textContent = forumThreads[forumCurrent].title;
    if (typeof forumCornerAd !== "undefined") forumCornerAd.hidden = forumAdClosed || forumView === "search" || forumPage.hidden;
  };
  const renderForumThread = () => {
    const thread = forumThreads[forumCurrent];
    const isTaoyuanThread = forumCurrent.startsWith("taoyuan-");
    forumTeaser.querySelector("h2").replaceChildren(document.createTextNode(thread.title + " "));
    const badge = document.createElement("small"); badge.textContent = `【${thread.board}】`; forumTeaser.querySelector("h2").appendChild(badge);
    forumTeaser.querySelector("p").textContent = thread.teaser;
    forumFull.querySelector(".forum-thread-head h2").textContent = thread.title;
    forumFull.querySelector(".forum-thread-head span").textContent = `${thread.board}　发表于 ${thread.date}`;
    forumFull.querySelector(".forum-post-author b").textContent = thread.author;
    forumFull.querySelector(".forum-post-author img").src = thread.avatar || (isTaoyuanThread ? "assets/avatars/taoyuan-forum-avatar-v2.png" : "assets/avatars/forum-default-avatar.png");
    forumFull.querySelector(".forum-post-heat").textContent = thread.heat || `浏览：${Math.max(120, thread.replies.length * 137)}｜回复：${thread.replies.length}`;
    const body = forumFull.querySelector(".forum-post-body"); body.replaceChildren(...thread.body.map(line => { const p = document.createElement("p"); if (forumCurrent === "fortune-wl" && line.includes("积福报")) { const [before, after] = line.split("积福报"); const emphasis = document.createElement("strong"); emphasis.textContent = "积福报"; p.append(document.createTextNode(before), emphasis, document.createTextNode(after)); } else p.textContent = line; return p; })); if (thread.image) { const imageLink = document.createElement("button"); imageLink.type = "button"; imageLink.className = "forum-attachment-link"; imageLink.textContent = `查看帖子附图：${thread.imageName || "图片"}`; imageLink.addEventListener("click", () => openPhotoViewer({ name: thread.imageName || "帖子附图", source: "浮光论坛", src: thread.image })); body.appendChild(imageLink); }
    const replies = forumFull.querySelector(".forum-replies"); const initialReplyCount = thread.initialReplyCount && !forumExpandedReplies.has(forumCurrent) ? thread.initialReplyCount : thread.replies.length; replies.replaceChildren(...thread.replies.slice(0, initialReplyCount).map((reply, index) => { const article = document.createElement("article"); const head = document.createElement("div"); head.className = "forum-reply-head"; const avatar = document.createElement("img"); avatar.className = "forum-reply-avatar"; avatar.src = thread.avatar && /｜wl（楼主）/.test(reply.name) ? thread.avatar : isTaoyuanThread && /(梦与心|露露|爱生活爱生命|远远|南风吹不到|小北)/.test(reply.name) ? "assets/avatars/taoyuan-forum-avatar-v2.png" : "assets/avatars/forum-default-avatar.png"; avatar.alt = `${reply.name}头像`; const name = document.createElement("strong"); name.textContent = reply.name; head.append(avatar, name); const p = document.createElement("p"); if(reply.download){const download=document.createElement("button");download.type="button";download.className="forum-download-link";download.innerHTML=`<img src="assets/icons/case-archive-transparent.png" alt=""> <span>${reply.download}</span>`;download.addEventListener("click",startCaseArchiveDownload);p.appendChild(download);}else p.textContent = reply.text; article.append(head, p); if (thread.initialReplyCount && index === thread.initialReplyCount && forumExpandedReplies.has(forumCurrent)) { const gap = document.createElement("div"); gap.className = "forum-reply-gap"; gap.textContent = "7—26楼的回复暂未显示"; replies.appendChild(gap); } return article; }));
    if (thread.initialReplyCount && forumExpandedReplies.has(forumCurrent) && replies.children[thread.initialReplyCount]) { const gap = document.createElement("div"); gap.className = "forum-reply-gap"; gap.textContent = "7—26楼的回复暂未显示"; replies.insertBefore(gap, replies.children[thread.initialReplyCount]); }
    if (thread.initialReplyCount && !forumExpandedReplies.has(forumCurrent)) { const more = document.createElement("button"); more.type = "button"; more.className = "forum-show-more"; more.textContent = "显示更多回复"; more.addEventListener("click", () => { forumExpandedReplies.add(forumCurrent); renderForumThread(); }); replies.appendChild(more); }
    forumTeaser.hidden = forumAuthed; forumFull.hidden = !forumAuthed; syncForumView();
  };
  const forumLoginForm = forumPage.querySelector(".forum-login-form"), forumLoginNotice = forumPage.querySelector(".forum-login-notice");
  const revealForumLogin = () => { forumLoginForm.hidden = false; forumLoginNotice.hidden = true; forumLoginForm.elements.password.focus(); };
  forumPage.querySelector(".forum-login-link").addEventListener("click", revealForumLogin);
  forumPage.querySelector(".forum-register-link").addEventListener("click", () => { forumLoginForm.hidden = true; forumLoginNotice.textContent = "你已经有账户，请直接登录。"; forumLoginNotice.hidden = false; });
  const forumReplyForm = forumFull.querySelector(".forum-reply-form"), forumReplyText = forumReplyForm.querySelector("textarea"); let forumReplyTarget = "";
  forumFull.addEventListener("click", event => { const button = event.target.closest(".forum-reply-button"); if (!button) return; if (!forumAuthed) { revealForumLogin(); return; } forumReplyTarget = button.dataset.replyTo || ""; forumReplyForm.querySelector("label").textContent = forumReplyTarget ? `回复 ${forumReplyTarget}` : `回复 ${forumThreads[forumCurrent].author}`; forumReplyForm.hidden = false; forumReplyText.focus(); forumPage.scrollTop = forumPage.scrollHeight; });
  forumReplyForm.querySelector(".forum-reply-cancel").addEventListener("click", () => { forumReplyForm.hidden = true; forumReplyText.value = ""; });
  forumReplyForm.addEventListener("submit", event => { event.preventDefault(); const message = forumReplyText.value.trim(); if (!message) return; const reply = { name: "zy2625", text: message }; forumThreads[forumCurrent].replies.push(reply); forumRepliesThisDesktopSession[forumCurrent].push(reply); forumReplyForm.hidden = true; forumReplyText.value = ""; renderForumThread(); forumPage.scrollTop = forumPage.scrollHeight; status.textContent = "回复已发表"; });
  const forumThreadList = forumPage.querySelector(".forum-thread-list");
  [["taoyuan-twin-case","双子悬案有人知道吗？","奇闻怪谈 · 爱写小说的小陈"],["fortune-meaning","佛教说的福报到底是什么","闲聊灌水 · 小姜不吃姜"],["fortune-daily","怎么积累福报？平时能做哪些事","闲聊灌水 · 葡萄味软糖"],["fortune-cause","福报和因果到底是什么关系？","社会杂谈 · 山外有山"],["fortune-comfort","我觉得福报就是一种心理安慰","闲聊灌水 · 今天不想上班，明天也是"],["fortune-wl","试着每天积一点福报","闲聊灌水 · wl"],["game-pixel-air","论坛那个像素空战真的有人打通过吗？","影视游戏 · 睡到下午"],["case-twin-collection","双子悬案整理合集","奇闻怪谈 · 城"],["yunyang-letters","分享一个记云阳城区位置的小办法","闲聊灌水 · 柚子皮有点苦"]].forEach(([key,title,meta]) => { const button = document.createElement("button"); button.type = "button"; button.dataset.forumOpen = key; button.hidden = true; const strong = document.createElement("strong"); strong.textContent = title; const small = document.createElement("small"); small.textContent = meta; button.append(strong, small); forumThreadList.querySelector(".forum-search-reserved").before(button); });
  forumPage.querySelectorAll("[data-forum-open]").forEach(button => button.addEventListener("click", () => { forumReplyForm.hidden = true; forumReplyText.value = ""; const fromHomeList = forumView === "home" && !!button.closest(".forum-thread-list"); forumCurrent = button.dataset.forumOpen; if (fromHomeList) { renderForumThread(); return; } forumInThread = true; forumFromSearch = forumView === "search"; forumView = "thread"; renderForumThread(); if (!forumAuthed) revealForumLogin(); else forumPage.scrollTop = 0; }));
  forumLoginForm.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget; const username = form.elements.username.value.trim(), password = form.elements.password.value; const error = forumPage.querySelector(".forum-login-error"); if (username !== "zy2625" || password !== "20060823") { error.textContent = "账户名或密码不正确，请重试。"; error.hidden = false; form.elements.password.value = ""; form.elements.password.focus(); return; } forumAuthed = true; error.hidden = true; form.elements.password.value = ""; forumGate.hidden = true; forumProfile.hidden = false; renderForumThread(); if (forumView === "search") updateForumSearch(); status.textContent = "论坛登录成功"; });
  forumProfile.querySelector(".forum-logout").addEventListener("click", () => { forumAuthed = false; forumGate.hidden = false; forumLoginForm.hidden = true; forumProfile.hidden = true; renderForumThread(); updateForumSearch(); status.textContent = "已退出论坛"; });
  forumPage.querySelectorAll("[data-forum-action]").forEach(button => button.addEventListener("click", () => { if (button.dataset.forumAction === "refresh") { forumUnavailableNotice.hidden = true; renderForumThread(); status.textContent = "帖子已刷新"; } else showForumUnavailable("站内信"); }));
  const forumBoardTitle = forumPage.querySelector(".forum-board-heading h2");
  const showForumSection = section => { if (section === "chat") { forumLoginNotice.textContent = "聊天室暂未开放，欢迎先浏览论坛帖子。"; forumLoginNotice.hidden = false; return; } forumInThread = false; forumView = "home"; forumFromSearch = false; forumSearchInput.value = ""; forumBoardTitle.textContent = section === "featured" ? "精华区" : section === "boards" ? "全站板块" : "近期热帖"; forumPage.querySelectorAll(".forum-thread-list button").forEach(button => { const searchOnly = button.dataset.forumOpen.startsWith("taoyuan-") || button.dataset.forumOpen.startsWith("fortune-") || button.dataset.forumOpen.startsWith("game-") || button.dataset.forumOpen.startsWith("case-") || button.dataset.forumOpen.startsWith("yunyang-"); button.hidden = searchOnly || (section === "featured" && button.dataset.forumOpen !== "old-town"); }); forumPage.querySelector(".forum-search-reserved").hidden = true; forumPage.querySelector(".forum-search-empty").hidden = true; forumPage.querySelector(".forum-board-heading span").textContent = section === "featured" ? "共 1 条主题" : "共 3 条主题"; syncForumView(); forumLoginNotice.textContent = section === "featured" ? "已显示精华帖，登录后可查看完整内容。" : "已显示论坛帖子。"; forumLoginNotice.hidden = forumAuthed; };
  forumPage.querySelectorAll("[data-forum-section]").forEach(button => button.addEventListener("click", () => showForumSection(button.dataset.forumSection)));
  forumPage.querySelectorAll("[data-forum-nav]").forEach(button => button.addEventListener("click", () => { if (button.dataset.forumNav === "home") { forumUnavailableNotice.hidden = true; forumCurrent = "old-town"; renderForumThread(); showForumSection("reading"); } else showForumUnavailable("全站板块"); }));
  const pinnedList = forumPage.querySelector(".forum-pinned-list");
  const newcomerPin = document.createElement("button"); newcomerPin.type = "button"; newcomerPin.dataset.forumOpen = "newcomer-notice"; newcomerPin.innerHTML = '<span>[置顶☝]</span> 【公告】新人报道帖'; pinnedList.children[0].after(newcomerPin); newcomerPin.addEventListener("click", () => { forumUnavailableNotice.hidden = true; forumReplyForm.hidden = true; forumReplyText.value = ""; forumCurrent = "newcomer-notice"; forumInThread = true; forumFromSearch = false; forumView = "thread"; renderForumThread(); if (!forumAuthed) revealForumLogin(); else forumPage.scrollTop = 0; });
  const phoneAdPin=document.createElement("button");phoneAdPin.type="button";phoneAdPin.className="forum-phone-ad-pin";phoneAdPin.innerHTML='<span>【广告】</span>注册即送30元话费！新用户限时领取';newcomerPin.after(phoneAdPin);phoneAdPin.addEventListener("click",()=>showForumUnavailable("广告活动页面"));
  [...pinnedList.querySelectorAll("button")].forEach((button, index) => { button.dataset.forumPinItem = index < 3 ? "1" : "2"; });
  const pinPager = document.createElement("div"); pinPager.className = "forum-pin-pager"; pinPager.innerHTML = '<button type="button" data-forum-pin-page="prev" aria-label="上一页">&lt;</button><button type="button" data-forum-pin-page="1" aria-current="page">1</button><button type="button" data-forum-pin-page="2">2</button><button type="button" data-forum-pin-page="next" aria-label="下一页">&gt;</button>'; pinnedList.after(pinPager);
  let pinnedPage = 1;
  const renderPinnedPage = () => { pinnedList.querySelectorAll("button").forEach(button => { button.hidden = button.dataset.forumPinItem !== String(pinnedPage); }); pinPager.querySelectorAll("button").forEach(button => { const active = button.dataset.forumPinPage === String(pinnedPage); if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current"); }); };
  pinPager.addEventListener("click", event => { const button = event.target.closest("button"); if (!button) return; const target = button.dataset.forumPinPage; pinnedPage = target === "prev" ? Math.max(1, pinnedPage - 1) : target === "next" ? Math.min(2, pinnedPage + 1) : Number(target); renderPinnedPage(); });
  renderPinnedPage();
  forumPage.querySelector(".forum-ad-play").addEventListener("click", () => { status.textContent = skyGameInstalledThisPage ? "正在打开像素空战" : "正在下载像素空战"; startSkyGameDownload(); });
  const forumCornerAd = forumPage.querySelector(".forum-corner-ad"); content.appendChild(forumCornerAd); forumCornerAd.hidden = true; content.classList.add("forum-ad-host"); let forumAdClosed = false, forumAdReopenTimer;
  const forumAdError = document.createElement("section"); forumAdError.className = "forum-ad-error"; forumAdError.hidden = true; forumAdError.innerHTML = '<div class="forum-ad-error-message"><div class="forum-ad-error-icon" aria-hidden="true">!</div><div><h2>无法显示该网页</h2><p>您正在查找的网页当前无法访问。该网站可能遇到技术问题，或者您需要调整浏览器设置。</p><p>请尝试：检查网络连接，或稍后再试。</p><hr><small>无法找到服务器或 DNS 错误<br>Internet Explorer</small></div></div>'; content.appendChild(forumAdError);
  const sensitiveSiteError = document.createElement("section"); sensitiveSiteError.className = "forum-ad-error browser-sensitive-error"; sensitiveSiteError.hidden = true; sensitiveSiteError.innerHTML = '<div class="forum-ad-error-message"><div class="forum-ad-error-icon" aria-hidden="true">!</div><div><h2>无法显示该网页</h2><p>您正在访问的网站含有敏感信息，已被禁止访问。</p><p>为保障网络环境安全，该网页已被浏览器安全策略拦截。</p><hr><small>访问被阻止：网站内容包含敏感信息<br>Internet Explorer</small></div></div>'; content.appendChild(sensitiveSiteError);
  forumCornerAd.querySelector(".forum-corner-ad-close").addEventListener("click", () => { forumAdClosed = true; forumCornerAd.hidden = true; clearTimeout(forumAdReopenTimer); forumAdReopenTimer = setTimeout(() => { forumAdClosed = false; if (!forumPage.hidden && forumAdError.hidden && forumView !== "search") forumCornerAd.hidden = false; }, 60000); });
  forumCornerAd.querySelector(".forum-corner-ad-fake-close").addEventListener("click", () => { status.textContent = "请点击广告蓝色标题栏右侧的 × 关闭"; });
  forumCornerAd.querySelector(".forum-corner-ad-image img").addEventListener("click", () => showAdError());
  const forumSearchInput = forumPage.querySelector(".forum-search input");
  forumSearchInput.name = `forum-search-${Date.now()}`; forumSearchInput.autocomplete = "off";
  const updateForumSearch = () => { const query = forumSearchInput.value.trim(); const taoyuanSearch = forumAuthed && (query === "桃源市" || query === "桃原市"); const fortuneSearch = forumAuthed && query === "福报"; const gameSearch = forumAuthed && query === "像素空战"; const caseSearch = forumAuthed && query === "双子悬案"; const yunyangSearch = forumAuthed && query === "云阳"; const searching = query.length > 0; forumView = searching ? "search" : "home"; forumInThread = false; forumFromSearch = false; let found = 0; forumPage.querySelectorAll(".forum-thread-list button").forEach(button => { const key = button.dataset.forumOpen; const group = key.startsWith("taoyuan-") ? "taoyuan" : key.startsWith("fortune-") ? "fortune" : key.startsWith("game-") ? "game" : key.startsWith("case-") ? "case" : key.startsWith("yunyang-") ? "yunyang" : "home"; button.hidden = searching ? !((taoyuanSearch && group === "taoyuan") || (fortuneSearch && group === "fortune") || (gameSearch && group === "game") || (caseSearch && group === "case") || (yunyangSearch && group === "yunyang")) : group !== "home"; if (!button.hidden) found++; }); forumPage.querySelector(".forum-search-reserved").hidden = !taoyuanSearch; forumPage.querySelector(".forum-search-empty").hidden = !searching || found > 0; forumBoardTitle.textContent = searching ? "搜索结果" : "近期热帖"; forumPage.querySelector(".forum-board-heading span").textContent = `共 ${found} 条主题`; syncForumView(); forumPage.scrollTop = 0; };
  forumSearchInput.addEventListener("input", updateForumSearch);
  forumPage.querySelector(".forum-crumb-home").addEventListener("click", () => { showForumSection("reading"); forumCurrent = "old-town"; renderForumThread(); forumPage.scrollTop = 0; });
  forumPage.querySelector(".forum-crumb-section").addEventListener("click", () => { if (forumFromSearch) { forumView = "search"; forumInThread = false; updateForumSearch(); } else { showForumSection("reading"); } forumPage.scrollTop = 0; });
  renderForumThread();
  let currentTitle = "星网网址导航";
  const browserHistory = [];
  let browserHistoryIndex = -1;
  const toolbarButtons = win.querySelectorAll(".toolbar button");
  applyRetroNavigationButton(toolbarButtons[0], "back");
  applyRetroNavigationButton(toolbarButtons[1], "forward");
  const updateHistoryButtons = () => {
    if (toolbarButtons[0]) toolbarButtons[0].disabled = browserHistoryIndex <= 0;
    if (toolbarButtons[1]) toolbarButtons[1].disabled = browserHistoryIndex >= browserHistory.length - 1;
  };
  const recordHistory = entry => {
    const current = browserHistory[browserHistoryIndex];
    if (current && current.type === entry.type && current.url === entry.url) { updateHistoryButtons(); return; }
    browserHistory.splice(browserHistoryIndex + 1);
    browserHistory.push(entry);
    browserHistoryIndex = browserHistory.length - 1;
    updateHistoryButtons();
  };
  let browserFavorites = browserFavoritesThisDesktopSession.map(item => ({ ...item }));
  if (!browserFavorites.some(item => item.url === yunyangUrl)) browserFavorites.unshift({ title:"云阳新闻网", url:yunyangUrl });
  const saveBrowserFavorites=()=>{ browserFavoritesThisDesktopSession = browserFavorites.map(item => ({ ...item })); };
  const favoritesBar=document.createElement("nav"); favoritesBar.className="browser-favorites-bar"; favoritesBar.setAttribute("aria-label","收藏栏");
  favoritesBar.innerHTML='<span class="favorites-label">收藏</span><div class="browser-favorite-links"></div><button type="button" class="add-browser-favorite" title="管理当前网页收藏"><span aria-hidden="true">＋</span> 加入收藏栏</button><div class="browser-favorite-dialog" hidden><strong>管理当前网页</strong><p class="browser-favorite-dialog-title"></p><div><button type="button" data-favorite-choice="add">加入</button><button type="button" data-favorite-choice="remove">移除</button><button type="button" data-favorite-choice="cancel">取消</button></div></div>';
  win.querySelector(".toolbar").after(favoritesBar);
  const renderFavorites=()=>{
    const links=favoritesBar.querySelector(".browser-favorite-links"); links.replaceChildren();
    browserFavorites.forEach(item=>{const button=document.createElement("button");button.type="button";button.className="browser-favorite-link";button.textContent=item.title;button.title=item.url;button.addEventListener("click",()=>{favoriteDialog.hidden=true;navigateAddress(item.url,item.title);});links.appendChild(button);});
  };
  const favoriteDialog=favoritesBar.querySelector(".browser-favorite-dialog");
  favoritesBar.querySelector(".add-browser-favorite").addEventListener("click",()=>{favoriteDialog.querySelector(".browser-favorite-dialog-title").textContent=currentTitle||address.value.trim();favoriteDialog.hidden=!favoriteDialog.hidden;});
  favoriteDialog.querySelectorAll("[data-favorite-choice]").forEach(button=>button.addEventListener("click",()=>{const choice=button.dataset.favoriteChoice,url=address.value.trim(),title=currentTitle||url;favoriteDialog.hidden=true;if(choice==="cancel")return;if(choice==="add"){if(!browserFavorites.some(item=>item.url===url))browserFavorites.push({title,url});if(url===forumUrl)forumFavoriteThisDesktopSession=true;status.textContent=`已加入收藏栏：${title}`;}else if(url===yunyangUrl){status.textContent="云阳新闻网为固定收藏，无法移除";}else{browserFavorites=browserFavorites.filter(item=>item.url!==url);if(url===forumUrl)forumFavoriteThisDesktopSession=false;status.textContent=`已从收藏栏移除：${title}`;}saveBrowserFavorites();renderFavorites();}));
  renderFavorites();
  if (!browserFavoriteTipShownThisPage) {
    browserFavoriteTipShownThisPage = true;
    const tip = document.createElement("aside");
    tip.className = "browser-favorite-tip";
    tip.setAttribute("role", "status");
    tip.innerHTML = '<button type="button" aria-label="关闭收藏提示">×</button><strong>收藏常用网址</strong><p>点击“加入收藏栏”，下次就能从收藏栏快速打开这个网页。</p>';
    favoritesBar.appendChild(tip);
    tip.querySelector("button").addEventListener("click", () => tip.remove());
  }
  content.querySelector("#navDate").textContent = "2001年7月18日　星期三";
  const hideBrowserPages = () => { navPage.hidden = true; weiboPage.hidden = true; yunyangPage.hidden = true; forumPage.hidden = true; forumCornerAd.hidden = true; forumAdError.hidden = true; sensitiveSiteError.hidden = true; };
  const resetDirectory = (record = true) => { currentTitle = "星网网址导航"; hideBrowserPages(); navPage.hidden = false; content.querySelectorAll(".nav-link").forEach(link => link.hidden = false); directory.hidden = false; warning.hidden = false; footer.hidden = false; input.value = ""; notice.textContent = "欢迎使用星网导航！提示：单击网址可在地址栏查看历史网址。"; address.value = apps.browser.path; status.textContent = "就绪"; if(record)recordHistory({type:"home",url:apps.browser.path,title:currentTitle}); };
  const showWeibo = (record = true) => { currentTitle = "新浪微博"; hideBrowserPages(); weiboPage.hidden = false; address.value = weiboUrl; status.textContent = "完成"; if(record)recordHistory({type:"weibo",url:weiboUrl,title:currentTitle}); };
  const showYunyang = (record = true) => { currentTitle = "云阳新闻网"; hideBrowserPages(); yunyangPage.hidden = false; showNewsFront(); address.value = yunyangUrl; status.textContent = "完成"; if(record)recordHistory({type:"yunyang",url:yunyangUrl,title:currentTitle}); };
  const showForum = (record = true) => { currentTitle = "浮光论坛"; hideBrowserPages(); forumPage.hidden = false; forumAdError.hidden = true; forumCornerAd.hidden = forumAdClosed || forumView === "search"; address.value = forumUrl; status.textContent = "完成"; if(record)recordHistory({type:"forum",url:forumUrl,title:currentTitle}); };
  const showUnavailable = (url, title = url, record = true) => { resetDirectory(false); currentTitle = title; address.value = url; directory.hidden = true; warning.hidden = true; footer.hidden = false; notice.innerHTML = `<b>无法访问：</b>${title}　<span>临时用户配置文件未载入网络访问凭据。</span>`; status.textContent = `无法访问：${title}`; if(record)recordHistory({type:"unavailable",url,title}); };
  const showAdError = (record = true) => { currentTitle = "无法显示该网页"; hideBrowserPages(); forumAdError.hidden = false; address.value = "http://game.fuguang.cn/"; status.textContent = "无法显示该网页"; if(record)recordHistory({type:"adError",url:address.value,title:currentTitle}); };
  const blockedSensitiveUrl = "http://88Av.Gv.cn/";
  const showSensitiveSiteError = (record = true) => { currentTitle = "无法显示该网页"; hideBrowserPages(); sensitiveSiteError.hidden = false; address.value = blockedSensitiveUrl; status.textContent = "已阻止含有敏感信息的网站"; if(record)recordHistory({type:"sensitiveError",url:address.value,title:currentTitle}); };
  const normalizeAddress = value => { const trimmed = value.trim(); if (!trimmed) return ""; if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed; if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(trimmed)) return `http://${trimmed}`; return trimmed; };
  const navigateAddress = (rawValue, preferredTitle = "") => { const value = normalizeAddress(rawValue); const normalized = value.toLowerCase().replace(/\s+/g, ""); const normalizedWithoutSlash = normalized.replace(/\/+$/, ""); if (!value) { resetDirectory(false); directory.hidden = true; warning.hidden = true; notice.textContent = "请输入有效的搜索网址。"; status.textContent = "地址无效"; address.focus(); return; } if (normalizedWithoutSlash === "http://88av.gv.cn") { showSensitiveSiteError(); return; } if (normalized === apps.browser.path.toLowerCase() || ["星网","星网导航"].includes(normalized)) { resetDirectory(); return; } if (normalized.startsWith(`${yunyangUrl}#`)) { const key = normalized.slice(yunyangUrl.length + 1); if (newsStories[key]) { showYunyang(false); showNewsArticle(key); return; } } if (["云阳","云阳新闻网","yunyang",yunyangUrl].includes(normalized)) { showYunyang(); return; } if (normalized === forumUrl) { showForum(); return; } if (["微博","新浪微博","sina微博",weiboUrl].includes(normalized)) { showWeibo(); return; } showUnavailable(value, preferredTitle || value); };
  const restoreHistory = entry => { if (!entry) return; if (entry.type === "home") resetDirectory(false); else if (entry.type === "weibo") showWeibo(false); else if (entry.type === "yunyang") showYunyang(false); else if (entry.type === "newsArticle") { showYunyang(false); showNewsArticle(entry.key, false); } else if (entry.type === "forum") showForum(false); else if (entry.type === "adError") showAdError(false); else if (entry.type === "sensitiveError") showSensitiveSiteError(false); else showUnavailable(entry.url, entry.title, false); updateHistoryButtons(); };
  recordHistory({type:"home",url:apps.browser.path,title:currentTitle});
  content.querySelector("#navSearchForm").addEventListener("submit", event => { event.preventDefault(); const keyword = input.value.trim(); if (!keyword) { directory.hidden = true; warning.hidden = true; footer.hidden = false; notice.textContent = "请输入有效的搜索网址。"; status.textContent = "搜索失败：0 项"; return; } navigateAddress(keyword); });
  content.querySelector("#navReset").addEventListener("click", resetDirectory);
  content.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", event => { event.preventDefault(); navigateAddress(link.dataset.url, link.dataset.site); }));
  address.addEventListener("keydown", event => { if (event.key !== "Enter") return; event.preventDefault(); navigateAddress(address.value); });
  toolbarButtons[0]?.addEventListener("click", () => { if (browserHistoryIndex <= 0) return; browserHistoryIndex--; restoreHistory(browserHistory[browserHistoryIndex]); });
  toolbarButtons[1]?.addEventListener("click", () => { if (browserHistoryIndex >= browserHistory.length - 1) return; browserHistoryIndex++; restoreHistory(browserHistory[browserHistoryIndex]); });
  const weiboInput=weiboPage.querySelector("#weiboInput"), remain=weiboPage.querySelector("#weiboRemain"), feed=weiboPage.querySelector("#weiboFeed"), postCount=weiboPage.querySelector("#weiboPostCount");
  weiboInput.addEventListener("input",()=>{remain.textContent=String(140-weiboInput.value.length);});
  weiboPage.querySelector("#weiboPublish").addEventListener("click",()=>{const text=weiboInput.value.trim();if(!text){status.textContent="请输入微博内容";weiboInput.focus();return;}const article=document.createElement("article");article.innerHTML='<img src="assets/avatars/xiaohang-user.png" alt="小航"><div><p><b>小航</b>：<span></span></p><small>刚刚　来自网页</small><footer><button>收藏</button> | <button>转发</button> | <button>评论</button></footer></div>';article.querySelector("p span").textContent=text;feed.prepend(article);weiboInput.value="";remain.textContent="140";postCount.textContent=String(Number(postCount.textContent)+1);status.textContent="微博发布成功";});
  weiboPage.addEventListener("click",event=>{const button=event.target.closest("button");if(button&&!button.id&&button.closest(".weibo-page")){status.textContent=`${button.textContent.trim()}：功能暂未开放`;}});
}
function setupQQLoginWindow(win) {
  win.classList.add("qq-window", "qq-login-window"); win.style.width = `${Math.min(550, innerWidth - 20)}px`; win.style.height = "365px"; win.style.left = `${Math.max(5, Math.round((innerWidth - Math.min(550, innerWidth - 20)) / 2))}px`; win.style.top = `${Math.max(30, Math.round((innerHeight - 425) / 2))}px`;
  win.querySelector("h2").textContent = "QQ 2001 - 用户登录"; win.querySelector(".toolbar")?.remove(); win.querySelector(".statusbar")?.remove();
  const content = win.querySelector(".window-content"); content.replaceChildren(document.querySelector("#qqLoginTemplate").content.cloneNode(true));
  const form = content.querySelector("#qqLoginForm"), account = content.querySelector("#qqAccount"), password = content.querySelector("#qqPassword"), error = content.querySelector("#qqLoginError");
  localStorage.removeItem("retroQQAccount");
  const showError = message => { playFaultAlert(); error.textContent = message; form.classList.remove("shake"); requestAnimationFrame(() => form.classList.add("shake")); };
  form.addEventListener("submit", event => {
    event.preventDefault(); const loginButton = form.querySelector("button[type=submit]");
    if (account.value.trim() !== "27491863" || password.value !== "zy2625") { showError("登录失败：QQ号码或密码不正确。"); password.value = ""; password.focus(); return; }
    qqAuthenticatedThisPage = true;
    error.classList.add("success"); error.textContent = "正在连接 QQ 服务器，请稍候…"; loginButton.disabled = true;
    setTimeout(() => { win.classList.remove("qq-login-window"); setupQQContactsWindow(win); win.querySelector("h2").textContent = "QQ 2001 - 主面板 (27491863)"; const task = document.querySelector(`.task-item[data-window-id="${win.id}"] .task-title`); if (task) task.textContent = "QQ 2001 - 好友列表"; focusWindow(win); }, 650);
  });
  content.querySelector("[data-login-action=cancel]").addEventListener("click", () => closeWindow(win));
  content.querySelector("[data-login-action=settings]").addEventListener("click", () => showError("网络设置：使用默认 Internet 连接。"));
}
function setupQQContactsWindow(win) {
  win.classList.add("qq-window", "qq-contacts-window"); win.style.width = `${Math.min(390, innerWidth - 20)}px`; win.style.height = `${Math.min(680, innerHeight - 75)}px`; win.style.left = "35px"; win.style.top = "35px";
  win.querySelector("h2").textContent = "QQ 2001 - 主面板 (27491863)"; win.querySelector(".menu-bar")?.remove(); win.querySelector(".toolbar")?.remove(); win.querySelector(".statusbar")?.remove();
  const content = win.querySelector(".window-content"); content.replaceChildren(document.querySelector("#qqContactsTemplate").content.cloneNode(true));
  content.querySelectorAll(".friend").forEach(friend => {
    friend.addEventListener("click", () => { content.querySelectorAll(".friend").forEach(f => f.classList.remove("selected")); friend.classList.add("selected"); openQQChat(friend.dataset.name, friend.dataset.avatar, friend.dataset.type, friend.dataset.avatarSrc); });
    if (friend.dataset.type !== "group") friend.querySelector(".avatar")?.addEventListener("click", event => { event.stopPropagation(); openQQUserInfo(friend.dataset.name); });
  });
  content.querySelectorAll("[data-contact-toggle]").forEach(header => {
    header.addEventListener("click", () => {
      const expanded = header.getAttribute("aria-expanded") === "true";
      header.setAttribute("aria-expanded", String(!expanded));
      content.querySelectorAll(`[data-contact-section="${header.dataset.contactToggle}"]`).forEach(item => { item.hidden = expanded; });
    });
  });
  content.querySelectorAll("[data-qq-tab]").forEach(tab => tab.addEventListener("click", () => {
    if (tab.dataset.qqTab === "chatroom") { openQQFeatureError("chatroom"); return; }
    content.querySelectorAll("[data-qq-tab]").forEach(item => item.classList.toggle("selected", item === tab));
    content.querySelectorAll("[data-qq-view]").forEach(view => { view.hidden = view.dataset.qqView !== tab.dataset.qqTab; });
  }));
  content.querySelector(".add-friend-row button")?.addEventListener("click", () => openQQFeatureError("friend"));
  content.querySelector("[data-qq-action=space]")?.addEventListener("click", () => openQQSpace());
  content.querySelector("[data-qq-action=favorites]")?.addEventListener("click", openQQFavorites);
  content.querySelector("[data-qq-action=channel]")?.addEventListener("click", openQQChannelError);
  bindWindowResize(win);
}
function openQQSpace(profile = { name: "愿珍惜你的每一天", qq: "27491863", avatarSrc: "assets/avatars/xiaohang-user.png", signature: "希望身边的人都好好的" }) {
  const safeProfile = profile?.name ? { ...profile } : { name: "愿珍惜你的每一天", qq: "27491863", avatarSrc: "assets/avatars/xiaohang-user.png", signature: "希望身边的人都好好的" };
  if (String(safeProfile.qq) === "27491863") { safeProfile.name = "愿珍惜你的每一天"; safeProfile.signature = "希望身边的人都好好的"; }
  if (String(safeProfile.qq) === "5200718") safeProfile.signature = "一切顺遂";
  const spaceId = `qq-space-${safeProfile.qq}`;
  const existing = document.getElementById(spaceId); if (existing) { focusWindow(existing); return; }
  const win = template.content.firstElementChild.cloneNode(true); win.id = spaceId; win.dataset.app = "qq-space"; win.classList.add("qq-space-window");
  win.querySelector("h2").textContent = `QQ空间 - ${safeProfile.name}`; win.querySelector(".window-mini-icon").classList.add("qq"); win.querySelector(".menu-bar")?.remove(); win.querySelector(".toolbar")?.remove(); win.querySelector(".statusbar span:first-child").textContent = "QQ空间已打开";
  win.style.width = `${Math.min(860, innerWidth - 40)}px`; win.style.height = `${Math.min(720, innerHeight - 64)}px`; win.style.left = `${Math.max(45, Math.round((innerWidth - Math.min(700, innerWidth - 80)) / 2))}px`; win.style.top = "36px";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const owner = escape(safeProfile.name);
  const isOwner = String(safeProfile.qq) === "27491863";
  const isZhenzhen = String(safeProfile.qq) === "5200718";
  const isTansiyuan = String(safeProfile.qq) === "7312046";
  const ownerPosts = [
    {date:"2022年3月7日", text:"我和珍珍姐的新朋友：毛毛！", photo:"猫咪照片"},
    {date:"2022.9.3", text:"高一的题比想象中简单呀", comment:"你小子别装B"},
    {date:"2023.5.24", text:"幸好你一直在我身边，谢谢你", comment:"你们班那群SB，我大哥今天已经帮你好好教训他们了"},
    {date:"2023.6.6", text:"节哀", images:[{src:"assets/photos/memorial-candle.png",name:"悼念蜡烛"}]}
  ];
  const zhenzhenPosts = [
    {date:"2024.9.4", text:"转发了一条动态", repost:"佛法讲万法皆空，因果不空。我们今生所受的苦乐，皆是往昔造作的业力所感。而福报，正是善业累积的显现。布施、持戒、忍辱、精进、禅定、智慧，六度万行，无一不是在为我们的福田播种。\n当福报资粮具足，便可往生桃源世界。那里没有生老病死之苦，没有爱别离、怨憎会之恼，是真正的极乐净土、无忧地界。\n然需知，福报不够者，无有资格得入此门。因此，我辈当于日用之中，广行善事，存好心、说好话、做好人，莫以善小而不为，莫以恶小而为之。\n愿尔我皆能精进不退，早日积满福报，超脱轮回之苦，同生桃源，共证菩提。"},
    {date:"2023.5.21", text:"最后还是没忍住……", images:[{src:"assets/photos/zhenzhen-desk.png",name:"新买的梳妆台"},{src:"assets/photos/zhenzhen-perfume.png",name:"香水"}], comments:[['林叔','上次不是还说舍不得买'],['强哥','喜欢就拿，省那点钱干啥'],['小雨','你最近是真的发财了'],['陈珍珍回复小雨','哪有，吃土了已经'],['峰哥','你现在眼光越来越高了'],['陈叔','下回来给你看个更好的'],['阿哲哥','又花钱，月底别来哭穷']]},
    {date:"2023.4.30", text:"今晚风还挺舒服，随便拍两张", images:[{src:"assets/photos/zhenzhen-night.png",name:"夜景自拍"}], comments:[['强叔','又这么晚不回家'],['林叔','现在是越来越会拍了哈'],['陈珍珍回复林叔','哈哈'],['峰哥','夜里风大，别光顾着好看'],['陈珍珍回复峰哥','哈哈'],['陈叔','难怪今晚喊你你都不来'],['陈珍珍回复陈叔','哈哈']]},
    {date:"2023.4.21", text:"这套比我想的好看一点", images:[{src:"assets/photos/zhenzhen-outfit.png",name:"新衣服"}], comments:[['强叔','小姑娘越来越会打扮了'],['林叔','这身比你平时那几套好看'],['峰哥','今天这么乖？不像你哦']]}
  ];
  const tansiyuanPosts = [
    {date:"2023.1.21", text:"", images:[{src:"assets/photos/tansiyuan-2023-01-21.png",name:"2023.1.21 照片"}]},
    {date:"2023.8.22", text:"", images:[{src:"assets/photos/tansiyuan-2023-08-22.png",name:"2023.8.22 照片"}]}
  ];
  const dateValue = value => { const parts = String(value).match(/\d+/g) || []; return Number(parts[0] || 0) * 10000 + Number(parts[1] || 0) * 100 + Number(parts[2] || 0); };
  const posts = (isOwner ? ownerPosts : isZhenzhen ? zhenzhenPosts : isTansiyuan ? tansiyuanPosts : []).sort((a,b) => dateValue(b.date) - dateValue(a.date));
  const placeholder = label => '<div class="qz-photo" role="img" aria-label="' + label + '占位图"><span aria-hidden="true">▧</span><span>' + label + '</span><small>图片暂未上传</small></div>';
  const feedAvatar = escape(safeProfile.avatarSrc || 'assets/avatars/xiaohang-user.png');
  const feed = () => posts.length ? posts.map(post => {
    const images = post.images?.length ? '<div class="qz-photo-grid' + (post.images.length === 1 ? ' is-single' : '') + '">' + post.images.map(img => '<button type="button" data-qz-image="' + escape(img.src) + '" data-qz-image-name="' + escape(img.name) + '" aria-label="查看' + escape(img.name) + '"><img src="' + escape(img.src) + '" alt="' + escape(img.name) + '" /></button>').join('') + '</div>' : '';
    const comments = post.comments?.length ? '<div class="qz-comments">' + post.comments.map(([name, body]) => '<div class="qz-comment"><strong>' + escape(name) + '：</strong>' + escape(body) + '</div>').join('') + '</div>' : post.comment ? '<div class="qz-comment"><strong>珍珍姐：</strong>' + escape(post.comment) + '</div>' : '';
    const repost = post.repost ? '<button type="button" class="qz-repost qz-repost-link" data-qz-external-step="0">' + escape(post.repost).replace(/\n/g,'<br>') + '</button><div class="qz-external-notice" hidden aria-live="polite"></div>' : '';
    const likers = isZhenzhen ? ['珍珍姐', ...new Set((post.comments || []).map(([name]) => name).filter(name => !name.includes('回复'))), '愿珍惜你的每一天'] : [safeProfile.name];
    const likes = '<div class="qz-like">♡ <strong>' + likers.map(escape).join('、') + '</strong> 赞了这条说说 · ' + likers.length + '</div>';
    return '<article class="qz-post qz-post-with-avatar"><img class="qz-feed-avatar" src="' + feedAvatar + '" alt="' + owner + '的头像" /><div class="qz-post-content"><div class="qz-post-meta"><strong>' + owner + '</strong><time>' + escape(post.date) + '</time></div>' + (post.text ? '<p>' + escape(post.text) + '</p>' : '') + repost + (post.photo === '猫咪照片' ? '<button type="button" class="qz-post-photo-button" data-qz-photo="maomao" aria-label="查看毛毛的照片"><img class="qz-post-photo" src="assets/photos/maomao.png" alt="毛毛，一只白色的猫" /></button>' : post.photo ? placeholder(post.photo) : '') + images + likes + comments + '</div></article>';
  }).join('') : '<p class="qz-empty">主人还没有发表说说。</p>';
  const page = document.createElement("section"); page.className = "qq-space-page";
  if (isOwner) page.classList.add("is-owner");
  if (String(safeProfile.qq) === "5200718") page.classList.add("is-zhenzhen");
  const avatar = '<img src="' + escape(safeProfile.avatarSrc || 'assets/avatars/xiaohang-user.png') + '" alt="' + owner + '的头像" />';
  page.innerHTML = '<header><span class="qq-space-star" aria-hidden="true">★</span><div><small>QZONE / 个人空间</small><strong>' + owner + '的 QQ 空间</strong><span>把生活里的小事，留在这里。</span></div></header><nav aria-label="空间导航"><button type="button" data-qz-tab="home" aria-pressed="true">主页</button><button type="button" data-qz-tab="board" aria-pressed="false">留言板</button><button type="button" data-qz-tab="posts" aria-pressed="false">说说</button><span>欢迎来到我的空间</span></nav><div class="qz-layout"><aside><section class="qz-module"><h3>个人档案</h3><div class="qz-profile"><div class="qz-avatar" aria-label="头像占位">头像</div><strong>' + owner + '</strong><small>QQ：' + escape(safeProfile.qq) + '</small><p>' + escape(safeProfile.signature || '记录生活，收藏回忆。') + '</p></div><div class="qz-stats"><span><b>' + posts.length + '</b>说说</span><span><b>' + posts.filter(p => p.photo).length + '</b>照片</span><span><b>0</b>留言</span></div></section><section class="qz-module"><h3>空间公告</h3><p class="qz-note">欢迎来我的小天地。<br>看看近况，留下你的足迹。</p></section><section class="qz-module"><h3>最近访客</h3><p class="qz-note">暂无访客记录</p></section></aside><main><section data-qz-panel="home"><section class="qz-module"><h3>我的主页 <small>HOME</small></h3><div class="qz-welcome"><strong>欢迎来到' + owner + '的空间</strong><p>一些日常，一些值得记住的人和事。</p></div></section><section class="qz-module"><h3>我的相册 <small>' + posts.filter(p => p.photo).length + ' 张照片</small></h3><div class="qz-album">' + (posts.filter(p => p.photo).map(p => placeholder(p.photo)).join('') || '<p>暂无照片</p>') + '</div></section><section class="qz-module"><h3>空间动态 <small>共 ' + posts.length + ' 条</small></h3>' + feed() + '</section></section><section data-qz-panel="board" hidden><section class="qz-module"><h3>留言板 <small>MESSAGE BOARD</small></h3><div class="qz-note"><p>有什么想说的，就留在这里吧。</p><form class="qz-message-form"><label>昵称<input name="nickname" maxlength="20" required placeholder="输入你的昵称"></label><label>留言<textarea name="message" maxlength="500" rows="4" required placeholder="写下你的留言……"></textarea></label><button type="submit">发表留言</button><small>留言仅保存在当前浏览器</small></form><div class="qz-messages" aria-live="polite"></div></div></section></section><section data-qz-panel="posts" hidden><section class="qz-module"><h3>我的说说 <small>共 ' + posts.length + ' 条</small></h3>' + feed() + '</section></section></main></div><footer>QQ空间 · 分享生活，留住感动</footer>';
  page.querySelector('.qq-space-star').removeAttribute('aria-hidden');
  page.querySelector('.qq-space-star').innerHTML = avatar;
  page.querySelector(':scope > header div span').textContent = safeProfile.signature ?? '';
  page.querySelector('.qz-profile p').textContent = safeProfile.signature ?? '';
  page.querySelector('.qz-avatar').removeAttribute('aria-label');
  page.querySelector('.qz-avatar').innerHTML = avatar;
  page.querySelector('.qz-stats span:nth-child(2) b').textContent = posts.reduce((count, post) => count + (post.images?.length || (post.photo ? 1 : 0)), 0);
  page.querySelector('.qz-album')?.closest('.qz-module')?.remove();
  page.addEventListener('click', event => {
    const externalLink = event.target.closest('.qz-repost-link');
    if (externalLink) { const notice = externalLink.nextElementSibling; const step = Number(externalLink.dataset.qzExternalStep || 0) + 1; externalLink.dataset.qzExternalStep = String(Math.min(step, 2)); if (step === 1) notice.innerHTML = '<strong>此为外部链接</strong><span>再次点击该文字继续</span><small>来源：浮光论坛</small>'; else notice.innerHTML = '<strong>需要从外部浏览器查看</strong><small>来源：浮光论坛</small>'; notice.hidden = false; win.querySelector('.statusbar span:first-child').textContent = step === 1 ? '外部链接提示' : '需要从外部浏览器查看'; return; }
    if (event.target.closest('[data-qz-photo="maomao"]')) openPhotoViewer({ name:'毛毛.png', source:`${safeProfile.name}的QQ空间`, src:'assets/photos/maomao.png' });
    const imageButton = event.target.closest('[data-qz-image]');
    if (imageButton) openPhotoViewer({ name:imageButton.dataset.qzImageName, source:`${safeProfile.name}的QQ空间`, src:imageButton.dataset.qzImage });
  });
  page.querySelectorAll('[data-qz-tab]').forEach(button => button.addEventListener('click', () => {
    page.querySelectorAll('[data-qz-tab]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    page.querySelectorAll('[data-qz-panel]').forEach(panel => { panel.hidden = panel.dataset.qzPanel !== button.dataset.qzTab; });
    win.querySelector('.statusbar span:first-child').textContent = 'QQ空间 · ' + button.textContent;
    win.querySelector('.window-content').scrollTop = 0;
  }));
  const storageKey = 'qzone-messages-' + safeProfile.qq;
  let messages = [];
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(saved)) messages = saved.filter(m => m && typeof m.name === 'string' && typeof m.text === 'string'); } catch {}
  const renderMessages = () => {
    page.querySelector('.qz-messages').innerHTML = messages.length ? messages.map(m => '<article class="qz-post"><div class="qz-post-meta"><strong>' + escape(m.name) + '</strong><time>' + escape(m.date) + '</time></div><p>' + escape(m.text) + '</p></article>').join('') : '<p class="qz-empty">还没有留言，来坐坐吧。</p>';
    page.querySelector('.qz-stats span:last-child b').textContent = messages.length;
  };
  renderMessages();
  page.querySelector('form').addEventListener('submit', event => {
    event.preventDefault(); const form = event.currentTarget;
    const name = form.elements.nickname.value.trim(), text = form.elements.message.value.trim();
    if (!name || !text) return;
    messages.unshift({name, text, date:new Date().toLocaleDateString('zh-CN')});
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch { form.querySelector('small').textContent = '浏览器存储不可用，留言仅在本次窗口中保留'; }
    form.reset(); renderMessages();
  });
  win.querySelector(".window-content").replaceChildren(page); layer.appendChild(win);
  const task = document.createElement("button"); task.className = "task-item"; task.dataset.windowId = win.id; task.innerHTML = '<span class="task-app-icon qq" aria-hidden="true"></span><span class="task-title"></span>'; task.querySelector(".task-title").textContent = `${safeProfile.name}的QQ空间`; task.addEventListener("click", () => { if (win.classList.contains("minimized")) focusWindow(win); else if (task.classList.contains("active")) minimizeWindow(win); else focusWindow(win); }); taskItems.appendChild(task);
  bindWindow(win); focusWindow(win); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once: true });
}

function renderQQFavorites(win, query = "", kind = "全部") {
  const list = win.querySelector(".qq-favorites-list"); if (!list) return;
  list.replaceChildren();
  const keyword = query.trim().toLowerCase();
  const dateKey = note => { const parts = String(note.date || "").match(/\d+/g) || []; return Number(parts[0] || 0) * 10000 + Number(parts[1] || 0) * 100 + Number(parts[2] || 0); };
  const visible = qqFavoriteNotes.filter(note => (kind === "全部" || note.kind === kind) && (!keyword || `${note.title} ${note.content} ${note.source}`.toLowerCase().includes(keyword))).sort((a, b) => dateKey(b) - dateKey(a));
  if (!visible.length) { const empty = document.createElement("div"); empty.className = "qq-favorites-empty"; empty.textContent = "没有找到收藏内容"; list.appendChild(empty); return; }
  visible.forEach(note => {
    const item = document.createElement("article"); item.className = "qq-favorite-item";
    const copy = document.createElement("div"); const title = document.createElement("strong"); title.textContent = note.title; copy.appendChild(title); if (note.content) { const excerpt = document.createElement("p"); excerpt.textContent = note.content; copy.appendChild(excerpt); }
    if (note.image) { const photo = document.createElement("button"); photo.type = "button"; photo.className = "qq-favorite-photo"; photo.setAttribute("aria-label", `查看${note.title}`); const image = document.createElement("img"); image.src = note.image; image.alt = note.title; photo.appendChild(image); photo.addEventListener("click", () => openPhotoViewer({ name: note.title, source: "QQ收藏", src: note.image })); copy.appendChild(photo); }
    const meta = document.createElement("aside"); const date = document.createElement("time"); date.textContent = note.date; const source = document.createElement("span"); source.textContent = `来自：${note.source}`; meta.append(date, source);
    item.append(copy, meta); list.appendChild(item);
    if (note.chatName) { item.classList.add("qq-favorite-chat-link"); item.tabIndex = 0; item.setAttribute("role", "button"); item.setAttribute("aria-label", `定位聊天记录：${note.content}`); const jump = () => openQQChatAtMessage(note.chatName, note.messageText); item.addEventListener("click", jump); item.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); jump(); } }); }
  });
}

function openQQFavorites() {
  const existing = document.getElementById("qq-favorites-window"); if (existing) { focusWindow(existing); return; }
  const win = template.content.firstElementChild.cloneNode(true); win.id = "qq-favorites-window"; win.dataset.app = "qq-favorites"; win.classList.add("qq-favorites-window");
  win.querySelector("h2").textContent = "QQ收藏"; win.querySelector(".window-mini-icon").classList.add("qq"); win.querySelector(".menu-bar").remove(); win.querySelector(".toolbar").remove(); win.querySelector(".statusbar").remove();
  win.style.width = `${Math.min(930, innerWidth - 50)}px`; win.style.height = `${Math.min(640, innerHeight - 70)}px`; win.style.left = `${Math.max(15, Math.round((innerWidth - Math.min(930, innerWidth - 50)) / 2))}px`; win.style.top = "24px";
  const app = document.createElement("section"); app.className = "qq-favorites-app";
  app.innerHTML = `<aside class="qq-favorites-sidebar"><label><input type="search" placeholder="搜索" aria-label="搜索收藏" /></label><nav><button class="selected" data-favorite-kind="全部">全部</button><button data-favorite-kind="聊天记录">聊天记录</button><button data-favorite-kind="图片与视频">图片与视频</button><button data-favorite-kind="文件">文件</button><button data-favorite-kind="链接">链接</button><button data-favorite-kind="笔记">笔记</button><button data-favorite-kind="其他">其他</button></nav><button class="create-favorite-note" type="button">创建笔记</button></aside><main class="qq-favorites-main"><header><span class="favorite-header-chevron" aria-hidden="true"></span><strong>全部收藏</strong></header><div class="qq-favorites-list"></div></main>`;
  win.querySelector(".window-content").replaceChildren(app); layer.appendChild(win);
  let selectedKind = "全部"; const search = app.querySelector('input[type="search"]'); const heading = app.querySelector(".qq-favorites-main header strong");
  search.addEventListener("input", () => renderQQFavorites(win, search.value, selectedKind));
  app.querySelectorAll("[data-favorite-kind]").forEach(button => button.addEventListener("click", () => { app.querySelectorAll("[data-favorite-kind]").forEach(item => item.classList.toggle("selected", item === button)); selectedKind = button.dataset.favoriteKind; heading.textContent = selectedKind === "全部" ? "全部收藏" : selectedKind; renderQQFavorites(win, search.value, selectedKind); }));
  app.querySelector(".create-favorite-note").addEventListener("click", () => openQQNoteEditor(win));
  renderQQFavorites(win);
  const task = document.createElement("button"); task.className = "task-item"; task.dataset.windowId = win.id; task.innerHTML = '<span class="task-app-icon qq" aria-hidden="true"></span><span class="task-title">QQ收藏</span>'; task.addEventListener("click", () => { if (win.classList.contains("minimized")) focusWindow(win); else if (task.classList.contains("active")) minimizeWindow(win); else focusWindow(win); }); taskItems.appendChild(task);
  bindWindow(win); focusWindow(win); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once: true });
}

function openQQNoteEditor(favoritesWindow) {
  const existing = document.getElementById("qq-note-editor"); if (existing) { focusWindow(existing); return; }
  const win = template.content.firstElementChild.cloneNode(true); win.id = "qq-note-editor"; win.dataset.app = "qq-note-editor"; win.classList.add("qq-note-editor-window");
  win.querySelector("h2").textContent = "创建笔记"; win.querySelector(".window-mini-icon").classList.add("qq"); win.querySelector(".menu-bar").remove(); win.querySelector(".toolbar").remove(); win.querySelector(".statusbar").remove();
  win.style.width = `${Math.min(760, innerWidth - 50)}px`; win.style.height = `${Math.min(560, innerHeight - 70)}px`; win.style.left = `${Math.max(20, Math.round((innerWidth - Math.min(760, innerWidth - 50)) / 2))}px`; win.style.top = "42px";
  const editor = document.createElement("section"); editor.className = "qq-note-editor";
  editor.innerHTML = `<header><input class="qq-note-title" maxlength="40" placeholder="无标题" aria-label="笔记标题" /><button type="button" class="publish-note">保存并发布</button></header><nav aria-label="笔记工具栏">
    <button type="button" title="撤销" aria-label="撤销"><svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" /></svg></button>
    <button type="button" title="重做" aria-label="重做"><svg viewBox="0 0 24 24"><path d="m15 7 5 5-5 5m4-5h-8a6 6 0 0 0-6 6" /></svg></button>
    <button type="button" title="语音输入" aria-label="语音输入"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg></button>
    <button type="button" title="文件" aria-label="文件"><svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/></svg></button>
    <button type="button" title="图片" aria-label="图片"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="8" cy="10" r="1.5"/><path d="m5 17 5-5 3 3 2-2 4 4"/></svg></button>
    <button type="button" title="粗体" aria-label="粗体"><b>B</b></button><button type="button" title="斜体" aria-label="斜体"><i>I</i></button><button type="button" title="下划线" aria-label="下划线"><u>U</u></button>
    <button type="button" title="项目列表" aria-label="项目列表"><svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg></button>
    <button type="button" title="编号列表" aria-label="编号列表"><svg viewBox="0 0 24 24"><path d="M10 6h10M10 12h10M10 18h10M4 4v4m0-4H3m0 6h2l-2 4h2m-2 3h2l-2 3h2"/></svg></button>
    <button type="button" title="段落" aria-label="段落"><svg viewBox="0 0 24 24"><path d="M4 6h16M7 11h13M4 16h16"/></svg></button>
    <button type="button" title="链接" aria-label="链接"><svg viewBox="0 0 24 24"><path d="m10 14 4-4m-6 7-2 2a4 4 0 0 1-6-6l3-3a4 4 0 0 1 6 0m7-3 2-2a4 4 0 0 1 6 6l-3 3a4 4 0 0 1-6 0"/></svg></button>
    <button type="button" title="表情" aria-label="表情"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M8 9h.01M14 9h.01M7.5 13.5a5 5 0 0 0 7 0M20 14v7m-3.5-3.5h7"/></svg></button>
  </nav><textarea maxlength="4000" placeholder="在这里输入笔记内容……"></textarea><small class="qq-note-error" aria-live="polite"></small>`;
  win.querySelector(".window-content").replaceChildren(editor); layer.appendChild(win);
  const titleInput = editor.querySelector(".qq-note-title"), bodyInput = editor.querySelector("textarea"), error = editor.querySelector(".qq-note-error");
  editor.querySelector(".publish-note").addEventListener("click", () => {
    const content = bodyInput.value.trim(); if (!content) { error.textContent = "请输入笔记内容后再保存。"; bodyInput.focus(); return; }
    const title = titleInput.value.trim() || content.split(/\r?\n/)[0].slice(0, 28) || "无标题";
    const now = new Date(); const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    qqFavoriteNotes.unshift({ title, content, date, source: "愿珍惜你的每一天", kind: "笔记" });
    if (favoritesWindow?.isConnected) { const allButton = favoritesWindow.querySelector('[data-favorite-kind="全部"]'); allButton?.click(); renderQQFavorites(favoritesWindow); focusWindow(favoritesWindow); }
    closeWindow(win);
  });
  const task = document.createElement("button"); task.className = "task-item"; task.dataset.windowId = win.id; task.innerHTML = '<span class="task-app-icon qq" aria-hidden="true"></span><span class="task-title">创建笔记</span>'; task.addEventListener("click", () => { if (win.classList.contains("minimized")) focusWindow(win); else if (task.classList.contains("active")) minimizeWindow(win); else focusWindow(win); }); taskItems.appendChild(task);
  bindWindow(win); focusWindow(win); bodyInput.focus(); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once: true });
}

function openQQFeatureError(kind = "channel") {
  const copy = {
    channel: { id:"qq-channel-error", title:"打开QQ频道时出错", lead:"无法打开 QQ频道。", detail:"频道服务暂时不可用，当前用户配置文件可能已损坏。" },
    chatroom: { id:"qq-chatroom-error", title:"打开聊天室时出错", lead:"无法打开 QQ聊天室。", detail:"聊天室服务暂时不可用，请稍后再试。" },
    friend: { id:"qq-friend-error", title:"添加好友时出错", lead:"无法打开添加好友。", detail:"好友查找服务暂时不可用，请稍后再试。" }
  }[kind];
  const existing = document.getElementById(copy.id); if (existing) { focusWindow(existing); playFaultAlert(); return; }
  playFaultAlert();
  const shield = document.createElement("div"); shield.className = "qq-modal-shield";
  const win = template.content.firstElementChild.cloneNode(true); win.id = copy.id; win.dataset.app = "qq-feature-error"; win.classList.add("qq-channel-error-window");
  win.querySelector("h2").textContent = copy.title; win.querySelector(".window-mini-icon").classList.add("qq"); win.querySelector(".menu-bar").remove(); win.querySelector(".toolbar").remove(); win.querySelector(".statusbar").remove(); win.querySelector('[data-action="minimize"]').remove(); win.querySelector('[data-action="maximize"]').remove();
  win.style.width = `${Math.min(620, innerWidth - 24)}px`; win.style.height = "205px"; win.style.left = `${Math.max(12, Math.round((innerWidth - Math.min(620, innerWidth - 24)) / 2))}px`; win.style.top = `${Math.max(36, Math.round((innerHeight - 260) / 2))}px`;
  const dialog = document.createElement("section"); dialog.className = "qq-channel-error"; dialog.innerHTML = '<div class="qq-error-mark" aria-hidden="true">×</div><div><strong>' + copy.lead + '</strong><p>' + copy.detail + '</p></div><button type="button">确定</button>';
  const close = () => { win.remove(); shield.remove(); focusTopWindow(); };
  dialog.querySelector("button").addEventListener("click", close);
  win.querySelector('[data-action="close"]').addEventListener("click", event => { event.stopImmediatePropagation(); close(); }, true);
  win.querySelector(".window-content").replaceChildren(dialog); shield.appendChild(win); document.querySelector("#desktop").appendChild(shield);
  shield.addEventListener("pointerdown", event => { if (!win.contains(event.target)) { event.preventDefault(); event.stopPropagation(); playFaultAlert(); } });
  bindWindow(win); focusWindow(win);
}
function openQQChannelError() { openQQFeatureError("channel"); }

function openQQUserInfo(name) {
  const profile = qqProfiles[name]; if (!profile) return;
  const existing = [...document.querySelectorAll(".qq-user-info-window")].find(item => item.dataset.profileName === name); if (existing) { focusWindow(existing); return; }
  const win = template.content.firstElementChild.cloneNode(true); win.id = `qq-user-${profile.qq}`; win.dataset.app = "qq-user-info"; win.dataset.profileName = name; win.classList.add("qq-window", "qq-user-info-window");
  win.querySelector("h2").textContent = "用户信息"; win.querySelector(".window-mini-icon").classList.add("qq"); win.querySelector(".menu-bar").remove(); win.querySelector(".toolbar").remove(); win.querySelector(".statusbar").remove();
  win.style.width = `${Math.min(440, innerWidth - 24)}px`; win.style.height = `${Math.min(430, innerHeight - 70)}px`; win.style.left = `${Math.max(12, Math.round((innerWidth - Math.min(440, innerWidth - 24)) / 2))}px`; win.style.top = "62px";
  const card = document.createElement("section"); card.className = "qq-user-card";
  const avatarMarkup = profile.avatarSrc ? `<img src="${profile.avatarSrc}" alt="" />` : `<span class="qq-profile-placeholder ${profile.color || "blue"}">${profile.avatar || name.slice(0, 1)}</span>`;
  const previewPhotos = name === "谭某人（谭思远）" ? [
    {src:"assets/photos/tansiyuan-2023-08-22.png",name:"2023.8.22 照片"},
    {src:"assets/photos/tansiyuan-2023-01-21.png",name:"2023.1.21 照片"}
  ] : name === "珍珍姐" ? [
    {src:"assets/photos/zhenzhen-desk.png",name:"2023.5.21 梳妆台"},
    {src:"assets/photos/zhenzhen-perfume.png",name:"2023.5.21 香水"},
    {src:"assets/photos/zhenzhen-night.png",name:"2023.4.30 夜景自拍"}
  ] : [];
  const previewMarkup = previewPhotos.length ? previewPhotos.map(photo => `<i role="button" tabindex="0" data-profile-photo="${photo.name}" data-profile-src="${photo.src}" aria-label="查看${photo.name}"><img src="${photo.src}" alt="" /></i>`).join("") : '<span class="qq-space-no-photo">暂无照片</span>';
  card.innerHTML = `<header><div class="qq-user-avatar">${avatarMarkup}</div><div><strong>${name}</strong><small>QQ ${profile.qq}</small><em>${profile.status}</em></div></header><div class="qq-user-signature"><span>个性签名</span><p>${profile.signature ?? ""}</p></div><button type="button" class="qq-user-space"><span>QQ空间</span><span class="qq-space-thumbs">${previewMarkup}</span><b>进入 ›</b></button><footer><button type="button" data-profile-action="share"><span aria-hidden="true">↗</span>分享</button><button type="button" data-profile-action="message"><span aria-hidden="true">✉</span>发信息</button></footer>`;
  card.querySelector(".qq-user-space").addEventListener("click", () => openQQSpace({ name, ...profile }));
  card.querySelectorAll("[data-profile-photo]").forEach(thumb => {
    const show = event => { event.stopPropagation(); openPhotoViewer({ name:thumb.dataset.profilePhoto, source:`${name}的QQ空间`, src:thumb.dataset.profileSrc }); };
    thumb.addEventListener("click", show);
    thumb.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); show(event); } });
  });
  card.querySelector("[data-profile-action=message]").addEventListener("click", () => openQQChat(name, profile.avatar, "direct", profile.avatarSrc));
  card.querySelector("[data-profile-action=share]").addEventListener("click", event => { event.currentTarget.classList.add("confirmed"); event.currentTarget.lastChild.textContent = "已分享"; setTimeout(() => { if (event.currentTarget.isConnected) { event.currentTarget.classList.remove("confirmed"); event.currentTarget.lastChild.textContent = "分享"; } }, 900); });
  win.querySelector(".window-content").replaceChildren(card); layer.appendChild(win);
  const task = document.createElement("button"); task.className = "task-item"; task.dataset.windowId = win.id; task.innerHTML = '<span class="task-app-icon qq" aria-hidden="true"></span><span class="task-title"></span>'; task.querySelector(".task-title").textContent = `用户信息 - ${name}`; task.addEventListener("click", () => { if (win.classList.contains("minimized")) focusWindow(win); else if (task.classList.contains("active")) minimizeWindow(win); else focusWindow(win); }); taskItems.appendChild(task);
  bindWindow(win); focusWindow(win); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once: true });
}
function openForwardRecord() {
  const existing = document.querySelector("#qq-forward-record"); if (existing) { focusWindow(existing); return; }
  const win = template.content.firstElementChild.cloneNode(true); win.id = "qq-forward-record"; win.dataset.app = "qq-forward-record"; win.classList.add("qq-window", "qq-forward-window");
  win.querySelector("h2").textContent = "转发聊天记录 - QQ 2001"; win.querySelector(".window-mini-icon").classList.add("qq-chat-icon"); win.querySelector(".menu-bar").remove(); win.querySelector(".toolbar").remove(); win.querySelector(".statusbar").remove();
  win.style.width = `${Math.min(520, innerWidth - 30)}px`; win.style.height = `${Math.min(540, innerHeight - 90)}px`; win.style.left = `${Math.max(15, Math.round((innerWidth - Math.min(520, innerWidth - 30)) / 2))}px`; win.style.top = "58px";
  const shell = document.createElement("section"); shell.className = "forward-record-shell";
  const heading = document.createElement("header"); heading.innerHTML = "<strong>管理员【陈总】：转发聊天记录</strong><small>以下为合并转发的聊天内容</small>"; shell.appendChild(heading);
  const transcript = document.createElement("div"); transcript.className = "forward-transcript";
  forwardedChatRecord.forEach(item => { const row = document.createElement("div"); if (item.system) { row.className = "forward-system"; row.textContent = item.text; } else { row.className = "forward-message"; const sender = document.createElement("b"); sender.textContent = `${item.sender}：`; const body = document.createElement("p"); body.textContent = item.text; row.append(sender, body); } transcript.appendChild(row); });
  shell.appendChild(transcript); win.querySelector(".window-content").replaceChildren(shell); layer.appendChild(win);
  const task = document.createElement("button"); task.className = "task-item"; task.dataset.windowId = win.id; task.innerHTML = '<span class="task-app-icon qq-chat-icon" aria-hidden="true"></span><span class="task-title">转发聊天记录</span>'; task.addEventListener("click", () => { if (win.classList.contains("minimized")) focusWindow(win); else if (task.classList.contains("active")) minimizeWindow(win); else focusWindow(win); }); taskItems.appendChild(task);
  bindWindow(win); focusWindow(win); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once: true });
}
function bindWindowResize(win) {
  if (win.matches(".qq-channel-error-window,.recycle-properties-window,.qq-login-window,.qq-user-info-window,.sky-game-window") || win.querySelector(".window-resize-handle")) return;
  const handle = document.createElement("button"); handle.type = "button"; handle.className = "window-resize-handle"; handle.setAttribute("aria-label", "拖动调整窗口大小"); handle.title = "拖动调整窗口大小"; win.appendChild(handle);
  handle.addEventListener("pointerdown", event => {
    if (event.button !== 0 || win.classList.contains("maximized")) return;
    event.preventDefault(); event.stopPropagation(); focusWindow(win);
    const rect = win.getBoundingClientRect(), startX = event.clientX, startY = event.clientY, startWidth = rect.width, startHeight = rect.height;
    const minWidth = win.classList.contains("qq-chat-window") ? 500 : win.classList.contains("qq-contacts-window") ? 320 : 360;
    const minHeight = win.classList.contains("qq-chat-window") ? 430 : win.classList.contains("qq-contacts-window") ? 430 : 280;
    win.classList.add("resizing");
    const move = pointer => { const maxWidth = Math.max(minWidth, innerWidth - rect.left - 5), maxHeight = Math.max(minHeight, innerHeight - rect.top - 47); win.style.width = `${Math.min(maxWidth, Math.max(minWidth, startWidth + pointer.clientX - startX))}px`; win.style.height = `${Math.min(maxHeight, Math.max(minHeight, startHeight + pointer.clientY - startY))}px`; };
    const up = () => { win.classList.remove("resizing"); document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); };
    document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
  });
}
function renderQQMessages(list, messages) {
  list.replaceChildren();
  messages.forEach(item => {
    if (item.date) { const separator = document.createElement("div"); separator.className = "message-date"; separator.textContent = item.date; list.appendChild(separator); return; }
    const message = document.createElement("div"); message.className = `message${item.mine ? " me" : ""}`; if (item.text) message.dataset.messageText = item.text;
    const sender = document.createElement("b"); sender.textContent = item.sender;
    message.appendChild(sender);
    const stamp = item.time || "";
    if (stamp) { const time = document.createElement("time"); time.textContent = stamp; message.appendChild(time); }
    const body = document.createElement("p");
    if (item.forward) { const card = document.createElement("button"); card.type = "button"; card.className = "forward-chat-card"; const title = document.createElement("strong"); title.textContent = "转发聊天记录"; const summary = document.createElement("span"); summary.textContent = "一只只丸子 等 7 条消息"; const action = document.createElement("em"); action.textContent = "单击查看 ›"; card.append(title, summary, action); card.addEventListener("click", openForwardRecord); body.appendChild(card); }
    else if (item.image) { const photo = document.createElement("button"); photo.type = "button"; photo.className = "qq-chat-photo"; photo.setAttribute("aria-label", "查看" + item.text); const image = document.createElement("img"); image.src = item.image; image.alt = item.text; photo.appendChild(image); photo.addEventListener("click", () => openPhotoViewer({ name: item.text, source: "QQ聊天图片", src: item.image })); body.appendChild(photo); }
    else body.textContent = item.text;
    message.appendChild(body); list.appendChild(message);
  });
}
function openQQChatAtMessage(name, messageText) {
  const win = openQQChat(name, "", "direct", qqProfiles[name]?.avatarSrc || "");
  if (!win) return;
  const message = [...win.querySelectorAll(".message[data-message-text]")].find(item => item.dataset.messageText === messageText);
  if (!message) return;
  message.scrollIntoView({ block: "center", behavior: "auto" });
  message.classList.add("favorite-chat-target");
  setTimeout(() => message.classList.remove("favorite-chat-target"), 3200);
}
function openQQChat(name, avatar, requestedType = "direct", requestedAvatarSrc = "") {
  const existing = [...document.querySelectorAll(".qq-chat-window")].find(item => item.dataset.chatName === name); if (existing) { focusWindow(existing); return existing; }
  const preset = qqConversations[name] || { type: requestedType || "direct", avatarSrc: requestedAvatarSrc, status: "离线三天", identity: "QQ：7312046", messages: [{ sender: name, text: "明天要是有人问起，就说我没去过七号楼。", time: "今天 11:42" }, { sender: "我", mine: true, text: "新闻出来了吗？", time: "今天 11:45" }] };
  const isGroup = preset.type === "group";
  const win = template.content.firstElementChild.cloneNode(true); const safeId = `qq-chat-${Date.now()}`; win.id = safeId; win.dataset.app = "qq-chat"; win.dataset.chatName = name; win.dataset.chatType = preset.type; win.classList.add("qq-window", "qq-chat-window");
  win.querySelector("h2").textContent = isGroup ? `[群聊] ${name} - QQ 2001` : `与 [${name}] 交谈 - QQ 2001`; win.querySelector(".address-field").textContent = isGroup ? `QQ群：${name}` : `QQ 联系人：${name}`; win.querySelector(".window-mini-icon").classList.add("qq-chat-icon"); win.querySelector(".toolbar").remove(); win.querySelector(".statusbar").remove();
  win.style.width = `${Math.min(820, Math.max(440, innerWidth - 440))}px`; win.style.height = `${Math.min(640, innerHeight - 105)}px`; win.style.left = `${Math.min(450, Math.max(5, innerWidth - 830))}px`; win.style.top = "70px";
  const content = win.querySelector(".window-content"); content.replaceChildren(document.querySelector("#qqChatTemplate").content.cloneNode(true));
  const chatPanel = content.querySelector(".qq-chat"), avatarBox = content.querySelector("#chatAvatar"); if (isGroup) chatPanel.classList.add("group-chat");
  content.querySelector("#chatTitle").textContent = isGroup ? `${name}（群聊）` : `与 ${name} 交谈中`; const chatStatus = content.querySelector("#chatStatus"); chatStatus.textContent = preset.status; content.querySelector("#chatIdentity").textContent = preset.identity;
  if (preset.avatarSrc) { avatarBox.textContent = ""; avatarBox.classList.add("avatar-image"); const image = document.createElement("img"); image.src = preset.avatarSrc; image.alt = ""; avatarBox.appendChild(image); } else avatarBox.textContent = avatar || name.slice(0, 1);
  if (!isGroup && qqProfiles[name]) { avatarBox.classList.add("profile-link"); avatarBox.title = "查看用户信息"; avatarBox.addEventListener("click", () => openQQUserInfo(name)); }
  const input = content.querySelector("#messageInput"), count = content.querySelector("#charCount"), list = content.querySelector("#messageList");
  renderQQMessages(list, preset.messages);
  if (isGroup) {
    content.querySelector(".chat-tools")?.remove(); input.remove(); content.querySelector(".chat-bottom")?.remove();
    const locked = document.createElement("div"); locked.className = "group-chat-locked"; locked.textContent = "无法在已退出的群聊中发送信息"; chatPanel.appendChild(locked);
  } else {
    input.addEventListener("input", () => count.textContent = `字数：${input.value.length}/512`);
    let replyPending = false;
    const appendLiveMessage = (senderName, text, mine = false) => { const msg = document.createElement("div"); msg.className = `message${mine ? " me" : ""}`; const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }); const sender = document.createElement("b"); sender.textContent = senderName; const stamp = document.createElement("time"); stamp.textContent = `${mine ? "发送" : "收到"}：今天 ${time}`; const body = document.createElement("p"); body.textContent = text; msg.append(sender, stamp, body); list.appendChild(msg); list.scrollTop = list.scrollHeight; };
    const send = async () => {
      const text = input.value.trim(); if (!text || replyPending) return;
      const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      appendLiveMessage("我", text, true); preset.messages.push({ sender: "我", mine: true, text, time: `今天 ${time}` });
      if (name === "珍珍姐") { const notice = document.createElement("div"); notice.className = "message-delivery-notice"; notice.textContent = "--- 消息已发送。对方当前不在线。 ---"; list.appendChild(notice); }
      input.value = ""; count.textContent = "字数：0/512"; list.scrollTop = list.scrollHeight;
      if (!preset.ai) return;
      replyPending = true; input.disabled = true; const sendButton = content.querySelector("#sendMessage"); sendButton.disabled = true;
      chatStatus.textContent = "对方正在输入中…";
      try {
        const reply = await requestShiQianReply(preset.messages);
        preset.messages.push({ sender: "时迁", text: reply, time: `今天 ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}` });
        await playQQMessageAlert();
        if (win.isConnected) appendLiveMessage("时迁", reply);
      } finally {
        replyPending = false;
        if (win.isConnected) { chatStatus.textContent = preset.status; input.disabled = false; sendButton.disabled = false; input.focus(); }
      }
    };
    content.querySelector("#sendMessage").addEventListener("click", send); input.addEventListener("keydown", e => { if ((e.altKey && e.key.toLowerCase() === "s") || (e.ctrlKey && e.key === "Enter")) { e.preventDefault(); send(); } });
    content.querySelector("[data-chat-action=close]")?.addEventListener("click", () => closeWindow(win));
  }
  layer.appendChild(win);
  list.scrollTop = list.scrollHeight;
  const task = document.createElement("button"); task.className = "task-item"; task.dataset.windowId = safeId; task.innerHTML = `<span class="task-app-icon qq-chat-icon" aria-hidden="true"></span><span class="task-title"></span>`; task.querySelector(".task-title").textContent = isGroup ? `${name}（群聊）` : `与 ${name} 交谈`;
  task.addEventListener("click", () => { if (win.classList.contains("minimized")) focusWindow(win); else if (task.classList.contains("active")) minimizeWindow(win); else focusWindow(win); }); taskItems.appendChild(task); bindWindow(win); focusWindow(win); win.classList.add("opening"); win.addEventListener("animationend", () => win.classList.remove("opening"), { once: true });
  return win;
}
function minimizeWindow(win) { win.classList.add("minimized"); document.querySelector(`.task-item[data-window-id="${win.id}"]`)?.classList.remove("active"); focusTopWindow(); }
function closeWindow(win) { document.querySelector(`.task-item[data-window-id="${win.id}"]`)?.remove(); win.remove(); focusTopWindow(); }
function focusTopWindow() { const visible = [...document.querySelectorAll(".retro-window:not(.minimized)")].sort((a,b) => Number(b.style.zIndex)-Number(a.style.zIndex)); if (visible[0]) focusWindow(visible[0]); }
function toggleMaximize(win) { if (!win.classList.contains("maximized")) { win.dataset.restore = JSON.stringify({ left:win.style.left,top:win.style.top,width:win.style.width,height:win.style.height }); win.classList.add("maximized"); } else { win.classList.remove("maximized"); Object.assign(win.style, JSON.parse(win.dataset.restore || "{}")); } focusWindow(win); }
function bindWindow(win) {
  win.addEventListener("pointerdown", () => focusWindow(win)); win.querySelector("[data-action=minimize]")?.addEventListener("click", e => {e.stopPropagation();minimizeWindow(win)}); win.querySelector("[data-action=maximize]")?.addEventListener("click", e => {e.stopPropagation();toggleMaximize(win)}); win.querySelector("[data-action=close]")?.addEventListener("click", e => {e.stopPropagation();closeWindow(win)});
  const bar = win.querySelector(".titlebar"); if (!win.classList.contains("sky-game-window")) bar.addEventListener("dblclick", () => toggleMaximize(win)); bar.addEventListener("pointerdown", event => { if (event.button !== 0 || event.target.closest("button") || win.classList.contains("maximized")) return; event.preventDefault(); focusWindow(win); const rect=win.getBoundingClientRect(), offsetX=event.clientX-rect.left, offsetY=event.clientY-rect.top; bar.setPointerCapture(event.pointerId); const move=e=>{win.style.left=`${Math.max(0,Math.min(innerWidth-win.offsetWidth,e.clientX-offsetX))}px`;win.style.top=`${Math.max(0,Math.min(innerHeight-75,e.clientY-offsetY))}px`}; const up=()=>{bar.removeEventListener("pointermove",move);bar.removeEventListener("pointerup",up)}; bar.addEventListener("pointermove",move);bar.addEventListener("pointerup",up); }); bindWindowResize(win);
}

document.querySelectorAll(".desktop-icon[data-app]").forEach(button => {
  bindDesktopAppIcon(button);
});
document.querySelectorAll("[data-app]:not(.desktop-icon)").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); openApp(button.dataset.app); setStartMenu(false); }));
document.querySelector(".shutdown").addEventListener("click", () => { setStartMenu(false); const cover=document.createElement("div");cover.className="shutdown-cover";cover.innerHTML="<strong>现在可以安全地关闭计算机了。</strong><small>单击任意位置返回桌面</small>";cover.addEventListener("click",()=>cover.remove());document.body.appendChild(cover); });

function renderVolume(value, muted) { volumeSlider.value = value; muteToggle.checked = muted; document.querySelector("#volumeValue").textContent = `${Math.round(value)}%`; document.querySelector("#volumeIcon").className = `tray-asset volume${muted || value == 0 ? " muted" : ""}`; }
async function loadSystemVolume() {
  try { const response=await fetch("/api/volume",{cache:"no-store"}); if(!response.ok) throw new Error(); const data=await response.json(); systemVolumeAvailable=true; renderVolume(data.volume,data.muted); document.querySelector("#volumeMode").textContent="Windows 系统音量"; }
  catch { systemVolumeAvailable=false; const saved=Number(localStorage.getItem("retroVolume") ?? 50); renderVolume(saved,localStorage.getItem("retroMuted")==="true"); document.querySelector("#volumeMode").textContent="网页音量（请通过 HTTP 启动）"; }
}
async function saveVolume() { const volume=Number(volumeSlider.value), muted=muteToggle.checked; renderVolume(volume,muted); localStorage.setItem("retroVolume",volume);localStorage.setItem("retroMuted",muted); if(systemVolumeAvailable){try{await fetch("/api/volume",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({volume,muted})})}catch{systemVolumeAvailable=false}} }
volumeSlider.addEventListener("input", saveVolume); muteToggle.addEventListener("change", saveVolume); loadSystemVolume();
window.addEventListener("resize",()=>document.querySelectorAll(".retro-window:not(.maximized)").forEach(win=>{const r=win.getBoundingClientRect();if(r.left>innerWidth-80)win.style.left=`${Math.max(0,innerWidth-320)}px`;if(r.top>innerHeight-70)win.style.top=`${Math.max(0,innerHeight-360)}px`;}));

// Two-stage profile error retained from the original desktop experience.
const bootLogin=document.querySelector("#bootLogin"),bootPassword=document.querySelector("#bootPassword"),bootLoginError=document.querySelector("#bootLoginError"),bootLoginConfirm=document.querySelector("#bootLoginConfirm"),bootLoginCancel=document.querySelector("#bootLoginCancel");
function submitBootLogin(){
  if(bootPassword.value==="1234"){
    bootLogin.remove();
    const progress=document.querySelector('#bootProgress'),fill=document.querySelector('#bootProgressFill');
    progress.hidden=false;
    let segment=0;
    const timer=setInterval(()=>{
      segment+=1;fill.style.width=`${segment*8}%`;
      if(segment>=6){clearInterval(timer);setTimeout(()=>{progress.remove();playFaultAlert();loginConfirm.focus();},190);}
    },135);
    return;
  }
  bootLoginError.textContent="密码不正确。请重新输入密码。";bootPassword.value="";bootPassword.focus();const dialog=bootLogin.querySelector(".boot-login-dialog");dialog.classList.remove("shake");void dialog.offsetWidth;dialog.classList.add("shake");playFaultAlert();
}
bootLoginConfirm.addEventListener("click",submitBootLogin);
bootLoginCancel.addEventListener("click",()=>{bootPassword.value="";bootPassword.focus();bootLoginError.textContent="必须输入密码才能登录。";playFaultAlert();});
bootPassword.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();submitBootLogin();}});
const loginError=document.querySelector("#loginError"),loginMessage=document.querySelector("#loginMessage"),loginConfirm=document.querySelector("#loginConfirm");
let loginStep=0;
loginConfirm.addEventListener("click",()=>{
  if(loginStep===0){
    loginStep=1;
    playFaultAlert();
    loginError.classList.add("second-step");
    loginMessage.innerHTML="<strong>User Profile Service 无法加载配置文件。</strong><strong>系统将尝试使用临时配置文件登录。</strong>";
    loginConfirm.focus();
    return;
  }
  if(loginStep===1){
    loginStep=2;
    loginError.remove();
  }
});

document.addEventListener("keydown",event=>{
  if(event.key==="Escape"){setStartMenu(false);setVolumePopup(false);}
  if(event.key==="Enter"&&document.body.contains(loginError)){event.preventDefault();}
});

