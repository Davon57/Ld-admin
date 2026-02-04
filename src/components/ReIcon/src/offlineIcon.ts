// 这里存放本地图标，在 src/layout/index.vue 文件中加载，避免在首启动加载
import { getSvgInfo } from "@pureadmin/utils";
import { addIcon } from "@iconify/vue/dist/offline";

// https://icon-sets.iconify.design/ep/?keyword=ep
import EpHomeFilled from "~icons/ep/home-filled?raw";

// https://icon-sets.iconify.design/ri/?keyword=ri
import RiSearchLine from "~icons/ri/search-line?raw";
import RiInformationLine from "~icons/ri/information-line?raw";
import RiDatabase2Line from "~icons/ri/database-2-line?raw";
import RiSettings3Line from "~icons/ri/settings-3-line?raw";
import RiNotification3Line from "~icons/ri/notification-3-line?raw";
import RiQuestionAnswerLine from "~icons/ri/question-answer-line?raw";
import RiArticleLine from "~icons/ri/article-line?raw";
import RiRocket2Line from "~icons/ri/rocket-2-line?raw";
import RiCarLine from "~icons/ri/car-line?raw";
import RiFeedbackLine from "~icons/ri/feedback-line?raw";
import RiPulseLine from "~icons/ri/pulse-line?raw";
import RiMedalLine from "~icons/ri/medal-line?raw";
import RiBookOpenLine from "~icons/ri/book-open-line?raw";
import RiLock2Line from "~icons/ri/lock-2-line?raw";
import RiShoppingBag3Line from "~icons/ri/shopping-bag-3-line?raw";

const icons = [
  // Element Plus Icon: https://github.com/element-plus/element-plus-icons
  ["ep/home-filled", EpHomeFilled],
  // Remix Icon: https://github.com/Remix-Design/RemixIcon
  ["ri/search-line", RiSearchLine],
  ["ri/information-line", RiInformationLine],
  ["ri/database-2-line", RiDatabase2Line],
  ["ri/settings-3-line", RiSettings3Line],
  ["ri/notification-3-line", RiNotification3Line],
  ["ri/question-answer-line", RiQuestionAnswerLine],
  ["ri/article-line", RiArticleLine],
  ["ri/rocket-2-line", RiRocket2Line],
  ["ri/car-line", RiCarLine],
  ["ri/feedback-line", RiFeedbackLine],
  ["ri/pulse-line", RiPulseLine],
  ["ri/medal-line", RiMedalLine],
  ["ri/book-open-line", RiBookOpenLine],
  ["ri/lock-2-line", RiLock2Line],
  ["ri/shopping-bag-3-line", RiShoppingBag3Line]
];

// 本地菜单图标，后端在路由的 icon 中返回对应的图标字符串并且前端在此处使用 addIcon 添加即可渲染菜单图标
icons.forEach(([name, icon]) => {
  addIcon(name as string, getSvgInfo(icon as string));
});
