import React, { useEffect, useMemo, useRef, useState } from "react";

const season_list = ["春", "夏", "秋", "冬"];
const max_year = 50;
const save_key = "michangsheng_game_save_v7";
const api_base_url = "http://127.0.0.1:8000";

const act_list = [
  { id: "cultivate", name: "闭关修炼", place: "洞府静室" },
  { id: "explore", name: "外出探索", place: "山脉野外" },
  { id: "quest", name: "接取委托", place: "委托堂" },
  { id: "trade", name: "坊市经营", place: "坊市摊位" },
  { id: "visit", name: "拜访修士", place: "茶馆雅间" },
  { id: "rest", name: "静养调息", place: "简陋洞府" },
];

const npc_avatar_pool = [
  "/avatar/npc-appraiser.png",
  "/avatar/npc-talisman.png",
  "/avatar/npc-escort.png",
  "/avatar/npc-sword.png",
  "/avatar/npc-clerk.png",
  "/avatar/npc-wanderer.png",
  "/avatar/npc-cultivator-1.png",
  "/avatar/npc-cultivator-2.png",
];

const enemy_avatar_pool = [
  "/avatar/nanxiu.png",
  "/avatar/laoxiu.png",
  "/avatar/laozhe.png",
  "/avatar/zhishi.png",
  "/avatar/zhanglao.png",
];

function stable_hash(seed = "") {
  const text = String(seed || "seed");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function get_stable_npc_avatar(seed = "") {
  return npc_avatar_pool[stable_hash(seed || "npc") % npc_avatar_pool.length];
}

function get_enemy_avatar(enemy_name = "", source = "") {
  const name = String(enemy_name || "");
  if (/狼|犬|蛇|山魈|妖/.test(name)) return "";
  if (/劫|地痞|恶客|闹事/.test(name)) return "/avatar/nanxiu.png";
  if (/青云|流云/.test(name)) return "/avatar/zhishi.png";
  if (/剑/.test(name)) return "/avatar/nanxiu.png";
  if (/赤霞|黑水|天机/.test(name)) return "/avatar/zhanglao.png";
  return enemy_avatar_pool[stable_hash(`${source}:${name}`) % enemy_avatar_pool.length];
}

const contact_templates = [
  {
    id: "old_appraiser",
    avatar: "/avatar/npc-appraiser.png",
    name: "鉴货老修",
    role: "坊市眼线",
    desc: "常年蹲在坊市茶棚，眼毒嘴也毒，最会听风声。",
    help: "打听行情",
    unlock_year: 1,
    debate: "辨物论价",
    trade: "买行情",
  },
  {
    id: "talisman_seller",
    avatar: "/avatar/npc-talisman.png",
    name: "符铺老陈",
    role: "符箓摊主",
    desc: "摊子不大，门路不少，欠他人情的人遍布几条街。",
    help: "牵线买卖",
    unlock_year: 10,
    debate: "符理拆解",
    trade: "买符箓",
  },
  {
    id: "escort_leader",
    avatar: "/avatar/npc-escort.png",
    name: "镖队头目",
    role: "外城行商",
    desc: "来往山路多年，知道哪些地方最近不太平，也知道哪里有货。",
    help: "指点去处",
    unlock_year: 20,
    debate: "山路见闻",
    trade: "买路引",
  },
  {
    id: "lin_muxin_contact",
    avatar: "/avatar/linmuxin.png",
    name: "林沐心",
    role: "同道修士",
    desc: "说话不饶人，但眼力和胆子都不差，偶尔会给你一点真正有用的提醒。",
    help: "论道破疑",
    unlock_year: 10,
    debate: "斗法论道",
    trade: "换旧物",
  },
  {
    id: "wandering_sword",
    avatar: "/avatar/npc-sword.png",
    name: "沈孤舟",
    role: "游方剑修",
    desc: "常在城外山道出没，话不多，出剑却很快，对天机大比似乎另有执念。",
    help: "切磋点拨",
    unlock_year: 30,
    debate: "剑意问心",
    trade: "买剑符",
  },
  {
    id: "tianji_clerk",
    avatar: "/avatar/npc-clerk.png",
    name: "高阁执事",
    role: "天机阁执事",
    desc: "负责大比前的名册与规矩，语气温和，却从不说多余的话。",
    help: "询问大比",
    unlock_year: 40,
    debate: "规矩问答",
    trade: "买名册",
  },
];

function get_contact_template(id) {
  return contact_templates.find((item) => item.id === id) || contact_templates[0];
}

function get_contact_avatar(contact) {
  const template = get_contact_template(contact?.id);
  return contact?.avatar || template.avatar || get_stable_npc_avatar(contact?.id || template.id);
}

function normalize_contacts(raw_contacts) {
  const source = Array.isArray(raw_contacts) && raw_contacts.length
    ? raw_contacts
    : [{ id: "old_appraiser", relation: 12, favor: 0 }];
  const seen = new Set();

  return source
    .filter((contact) => contact_templates.some((tpl) => tpl.id === contact?.id))
    .filter((contact) => {
      if (seen.has(contact.id)) return false;
      seen.add(contact.id);
      return true;
    })
    .map((contact) => ({
      id: contact.id,
      avatar: get_contact_avatar(contact),
      relation: clamp(Number(contact.relation || 0), 0, 100),
      favor: clamp(Number(contact.favor || 0), 0, 9),
    }));
}

function get_contact_view(contact) {
  return {
    ...get_contact_template(contact.id),
    ...contact,
  };
}

function get_contact_level(relation) {
  if (relation >= 80) return "生死之交";
  if (relation >= 55) return "熟络";
  if (relation >= 30) return "可托小事";
  return "点头之交";
}

function get_unlocked_contact_templates(year = 1) {
  return contact_templates.filter((tpl) => Number(tpl.unlock_year || 1) <= Number(year || 1));
}

function meet_or_improve_contact(contacts, year = 1) {
  const list = normalize_contacts(contacts);
  const unknown = get_unlocked_contact_templates(year).filter(
    (tpl) => !list.some((contact) => contact.id === tpl.id)
  );

  if (unknown.length && rand_int(1, 100) <= 55) {
    const tpl = pick(unknown);
    const contact = {
      id: tpl.id,
      avatar: tpl.avatar || get_stable_npc_avatar(tpl.id),
      relation: rand_int(10, 18),
      favor: 0,
    };
    return {
      contacts: [...list, contact],
      line: `你在茶馆结识了${tpl.role}【${tpl.name}】。`,
    };
  }

  const idx = list.length ? rand_int(0, list.length - 1) : 0;
  const base = list[idx] || { id: "old_appraiser", relation: 0, favor: 0 };
  const tpl = get_contact_template(base.id);
  const gain = rand_int(6, 12);
  const next = list.map((contact, contact_idx) =>
    contact_idx === idx
      ? {
          ...contact,
          relation: clamp(contact.relation + gain, 0, 100),
          favor: clamp(contact.favor + (rand_int(1, 100) <= 30 ? 1 : 0), 0, 9),
        }
      : contact
  );

  return {
    contacts: next,
    line: `你和【${tpl.name}】多聊了几句，关系 +${gain}。`,
  };
}

function clamp(x, l, r) {
  return Math.max(l, Math.min(r, x));
}

function rand_int(l, r) {
  return l + Math.floor(Math.random() * (r - l + 1));
}

function pick(arr) {
  return arr[rand_int(0, arr.length - 1)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function get_need_exp(stage) {
  if (stage <= 9) return 100 + stage * 55;
  if (stage === 10) return 800;
  if (stage === 11) return 1200;
  return 1600 + (stage - 11) * 300;
}

function get_stage_name(stage) {
  if (stage <= 9) return `练气${stage}层`;
  if (stage === 10) return "练气圆满";
  if (stage === 11) return "筑基初期";
  return "未知境界";
}

function push_log(logs, msg) {
  return [msg, ...logs].slice(0, 40);
}

function get_scene_desc(scene) {
  if (scene === "洞府静室") return "石壁微冷，灵气稀薄。你盘膝而坐，勉强还能稳住心神。";
  if (scene === "山脉野外") return "山风掠过林梢，偶有妖气浮动。机缘和危险通常一起出现。";
  if (scene === "委托堂" || scene === "坊市告示栏") return "委托堂内修士来往不断，悬赏、寻物、护送与恩怨都在这里流转。";
  if (scene === "坊市摊位") return "摊贩吆喝声不断，真假货混在一起，眼力不够就是送灵石。";
  if (scene === "茶馆雅间") return "茶香微散，修士们闲谈之间，往往藏着零碎情报与人情往来。";
  if (scene === "简陋洞府") return "洞府不大，但能遮风避雨。至少在这里，你暂时不用担心被人偷袭。";
  if (scene === "坊市拍卖会") return "灯火如昼，叫价声此起彼伏。今日若眼力够好，或许能淘到一本改命功法。";
  if (scene === "天机阁前") return "高阁入云，石阶尽头钟声沉沉。五十年一启的大比，就在眼前。";
  return "修仙路远，天地茫茫。";
}

function get_scene_bg(scene) {
  if (scene === "委托堂" || scene === "坊市告示栏") return "/scenes/gaoshilan.png";
  if (scene === "坊市摊位") return "/scenes/fangshi.png";
  if (scene === "坊市拍卖会") return "/scenes/fangshi.png";
  if (scene === "天机阁前") return "/scenes/fangshi.png";
  if (scene === "洞府静室") return "/scenes/dongfu.png";
  if (scene === "简陋洞府") return "/scenes/dongfu.png";
  if (scene === "山脉野外") return "/scenes/shanmai.png";
  if (scene === "茶馆雅间") return "/scenes/chaguan.png";
  return "/scenes/fangshi.png";
}

function story_line(speaker, text, side = "left", avatar = "") {
  return {
    speaker,
    text,
    side,
    avatar,
    isNarration: false,
  };
}

function narration(text) {
  return {
    speaker: "",
    avatar: "",
    text,
    isNarration: true,
  };
}

function get_main_story_map(player_avatar, player_name) {
  return {
    0: {
      title: "初入武陵",
      lines: [
        story_line("老修", "第一次来武陵城？", "left", "/avatar/laoxiu.png"),
        narration("你才刚踏进武陵城，就被迎面而来的吆喝声震得一愣。长街两侧摊位一眼望不到头，卖丹药的、卖符箓的、卖妖兽材料的挤成一片，修士与凡人混杂往来，空气里满是药香、铁腥味和烟火气。"),
        story_line("你", "刚到。", "right", player_avatar),
        story_line("老修", "怪不得，一看就是还没被武陵城的风吹过。", "left", "/avatar/laoxiu.png"),
        story_line("你", "这城……和别处不一样？", "right", player_avatar),
        story_line("老修", "当然不一样。这地方，穷人来混口饭，散修来混条命，真有本事的——来这儿等一场天大的机缘。", "left", "/avatar/laoxiu.png"),
        story_line("你", "什么机缘？", "right", player_avatar),
        story_line("老修", "你听过天机阁吗？", "left", "/avatar/laoxiu.png"),
        story_line("你", "没有。", "right", player_avatar),
        story_line("老修", "那你以后会记住的。五十年后，天机阁开，天机大比起。到时候，这城里城外会挤满想改命的人。", "left", "/avatar/laoxiu.png"),
        story_line("你", "赢了会怎样？", "right", player_avatar),
        story_line("老修", "赢了就有机会被上宗看中，离开这座城，离开眼前这点鸡零狗碎的日子。说白了，赢了，你就不只是武陵城里的一个小散修了。", "left", "/avatar/laoxiu.png"),
        story_line("老修", "修仙路上，怕自己不行的人，通常也真走不远。武陵城里每天都有新面孔，可真正能在五十年后站到天机阁前的人，没几个。", "left", "/avatar/laoxiu.png"),
        story_line("你", "我会去。", "right", player_avatar),
        story_line("老修", "行，有志气。先别管五十年后，眼下先想想今晚住哪儿吧。", "left", "/avatar/laoxiu.png"),
        narration("旁白极轻，却像一粒火种落进了心里。那一日，你第一次记住了“天机大比”四个字，也第一次觉得，自己这条原本只想着活下去的路，似乎终于有了一个尽头。"),
      ],
      reward_exp: 300,
    },

    10: {
      title: "拍卖会风波",
      lines: [
        narration("拍卖台上，老者声音刚落，整座拍卖楼便短暂安静了一瞬。你原本只是坐在角落里看热闹，听到“残旧玉简”四个字才抬起头。"),
        story_line("拍卖老者", "安静——下一件拍品，残旧玉简一枚，出自北山遗府，来历不明，底价五十灵石。", "left", "/avatar/laozhe.png"),
        narration("那玉简颜色黯淡，边缘残缺，表面甚至还有几道细小裂纹，看上去像是随时会碎。可不知为何，你偏偏觉得它身上有种说不出的古怪气息。"),
        story_line("你", "八十。", "right", player_avatar),
        story_line("林沐心", "一百二。", "left", "/avatar/linmuxin.png"),
        narration("你猛地抬头，只见二楼栏边坐着一名少女，神情松松散散，像只是随口一喊，可眼神却稳稳落在那枚玉简上。"),
        story_line("你", "一百五。", "right", player_avatar),
        story_line("林沐心", "两百。", "left", "/avatar/linmuxin.png"),
        story_line("你", "二百三。", "right", player_avatar),
        story_line("林沐心", "三百。", "left", "/avatar/linmuxin.png"),
        story_line("林沐心", "你很想要？", "left", "/avatar/linmuxin.png"),
        story_line("你", "你不也是？", "right", player_avatar),
        story_line("林沐心", "那就各凭本事呗。", "left", "/avatar/linmuxin.png"),
        story_line("林沐心", "四百。", "left", "/avatar/linmuxin.png"),
        narration("最终，那枚玉简还是落入了她手里。散场时，你心里还憋着一口气，正沿着石阶往下走，前面忽然有人挡住了路。"),
        story_line("林沐心", "怎么，输不起啊？", "left", "/avatar/linmuxin.png"),
        story_line("你", "我只是没带够灵石，不代表我看不出东西。", "right", player_avatar),
        story_line("林沐心", "哦？那你说说，这东西哪里不一样？", "left", "/avatar/linmuxin.png"),
        story_line("你", "灵纹太旧，旧得不像这个时代的东西。还有，它表面看着快碎了，可灵识扫上去时，总像被什么挡了一层。", "right", player_avatar),
        story_line("林沐心", "行啊，眼力不错。", "left", "/avatar/linmuxin.png"),
        story_line("林沐心", "我本来还以为你只是跟我赌气，现在看，倒真不是乱喊价。", "left", "/avatar/linmuxin.png"),
        story_line("你", "你专门拦我，就是为了说这个？", "right", player_avatar),
        story_line("林沐心", "当然不是。我只是觉得，能跟我抢这么久的人，起码得让我知道名字吧。", "left", "/avatar/linmuxin.png"),
        story_line("林沐心", "我叫林沐心。你呢？", "left", "/avatar/linmuxin.png"),
        story_line("你", `我叫${player_name}。`, "right", player_avatar),
        story_line("林沐心", "行，我记住你了。下次再遇到这种东西，别输得这么早。", "left", "/avatar/linmuxin.png"),
        story_line("你", "那下次你灵石最好也多带点。", "right", player_avatar),
        story_line("林沐心", "还挺记仇。", "left", "/avatar/linmuxin.png"),
        narration("拍卖楼外夜色沉沉，灯火映在她眼底，像一簇跳动的火。你当时并不知道，这场因为一枚残旧玉简而起的争执，往后会在你的修行路上留下比你想象中更重的痕迹。"),
      ],
      reward_exp: 300,
    },

    20: {
      title: "暗流初现",
      lines: [
        story_line("中年修士", "你最近有没有发现，武陵城里陌生面孔多了不少？", "left", "/avatar/nanxiu.png"),
        narration("茶馆角落里，热气从壶口缓缓冒起。你刚坐下，对面的中年修士便把酒盏往你面前推了推，声音压得极低。"),
        story_line("你", "你特地把我叫出来，不会只是为了说这个吧。", "right", player_avatar),
        story_line("中年修士", "你还真是一点都不爱绕弯子。", "left", "/avatar/nanxiu.png"),
        story_line("你", "修士都活不长，没必要浪费时间。", "right", player_avatar),
        story_line("中年修士", "这半年，城里来了很多外修。表面上有做买卖的、有做委托的，也有说来找机缘的，可我总觉得不对。", "left", "/avatar/nanxiu.png"),
        story_line("你", "哪里不对？", "right", player_avatar),
        story_line("中年修士", "他们不看丹药，不看法器，也不问哪个山头有妖兽。", "left", "/avatar/nanxiu.png"),
        story_line("中年修士", "他们只问旧物、残卷、遗迹和……天机阁。", "left", "/avatar/nanxiu.png"),
        story_line("你", "天机阁？", "right", player_avatar),
        story_line("中年修士", "对。我原本也以为，大家都是冲着五十年后的天机大比来的。可后来我发现，不一样。普通修士打听的是名额、规矩、往届谁赢了；这些人打听的，是更早以前的东西。", "left", "/avatar/nanxiu.png"),
        story_line("你", "更早以前？", "right", player_avatar),
        story_line("中年修士", "比如天机阁最初是谁建的，比如为什么偏偏五十年一开，比如有没有旧碑旧卷留下来。", "left", "/avatar/nanxiu.png"),
        story_line("中年修士", "这不像是为了上台，更像是在提前掀棋盘。", "left", "/avatar/nanxiu.png"),
        narration("茶馆外人声喧杂，里头这一角却安静得过分。"),
        story_line("你", "你为什么来找我？", "right", player_avatar),
        story_line("中年修士", "因为这两年，城里不少人都说你盯天机阁盯得很紧。我想着，与其让你以后被卷进去时什么都不知道，不如提前告诉你一声。", "left", "/avatar/nanxiu.png"),
        story_line("你", "你倒是好心。", "right", player_avatar),
        story_line("中年修士", "不是好心，是怕。", "left", "/avatar/nanxiu.png"),
        story_line("中年修士", "我在武陵城混了这么多年，最懂一件事——水面越平，底下越可能有东西在动。天机大比快到了，有些人已经不打算等到第五十年那一天再出手了。", "left", "/avatar/nanxiu.png"),
        narration("话音刚落，茶馆门外忽然传来一阵急促脚步声。几名陌生修士从街上走过，衣着寻常，步伐却整齐得过分。"),
        story_line("中年修士", "就是这种人。", "left", "/avatar/nanxiu.png"),
        story_line("你", "你的意思是，天机大比还没开始，路就已经有人在清了？", "right", player_avatar),
        story_line("中年修士", "谁能上台，谁不能上台，谁知道得太多……真到了那一天，台上争的是高低，台下争的就未必只是高低了。", "left", "/avatar/nanxiu.png"),
        narration("旁白像阴影一样缓缓压下来。你原本以为五十年后的天机大比，只是自己与旁人之间的一场争胜。可从这一刻起，你第一次真正意识到，那或许还是一张更大的网，而自己，已经站在网边了。"),
      ],
      reward_exp: 300,
    },

    30: {
      title: "城主飞升",
      lines: [
        narration("长街尽头忽然爆出一阵惊呼，连坊市里的吆喝声都在一瞬间低了下去。你原本正站在摊前挑一卷残缺符册，闻声抬头，只见整片天幕都被一层金色光华染亮。"),
        story_line("路人修士", "快看！城主府那边！", "left", "/avatar/nanxiu.png"),
        story_line("年轻修士", "怎么回事？有人闯城主府？", "left", "/avatar/nanxiu.png"),
        story_line("另一个修士", "闯你个头！你见过哪家闯府能把半边天点亮的？这是异象！", "left", "/avatar/nanxiu.png"),
        narration("人群像潮水般朝长街尽头涌去，你也顺着人流一路抬头望去。只见城主府上空，云层已被某种恐怖气息生生撕开，一道修长身影立于高天之上。"),
        story_line("老修士", "这是……飞升异象。", "left", "/avatar/laoxiu.png"),
        story_line("路人修士", "飞升？武陵城主要飞升了？", "left", "/avatar/nanxiu.png"),
        story_line("路人修士", "真有人能走到那一步？", "left", "/avatar/nanxiu.png"),
        narration("旁白极轻，却重得像山压下来。你修行三十年，自以为已经见过不少风浪，可直到这一刻，才真正明白“仙路尽头”这四个字到底有多远。"),
        story_line("武陵城主", "武陵守城三百载，今日，当去天外一行。", "left", "/avatar/chengzhu.png"),
        narration("下一刻，城主府上空灵光暴涨，一道巨大的裂隙自天穹深处缓缓张开。金色天梯自裂隙中垂落，霞光倾泻，连空气都带上了一种让人屏息的庄严。"),
        story_line("年轻修士", "那就是……天外？", "left", "/avatar/nanxiu.png"),
        story_line("另一个修士", "我原以为武陵城主已经够高了，原来他也只是要往更高处走。", "left", "/avatar/nanxiu.png"),
        story_line("武陵城主", "修道者，当争。", "left", "/avatar/chengzhu.png"),
        story_line("武陵城主", "争一线生机，争一口不平，争那本不属于凡俗的一步登天。", "left", "/avatar/chengzhu.png"),
        story_line("武陵城主", "五十年天机阁开，莫把它只当一场比试。", "left", "/avatar/chengzhu.png"),
        story_line("武陵城主", "能登阁者，争的不只是强弱，也是自己的命。", "left", "/avatar/chengzhu.png"),
        story_line("你", "原来……这世上真有飞升。", "right", player_avatar),
        narration("你仰头望着那道身影，只觉得胸口发热，掌心不知何时已攥得发白。"),
        story_line("你", "五十年的天机大比……", "right", player_avatar),
        story_line("你", "我会去。", "right", player_avatar),
        narration("旁白极轻，却像誓言落地。那一日，武陵城主飞升而去，而你第一次真正坚定了自己的目标。"),
      ],
      reward_exp: 300,
    },

    40: {
      title: "遗迹同行",
      lines: [
        story_line("林沐心", "你来得也太慢了吧。", "left", "/avatar/linmuxin.png"),
        narration("遗迹入口前，石门尚未完全开启，你刚穿过外围禁制，就听见一道熟悉的声音从前方传来。"),
        story_line("你", "你到底是来探遗迹的，还是来春游的？", "right", player_avatar),
        story_line("林沐心", "探遗迹就不能吃饭了？修士也要填肚子啊。", "left", "/avatar/linmuxin.png"),
        story_line("你", "你还真是一点都不紧张。", "right", player_avatar),
        story_line("林沐心", "紧张有用吗？你要不要？不吃等会儿别说自己饿得没力气破阵。", "left", "/avatar/linmuxin.png"),
        story_line("你", "这里灵气乱得不正常，里面多半不只是机关。", "right", player_avatar),
        story_line("林沐心", "巧了，我也这么想。所以我本来想拉个顺眼点的人一起走。现在看，正好碰上你了。", "left", "/avatar/linmuxin.png"),
        story_line("你", "你这算邀请，还是顺手捡个打工的？", "right", player_avatar),
        story_line("林沐心", "看你表现。表现好算同行，表现差算苦力。", "left", "/avatar/linmuxin.png"),
        narration("石门缓缓开启，古老气息扑面而来，四周修士一阵骚动，很快便有人率先冲了进去。你和林沐心对视一眼，也没再多说，同时向前踏入。"),
        narration("遗迹内部比想象中更复杂，残阵交错，石道蜿蜒，墙上古纹时明时灭。"),
        story_line("林沐心", "小心！", "left", "/avatar/linmuxin.png"),
        narration("林沐心反应极快，一把将你往侧边拽去，自己反手打出一道火光，将最前面的两道光刃硬生生撞碎。你也立刻稳住身形，挥手震开余下几道攻击，两人一退一进，总算把突发禁制扛了过去。"),
        story_line("林沐心", "发什么呆？再慢一点你脸都要被削掉了。", "left", "/avatar/linmuxin.png"),
        story_line("你", "我还以为你会先顾自己。", "right", player_avatar),
        story_line("林沐心", "那你可太小看我了。我这人脾气是一般，眼光也挑，但真要一起走路，总不能看着同伴死在面前吧。", "left", "/avatar/linmuxin.png"),
        narration("旁白只轻轻落下一句：遗迹深处阴影重重，可她站在你身旁时，那种冷意似乎总会被冲淡一些。"),
        story_line("你", "你到底往储物袋里塞了多少吃的？", "right", player_avatar),
        story_line("林沐心", "这叫未雨绸缪。像你这种只知道带丹药和符纸的，迟早会饿傻。", "left", "/avatar/linmuxin.png"),
        story_line("你", "说真的，你这样的人，怎么看都不像会对遗迹感兴趣。", "right", player_avatar),
        story_line("林沐心", "谁说我是对遗迹感兴趣了？我只是对里面藏的答案有兴趣。", "left", "/avatar/linmuxin.png"),
        story_line("你", "什么答案？", "right", player_avatar),
        story_line("林沐心", "拍卖会那枚玉简，我后来研究了很久。上面的痕迹和这里的古纹很像。若我没猜错，这地方和天机阁、和五十年后的那场大比，多少有点关系。", "left", "/avatar/linmuxin.png"),
        story_line("你", "你也查到这里来了？", "right", player_avatar),
        story_line("林沐心", "怎么，只许你查？我还以为你这些年也没闲着。", "left", "/avatar/linmuxin.png"),
        story_line("你", "天机大比这件事，越来越不像表面那样简单了。", "right", player_avatar),
        story_line("林沐心", "所以我才会来。", "left", "/avatar/linmuxin.png"),
        narration("最终，在遗迹最核心的一间石室中，你们看见了一方残碑。碑上裂痕纵横，字迹残缺，却仍能勉强辨出几句古字。"),
        story_line("你", "阁门五十年一开……", "right", player_avatar),
        story_line("你", "择能登者，非独以力。", "right", player_avatar),
        story_line("林沐心", "看来，咱们之前猜得没错。", "left", "/avatar/linmuxin.png"),
        story_line("你", "天机大比，果然不只是比武。", "right", player_avatar),
        narration("旁白悄然落下。你终于确信，第五十年的天机大比背后，藏着比胜负更重的东西。"),
      ],
      reward_exp: 300,
    },

    50: {
      title: "四方云集",
      lines: [
        story_line("路人修士", "让开，让开！青岚宗的人来了——", "left", "/avatar/nanxiu.png"),
        narration("武陵城外，人潮如海。天机阁尚未完全开启，阁前广场便已经被来自四方的修士挤得水泄不通。"),
        narration("有人背剑而立，有人乘禽而来，也有人衣着普通，神情却比谁都沉。每个人都知道，今日之后，很多人的命运都会被改写。"),
        narration("你站在人群边缘，抬头望向那座高阁。五十年过去，它看起来与最初听闻时并无太大不同，可你心里很清楚，自己已经不是当年那个初入武陵、连城门都看得发怔的小修士了。"),
        story_line("林沐心", "发什么呆？", "left", "/avatar/linmuxin.png"),
        story_line("你", "我还以为你会再晚一点。", "right", player_avatar),
        story_line("林沐心", "怎么，想我了？还是怕我不来，你一个人上去会腿软？", "left", "/avatar/linmuxin.png"),
        story_line("你", "我只是觉得，你这么爱看热闹的人，不来可惜了。", "right", player_avatar),
        story_line("林沐心", "说得对。这种热闹，一辈子也未必有第二次。", "left", "/avatar/linmuxin.png"),
        narration("四周呼声此起彼伏，宗门旗号、家族名头、天骄传闻不绝于耳。你看着那些人，有一瞬甚至会觉得自己像重新回到了最初踏入武陵城的时候。"),
        narration("可这一次，你只是安静地看着，没有退后。"),
        story_line("林沐心", "紧张吗？", "left", "/avatar/linmuxin.png"),
        story_line("你", "有一点。", "right", player_avatar),
        story_line("林沐心", "那就对了。真不紧张的，不是傻子就是骗子。", "left", "/avatar/linmuxin.png"),
        story_line("你", "你安慰人的方式还真特别。", "right", player_avatar),
        story_line("林沐心", "有用不就行。反正都走到这儿了，怕也没用。", "left", "/avatar/linmuxin.png"),
        narration("高阁之上，古钟终于响起。第一声钟鸣传出时，整片天地都像静了一下。原本嘈杂的人群瞬间安静下来，无数目光同时抬起，看向高阁最上方缓缓打开的石门。"),
        narration("紧接着，第二声、第三声钟鸣接连回荡，像是在替所有人宣告：五十年之约，到了。"),
        narration("你站在原地，听着钟声一下一下砸进耳中，眼前却飞快闪过这五十年的无数片段。"),
        story_line("林沐心", "去吧。", "left", "/avatar/linmuxin.png"),
        story_line("你", "……", "right", player_avatar),
        story_line("林沐心", "别输得太难看。至少别让我白陪你走到这一步。", "left", "/avatar/linmuxin.png"),
        story_line("你", "好。", "right", player_avatar),
        story_line("高阁执事", "天机大比，启！", "left", "/avatar/zhishi.png"),
        narration("旁白极轻，却像一整条路在脚下落定。五十年修行，五十年积累，五十年不肯回头的坚持，至此尽归一战。"),
      ],
      reward_exp: 300,
    },
  };
}

function get_ending_dialogue_good(player_avatar) {
  return [
    narration("高台之上，最后一战尘埃落定。风从高处卷落，吹得你衣袍猎猎作响，满场修士却安静得近乎死寂。"),
    narration("你站在原地，胸口仍有激战之后的起伏，掌心还残留着灵力碰撞的余震，可这一刻，你心里却前所未有地平静。"),
    story_line("路人修士", "结束了……真让他赢到了最后。", "left", "/avatar/nanxiu.png"),
    story_line("路人修士", "散修出身，竟能在天机大比中杀到最后，这人以后怕是要改命了。", "left", "/avatar/nanxiu.png"),
    narration("高阁深处，一道苍老而沉稳的声音缓缓落下，像钟声一样压过了全场嘈杂。"),
    story_line("高阁长老", "此子，可入阁门。", "left", "/avatar/zhanglao.png"),
    narration("短短六个字落下，整座广场先是一静，随后哗然声四起。无数目光从四面八方汇聚到你身上，有惊叹，有不甘，也有毫不掩饰的艳羡。"),
    story_line("路人修士", "入阁了……他真入阁了！", "left", "/avatar/nanxiu.png"),
    story_line("路人修士", "五十年一开的大门，竟真让他走进去了。", "left", "/avatar/nanxiu.png"),
    narration("你缓缓抬头，看向高阁深处那扇缓缓开启的门。五十年的风霜、搏命、隐忍与咬牙坚持，在这一刻终于化作了某种真实可触的东西。"),
    story_line("林沐心", "行啊，你还真做到了。", "left", "/avatar/linmuxin.png"),
    narration("你回头，看见林沐心正站在人群边缘望着你。她嘴角带着熟悉的笑意，可那笑里少见地没有打趣，反而像是替你松了一口气。"),
    story_line("你", "你不是早就觉得我能行？", "right", player_avatar),
    story_line("林沐心", "我只是懒得先夸你，免得你飘。", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "不过现在看来，夸你一句倒也不算亏。", "left", "/avatar/linmuxin.png"),
    story_line("你", "那我是不是该谢你？", "right", player_avatar),
    story_line("林沐心", "谢倒不必。", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "以后真进了阁门，别混出点名堂就不认人。", "left", "/avatar/linmuxin.png"),
    narration("你看着她，忽然笑了。那笑意并不张扬，却像终于卸下了压在心头五十年的某块石头。"),
    story_line("你", "不会。", "right", player_avatar),
    narration("高阁之门彻底开启，云间灵光流转，仿佛有一条真正通往更高处的道路正在你眼前铺开。"),
    narration("旁白轻轻落下：阁门已开，而你的修行，也终于不再只是武陵城中的一场挣扎。真正的仙途，从这一刻才算开始。"),
  ];
}

function get_ending_dialogue_mid(player_avatar) {
  return [
    narration("高台之上，钟声落下，你终究还是停在了最后一道门槛前。"),
    narration("你没有赢到最后，也没能等来那句真正改变命运的话。可当你从台上缓缓走下时，四周并没有轻蔑，反而有许多目光落在你身上，久久未散。"),
    story_line("路人修士", "可惜了，就差一步。", "left", "/avatar/nanxiu.png"),
    story_line("路人修士", "是啊，可能走到这里，本就不是一般人。", "left", "/avatar/nanxiu.png"),
    narration("风吹过高台边缘，吹得你胸口一阵发空。你抬头看向那座尚未彻底闭合的阁门，只觉得自己与它之间明明只差一步，却像隔着整整五十年的风雪。"),
    story_line("林沐心", "难受吗？", "left", "/avatar/linmuxin.png"),
    narration("你回头，看见林沐心不知何时已站到了你身边。她今天难得没笑，只是静静望着你。"),
    story_line("你", "有一点。", "right", player_avatar),
    story_line("林沐心", "那就记住这种感觉。", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "今天没走进去，不代表以后也走不进去。", "left", "/avatar/linmuxin.png"),
    story_line("你", "你这是在安慰我？", "right", player_avatar),
    story_line("林沐心", "少自作多情。", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "我只是不想看你像条死鱼一样站着，怪丢人的。", "left", "/avatar/linmuxin.png"),
    narration("她别过脸去，语气还是一如既往地不肯认输，可你却听得出来，她这一次说得比哪次都认真。"),
    story_line("你", "可惜，还是差了半步。", "right", player_avatar),
    story_line("林沐心", "修仙这种事，本来就差一步最常见。", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "能走到这一步，已经够让很多人一辈子都抬不起头了。", "left", "/avatar/linmuxin.png"),
    narration("你缓缓吐出一口气，再次抬头望向高阁时，心里那股近乎窒闷的不甘，竟在她这几句话里慢慢松开了几分。"),
    story_line("你", "下次再来，我不会停在这里。", "right", player_avatar),
    story_line("林沐心", "这话听着还像点样子。", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "那我就姑且信你一次。", "left", "/avatar/linmuxin.png"),
    narration("高阁的门缓缓闭合，天地重新归于平静。你没有真正走进去，可你的名字却已经在武陵城中悄然传开。"),
    narration("旁白无声落下：门这一次没有为你打开，但路却没有因此断绝。你已走到这里，那么下一次，未必不能再向前半步。"),
  ];
}

function get_ending_dialogue_bad(player_avatar) {
  return [
    narration("天机大比落幕时，你已退到高台之外。"),
    narration("你没有走到最后，也没能在那座高阁前留下属于自己的名字。四周人潮渐渐散去，喧嚣也像潮水一样退远，只剩风还在高台下打着旋。"),
    narration("你站在原地，久久没有说话。"),
    story_line("路人修士", "散了吧，结束了。", "left", "/avatar/nanxiu.png"),
    story_line("路人修士", "今年天机阁的门，又只对少数几个人开。", "left", "/avatar/nanxiu.png"),
    narration("那些声音从你耳边滑过，你却没有回头。你只是望着高处那座渐渐闭合的阁门，心里空得发沉，却又说不上是愤怒，还是遗憾。"),
    story_line("林沐心", "喂。", "left", "/avatar/linmuxin.png"),
    narration("熟悉的声音从身后传来。你转身时，林沐心已经走到了你面前，手里还拎着一包冒着热气的烤肉。"),
    story_line("你", "这是干什么？", "right", player_avatar),
    story_line("林沐心", "怕你输了以后想不开，先拿吃的堵住你的嘴。", "left", "/avatar/linmuxin.png"),
    story_line("你", "你安慰人的方式还真奇怪。", "right", player_avatar),
    story_line("林沐心", "有用就行。", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "输了大比，又不是输了命。你这副表情摆给谁看？", "left", "/avatar/linmuxin.png"),
    narration("你低头看了看手里那包还带着温度的烤肉，忽然有点想笑。明明输了这一场本该难看到极点的比试，可她这一开口，偏偏把那点快压得你喘不过气的失落冲淡了些。"),
    story_line("你", "我只是觉得，五十年走到今天，还是差了点。", "right", player_avatar),
    story_line("林沐心", "修仙哪有不差的。", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "今天你没赢，不代表以后都赢不了。再说了——", "left", "/avatar/linmuxin.png"),
    story_line("林沐心", "你要是真就这么认了，我反而会看不起你。", "left", "/avatar/linmuxin.png"),
    story_line("你", "你这人，嘴上还是一点都不饶人。", "right", player_avatar),
    story_line("林沐心", "那不然呢？难道还要我抱着你哭一场？", "left", "/avatar/linmuxin.png"),
    narration("你终究还是笑了出来。那笑意很淡，却让胸口那股一直压着你的闷意松开了不少。"),
    story_line("你", "是啊。路还没断。", "right", player_avatar),
    story_line("林沐心", "这才像话。", "left", "/avatar/linmuxin.png"),
    narration("你抬头看向远处渐渐闭合的天机阁，忽然发现自己并没有想象中那样彻底被打垮。"),
    narration("旁白极轻：阁门关上了，可武陵城的风还在吹，而你的修行，也并不会在今日结束。你没有一步登天，但你也早已不是当年那个刚进城时，连天机大比是什么都不知道的小修士了。"),
  ];
}

function get_init_game() {
  return {
    started: false,
    now_year: 1,
    now_season: 0,
    ended: false,
    ending: null,
    tournament_pending: false,
    scene: "委托堂",
    event_serial: 0,
    current_event: {
      title: "初入坊市",
      desc: "你踏入坊市时，四周修士来往不绝。药香、酒气、兵刃碰撞声混在一起，热闹中也透着几分生冷。五十年之约已在前方等你。",
      summary: "新的一局已经开始。",
    },
battle: null,
tournament: null,
auction: null,
puzzle: null,
market: null,
memory: null,
trace: null,
forage: null,
balance: null,
foundation: null,
bag: [],
contacts: [
  {
    id: "old_appraiser",
    relation: 12,
    favor: 0,
  },
],
equipped_gongfa: null,
equipped_weapon: null,
equipped_skill: null,
equipped_items: [],
    role: {
      name: "",
      gender: "male",
      avatar: "/avatar/nanjuese.png",
    },
    player: {
      stage: 1,
      exp: 0,
      hp: 100,
      mp: 100,
      spirit: 20,
      stone: 80,
      dao: 50,
      fame: 0,
      chance: 0,
      hurt: 0,
    },
    flags: {
      know_match: true,
      qualify: false,
    },
    logs: [
      "你初入坊市，囊中羞涩，但道心还算热乎。",
      "听闻第 50 年将举行天机大比，这是改变命运的唯一机会。",
    ],
  };
}

function normalize_equipped_items(raw_game) {
  const source = [
    ...(Array.isArray(raw_game?.equipped_items) ? raw_game.equipped_items : []),
    raw_game?.equipped_gongfa,
    raw_game?.equipped_weapon,
    raw_game?.equipped_skill,
  ].filter(Boolean);
  const seen = new Set();

  return source
    .filter((item) => item.type !== "trade_good")
    .filter((item) => {
      const key = String(item.id || `${item.type}_${item.name}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 9);
}

function normalize_save(raw_game) {
  const init = get_init_game();

  return {
    ...init,
    ...raw_game,
    role: {
      ...init.role,
      ...(raw_game?.role || {}),
    },
    player: {
      ...init.player,
      ...(raw_game?.player || {}),
    },
    flags: {
      ...init.flags,
      ...(raw_game?.flags || {}),
    },
    current_event: {
      ...init.current_event,
      ...(raw_game?.current_event || {}),
    },
battle: raw_game?.battle || null,
tournament: raw_game?.tournament || null,
auction: raw_game?.auction || null,
puzzle: raw_game?.puzzle || null,
market: raw_game?.market || null,
memory: raw_game?.memory || null,
trace: raw_game?.trace || null,
forage: raw_game?.forage || null,
balance: raw_game?.balance || null,
foundation: raw_game?.foundation || null,
bag: Array.isArray(raw_game?.bag) ? raw_game.bag : init.bag,
contacts: normalize_contacts(raw_game?.contacts || init.contacts),
equipped_gongfa: raw_game?.equipped_gongfa || null,
equipped_weapon: raw_game?.equipped_weapon || null,
equipped_skill: raw_game?.equipped_skill || null,
equipped_items: normalize_equipped_items(raw_game),
    logs:
      Array.isArray(raw_game?.logs) && raw_game.logs.length
        ? raw_game.logs
        : init.logs,
    tournament_pending: raw_game?.tournament_pending || false,
  };
}

function is_resumable_save(state) {
  if (!state?.started) return false;
  if (state.ended) return false;
  if (Number(state.player?.hp || 0) <= 0) return false;
  if (state.tournament?.finished) return false;
  return true;
}

function get_settlement_items(summary = "") {
  return String(summary)
    .split(/[，。；,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function should_show_settlement(event) {
  const summary = String(event?.summary || "");
  if (!summary) return false;

  const process_only = [
    "需要",
    "已完成",
    "进度",
    "失误",
    "输入已清空",
    "先搜消息",
    "点灵草格",
    "完成连线",
    "从起点",
    "API",
    "当前最高价",
    "对手：",
  ];
  if (process_only.some((word) => summary.includes(word))) return false;

  return /[+-]\d|＋\d|－\d|获得|入账|净赚|净亏|修为|灵石|气血|灵力|名望|机缘|悟性|关系|人情|伤势|已装备|已卸下|最终战绩/.test(summary);
}

function maybe_breakthrough(player, logs) {
  let next_player = { ...player };
  let next_logs = [...logs];

  while (next_player.stage < 11) {
    const need_exp = get_need_exp(next_player.stage);
    if (next_player.exp < need_exp) break;
    if (next_player.stage === 10) break;

    next_player.exp -= need_exp;
    next_player.stage += 1;
    next_player.hp = clamp(next_player.hp + 10, 0, 120);
    next_player.mp = clamp(next_player.mp + 15, 0, 120);
    next_player.dao = clamp(next_player.dao + 4, 0, 100);

    next_logs = push_log(
      next_logs,
      `你成功突破，当前境界：${get_stage_name(next_player.stage)}。`
    );
  }

  return {
    player: next_player,
    logs: next_logs,
  };
}

function roll_common_event(state) {
  let player = { ...state.player };
  let logs = [...state.logs];
  const dice = rand_int(1, 100);

  if (dice <= 10) {
    const gain = rand_int(15, 35);
    player.stone += gain;
    logs = push_log(logs, `你在坊市捡漏，白赚 ${gain} 灵石。今天气运有点在线。`);
  } else if (dice <= 18) {
    const gain = rand_int(4, 8);
    player.dao = clamp(player.dao + gain, 0, 100);
    logs = push_log(logs, "你偶遇一位游方老修，与其闲谈后，道心有所精进。");
  } else if (dice <= 25) {
    const dmg = rand_int(8, 16);
    player.hp = clamp(player.hp - dmg, 0, 120);
    player.hurt = clamp(player.hurt + 1, 0, 10);
    logs = push_log(logs, `你被不讲武德的小妖偷袭，气血 -${dmg}。`);
  } else if (dice <= 30) {
    player.chance += 1;
    logs = push_log(logs, "你得到一条关于拍卖会的传闻，机缘值 +1。");
  }

  return {
    ...state,
    player,
    logs,
  };
}

function get_final_rank(score) {
  if (score >= 210) return "甲上";
  if (score >= 170) return "甲";
  if (score >= 135) return "乙上";
  if (score >= 100) return "乙";
  return "未入流";
}

function get_final_ending(state) {
  const p = state.player;
  const score =
    p.stage * 18 +
    Math.floor(p.exp / 8) +
    Math.floor(p.stone / 12) +
    Math.floor(p.dao / 4) +
    Math.floor(p.fame / 3) +
    p.chance * 6 -
    p.hurt * 4;

  const rank = get_final_rank(score);

  if (p.stage >= 11 && rank === "甲上") {
    return {
      title: "完美结局：筑基入宗",
      desc: `你以 ${get_stage_name(p.stage)} 之身在天机大比中名列前茅，被大宗门看中，自此踏入真正仙途。`,
      rank,
      score,
    };
  }

  if (p.stage >= 11) {
    return {
      title: "成功结局：得机缘而入门",
      desc: `你在天机大比中表现不俗，虽未冠绝全场，但仍凭 ${get_stage_name(p.stage)} 的底蕴获得宗门名额。`,
      rank,
      score,
    };
  }

  if (p.stage >= 8 && state.flags.qualify) {
    return {
      title: "遗憾结局：止步练气",
      desc: "你成功站上了天机大比的舞台，却终究未能迈出筑基那一步。",
      rank,
      score,
    };
  }

  return {
    title: "普通结局：坊市散修",
    desc: "你没能借大比改命，但五十年的修行并未白费。至少，你早已不是那个一穷二白的小修士。",
    rank,
    score,
  };
}

function finish_game(state) {
  const ending = get_final_ending(state);
  return {
    ...state,
    ended: true,
    ending,
    logs: push_log(
      state.logs,
      `第 50 年，天机大比落幕。你的综合评价为【${ending.rank}】。`
    ),
  };
}

function advance_time(state) {
  let now_year = state.now_year;
  let now_season = state.now_season + 1;
  let player = { ...state.player };
  let logs = [...state.logs];

  if (now_season >= 4) {
    now_season = 0;
    logs = push_log(
      logs,
      `第 ${now_year} 年结束。你抬头望向天机阁方向，离大比又近了一步。`
    );
    now_year += 1;
    player.hp = clamp(player.hp + 4, 0, 120);
    player.mp = clamp(player.mp + 6, 0, 120);
  }

  const next_state = {
    ...state,
    now_year,
    now_season,
    player,
    logs,
  };

  if (now_year === max_year && now_season === 0 && !next_state.tournament && !next_state.ended) {
  return {
    ...next_state,
    tournament_pending: true,
  };
}

  if (now_year > max_year) {
      return finish_game(next_state);
  }

      return next_state;
  }

  function finalize_one_year(state) {
  let next_state = { ...state };

  if (
    !next_state.flags.qualify &&
    (next_state.player.stage >= 6 || next_state.player.fame >= 25)
  ) {
    next_state = {
      ...next_state,
      flags: {
        ...next_state.flags,
        qualify: true,
      },
      logs: push_log(
        next_state.logs,
        "你已初步具备参加天机大比的资格。不错，终于不是路人甲了。"
      ),
    };
  }

  next_state = advance_time(next_state);
  if (next_state.ended) return next_state;

  next_state = advance_time(next_state);
  if (next_state.ended) return next_state;

  next_state = advance_time(next_state);
  if (next_state.ended) return next_state;

  next_state = advance_time(next_state);
  return next_state;
}

function finalize_turn(state, with_common_event = true) {
  let next_state = { ...state };

  if (
    !next_state.flags.qualify &&
    (next_state.player.stage >= 6 || next_state.player.fame >= 25)
  ) {
    next_state = {
      ...next_state,
      flags: {
        ...next_state.flags,
        qualify: true,
      },
      logs: push_log(
        next_state.logs,
        "你已初步具备参加天机大比的资格。不错，终于不是路人甲了。"
      ),
    };
  }

  if (with_common_event) {
    next_state = roll_common_event(next_state);
  }

  if (next_state.player.hp <= 0) {
    return {
      ...next_state,
      ended: true,
      ending: {
        title: "失败结局：道途终止",
        desc: "你在修行途中重伤陨落，未能等到天机大比开启。",
        rank: "无",
        score: 0,
      },
      logs: push_log(next_state.logs, "你重伤陨落，道途至此而止。"),
    };
  }

  return advance_time(next_state);
}

function build_summary(seed) {
  const parts = [];

  if (seed.hp_gain) parts.push(`气血 +${seed.hp_gain}`);
  if (seed.hp_loss) parts.push(`气血 -${seed.hp_loss}`);
  if (seed.mp_gain) parts.push(`灵力 +${seed.mp_gain}`);
  if (seed.mp_loss) parts.push(`灵力 -${seed.mp_loss}`);
  if (seed.reward_exp) parts.push(`修为 +${seed.reward_exp}`);
  if (seed.reward_stone) parts.push(`灵石 +${seed.reward_stone}`);
  if (seed.stone_loss) parts.push(`灵石 -${seed.stone_loss}`);
  if (seed.reward_fame) parts.push(`名望 +${seed.reward_fame}`);
  if (seed.reward_dao) parts.push(`道心 +${seed.reward_dao}`);
  if (seed.chance_gain) parts.push(`机缘 +${seed.chance_gain}`);
  if (seed.hurt_reduce) parts.push(`伤势 -${seed.hurt_reduce}`);

  if (!parts.length) return "这一季并无明显收获。";
  return parts.join("，");
}

function get_local_tournament_round(player, round_idx) {
  const player_power =
    player.stage * 8 +
    Math.floor(player.spirit / 2) +
    Math.floor(player.dao / 10);

  const round_names = ["初试", "复试", "决试"];
  const enemy_name = pick([
    "青云宗弟子",
    "赤霞山天才",
    "北岭剑修",
    "黑水谷真传",
    "流云宗核心弟子",
    "天机阁候补修士",
  ]);

  let enemy_value = 0;
  let hint = "";

  if (player.stage < 11) {
    enemy_value = player_power + 20 + round_idx * 5 + rand_int(1, 4);
    hint = "未筑基，胜算渺茫";
  } else {
    const fixed_bonus = [4, 6, 7][Math.min(round_idx, 2)];
    enemy_value = player_power + fixed_bonus;
    hint = "初入筑基，尚可一战";
  }

  const round_name = round_names[Math.min(round_idx, 2)];

  return {
    round_name,
    enemy_name,
    enemy_value,
    reward_exp: 24 + round_idx * 10,
    reward_stone: 30 + round_idx * 12,
    reward_fame: 5 + round_idx * 2,
    hint,
    desc: `天机大比${round_name}，你的对手是${enemy_name}。对方气势凝练，显然不是寻常散修。`,
  };
}

async function fetch_tournament_round(player, round_idx, player_name) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(`${api_base_url}/api/tournament_round`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_stage: player.stage,
        spirit: player.spirit,
        dao: player.dao,
        round_idx,
        player_name,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`tournament_round request failed: ${resp.status}`);
    }

    return await resp.json();
  } catch (err) {
    console.error("fetch_tournament_round failed, use local fallback:", err);
    return get_local_tournament_round(player, round_idx);
  } finally {
    clearTimeout(timer);
  }
}

function get_auction_rarity(player) {
  if (player.stone >= 260) return pick(["黄阶上品", "玄阶下品", "黄阶下品"]);
  if (player.stone >= 130) return pick(["黄阶下品", "黄阶上品", "凡阶"]);
  return pick(["凡阶", "黄阶下品"]);
}

function get_auction_theme() {
  return pick(["木属性养生功法", "火属性爆发功法", "水属性绵长功法"]);
}

function get_foundation_manual_bonus(rarity) {
  if (String(rarity || "").includes("玄")) return rand_int(17, 24);
  if (String(rarity || "").includes("上")) return rand_int(12, 17);
  if (String(rarity || "").includes("下")) return rand_int(8, 13);
  return rand_int(5, 9);
}

function get_foundation_manual(player, rarity = get_auction_rarity(player)) {
  const balanced = rand_int(1, 100) <= 55;
  const base = get_foundation_manual_bonus(rarity);
  const skew = balanced ? 0 : rand_int(2, 5);
  const focus = pick(["qi", "meridian", "mind"]);
  const names = {
    qi: ["归元筑基诀", "聚海凝基篇", "抱元归气法"],
    meridian: ["通脉筑基图", "玉脉开窍诀", "九转贯脉篇"],
    mind: ["守心凝基录", "明心筑基章", "定神问基诀"],
  };
  const foundation_qi = clamp(base + (focus === "qi" ? skew : balanced ? 0 : -1), 3, 26);
  const foundation_meridian = clamp(base + (focus === "meridian" ? skew : balanced ? 0 : -1), 3, 26);
  const foundation_mind = clamp(base + (focus === "mind" ? skew : balanced ? 0 : -1), 3, 26);
  const name = pick(names[focus]);
  const price_base = rarity.includes("玄") ? 320 : rarity.includes("上") ? 220 : rarity.includes("下") ? 130 : 70;
  const item = {
    id: `foundation_${Date.now()}_${rand_int(1000, 9999)}`,
    type: "foundation",
    name,
    rarity,
    description: "专为练气圆满修士冲击筑基所用的法门，能在筑基冲关开始时稳住三元根基。",
    foundation_qi,
    foundation_meridian,
    foundation_mind,
    price: clamp(price_base + (foundation_qi + foundation_meridian + foundation_mind) * 4 + rand_int(-20, 40), 40, Math.max(80, player.stone + 180)),
  };

  return {
    ...item,
    effect_text: get_item_effect_text(item),
  };
}

function get_local_gongfa(player, theme, rarity) {
  const rarity_map = {
    凡阶: {
      speed: [0.0, 0.05],
      damage: [0.0, 0.05],
      price: [30, 60],
      both: false,
    },
    黄阶下品: {
      speed: [0.06, 0.12],
      damage: [0.06, 0.1],
      price: [60, 120],
      both: false,
    },
    黄阶上品: {
      speed: [0.13, 0.2],
      damage: [0.1, 0.16],
      price: [120, 220],
      both: true,
    },
    玄阶下品: {
      speed: [0.21, 0.3],
      damage: [0.17, 0.24],
      price: [220, 420],
      both: true,
    },
  };

  const cfg = rarity_map[rarity] || rarity_map["凡阶"];

  let speed_bonus = 0;
  let damage_bonus = 0;

  if (cfg.both) {
    speed_bonus = Number(
      (Math.random() * (cfg.speed[1] - cfg.speed[0]) + cfg.speed[0]).toFixed(2)
    );
    damage_bonus = Number(
      (Math.random() * (cfg.damage[1] - cfg.damage[0]) + cfg.damage[0]).toFixed(2)
    );
  } else {
    const effect_type = pick(["speed", "damage"]);
    if (effect_type === "speed") {
      speed_bonus = Number(
        (Math.random() * (cfg.speed[1] - cfg.speed[0]) + cfg.speed[0]).toFixed(2)
      );
    } else {
      damage_bonus = Number(
        (Math.random() * (cfg.damage[1] - cfg.damage[0]) + cfg.damage[0]).toFixed(2)
      );
    }
  }

  const theme_map = {
    木属性养生功法: [
      "青木养元诀",
      "此诀偏重温养经脉、稳固根基，闭关时灵气入体更顺，适合慢慢滚雪球。",
    ],
    火属性爆发功法: [
      "赤炎行气诀",
      "此诀灵力运转迅疾，斗法时出手更烈，读起来就很上头。",
    ],
    水属性绵长功法: [
      "玄水归息诀",
      "此诀柔和绵长，重在循环不息，修炼与斗法皆有几分助益。",
    ],
  };

  const [name, base_desc] = theme_map[theme] || [
    "无名古诀",
    "一卷来历不明的古旧功法，虽残缺，却仍有几分玄妙。",
  ];

  const effects = [];
  if (speed_bonus > 0) effects.push(`闭关修炼 +${(speed_bonus * 100).toFixed(0)}%`);
  if (damage_bonus > 0) effects.push(`斗法伤害 +${(damage_bonus * 100).toFixed(0)}%`);

  return {
    name,
    rarity,
    description: `${base_desc}效果：${effects.join("，")}。`,
    speed_bonus,
    damage_bonus,
    effect_text: effects.join("，"),
    price: clamp(rand_int(cfg.price[0], cfg.price[1]), 20, Math.max(40, player.stone + 120)),
    type: "cultivation",
  };
}

const basic_battle_skill = {
  id: "none",
  name: "普通出招",
  desc: "不催动额外功法，保留灵力。",
  mpCost: 0,
  valueMultiplier: 1,
  valueBonus: 0,
  damageBonus: 0,
  incomingReduction: 0,
  heal: 0,
};

function get_gongfa_battle_skills(gongfa) {
  const speed_bonus = Number(gongfa?.speed_bonus || 0);
  const damage_bonus = Number(gongfa?.damage_bonus || 0);
  const name = gongfa?.name || "当前功法";
  const skills = [basic_battle_skill];

  skills.push({
    id: "spirit_strike",
    name: "凝气击",
    desc: "本回合数值 +8。",
    mpCost: 5,
    valueMultiplier: 1,
    valueBonus: 8,
    damageBonus: 0,
    incomingReduction: 0,
    heal: 0,
  });

  if (!gongfa) {
    skills.push({
      id: "guard_light",
      name: "护体灵光",
      desc: "本回合承伤 -8。",
      mpCost: 4,
      valueMultiplier: 1,
      valueBonus: 0,
      damageBonus: 0,
      incomingReduction: 8,
      heal: 0,
    });
    return skills;
  }

  skills.push({
    id: "gongfa_burst",
    name: `${name}·破势`,
    desc: `本回合数值 +${Math.max(10, Math.round(damage_bonus * 80))}，若压过对方，额外伤害 +${Math.max(3, Math.round(damage_bonus * 35))}。`,
    mpCost: 8,
    valueMultiplier: 1,
    valueBonus: Math.max(10, Math.round(damage_bonus * 80)),
    damageBonus: Math.max(3, Math.round(damage_bonus * 35)),
    incomingReduction: 0,
    heal: 0,
  });

  skills.push({
    id: "gongfa_cycle",
    name: `${name}·回息`,
    desc: `本回合承伤 -${Math.max(6, Math.round(speed_bonus * 45))}，并回复 ${Math.max(4, Math.round(speed_bonus * 30))} 气血。`,
    mpCost: 7,
    valueMultiplier: 1 + Math.max(0.08, damage_bonus / 2),
    valueBonus: 0,
    damageBonus: 0,
    incomingReduction: Math.max(6, Math.round(speed_bonus * 45)),
    heal: Math.max(4, Math.round(speed_bonus * 30)),
  });

  return skills;
}

function item_to_battle_skill(item) {
  if (!item) return null;
  if (item.type === "trade_good") return null;
  if (item.type === "foundation") return null;
  return {
    id: `${item.type}_${item.id || item.name}`,
    name: item.name,
    desc: item.description || get_item_effect_text(item),
    mpCost: Number(item.mpCost || 0),
    valueMultiplier: 1,
    valueBonus: Number(item.valueBonus || item.value_bonus || 0),
    damageBonus: Number(item.damageBonus || item.damage_flat || 0),
    incomingReduction: Number(item.incomingReduction || item.incoming_reduction || 0),
    heal: Number(item.heal || 0),
  };
}

function get_equipped_items(state) {
  const source = Array.isArray(state?.equipped_items) && state.equipped_items.length
    ? state.equipped_items
    : [state?.equipped_gongfa, state?.equipped_weapon, state?.equipped_skill].filter(Boolean);
  const seen = new Set();

  return source
    .filter(Boolean)
    .filter((item) => item.type !== "trade_good")
    .filter((item) => {
      const key = String(item.id || `${item.type}_${item.name}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 9);
}

function get_equipped_bonus(state, key) {
  return get_equipped_items(state).reduce((sum, item) => sum + Number(item?.[key] || 0), 0);
}

function get_available_battle_skills(state) {
  const skills = [];

  get_equipped_items(state).forEach((item) => {
    if (item.type === "cultivation") {
      skills.push(...get_gongfa_battle_skills(item).filter((skill) => skill.id !== "none"));
      return;
    }

    const item_skill = item_to_battle_skill(item);
    if (item_skill) skills.push(item_skill);

    if (item.type === "weapon") {
      skills.push({
        id: `weapon_${item.id || item.name}`,
        name: `${item.name}·器势`,
        desc: `借武器锋芒出手，本回合数值 +${Number(item.value_bonus || 0)}，额外伤害 +${Number(item.damage_flat || 0)}。`,
        mpCost: 3,
        valueMultiplier: 1,
        valueBonus: Number(item.value_bonus || 0),
        damageBonus: Number(item.damage_flat || 0),
        incomingReduction: 0,
        heal: 0,
      });
    }
  });

  return skills;
}

function get_battle_skill_by_id(skills, skill_id) {
  return skills.find((skill) => skill.id === skill_id) || basic_battle_skill;
}

function get_battle_skills_by_ids(skills, skill_ids) {
  const id_set = new Set((skill_ids || []).filter((id) => id && id !== "none"));
  return skills.filter((skill) => id_set.has(skill.id));
}

function combine_battle_skills(skills) {
  const active_skills = (skills || []).filter((skill) => skill && skill.id !== "none");
  if (!active_skills.length) return basic_battle_skill;

  return {
    id: active_skills.map((skill) => skill.id).join("+"),
    name: active_skills.map((skill) => skill.name).join(" + "),
    desc: active_skills.map((skill) => skill.desc).join("；"),
    mpCost: active_skills.reduce((sum, skill) => sum + Number(skill.mpCost || 0), 0),
    valueMultiplier: active_skills.reduce(
      (value, skill) => value * Number(skill.valueMultiplier || 1),
      1
    ),
    valueBonus: active_skills.reduce((sum, skill) => sum + Number(skill.valueBonus || 0), 0),
    damageBonus: active_skills.reduce((sum, skill) => sum + Number(skill.damageBonus || 0), 0),
    incomingReduction: active_skills.reduce(
      (sum, skill) => sum + Number(skill.incomingReduction || 0),
      0
    ),
    heal: active_skills.reduce((sum, skill) => sum + Number(skill.heal || 0), 0),
    count: active_skills.length,
  };
}

function get_item_type_label(type) {
  if (type === "weapon") return "武器";
  if (type === "skill") return "技能";
  if (type === "trade_good") return "旧物";
  if (type === "foundation") return "筑基功法";
  return "功法";
}

function get_item_effect_text(item) {
  if (!item) return "";
  const parts = [];
  if (Number(item.speed_bonus || 0) > 0) parts.push(`修炼 +${(Number(item.speed_bonus || 0) * 100).toFixed(0)}%`);
  if (Number(item.damage_bonus || 0) > 0) parts.push(`伤害 +${(Number(item.damage_bonus || 0) * 100).toFixed(0)}%`);
  if (Number(item.value_bonus || 0) > 0) parts.push(`出招 +${Number(item.value_bonus || 0)}`);
  if (Number(item.damage_flat || 0) > 0) parts.push(`破防 +${Number(item.damage_flat || 0)}`);
  if (Number(item.incoming_reduction || 0) > 0) parts.push(`减伤 +${Number(item.incoming_reduction || 0)}`);
  if (Number(item.heal || 0) > 0) parts.push(`回血 +${Number(item.heal || 0)}`);
  if (Number(item.mpCost || 0) > 0 && item.type === "skill") parts.push(`灵力 ${Number(item.mpCost || 0)}`);
  if (Number(item.foundation_qi || 0) > 0) parts.push(`筑基气海 +${Number(item.foundation_qi || 0)}`);
  if (Number(item.foundation_meridian || 0) > 0) parts.push(`筑基经脉 +${Number(item.foundation_meridian || 0)}`);
  if (Number(item.foundation_mind || 0) > 0) parts.push(`筑基道心 +${Number(item.foundation_mind || 0)}`);
  return item.effect_text || parts.join(" ｜ ") || "暂无明显加成";
}

function is_equipped_item(state, item) {
  if (!item) return false;
  if (item.type === "trade_good") return false;
  return get_equipped_items(state).some((equipped) => String(equipped.id || equipped.name) === String(item.id || item.name));
}

function get_item_base_price(item) {
  if (!item) return 1;
  const rarity = String(item.rarity || "凡阶");
  const rarity_base = rarity.includes("玄")
    ? 220
    : rarity.includes("上")
      ? 140
      : rarity.includes("下")
        ? 80
        : 40;
  const effect_value =
    Number(item.value_bonus || 0) * 5 +
    Number(item.damage_flat || 0) * 7 +
    Number(item.incoming_reduction || 0) * 6 +
    Number(item.heal || 0) * 5 +
    Math.round(Number(item.speed_bonus || 0) * 180) +
    Math.round(Number(item.damage_bonus || 0) * 220) +
    Number(item.foundation_qi || 0) * 5 +
    Number(item.foundation_meridian || 0) * 5 +
    Number(item.foundation_mind || 0) * 5;

  return Math.max(1, Number(item.price || 0), rarity_base + effect_value);
}

function get_normal_sell_price(item) {
  return Math.max(1, Math.round(get_item_base_price(item) * 0.58));
}

function get_urgent_sell_cost(item) {
  return clamp(6 + Math.floor(get_item_base_price(item) / 80), 6, 14);
}

function get_urgent_sell_estimate(item, player) {
  const base = get_item_base_price(item);
  const bonus = Math.floor(Number(player.fame || 0) / 8) + Math.floor(Number(player.spirit || 0) / 14);
  const low = Math.max(get_normal_sell_price(item), Math.round(base * (0.76 + bonus / 100)));
  const high = Math.max(low + 1, Math.round(base * (1.12 + bonus / 80)));
  return [low, high];
}

function clear_sold_equipment(state, item) {
  if (!is_equipped_item(state, item)) return {};
  const item_key = String(item.id || item.name);
  const equipped_items = get_equipped_items(state).filter(
    (equipped) => String(equipped.id || equipped.name) !== item_key
  );
  return {
    equipped_items,
    equipped_weapon: state.equipped_weapon?.id === item.id ? null : state.equipped_weapon,
    equipped_skill: state.equipped_skill?.id === item.id ? null : state.equipped_skill,
    equipped_gongfa: state.equipped_gongfa?.id === item.id ? null : state.equipped_gongfa,
  };
}

function get_local_item(player, source = "auction", preferred_type = "random") {
  const random_pool = Number(player.stage || 1) >= 8
    ? ["cultivation", "weapon", "skill", "foundation", "foundation"]
    : ["cultivation", "weapon", "skill", "foundation"];
  const type = preferred_type === "random" ? pick(random_pool) : preferred_type;
  const rarity = get_auction_rarity(player);
  const power = Math.max(1, Math.floor(player.stage / 2));
  const price_base = rarity.includes("玄") ? 220 : rarity.includes("上") ? 140 : rarity.includes("下") ? 80 : 40;

  if (type === "foundation") {
    return get_foundation_manual(player, rarity);
  }

  if (type === "weapon") {
    const item = {
      type: "weapon",
      name: pick(["青锋剑", "赤纹刀", "玄铁尺", "流火环", "寒星刺"]),
      rarity,
      description: "一件适合低阶修士驱使的法器，灵纹虽浅，却足以在斗法中添几分锋芒。",
      value_bonus: rand_int(4 + power, 10 + power * 2),
      damage_bonus: Number((rand_int(3, 10) / 100).toFixed(2)),
      damage_flat: rand_int(1, 5 + power),
      price: price_base + rand_int(10, 90),
    };
    return { ...item, effect_text: get_item_effect_text(item) };
  }

  if (type === "skill") {
    const item = {
      type: "skill",
      name: pick(["裂石诀", "回风步", "护脉诀", "燃灵一击", "清心印"]),
      rarity,
      description: "一门可以在战斗中主动催动的小术，胜在见效快，缺点是颇耗灵力。",
      mpCost: rand_int(4, 10),
      valueBonus: rand_int(6 + power, 14 + power * 2),
      damageBonus: rand_int(0, 6 + power),
      incomingReduction: rand_int(0, 8 + power),
      heal: rand_int(0, 6 + power),
      price: price_base + rand_int(15, 100),
    };
    return { ...item, effect_text: get_item_effect_text(item) };
  }

  return {
    ...get_local_gongfa(player, get_auction_theme(), rarity),
    type: "cultivation",
  };
}

async function fetch_generated_item(player, source = "auction", preferred_type = "random") {
  if (preferred_type === "foundation") {
    return get_foundation_manual(player, get_auction_rarity(player));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(`${api_base_url}/api/generate_item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source,
        item_type: preferred_type,
        player_stage: player.stage,
        rarity: get_auction_rarity(player),
      }),
      signal: controller.signal,
    });

    if (!resp.ok) throw new Error(`generate_item request failed: ${resp.status}`);
    const item = await resp.json();
    return {
      ...item,
      type: item.type || item.item_type || "cultivation",
      foundation_qi: Number(item.foundation_qi || 0),
      foundation_meridian: Number(item.foundation_meridian || 0),
      foundation_mind: Number(item.foundation_mind || 0),
      effect_text: item.effect_text || get_item_effect_text(item),
    };
  } catch (err) {
    console.error("fetch_generated_item failed, use local fallback:", err);
    return get_local_item(player, source, preferred_type);
  } finally {
    clearTimeout(timer);
  }
}

async function maybe_fetch_action_loot(player, act_id) {
  const chance =
    act_id === "explore" ? 35 : act_id === "quest" ? 22 : act_id === "trade" ? 12 : 0;
  if (!chance || rand_int(1, 100) > chance) return null;
  return fetch_generated_item(player, act_id, "random");
}

function normalize_market_good(good, idx) {
  const asking_price = Math.max(1, Number(good.asking_price || good.price || 20));
  const true_value = Math.max(1, Number(good.true_value || asking_price));

  return {
    id: String(good.id || `market_${Date.now()}_${idx}`),
    type: String(good.type || "relic"),
    type_label: String(good.type_label || "旧物"),
    rarity: String(good.rarity || "凡阶"),
    quality: String(good.quality || "fair"),
    name: String(good.name || "无名旧物"),
    description: String(good.description || "摊位上一件来历不明的旧物。"),
    seller: String(good.seller || "摊主"),
    pitch: String(good.pitch || "道友不妨看看。"),
    clue: String(good.clue || "还需要仔细辨认。"),
    asking_price,
    true_value,
    risk: String(good.risk || "中"),
    demand: String(good.demand || "散修常用"),
    search_cost: Math.max(1, Number(good.search_cost || 8)),
    foundation_qi: Number(good.foundation_qi || 0),
    foundation_meridian: Number(good.foundation_meridian || 0),
    foundation_mind: Number(good.foundation_mind || 0),
    effect_text: good.effect_text || "",
    searched: false,
    estimate_low: null,
    estimate_high: null,
  };
}

function market_good_to_bag_item(good, purchase_price) {
  if (good.type === "foundation") {
    const item = {
      id: `market_foundation_${good.id}_${Date.now()}`,
      type: "foundation",
      type_label: "筑基功法",
      rarity: good.rarity || "凡阶",
      name: good.name,
      description: good.description,
      foundation_qi: Number(good.foundation_qi || 0),
      foundation_meridian: Number(good.foundation_meridian || 0),
      foundation_mind: Number(good.foundation_mind || 0),
      price: Math.max(1, Number(good.true_value || good.asking_price || purchase_price || 1)),
      purchase_price: Number(purchase_price || good.asking_price || 0),
      source: "market",
    };
    return {
      ...item,
      effect_text: good.effect_text || get_item_effect_text(item),
    };
  }

  return {
    id: `market_bag_${good.id}_${Date.now()}`,
    type: "trade_good",
    type_label: good.type_label || "旧物",
    rarity: good.rarity || "凡阶",
    name: good.name,
    description: good.description,
    price: Math.max(1, Number(good.true_value || good.asking_price || purchase_price || 1)),
    purchase_price: Number(purchase_price || good.asking_price || 0),
    effect_text: "坊市旧物，不能装备，可在坊市寄售换取灵石。",
    source: "market",
  };
}

function get_local_market_goods(player, game_state) {
  const rarity = get_auction_rarity(player);
  const manual = get_foundation_manual(player, rarity);
  const manual_price = Math.max(35, Math.round(manual.price * 0.82));
  const old_good = {
    id: `local_relic_${Date.now()}_${rand_int(100, 999)}`,
    type: "relic",
    type_label: "旧物",
    rarity: pick(["凡阶", "黄阶下品", "黄阶上品"]),
    quality: pick(["fair", "bargain", "risky"]),
    name: pick(["残缺玉片", "旧铜炉", "裂纹符册", "兽骨挂坠"]),
    description: "摊位上一件来历不明的旧物，灵纹浅淡，但未必没有转手价值。",
    seller: pick(["游摊散修", "旧货摊主", "外城行商"]),
    pitch: "道友眼力若好，说不定能看出门道。",
    clue: "灵纹有旧痕，价格不算离谱，但仍需谨慎估价。",
    asking_price: rand_int(24, 70),
    true_value: rand_int(35, 110),
    risk: "中",
    demand: "旧物客会收",
    search_cost: rand_int(5, 9),
  };
  const support_good = {
    id: `local_support_${Date.now()}_${rand_int(100, 999)}`,
    type: "relic",
    type_label: "旧物",
    rarity: "黄阶下品",
    quality: "fair",
    name: pick(["护脉散", "温灵符", "静心香"]),
    description: "辅助修行的小物件，拿去转手或自用都不算亏。",
    seller: pick(["药摊修士", "符铺伙计", "茶棚掮客"]),
    pitch: "冲关前后都用得上，错过未必还有。",
    clue: "需求稳定，利润不会太夸张。",
    asking_price: rand_int(18, 55),
    true_value: rand_int(28, 85),
    risk: "低",
    demand: "低阶修士常买",
    search_cost: rand_int(4, 8),
  };
  const manual_good = {
    id: `local_foundation_${Date.now()}_${rand_int(100, 999)}`,
    type: "foundation",
    type_label: "筑基功法",
    rarity: manual.rarity,
    quality: "foundation",
    name: manual.name,
    description: manual.description,
    seller: Number(game_state?.now_year || 1) >= 35 ? "天机阁外摊" : "旧书摊主",
    pitch: "练气圆满前后最抢手，真要筑基，光靠硬冲可不稳。",
    clue: `三元加成：气海 +${manual.foundation_qi}，经脉 +${manual.foundation_meridian}，道心 +${manual.foundation_mind}。`,
    asking_price: manual_price,
    true_value: manual.price,
    risk: "低",
    demand: "练气圆满修士抢购",
    search_cost: rand_int(6, 10),
    foundation_qi: manual.foundation_qi,
    foundation_meridian: manual.foundation_meridian,
    foundation_mind: manual.foundation_mind,
    effect_text: manual.effect_text,
  };

  return [manual_good, old_good, support_good].map(normalize_market_good);
}

async function fetch_market_goods(player, game_state) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);

  try {
    const resp = await fetch(`${api_base_url}/api/market_goods`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_stage: player.stage,
        spirit: player.spirit,
        fame: player.fame,
        stone: player.stone,
        year: game_state.now_year,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) throw new Error(`market_goods request failed: ${resp.status}`);
    const data = await resp.json();
    const goods = Array.isArray(data.goods) ? data.goods : [];

    if (!goods.length) throw new Error("market_goods returned empty list");
    const normalized_goods = goods.map(normalize_market_good);
    const local_foundation_good = get_local_market_goods(player, game_state)[0];
    const final_goods = Number(player.stage || 1) >= 7
      ? [local_foundation_good, ...normalized_goods].slice(0, 3)
      : normalized_goods.slice(0, 3);

    return {
      ok: true,
      goods: final_goods,
      error: "",
    };
  } catch (err) {
    console.error("fetch_market_goods failed:", err);
    return {
      ok: true,
      goods: get_local_market_goods(player, game_state),
      error:
        err?.name === "AbortError"
          ? "坊市 API 生成超时，已改用本地货物。"
          : "坊市 API 未连接，已改用本地货物。",
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalize_memory_puzzle(data, player, scene) {
  const sequence = Array.isArray(data.sequence)
    ? data.sequence.map((item) => String(item).replace(/\D/g, "").slice(0, 1)).filter(Boolean)
    : [];
  const safe_sequence = sequence.length ? sequence : ["3", "8", "1", "6"];
  const reward_exp = Math.max(1, Number(data.reward_exp || 22));
  const reward_stone = Math.max(0, Number(data.reward_stone || 12));

  return {
    id: String(data.id || `memory_${Date.now()}`),
    title: String(data.title || "神识破禁"),
    scene: String(data.scene || scene),
    description: String(data.description || "石壁上浮出一串转瞬即逝的数字灵纹。"),
    hint: String(data.hint || "记住数字，隐藏后按顺序输入。"),
    sequence: safe_sequence,
    input: [],
    reveal_ms: clamp(Number(data.reveal_ms || 3600), 1400, 7000),
    reward_exp,
    reward_stone,
    chance_gain: Math.max(0, Number(data.chance_gain || 1)),
    fail_exp: Math.max(1, Number(data.fail_exp || Math.floor(reward_exp / 3))),
    fail_hp_loss: Math.max(1, Number(data.fail_hp_loss || 10)),
    started_at: Date.now(),
    history: [
      "数字灵纹即将隐没。稳住神识，记住它们出现的顺序。",
      `你的神识为 ${player.spirit}，可辨认时间略有加成。`,
    ],
  };
}

async function fetch_memory_puzzle(player, game_state, scene) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const resp = await fetch(`${api_base_url}/api/memory_puzzle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        player_stage: player.stage,
        spirit: player.spirit,
        scene,
        year: game_state.now_year,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) throw new Error(`memory_puzzle request failed: ${resp.status}`);
    const data = await resp.json();
    return normalize_memory_puzzle(data, player, scene);
  } catch (err) {
    console.error("fetch_memory_puzzle failed, use local fallback:", err);
    return normalize_memory_puzzle(
      {
        id: `memory_fallback_${Date.now()}`,
        title: "神识破禁",
        scene,
        description: "后端暂未响应，石壁上临时浮出一串数字灵纹供你演练。",
        hint: "记住数字，隐藏后按顺序输入。",
        sequence: ["3", "8", "1", "6"],
        reveal_ms: 3600,
        reward_exp: 22,
        reward_stone: 12,
        chance_gain: 1,
        fail_exp: 7,
        fail_hp_loss: 10,
      },
      player,
      scene
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetch_auction_gongfa(player) {
  const theme = get_auction_theme();
  const rarity = get_auction_rarity(player);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(`${api_base_url}/api/auction_gongfa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        theme,
        rarity,
        player_stage: player.stage,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`auction_gongfa request failed: ${resp.status}`);
    }

    return await resp.json();
  } catch (err) {
    console.error("fetch_auction_gongfa failed, use local fallback:", err);
    return get_local_gongfa(player, theme, rarity);
  } finally {
    clearTimeout(timer);
  }
}

async function generate_ai_event_text(event_seed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const resp = await fetch(`${api_base_url}/api/event_text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event_seed),
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`event_text request failed: ${resp.status}`);
    }

    const data = await resp.json();

    return {
      title: data.title || "寻常一年",
desc: data.desc || "这一年并无惊世波澜。",
summary: data.summary || build_summary(event_seed),
    };
  } catch (err) {
    console.error("generate_ai_event_text failed:", err);

    const fallbackTitleMap = {
      cultivate: "静室吐纳",
      explore: "山中行路",
      quest: "坊市差事",
      trade: "摊前交易",
      visit: "茶馆闲谈",
      rest: "归府静养",
    };

    const fallbackDescMap = {
      cultivate: `你在${event_seed.scene}中静心吐纳，运转功法，虽无惊人顿悟，但修行本就是日积月累之事。`,
      explore: `你在${event_seed.scene}中小心前行，山路蜿蜒，四周灵气浮动，稍有不慎便可能生出变数。`,
      quest: `你在${event_seed.scene}接下一桩差事，来回奔走，总算将事情办妥。`,
      trade: `你在${event_seed.scene}与人讨价还价，真假难辨，最后总算有了结果。`,
      visit: `你在${event_seed.scene}与人谈天论道，虽无大机缘，却也并非毫无所得。`,
      rest: `你回到${event_seed.scene}静养调息，经脉与心神都稍微平稳了些。`,
    };

    return {
      title: fallbackTitleMap[event_seed.action] || "寻常一季",
      desc: fallbackDescMap[event_seed.action] || "这一季并无惊世波澜。",
      summary: build_summary(event_seed),
    };
  } finally {
    clearTimeout(timer);
  }
}

function create_battle(player, source_action, scene) {
  const base =
    player.stage * 8 +
    Math.floor(player.spirit / 2) +
    Math.floor(player.dao / 10);

  const enemy_name =
    source_action === "explore"
      ? pick(["赤纹狼妖", "山魈", "黑鳞蛇妖", "劫修散人"])
      : pick(["闹事修士", "失控妖犬", "地痞劫修", "恶客修士"]);

  const enemy_value = clamp(base + rand_int(-3, 6), 8, 120);

  const steady_value = clamp(base - 2 + rand_int(-2, 2), 1, 120);
  const normal_value = clamp(base + 2 + rand_int(-1, 3), 1, 120);
  const fierce_value = clamp(base + 9 + rand_int(0, 5), 1, 120);
  const enemy_hp = source_action === "explore" ? rand_int(72, 92) : rand_int(80, 100);

  return {
    source_action,
    scene,
    enemy_name,
    enemy_avatar: get_enemy_avatar(enemy_name, source_action),
    enemy_value,
    enemy_hp,
    enemy_max_hp: enemy_hp,
    enemy_damage: source_action === "explore" ? rand_int(7, 13) : rand_int(5, 11),
    win_hp_loss: source_action === "explore" ? rand_int(2, 8) : rand_int(1, 6),
    lose_hp_loss: source_action === "explore" ? rand_int(12, 24) : rand_int(8, 18),
    reward_exp: source_action === "explore" ? rand_int(16, 28) : rand_int(10, 20),
    reward_stone: source_action === "explore" ? rand_int(8, 20) : rand_int(18, 32),
    reward_fame: source_action === "explore" ? 1 : rand_int(2, 4),
    chance_gain: source_action === "explore" ? 1 : 0,
    choices: [
      {
        id: "steady",
        name: "稳招",
        desc: "保守试探，输了掉血更少。",
        value: steady_value,
        mpCost: 0,
        loseFactor: 0.7,
      },
      {
        id: "normal",
        name: "常招",
        desc: "中规中矩，最均衡。",
        value: normal_value,
        mpCost: 4,
        loseFactor: 1,
      },
      {
        id: "fierce",
        name: "猛招",
        desc: "数值最高，但消耗灵力，输了更痛。",
        value: fierce_value,
        mpCost: 10,
        loseFactor: 1.25,
      },
    ],
  };
}

async function generate_battle_intro_text(battle) {
  await sleep(rand_int(180, 360));

  return {
    title: pick(["遭遇斗法", "前路起杀机", "狭路相逢"]),
    desc: pick([
      `你在${battle.scene}中行进时，忽然感到一阵杀意逼近。来者竟是${battle.enemy_name}，对方气势汹汹，显然不打算与你客气。`,
      `四周灵气骤然一乱，你猛地停步，只见${battle.enemy_name}已拦在前方。眼下想全身而退，怕是只能先分个高下。`,
      `你原本还在留意四周痕迹，下一刻便被${battle.enemy_name}盯上。对方已摆出攻势，你也只能提起灵力迎战。`,
    ]),
    summary: "对方气势逼人，先出招再见真章。",
  };
}

async function generate_battle_result_text(battle, choice, victory, final_hp_loss, bonus_exp) {
  await sleep(rand_int(220, 420));

  if (victory) {
    return {
      title: pick(["斗法得胜", "压过对手", "一击制敌"]),
      desc: pick([
        `你果断施展【${choice.name}】，灵力走势恰好压过对方。${battle.enemy_name}被你这一手逼退，只得仓皇后撤，你也趁机收下了这份战果。`,
        `你出手快了半分，气机也更稳，终究在这一轮斗法中占了上风。对方被迫退去，而你则在实战中又多了几分把握。`,
        `这一招打出去时，你自己都感觉气势顺了不少。${battle.enemy_name}没能顶住，当场落了下风，这一战算你赢得漂亮。`,
      ]),
      summary: `你以 ${choice.value} 压过敌方 ${battle.enemy_value}。气血 -${final_hp_loss}，修为 +${bonus_exp}，灵石 +${battle.reward_stone}。`,
    };
  }

  return {
    title: pick(["斗法失手", "一招不敌", "被逼退却"]),
    desc: pick([
      `你虽然已经尽力，但【${choice.name}】终究没能压过对方。${battle.enemy_name}趁势逼近，你只得硬吃一击后后退，模样多少有些狼狈。`,
      `你出手稍慢了些，气机也被对方顶了回来。短暂交锋之后，你没能占到便宜，只能带着伤势先行退开。`,
      `这一轮碰撞之中，对方明显更凶。你虽未当场倒下，但经脉震得发麻，显然是吃了亏。`,
    ]),
    summary: `你以 ${choice.value} 未能压过敌方 ${battle.enemy_value}。气血 -${final_hp_loss}，但修为仍 +${bonus_exp}。`,
  };
}

function pair_key(a, b) {
  return [a, b].sort().join("-");
}

function get_puzzle_node(puzzle, node_id) {
  return puzzle.nodes.find((node) => node.id === node_id);
}

function ccw(a, b, c) {
  return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
}

function segments_cross(a, b, c, d) {
  if ([a.id, b.id].includes(c.id) || [a.id, b.id].includes(d.id)) return false;
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

function does_puzzle_line_cross(puzzle, from_id, to_id) {
  const from_node = get_puzzle_node(puzzle, from_id);
  const to_node = get_puzzle_node(puzzle, to_id);
  if (!from_node || !to_node) return false;

  return (puzzle.connections || []).some((line) => {
    const line_from = get_puzzle_node(puzzle, line.from);
    const line_to = get_puzzle_node(puzzle, line.to);
    if (!line_from || !line_to) return false;
    return segments_cross(from_node, to_node, line_from, line_to);
  });
}

function create_leyline_puzzle(player, scene) {
  const spirit_bonus = Math.floor(Number(player.spirit || 0) / 20);
  const reward_exp = rand_int(18, 32) + spirit_bonus * 3;
  const reward_stone = rand_int(8, 18) + Math.floor(Number(player.stage || 1) / 2);

  return {
    type: "leyline",
    title: "古阵连线",
    scene,
    selected: null,
    mistakes: 0,
    max_mistakes: 3,
    reward_exp,
    reward_stone,
    chance_gain: 1,
    fail_exp: Math.max(6, Math.floor(reward_exp / 3)),
    fail_hp_loss: rand_int(8, 16),
    nodes: [
      { id: "a1", label: "坎", x: 18, y: 18, tone: "blue" },
      { id: "a2", label: "坎", x: 50, y: 18, tone: "blue" },
      { id: "b1", label: "离", x: 82, y: 18, tone: "red" },
      { id: "c1", label: "震", x: 18, y: 50, tone: "green" },
      { id: "b2", label: "离", x: 82, y: 50, tone: "red" },
      { id: "c2", label: "震", x: 18, y: 82, tone: "green" },
      { id: "d1", label: "兑", x: 50, y: 82, tone: "gold" },
      { id: "d2", label: "兑", x: 82, y: 82, tone: "gold" },
    ],
    targets: [
      { from: "a1", to: "a2", label: "坎" },
      { from: "b1", to: "b2", label: "离" },
      { from: "c1", to: "c2", label: "震" },
      { from: "d1", to: "d2", label: "兑" },
    ],
    connections: [],
    history: [
      "石盘上八枚阵眼忽明忽暗，似乎要你将同名灵纹逐一接通。",
      "阵法要求很苛刻：灵脉线不能相交，错三次就会反噬。",
    ],
  };
}

function get_puzzle_target(puzzle, from_id, to_id) {
  const key = pair_key(from_id, to_id);
  return puzzle.targets.find((target) => pair_key(target.from, target.to) === key);
}

function is_puzzle_pair_connected(puzzle, from_id, to_id) {
  const key = pair_key(from_id, to_id);
  return (puzzle.connections || []).some((line) => pair_key(line.from, line.to) === key);
}

function trace_cell_id(row, col) {
  return `${row}_${col}`;
}

function get_trace_cell(trace, cell_id) {
  return (trace.cells || []).find((cell) => cell.id === cell_id);
}

function are_trace_neighbors(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function shuffle_trace_steps(steps) {
  return [...steps].sort(() => Math.random() - 0.5);
}

function get_trace_step_options([row, col], size) {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].filter(([next_row, next_col]) =>
    next_row >= 0 && next_row < size && next_col >= 0 && next_col < size
  );
}

function create_random_trace_path(size = 4) {
  const target_length = rand_int(12, size * size);
  const starts = shuffle_trace_steps(
    Array.from({ length: size * size }, (_, idx) => [
      Math.floor(idx / size),
      idx % size,
    ])
  );

  for (const start of starts) {
    const path = [start];
    const visited = new Set([trace_cell_id(start[0], start[1])]);

    function walk() {
      if (path.length >= target_length) return true;

      const current = path[path.length - 1];
      const options = shuffle_trace_steps(
        get_trace_step_options(current, size).filter(
          ([row, col]) => !visited.has(trace_cell_id(row, col))
        )
      );

      for (const next of options) {
        path.push(next);
        visited.add(trace_cell_id(next[0], next[1]));

        if (walk()) return true;

        path.pop();
        visited.delete(trace_cell_id(next[0], next[1]));
      }

      return false;
    }

    if (walk()) return path;
  }

  return [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
    [1, 2],
    [0, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [3, 2],
    [3, 1],
  ];
}

function create_trace_puzzle(player, scene) {
  const path = create_random_trace_path(4);
  const cells = path.map(([row, col], idx) => ({
    id: trace_cell_id(row, col),
    row,
    col,
    order: idx,
  }));
  const spirit_bonus = Math.floor(Number(player.spirit || 0) / 22);
  const length_bonus = Math.max(0, cells.length - 12) * 2;
  const reward_exp = rand_int(24, 42) + spirit_bonus * 3 + length_bonus;
  const reward_stone = rand_int(10, 24) + Math.floor(Number(player.stage || 1) / 2) + Math.floor(length_bonus / 2);

  return {
    type: "trace",
    title: "灵径一笔画",
    scene,
    size: 4,
    cells,
    start: cells[0].id,
    end: cells[cells.length - 1].id,
    path: [],
    mistakes: 0,
    max_mistakes: 3,
    reward_exp,
    reward_stone,
    chance_gain: 1,
    fail_exp: Math.max(7, Math.floor(reward_exp / 3)),
    fail_hp_loss: rand_int(7, 15),
    history: [
      "潮湿石壁上浮出一片灵纹格，像是某种古旧机关。",
      "从起点开始，一笔走完所有亮格，不能重复踏入同一格。",
    ],
  };
}

function is_trace_complete(trace, next_path) {
  if (next_path.length !== trace.cells.length) return false;
  return next_path[next_path.length - 1] === trace.end;
}

function create_balance_puzzle(player, scene) {
  const spirit_bonus = Math.floor(Number(player.spirit || 0) / 24);
  const channel_defs = [
    { id: "wood", label: "木脉" },
    { id: "fire", label: "火脉" },
    { id: "metal", label: "金脉" },
    { id: "water", label: "水脉" },
  ];
  const channels = channel_defs.map((channel) => {
    const target = rand_int(3, 8);
    let offset = rand_int(-3, 3);
    if (offset === 0) offset = pick([-2, -1, 1, 2]);

    return {
      ...channel,
      current: clamp(target + offset, 1, 10),
      target,
    };
  });
  const reward_exp = rand_int(22, 40) + spirit_bonus * 3;
  const reward_stone = rand_int(10, 22) + Math.floor(Number(player.stage || 1) / 2);

  return {
    type: "balance",
    title: "灵泉调息",
    scene,
    channels,
    moves_left: 11 + Math.min(3, spirit_bonus),
    max_moves: 11 + Math.min(3, spirit_bonus),
    reward_exp,
    reward_stone,
    chance_gain: 1,
    fail_exp: Math.max(7, Math.floor(reward_exp / 3)),
    fail_hp_loss: rand_int(6, 14),
    history: [
      "山涧灵泉忽然泛起四道气旋，像是在等人把灵息调到同一节拍。",
      "把每条灵脉调到目标刻度即可引出泉底灵气，步数用尽则泉眼闭合。",
    ],
  };
}

function is_balance_complete(balance) {
  return (balance.channels || []).every(
    (channel) => Number(channel.current) === Number(channel.target)
  );
}

function create_foundation_trial(player, state = null) {
  const foundation_qi = state ? get_equipped_bonus(state, "foundation_qi") : 0;
  const foundation_meridian = state ? get_equipped_bonus(state, "foundation_meridian") : 0;
  const foundation_mind = state ? get_equipped_bonus(state, "foundation_mind") : 0;
  const qi = clamp(5 + Math.floor(Number(player.mp || 0) / 24) + foundation_qi, 5, 50);
  const meridian = clamp(5 + Math.floor(Number(player.hp || 0) / 26) + foundation_meridian, 5, 50);
  const mind = clamp(5 + Math.floor(Number(player.dao || 0) / 20) + foundation_mind, 5, 50);

  return {
    type: "foundation",
    title: "筑基冲关",
    threshold: 50,
    round: 1,
    max_rounds: 10,
    decay_base: 2,
    values: {
      qi,
      meridian,
      mind,
    },
    manual_bonus: {
      qi: foundation_qi,
      meridian: foundation_meridian,
      mind: foundation_mind,
    },
    history: [
      "气海、经脉、道心三元已至临界。每回合择一法门冲关，回合末天压会递增削落三元。",
      "三元同时达到 50 即可筑基；十回合未成，则道基散乱。",
    ],
  };
}

function get_foundation_decay(foundation) {
  return Number(foundation.decay_base || 2) + Number(foundation.round || 1) - 1;
}

function get_foundation_actions(foundation) {
  const values = foundation.values || {};
  const entries = [
    ["qi", Number(values.qi || 0)],
    ["meridian", Number(values.meridian || 0)],
    ["mind", Number(values.mind || 0)],
  ];
  const [lowest] = [...entries].sort((a, b) => a[1] - b[1])[0] || ["qi", 0];

  return [
    {
      id: "gather_qi",
      name: "聚气归海",
      desc: "稳住气海，略压经脉。",
      delta: { qi: 22, meridian: -4, mind: 4 },
    },
    {
      id: "open_meridian",
      name: "冲脉开窍",
      desc: "强开经脉，心神承压。",
      delta: { qi: 5, meridian: 22, mind: -5 },
    },
    {
      id: "guard_mind",
      name: "守心凝基",
      desc: "道心上提，气海稍缓。",
      delta: { qi: -4, meridian: 5, mind: 22 },
    },
    {
      id: "threefold",
      name: "三元并进",
      desc: "三项同涨，但涨幅较稳。",
      delta: { qi: 14, meridian: 14, mind: 14 },
    },
    {
      id: "force_lowest",
      name: "逆压补缺",
      desc: "猛补最低一项，其余承压。",
      delta: {
        qi: lowest === "qi" ? 28 : -6,
        meridian: lowest === "meridian" ? 28 : -6,
        mind: lowest === "mind" ? 28 : -6,
      },
    },
  ];
}

function apply_foundation_delta(values, delta) {
  return {
    qi: clamp(Number(values.qi || 0) + Number(delta.qi || 0), 0, 45),
    meridian: clamp(Number(values.meridian || 0) + Number(delta.meridian || 0), 0, 45),
    mind: clamp(Number(values.mind || 0) + Number(delta.mind || 0), 0, 45),
  };
}

function decay_foundation_values(values, decay) {
  return {
    qi: clamp(Number(values.qi || 0) - decay, 0, 45),
    meridian: clamp(Number(values.meridian || 0) - decay, 0, 45),
    mind: clamp(Number(values.mind || 0) - decay, 0, 45),
  };
}

function is_foundation_success(foundation, values = foundation.values) {
  const threshold = Number(foundation.threshold || 30);
  return (
    Number(values.qi || 0) >= threshold &&
    Number(values.meridian || 0) >= threshold &&
    Number(values.mind || 0) >= threshold
  );
}

function create_forage_puzzle(player, scene, rich = false) {
  const total = rich ? 9 : 7;
  const target_count = rich ? 3 : 2;
  const herb_count = rich ? 5 : 4;
  const poison_count = rich ? 2 : 1;
  const indexes = Array.from({ length: total }, (_, idx) => idx);
  const shuffled = [...indexes].sort(() => Math.random() - 0.5);
  const herb_set = new Set(shuffled.slice(0, herb_count));
  const poison_set = new Set(shuffled.slice(herb_count, herb_count + poison_count));
  const spirit_bonus = Math.floor(Number(player.spirit || 0) / 18);
  const reward_exp = rand_int(rich ? 30 : 18, rich ? 52 : 34) + spirit_bonus * 2;
  const reward_stone = rand_int(rich ? 18 : 8, rich ? 38 : 20) + Math.floor(Number(player.stage || 1) / 2);

  return {
    type: "forage",
    title: "灵草采撷",
    scene,
    target_count,
    collected: 0,
    attempts: rich ? 4 : 3,
    max_attempts: rich ? 4 : 3,
    selected: null,
    qte_round: 0,
    reward_exp,
    reward_stone,
    chance_gain: rich ? 2 : 1,
    fail_exp: Math.max(6, Math.floor(reward_exp / 3)),
    fail_hp_loss: rand_int(5, 12),
    patches: indexes.map((idx) => ({
      id: `herb_${idx}`,
      kind: poison_set.has(idx) ? "poison" : herb_set.has(idx) ? "herb" : "grass",
      picked: false,
      revealed: false,
    })),
    history: [
      "灵草混在杂草之间，成熟草叶会在灵光最稳时显露药性。",
      "先点一株灵草格，再在采摘窗口内按下采摘，成功才算入篓。",
    ],
  };
}

function resolve_action(state, act_id) {
  if (state.ended) return { kind: "none", next_state: state };

  const act = act_list.find((it) => it.id === act_id);
  let player = { ...state.player };
  let logs = [...state.logs];
  let scene = act ? act.place : state.scene;
  let contacts = normalize_contacts(state.contacts);

  const event_seed = {
    action: act_id,
    scene,
    event_type: "normal",
    reward_exp: 0,
    reward_stone: 0,
    stone_loss: 0,
    reward_fame: 0,
    reward_dao: 0,
    hp_loss: 0,
    hp_gain: 0,
    mp_loss: 0,
    mp_gain: 0,
    chance_gain: 0,
    hurt_reduce: 0,
  };

  if (act_id === "cultivate") {
    const cost = rand_int(12, 24);
    const base_gain = rand_int(90, 140) + Math.floor(player.dao / 12);
    const gongfa_bonus = get_equipped_bonus(state, "speed_bonus");
    const gain = Math.floor(base_gain * (1 + gongfa_bonus));
    const mp_cost = rand_int(18, 32);

    if (player.stone < cost || player.mp < mp_cost) {
      return {
        kind: "normal",
        next_state: {
          ...state,
          scene,
          current_event: {
            title: "闭关未成",
            desc: "你本想闭关一年，却发现灵石与灵力都不太够。强行闭关只会伤身误道，只得暂且作罢。",
            summary: `需要灵石 ${cost}、灵力 ${mp_cost}。`,
          },
          event_serial: (state.event_serial || 0) + 1,
          logs: push_log(
            state.logs,
            `【闭关未成】灵石或灵力不足，无法完成这一年闭关。`
          ),
        },
        event_seed: {
          ...event_seed,
          event_type: "cultivate_fail",
        },
      };
    }

    player.stone = Math.max(0, player.stone - cost);
    player.exp += gain;
    player.mp = clamp(player.mp - mp_cost, 0, 120);

    event_seed.event_type = "cultivate";
    event_seed.reward_exp = gain;
    event_seed.stone_loss = cost;
    event_seed.mp_loss = mp_cost;
  }

  if (act_id === "explore") {
    const roll = rand_int(1, 100);

    if (roll <= 18) {
      const forage = create_forage_puzzle(player, scene, false);
      return {
        kind: "forage",
        draft_state: {
          ...state,
          scene,
          forage,
          current_event: {
            title: "灵草采撷",
            desc: "你于山脉野外行走，忽见一片灵草隐在石缝与杂草间。药性稍纵即逝，需看准灵光稳定的一瞬采下。",
            summary: "点灵草格选择目标，再在采摘窗口内点击采摘。",
          },
          event_serial: (state.event_serial || 0) + 1,
          logs: push_log(state.logs, "【灵草采撷】你发现一片可采的灵草地。"),
        },
        forage,
      };
    } else if (roll <= 36) {
      const puzzle = create_leyline_puzzle(player, scene);
      return {
        kind: "puzzle",
        draft_state: {
          ...state,
          scene,
          puzzle,
          current_event: {
            title: "古阵拦路",
            desc: "你沿着山脊寻到一处塌陷石台，石台中央刻着残破阵图。几枚阵眼尚有微光，只要接通对应灵纹，或许能引出地下残存的灵气。",
            summary: "完成连线且不要让灵脉相交，可获得额外机缘。",
          },
          event_serial: (state.event_serial || 0) + 1,
          logs: push_log(state.logs, "【古阵拦路】你发现一座残破阵图，准备尝试接通灵脉。"),
        },
        puzzle,
      };
    } else if (roll <= 54) {
      const trace = create_trace_puzzle(player, scene);
      return {
        kind: "trace",
        draft_state: {
          ...state,
          scene,
          trace,
          current_event: {
            title: "灵径浮现",
            desc: "你在山壁裂隙间发现一片泛光灵纹。光路只允许一次成形，若能从起点一笔走到终点，也许能打开下方暗藏的灵气节点。",
            summary: "从起点开始，一笔走完所有亮格，不可重复。",
          },
          event_serial: (state.event_serial || 0) + 1,
          logs: push_log(state.logs, "【灵径一笔画】你发现一处需要一笔走完的灵纹机关。"),
        },
        trace,
      };
    } else if (roll <= 70) {
      return {
        kind: "memory_seed",
        draft_state: {
          ...state,
          scene,
        },
      };
    } else if (roll <= 86) {
      const balance = create_balance_puzzle(player, scene);
      return {
        kind: "balance",
        draft_state: {
          ...state,
          scene,
          balance,
          current_event: {
            title: "灵泉调息",
            desc: "你穿过山石缝隙，见一眼灵泉在暗处吐纳。泉面浮着四道气旋，只要将气机调到对应刻度，便能引出泉底积蓄的灵气。",
            summary: "把四脉调到目标刻度，步数用尽前完成。",
          },
          event_serial: (state.event_serial || 0) + 1,
          logs: push_log(state.logs, "【灵泉调息】你发现一处需要调和四脉的灵泉机关。"),
        },
        balance,
      };
    } else if (roll <= 96) {
      const battle = create_battle(player, "explore", scene);
      return {
        kind: "battle",
        draft_state: {
          ...state,
          scene,
        },
        battle,
      };
    } else {
      const forage = create_forage_puzzle(player, scene, true);
      return {
        kind: "forage",
        draft_state: {
          ...state,
          scene,
          forage,
          current_event: {
            title: "灵草丰地",
            desc: "你循着一缕清甜药香找到一处湿润石台，数株灵草正映着晨露吐纳。此处药性更盛，也更容易引来毒草伪装。",
            summary: "采够目标灵草可获得更高奖励。",
          },
          event_serial: (state.event_serial || 0) + 1,
          logs: push_log(state.logs, "【灵草丰地】你发现一处药性更盛的灵草地。"),
        },
        forage,
      };
    }
  }

  if (act_id === "quest") {
    const roll = rand_int(1, 100);

    if (roll <= 25) {
      const battle = create_battle(player, "quest", scene);
      return {
        kind: "battle",
        draft_state: {
          ...state,
          scene,
        },
        battle,
      };
    } else {
      const gain_stone = rand_int(18, 36);
      const gain_fame = rand_int(2, 5);
      const gain_exp = rand_int(8, 20);

      player.stone += gain_stone;
      player.fame += gain_fame;
      player.exp += gain_exp;

      event_seed.event_type = "quest_safe";
      event_seed.reward_stone = gain_stone;
      event_seed.reward_fame = gain_fame;
      event_seed.reward_exp = gain_exp;
    }
  }

  if (act_id === "trade") {
    const roll = rand_int(1, 100);

    if (roll <= 65) {
      const gain = rand_int(15, 35);
      player.stone += gain;

      event_seed.event_type = "trade_profit";
      event_seed.reward_stone = gain;
    } else {
      const lose = rand_int(10, 25);
      player.stone = Math.max(0, player.stone - lose);

      event_seed.event_type = "trade_loss";
      event_seed.stone_loss = lose;
    }
  }

  if (act_id === "visit") {
    const gain_dao = rand_int(4, 10);
    const gain_fame = rand_int(1, 3);
    const contact_result = meet_or_improve_contact(contacts, state.now_year);

    player.dao = clamp(player.dao + gain_dao, 0, 100);
    player.fame += gain_fame;
    contacts = contact_result.contacts;
    logs = push_log(logs, `【人脉】${contact_result.line}`);

    event_seed.reward_dao = gain_dao;
    event_seed.reward_fame = gain_fame;

    if (rand_int(1, 100) <= 30) {
      player.chance += 1;
      event_seed.event_type = "visit_clue";
      event_seed.chance_gain = 1;
    } else {
      event_seed.event_type = "visit_talk";
    }
  }

  if (act_id === "rest") {
    const gain_hp = rand_int(16, 30);
    const gain_mp = rand_int(12, 28);
    const reduce_hurt = Math.min(2, player.hurt);

    player.hp = clamp(player.hp + gain_hp, 0, 120);
    player.mp = clamp(player.mp + gain_mp, 0, 120);
    player.hurt = clamp(player.hurt - 2, 0, 10);

    event_seed.event_type = "rest";
    event_seed.hp_gain = gain_hp;
    event_seed.mp_gain = gain_mp;
    event_seed.hurt_reduce = reduce_hurt;
  }

  const r1 = maybe_breakthrough(player, logs);
  player = r1.player;
  logs = r1.logs;

  let next_state = {
    ...state,
    player,
    logs,
    scene,
    contacts,
  };

  next_state = finalize_one_year(next_state, true);

  return {
    kind: "normal",
    next_state,
    event_seed,
  };
}

function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-row-label">{label}</span>
      <span className="stat-row-value">{value}</span>
    </div>
  );
}

function ActionButton({ item, onClick, disabled }) {
  return (
    <button className="menu-btn" onClick={onClick} disabled={disabled}>
      <span>{item.name}</span>
      <span className="menu-btn-arrow">›</span>
    </button>
  );
}

function WorldMap({ game, loading, onAction, onAuction, onSkipTournament }) {
  const blocked = loading || game.ended;
  const markers = [
    {
      id: "cave_cultivate",
      icon: "府",
      image: "/scenes/dongfu.png",
      title: "简陋洞府",
      action: "闭关修炼",
      desc: "消耗灵石与灵力，专心提升修为。",
      x: 12,
      y: 60,
      scene: "洞府静室",
      onClick: () => onAction("cultivate"),
    },
    {
      id: "cave_rest",
      icon: "息",
      image: "/scenes/dongfu.png",
      title: "静室卧榻",
      action: "静养调息",
      desc: "恢复气血灵力，缓解伤势。",
      x: 22,
      y: 78,
      scene: "简陋洞府",
      onClick: () => onAction("rest"),
    },
    {
      id: "mountain",
      icon: "山",
      image: "/scenes/shanmai.png",
      title: "外山灵脉",
      action: "外出探索",
      desc: "可能遇到灵径、古阵、禁制或斗法。",
      x: 24,
      y: 21,
      scene: "山脉野外",
      onClick: () => onAction("explore"),
    },
    {
      id: "market",
      icon: "市",
      image: "/scenes/fangshi.png",
      title: "武陵坊市",
      action: "坊市经营",
      desc: "扫货倒手，也可寄售背包物品。",
      x: 67,
      y: 57,
      scene: "坊市摊位",
      onClick: () => onAction("trade"),
    },
    {
      id: "notice",
      icon: "榜",
      image: "/scenes/gaoshilan.png",
      title: "委托堂",
      action: "接取委托",
      desc: "接悬赏、跑委托，常有战斗与报酬。",
      x: 62,
      y: 34,
      scene: "委托堂",
      aliases: ["坊市告示栏"],
      onClick: () => onAction("quest"),
    },
    {
      id: "tea",
      icon: "茶",
      image: "/scenes/chaguan.png",
      title: "茶馆雅间",
      action: "拜访修士",
      desc: "结识人脉，论道打听消息。",
      x: 73,
      y: 74,
      scene: "茶馆雅间",
      onClick: () => onAction("visit"),
    },
    {
      id: "auction",
      icon: "拍",
      image: "/scenes/fangshi.png",
      title: "拍卖楼",
      action: "进入拍卖会",
      desc: "竞拍功法、武器与技能。",
      x: 83,
      y: 48,
      scene: "坊市拍卖会",
      onClick: onAuction,
    },
  ];

  return (
    <div className="world-map-box">
      <div className="world-map-head">
        <div>
          <div className="world-map-title">武陵城大地图</div>
          <div className="world-map-subtitle">
            点击地图上的建筑或地标行动。外山会触发探索小游戏，坊市可买卖倒手。
          </div>
        </div>
        <div className="world-map-badge">{game.scene}</div>
      </div>

      {loading ? <div className="map-status">正在推演事件，请稍候……</div> : null}

      <div className="world-map">
        <div className="map-region map-mountains">外山</div>
        <div className="map-region map-city">武陵城</div>
        <div className="map-region map-river">灵溪</div>
        <div className="map-road road-a" />
        <div className="map-road road-b" />
        <div className="map-road road-c" />

        {markers.map((marker) => {
          const active = game.scene === marker.scene || marker.aliases?.includes(game.scene);

          return (
            <button
              key={marker.id}
              type="button"
              className={`map-marker ${active ? "active" : ""}`}
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              onClick={marker.onClick}
              disabled={blocked}
              aria-label={`${marker.title}${marker.action}`}
            >
              <span className="map-marker-art">
                <img src={marker.image} alt="" />
                <span className="map-marker-icon">{marker.icon}</span>
              </span>
              <span className="map-marker-text">
                <strong>{marker.title}</strong>
                <em>{marker.action}</em>
              </span>
              <span className="map-marker-tip">{marker.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="map-quick-actions">
        <button
          className="mini-btn"
          onClick={() => onSkipTournament(false)}
          disabled={blocked}
        >
          抵达天机大比
        </button>
        <button
          className="mini-btn"
          onClick={() => onSkipTournament(true)}
          disabled={blocked}
        >
          满级大比
        </button>
      </div>
    </div>
  );
}

function AuctionPanel({ auction, player, loading, onBid, onPass }) {
  const item = auction.item;
  const can_bid = player.stone >= auction.next_bid;
  const item_label = get_item_type_label(item.type);

  return (
    <div className="auction-box">
      <div className="auction-head">
        <div>
          <div className="auction-title">坊市拍卖会</div>
          <div className="auction-subtitle">
            正在拍卖：{item.rarity}功法《{item.name}》
          </div>
        </div>

        <div className="auction-price">
          当前价：{auction.current_price} 灵石
        </div>
      </div>

      <div className="auction-item">
        <div className="gongfa-card-head">
          <div>
            <div className="gongfa-name">《{item.name}》</div>
            <div className="gongfa-rarity">{item.rarity}</div>
          </div>

          <div className="gongfa-bonus-box">
  {Number(item.speed_bonus || 0) > 0 && (
    <div className="gongfa-bonus">
      修炼 +{(Number(item.speed_bonus || 0) * 100).toFixed(0)}%
    </div>
  )}

  {Number(item.damage_bonus || 0) > 0 && (
    <div className="gongfa-bonus">
      伤害 +{(Number(item.damage_bonus || 0) * 100).toFixed(0)}%
    </div>
  )}
</div>
        </div>

        <div className="gongfa-desc">{item.description}</div>

        <div className="auction-meta">
          你的灵石：{player.stone} ｜ 下一次出价：{auction.next_bid} ｜ 竞争者：{auction.npc_name}
<br />
功法效果：{item.effect_text || "暂无明显加成"}
        </div>
      </div>

      <div className="auction-history">
        {auction.history.map((line, idx) => (
          <div className="auction-history-line" key={idx}>
            {line}
          </div>
        ))}
      </div>

      <div className="auction-actions">
        <button
          className="menu-btn feature-btn"
          onClick={onBid}
          disabled={loading || !can_bid}
        >
          <span>
            {can_bid ? `出价 ${auction.next_bid} 灵石` : "灵石不足"}
          </span>
          <span className="menu-btn-arrow">+</span>
        </button>

        <button
          className="menu-btn"
          onClick={onPass}
          disabled={loading}
        >
          <span>放弃竞价</span>
          <span className="menu-btn-arrow">×</span>
        </button>
      </div>
    </div>
  );
}

function PuzzlePanel({ puzzle, loading, onNodeClick, onReset, onGiveUp }) {
  const selected_node = puzzle.selected ? get_puzzle_node(puzzle, puzzle.selected) : null;

  return (
    <div className="puzzle-box">
      <div className="puzzle-head">
        <div>
          <div className="puzzle-title">{puzzle.title}</div>
          <div className="puzzle-subtitle">
            点击一个阵眼，再点击同名阵眼完成连接。灵脉线不能相交。
          </div>
        </div>
        <div className="puzzle-counter">
          失误 {puzzle.mistakes} / {puzzle.max_mistakes}
        </div>
      </div>

      <div className="puzzle-layout">
        <div className="puzzle-board" aria-label="古阵连线石盘">
          <svg className="puzzle-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {(puzzle.connections || []).map((line) => {
              const from = get_puzzle_node(puzzle, line.from);
              const to = get_puzzle_node(puzzle, line.to);
              if (!from || !to) return null;

              return (
                <line
                  key={pair_key(line.from, line.to)}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={`puzzle-line tone-${from.tone}`}
                />
              );
            })}

            {selected_node ? (
              <circle
                cx={selected_node.x}
                cy={selected_node.y}
                r="6.2"
                className="puzzle-selected-ring"
              />
            ) : null}
          </svg>

          {puzzle.nodes.map((node) => {
            const is_selected = puzzle.selected === node.id;
            const is_connected = (puzzle.connections || []).some(
              (line) => line.from === node.id || line.to === node.id
            );

            return (
              <button
                key={node.id}
                type="button"
                className={`puzzle-node tone-${node.tone} ${is_selected ? "selected" : ""} ${is_connected ? "connected" : ""}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onClick={() => onNodeClick(node.id)}
                disabled={loading}
                title={`${node.label}阵眼`}
              >
                {node.label}
              </button>
            );
          })}
        </div>

        <div className="puzzle-side">
          <div className="puzzle-goals">
            {puzzle.targets.map((target) => {
              const done = is_puzzle_pair_connected(puzzle, target.from, target.to);

              return (
                <div className={`puzzle-goal ${done ? "done" : ""}`} key={pair_key(target.from, target.to)}>
                  <span>{target.label}纹</span>
                  <strong>{done ? "已接通" : "待接通"}</strong>
                </div>
              );
            })}
          </div>

          <div className="puzzle-history">
            {(puzzle.history || []).map((line, idx) => (
              <div className="puzzle-history-line" key={idx}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="puzzle-actions">
        <button className="menu-btn" onClick={onReset} disabled={loading}>
          <span>重置连线</span>
          <span className="menu-btn-arrow">↺</span>
        </button>
        <button className="menu-btn" onClick={onGiveUp} disabled={loading}>
          <span>撤离古阵</span>
          <span className="menu-btn-arrow">×</span>
        </button>
      </div>
    </div>
  );
}

function MarketPanel({ market, player, bag, loading, onSearch, onBuy, onResell, onKeep, onLeave, onRetry, onSell }) {
  const [selected_id, set_selected_id] = useState(market.goods[0]?.id || "");
  const selected_good =
    market.goods.find((good) => good.id === selected_id) || market.goods[0];
  const bag_items = Array.isArray(bag) ? bag : [];
  const holding = market.holding || null;

  useEffect(() => {
    if (!market.goods.some((good) => good.id === selected_id)) {
      set_selected_id(market.goods[0]?.id || "");
    }
  }, [market.goods, selected_id]);

  const selected_index = Math.max(
    0,
    market.goods.findIndex((good) => good.id === selected_good?.id)
  );
  const can_buy = !holding && selected_good && player.stone >= selected_good.asking_price;
  const can_search =
    !holding && selected_good && player.mp >= selected_good.search_cost && !selected_good.searched;

  return (
    <div className="market-box">
      <div className="market-head">
        <div>
          <div className="market-title">坊市经营</div>
          <div className="market-subtitle">
            今日摊位货由 API 生成。可选货倒手，也可把储物袋里的东西卖出去。
          </div>
        </div>
        <div className="market-wallet">灵石 {player.stone}</div>
      </div>

      {market.api_error ? (
        <div className="market-api-error">
          <div>
            <strong>API 未连接</strong>
            <span>{market.api_error}</span>
          </div>
          <button className="mini-btn" onClick={onRetry} disabled={loading}>
            重试生成
          </button>
        </div>
      ) : null}

      <div className="market-stage">
        <div className="market-scan">
          <div className="market-scan-head">
            <span>摊位扫货</span>
            <strong>{selected_good ? `${selected_index + 1} / ${market.goods.length}` : "0 / 0"}</strong>
          </div>

          {market.goods.length ? (
            <div className="market-list">
              {market.goods.map((good, idx) => (
                <button
                  key={good.id}
                  type="button"
                  className={`market-list-row ${selected_good?.id === good.id ? "active" : ""}`}
                  onClick={() => set_selected_id(good.id)}
                  disabled={loading}
                >
                  <span className="market-list-no">{idx + 1}</span>
                  <span className="market-list-main">
                    <strong>《{good.name}》</strong>
                    <em>
                      {good.searched
                        ? `${good.type_label} · 估价 ${good.estimate_low}-${good.estimate_high}`
                        : `${good.type_label} · 摊主自称${good.rarity}`}
                    </em>
                  </span>
                  <span className={good.searched ? "market-list-state known" : "market-list-state"}>
                    {good.searched ? "已探" : "未探"}
                  </span>
                  <span className="market-list-price">要价 {good.asking_price}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="market-empty">
              后端未返回货物。启动 API 后点“重试生成”。
            </div>
          )}
        </div>

        {holding ? (
          <div className="market-detail market-holding">
            <div className="market-card-head">
              <div>
                <div className="market-good-name">《{holding.good.name}》</div>
                <div className="market-good-meta">
                  已买下 · 成本 {holding.good.asking_price} 灵石 · {holding.good.type_label}
                </div>
              </div>
              <div className="market-price">{holding.offer_price} 灵石</div>
            </div>

            <div className="market-seller">
              <strong>{holding.buyer_name}</strong>
              <span>{holding.buyer_pitch}</span>
            </div>

            <div className="market-desc">
              你已经把《{holding.good.name}》买到手。眼前这位买主愿意出 {holding.offer_price} 灵石收走，
              {holding.profit >= 0 ? `卖掉可净赚 ${holding.profit} 灵石。` : `卖掉会净亏 ${Math.abs(holding.profit)} 灵石。`}
            </div>

            <div className="market-tags">
              <span>成本 {holding.good.asking_price}</span>
              <span>收购价 {holding.offer_price}</span>
              <span>{holding.profit >= 0 ? `可赚 ${holding.profit}` : `会亏 ${Math.abs(holding.profit)}`}</span>
            </div>

            <div className="market-clue">
              不卖也可以把货带走，之后在坊市寄售里普通卖出或加急寻找买主。
            </div>

            <div className="market-actions">
              <button className="mini-btn" onClick={onKeep} disabled={loading}>
                带走入袋
              </button>
              <button className="mini-btn" onClick={onResell} disabled={loading}>
                卖给买主 +{holding.offer_price}
              </button>
            </div>
          </div>
        ) : selected_good ? (
          <div className="market-detail">
            <div className="market-card-head">
              <div>
                <div className="market-good-name">《{selected_good.name}》</div>
                <div className="market-good-meta">
                  {selected_good.searched
                    ? `${selected_good.rarity} · ${selected_good.type_label} · 风险 ${selected_good.risk}`
                    : `${selected_good.type_label} · 摊主自称${selected_good.rarity} · 尚未辨明`}
                </div>
              </div>
              <div className="market-price">{selected_good.asking_price} 灵石</div>
            </div>

            <div className="market-seller">
              <strong>{selected_good.seller}</strong>
              <span>{selected_good.pitch}</span>
            </div>

            <div className="market-desc">{selected_good.description}</div>

            <div className="market-tags">
              {selected_good.searched ? (
                <>
                  <span>估价 {selected_good.estimate_low} - {selected_good.estimate_high}</span>
                  <span>风险 {selected_good.risk}</span>
                  <span>{selected_good.demand}</span>
                </>
              ) : (
                <>
                  <span>未搜消息</span>
                  <span>信息不全</span>
                </>
              )}
            </div>

            {selected_good.searched ? (
              <div className="market-clue">{selected_good.clue}</div>
            ) : null}

            <div className="market-actions">
              <button
                className="mini-btn"
                onClick={() => onSearch(selected_good.id)}
                disabled={loading || !can_search}
              >
                {selected_good.searched
                  ? "已搜"
                  : can_search
                    ? `搜消息 -${selected_good.search_cost} 灵力`
                    : "灵力不足"}
              </button>
              <button
                className="mini-btn"
                onClick={() => onBuy(selected_good.id)}
                disabled={loading || !can_buy}
              >
                {can_buy ? "买下" : "灵石不足"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="market-sell-panel">
        <div className="market-scan-head">
          <span>储物袋寄售</span>
          <strong>{bag_items.length}</strong>
        </div>

        {bag_items.length ? (
          <div className="market-sell-list">
            {bag_items.map((item) => {
              const urgent_estimate = get_urgent_sell_estimate(item, player);
              const urgent_cost = get_urgent_sell_cost(item);
              const can_urgent = player.mp >= urgent_cost;

              return (
                <div className="market-sell-card" key={item.id}>
                  <div className="market-card-head">
                    <div>
                      <div className="market-good-name">《{item.name}》</div>
                      <div className="market-good-meta">
                        {item.rarity} · {get_item_type_label(item.type)} · {get_item_effect_text(item)}
                      </div>
                    </div>
                    <div className="market-price">{get_normal_sell_price(item)} 灵石</div>
                  </div>

                  <div className="market-sell-meta">
                    <span>普通收货 {get_normal_sell_price(item)} 灵石</span>
                    <span>
                      加急预估 {urgent_estimate[0]} - {urgent_estimate[1]} 灵石
                    </span>
                    <span>消耗 {urgent_cost} 灵力</span>
                  </div>

                  <div className="market-actions">
                    <button
                      className="mini-btn"
                      onClick={() => onSell(item.id, "normal")}
                      disabled={loading}
                    >
                      普通卖出
                    </button>
                    <button
                      className="mini-btn"
                      onClick={() => onSell(item.id, "urgent")}
                      disabled={loading || !can_urgent}
                    >
                      {can_urgent ? "加急寻找" : "灵力不足"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="market-empty">
            储物袋里没有可寄售的东西。先去探索、拍卖或倒手攒点货。
          </div>
        )}
      </div>

      <div className="market-history">
        {(market.history || []).map((line, idx) => (
          <div className="market-history-line" key={idx}>
            {line}
          </div>
        ))}
      </div>

      <button className="menu-btn" onClick={onLeave} disabled={loading}>
        <span>撤出坊市</span>
        <span className="menu-btn-arrow">×</span>
      </button>
    </div>
  );
}

function SocialPanel({ contacts, player, year, loading, actionDisabled, onVisit, onGift, onHelp, onDebate, onTrade }) {
  const views = normalize_contacts(contacts).map(get_contact_view);
  const met_ids = new Set(views.map((contact) => contact.id));
  const locked_views = contact_templates
    .filter((tpl) => !met_ids.has(tpl.id))
    .map((tpl) => ({
      ...tpl,
      locked: Number(tpl.unlock_year || 1) > Number(year || 1),
    }));

  return (
    <div className="social-board">
      <div className="social-head">
        <div>
          <div className="social-title">茶馆人脉</div>
          <div className="social-subtitle">
            主线推进会解锁新人物；结识后可送礼、论道、交易或请托。
          </div>
        </div>
        <button className="mini-btn" onClick={onVisit} disabled={actionDisabled}>
          去茶馆结交
        </button>
      </div>

      <div className="contact-grid">
        {views.map((contact) => {
          const gift_cost = 10 + Math.floor(contact.relation / 20) * 4;
          const can_gift = player.stone >= gift_cost && player.mp >= 6 && !loading;
          const can_help = contact.relation >= 25 && contact.favor > 0 && !loading;

          return (
            <div className="contact-card" key={contact.id}>
              <div className="contact-card-head">
                <div className="contact-identity">
                  <img className="contact-avatar" src={contact.avatar} alt={contact.name} />
                  <div>
                    <div className="contact-name">【{contact.name}】</div>
                    <div className="contact-role">{contact.role} · {get_contact_level(contact.relation)}</div>
                  </div>
                </div>
                <div className="contact-favor">人情 {contact.favor}</div>
              </div>

              <div className="contact-desc">{contact.desc}</div>

              <div className="contact-meter">
                <div style={{ width: `${contact.relation}%` }} />
              </div>

              <div className="contact-meta">
                <span>关系 {contact.relation} / 100</span>
                <span>{contact.help}</span>
              </div>

              <div className="contact-actions">
                <button
                  className="mini-btn"
                  onClick={() => onDebate(contact.id)}
                  disabled={actionDisabled || loading || player.mp < 8}
                >
                  论道 -8 灵力
                </button>
                <button
                  className="mini-btn"
                  onClick={() => onTrade(contact.id)}
                  disabled={actionDisabled || loading || player.stone < 12}
                >
                  {contact.trade}
                </button>
                <button
                  className="mini-btn"
                  onClick={() => onGift(contact.id)}
                  disabled={actionDisabled || !can_gift}
                >
                  送礼 -{gift_cost} 灵石
                </button>
                <button
                  className="mini-btn"
                  onClick={() => onHelp(contact.id)}
                  disabled={actionDisabled || !can_help}
                >
                  请托办事
                </button>
              </div>
            </div>
          );
        })}

        {locked_views.map((contact) => (
          <div className={`contact-card ${contact.locked ? "locked" : ""}`} key={contact.id}>
            <div className="contact-card-head">
              <div className="contact-identity">
                <img
                  className={`contact-avatar ${contact.locked ? "mystery" : ""}`}
                  src={contact.locked ? get_stable_npc_avatar(contact.id) : contact.avatar}
                  alt={contact.locked ? "未识修士" : contact.name}
                />
                <div>
                  <div className="contact-name">
                    {contact.locked ? "未识修士" : `【${contact.name}】`}
                  </div>
                  <div className="contact-role">
                    {contact.locked ? `第 ${contact.unlock_year} 年后可能出现` : `${contact.role} · 尚未结识`}
                  </div>
                </div>
              </div>
              <div className="contact-favor">{contact.locked ? "未解锁" : "可拜访"}</div>
            </div>

            <div className="contact-desc">
              {contact.locked
                ? "时机未到，此人尚未进入你的修行圈。"
                : `${contact.desc} 去茶馆拜访时，有机会与此人结识。`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TracePanel({ trace, loading, onCellClick, onReset, onGiveUp }) {
  const visited = new Set(trace.path || []);
  const current = trace.path?.[trace.path.length - 1] || "";

  return (
    <div className="trace-box">
      <div className="trace-head">
        <div>
          <div className="trace-title">{trace.title}</div>
          <div className="trace-subtitle">
            从起点出发，一笔走完所有亮格，不能重复。
          </div>
        </div>
        <div className="trace-counter">
          失误 {trace.mistakes} / {trace.max_mistakes}
        </div>
      </div>

      <div className="trace-layout">
        <div className="trace-board" style={{ gridTemplateColumns: `repeat(${trace.size}, 1fr)` }}>
          {Array.from({ length: trace.size * trace.size }).map((_, idx) => {
            const row = Math.floor(idx / trace.size);
            const col = idx % trace.size;
            const cell_id = trace_cell_id(row, col);
            const cell = get_trace_cell(trace, cell_id);
            const active = Boolean(cell);
            const is_start = trace.start === cell_id;
            const is_end = trace.end === cell_id;
            const is_visited = visited.has(cell_id);
            const is_current = current === cell_id;
            const order = trace.path.indexOf(cell_id);

            return (
              <button
                key={cell_id}
                type="button"
                className={`trace-cell ${active ? "active" : ""} ${is_start ? "start" : ""} ${is_end ? "end" : ""} ${is_visited ? "visited" : ""} ${is_current ? "current" : ""}`}
                onClick={() => onCellClick(cell_id)}
                disabled={loading || !active}
              >
                {is_visited ? order + 1 : is_start ? "起" : is_end ? "终" : ""}
              </button>
            );
          })}
        </div>

        <div className="trace-side">
          <div className="trace-stat">
            <span>已走</span>
            <strong>{trace.path.length} / {trace.cells.length}</strong>
          </div>
          <div className="trace-stat">
            <span>奖励</span>
            <strong>修为 {trace.reward_exp} · 灵石 {trace.reward_stone}</strong>
          </div>
          <div className="trace-history">
            {(trace.history || []).map((line, idx) => (
              <div className="trace-history-line" key={idx}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="trace-actions">
        <button className="menu-btn" onClick={onReset} disabled={loading || !trace.path.length}>
          <span>重置路线</span>
          <span className="menu-btn-arrow">↺</span>
        </button>
        <button className="menu-btn" onClick={onGiveUp} disabled={loading}>
          <span>离开灵径</span>
          <span className="menu-btn-arrow">×</span>
        </button>
      </div>
    </div>
  );
}

function BalancePanel({ balance, loading, onAdjust, onReset, onGiveUp }) {
  return (
    <div className="balance-box">
      <div className="balance-head">
        <div>
          <div className="balance-title">{balance.title}</div>
          <div className="balance-subtitle">
            将四条灵脉调到目标刻度，步数用尽前完成调息。
          </div>
        </div>
        <div className="balance-counter">
          剩余步数 {balance.moves_left} / {balance.max_moves}
        </div>
      </div>

      <div className="balance-layout">
        <div className="balance-channels">
          {balance.channels.map((channel) => {
            const delta = Number(channel.current) - Number(channel.target);
            const done = delta === 0;

            return (
              <div className={`balance-channel ${done ? "done" : ""}`} key={channel.id}>
                <div className="balance-channel-head">
                  <strong>{channel.label}</strong>
                  <span>{done ? "已调和" : delta > 0 ? `高 ${delta}` : `低 ${Math.abs(delta)}`}</span>
                </div>
                <div className="balance-meter">
                  <div className="balance-target" style={{ left: `${channel.target * 10}%` }} />
                  <div className="balance-current" style={{ width: `${channel.current * 10}%` }} />
                </div>
                <div className="balance-values">
                  <span>当前 {channel.current}</span>
                  <span>目标 {channel.target}</span>
                </div>
                <div className="balance-channel-actions">
                  <button
                    className="mini-btn"
                    type="button"
                    onClick={() => onAdjust(channel.id, -1)}
                    disabled={loading || channel.current <= 1 || balance.moves_left <= 0}
                  >
                    降一息
                  </button>
                  <button
                    className="mini-btn"
                    type="button"
                    onClick={() => onAdjust(channel.id, 1)}
                    disabled={loading || channel.current >= 10 || balance.moves_left <= 0}
                  >
                    升一息
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="balance-side">
          <div className="balance-stat">
            <span>奖励</span>
            <strong>修为 {balance.reward_exp} · 灵石 {balance.reward_stone}</strong>
          </div>
          <div className="balance-history">
            {(balance.history || []).map((line, idx) => (
              <div className="balance-history-line" key={idx}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="balance-actions">
        <button className="menu-btn" onClick={onReset} disabled={loading}>
          <span>重新感气</span>
          <span className="menu-btn-arrow">↺</span>
        </button>
        <button className="menu-btn" onClick={onGiveUp} disabled={loading}>
          <span>离开灵泉</span>
          <span className="menu-btn-arrow">×</span>
        </button>
      </div>
    </div>
  );
}

function FoundationPanel({ foundation, loading, onAction }) {
  const labels = {
    qi: "气海",
    meridian: "经脉",
    mind: "道心",
  };
  const values = foundation.values || {};
  const threshold = Number(foundation.threshold || 30);
  const decay = get_foundation_decay(foundation);
  const actions = get_foundation_actions(foundation);
  const fx_class = foundation.fx?.type ? `fx-${foundation.fx.type}` : "";

  return (
    <div className={`foundation-box ${fx_class}`} key={foundation.fx?.key || "foundation"}>
      <div className="foundation-head">
        <div>
          <div className="foundation-title">{foundation.title}</div>
          <div className="foundation-subtitle">
            每回合择一法门冲关；若三元同时达到 {threshold}，即可筑基。
          </div>
        </div>
        <div className="foundation-counter">
          第 {foundation.round} / {foundation.max_rounds} 回合 · 天压 -{decay}
        </div>
      </div>

      <div className="foundation-guide">
        <div>
          <strong>玩法</strong>
          <span>每回合选一个法门，先获得三元涨跌，再承受天压削落。</span>
        </div>
        <div>
          <strong>目标</strong>
          <span>气海、经脉、道心同时到达 {threshold} 即可筑基。</span>
        </div>
        <div>
          <strong>准备</strong>
          <span>拍卖会或坊市买到筑基功法，会提高开局三元。</span>
        </div>
      </div>

      {foundation.fx?.line ? (
        <div className="foundation-fx-line">{foundation.fx.line}</div>
      ) : null}

      <div className="foundation-layout">
        <div className="foundation-meters">
          <div className="foundation-manual">
            功法加成：气海 +{Number(foundation.manual_bonus?.qi || 0)} · 经脉 +{Number(foundation.manual_bonus?.meridian || 0)} · 道心 +{Number(foundation.manual_bonus?.mind || 0)}
          </div>
          {["qi", "meridian", "mind"].map((key) => {
            const value = Number(values[key] || 0);
            const percent = clamp((value / threshold) * 100, 0, 100);
            return (
              <div className="foundation-meter-card" key={key}>
                <div className="foundation-meter-head">
                  <strong>{labels[key]}</strong>
                  <span>{value} / {threshold}</span>
                </div>
                <div className="foundation-meter">
                  <div style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="foundation-actions">
          {actions.map((action) => (
            <button
              className="foundation-action"
              type="button"
              key={action.id}
              onClick={() => onAction(action.id)}
              disabled={loading || foundation.resolving}
            >
              <div className="foundation-action-head">
                <strong>{action.name}</strong>
                <span>{action.desc}</span>
              </div>
              <div className="foundation-deltas">
                <span>气海 {action.delta.qi >= 0 ? "+" : ""}{action.delta.qi}</span>
                <span>经脉 {action.delta.meridian >= 0 ? "+" : ""}{action.delta.meridian}</span>
                <span>道心 {action.delta.mind >= 0 ? "+" : ""}{action.delta.mind}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="foundation-history">
        {(foundation.history || []).map((line, idx) => (
          <div className="foundation-history-line" key={idx}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function ForagePanel({ forage, loading, onSelect, onHarvest, onGiveUp }) {
  const [qte_pos, set_qte_pos] = useState(0);
  const qte_dir_ref = useRef(1);
  const selected_patch = forage.patches.find((patch) => patch.id === forage.selected);
  const window_start = selected_patch ? 42 : 0;
  const window_width = selected_patch ? 24 : 0;

  useEffect(() => {
    if (!forage.selected) {
      set_qte_pos(0);
      qte_dir_ref.current = 1;
      return undefined;
    }

    set_qte_pos(0);
    qte_dir_ref.current = 1;
    const timer = setInterval(() => {
      set_qte_pos((prev) => {
        let next = prev + qte_dir_ref.current * 2.8;
        if (next >= 100) {
          next = 100;
          qte_dir_ref.current = -1;
        } else if (next <= 0) {
          next = 0;
          qte_dir_ref.current = 1;
        }
        return next;
      });
    }, 48);

    return () => clearInterval(timer);
  }, [forage.selected, forage.qte_round]);

  return (
    <div className="forage-box">
      <div className="forage-head">
        <div>
          <div className="forage-title">{forage.title}</div>
          <div className="forage-subtitle">
            点选草格，再在灵光进入采摘窗口时点击采摘。
          </div>
        </div>
        <div className="forage-counter">
          {forage.collected} / {forage.target_count} ｜ 机会 {forage.attempts}
        </div>
      </div>

      <div className="forage-layout">
        <div className="forage-field">
          {forage.patches.map((patch) => (
            <button
              key={patch.id}
              type="button"
              className={`forage-patch ${patch.picked ? "picked" : ""} ${patch.revealed ? patch.kind : ""} ${forage.selected === patch.id ? "selected" : ""}`}
              onClick={() => onSelect(patch.id)}
              disabled={loading || patch.picked}
            >
              <span>{patch.picked ? "采" : patch.revealed ? patch.kind === "poison" ? "毒" : patch.kind === "herb" ? "灵" : "草" : "?"}</span>
            </button>
          ))}
        </div>

        <div className="forage-qte-panel">
          <div className="forage-qte-title">
            {selected_patch ? "看准灵光" : "先选一株灵草"}
          </div>
          <div className="forage-qte-track">
            {selected_patch ? (
              <>
                <div
                  className="forage-qte-window"
                  style={{ left: `${window_start}%`, width: `${window_width}%` }}
                />
                <div className="forage-qte-cursor" style={{ left: `${qte_pos}%` }} />
              </>
            ) : null}
          </div>
          <button
            className="mini-btn forage-harvest-btn"
            onClick={() => onHarvest(qte_pos, window_start, window_start + window_width)}
            disabled={loading || !selected_patch}
          >
            采摘
          </button>

          <div className="forage-history">
            {(forage.history || []).map((line, idx) => (
              <div className="forage-history-line" key={idx}>
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button className="menu-btn" onClick={onGiveUp} disabled={loading}>
        <span>离开草地</span>
        <span className="menu-btn-arrow">×</span>
      </button>
    </div>
  );
}

function MemoryPanel({ memory, loading, onDigit, onClear, onGiveUp }) {
  const [revealing, set_revealing] = useState(true);
  const [remaining_ms, set_remaining_ms] = useState(memory.reveal_ms);

  useEffect(() => {
    set_revealing(true);
    set_remaining_ms(memory.reveal_ms);

    const started = Date.now();
    const interval = setInterval(() => {
      const left = Math.max(0, memory.reveal_ms - (Date.now() - started));
      set_remaining_ms(left);
      if (left <= 0) {
        set_revealing(false);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [memory.id, memory.reveal_ms]);

  const progress = clamp((remaining_ms / memory.reveal_ms) * 100, 0, 100);

  return (
    <div className="memory-box">
      <div className="memory-head">
        <div>
          <div className="memory-title">{memory.title}</div>
          <div className="memory-subtitle">{memory.hint}</div>
        </div>
        <div className="memory-timer">
          {revealing ? `${(remaining_ms / 1000).toFixed(1)} 秒` : "开始输入"}
        </div>
      </div>

      <div className="memory-desc">{memory.description}</div>

      <div className="memory-sequence">
        {memory.sequence.map((digit, idx) => (
          <div className={`memory-rune ${revealing ? "visible" : "hidden"}`} key={`${digit}_${idx}`}>
            {revealing ? digit : "?"}
          </div>
        ))}
      </div>

      <div className="memory-progress">
        <div className="memory-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="memory-input">
        {memory.sequence.map((_, idx) => (
          <span key={idx} className={memory.input[idx] ? "filled" : ""}>
            {memory.input[idx] || "·"}
          </span>
        ))}
      </div>

      <div className="memory-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => (
          <button
            className="memory-key"
            key={digit}
            onClick={() => onDigit(digit)}
            disabled={loading || revealing}
          >
            {digit}
          </button>
        ))}
      </div>

      <div className="memory-actions">
        <button className="menu-btn" onClick={onClear} disabled={loading || revealing}>
          <span>清空输入</span>
          <span className="menu-btn-arrow">↺</span>
        </button>
        <button className="menu-btn" onClick={onGiveUp} disabled={loading}>
          <span>放弃破禁</span>
          <span className="menu-btn-arrow">×</span>
        </button>
      </div>

      <div className="memory-history">
        {(memory.history || []).map((line, idx) => (
          <div className="memory-history-line" key={idx}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

const unity_build_path = "/unity-battle/Build";
const unity_loader_url = `${unity_build_path}/unity-battle.loader.js`;

function get_hp_percent(value, max_value) {
  return `${clamp(Math.round((Number(value || 0) / Number(max_value || 1)) * 100), 0, 100)}%`;
}

function load_unity_loader() {
  if (window.createUnityInstance) return Promise.resolve();
  if (window.__unityBattleLoaderPromise) return window.__unityBattleLoaderPromise;

  window.__unityBattleLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${unity_loader_url}"]`);

    if (existing) {
      if (window.createUnityInstance) {
        resolve();
        return;
      }

      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = unity_loader_url;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

  return window.__unityBattleLoaderPromise;
}

function UnityBattleView({ statePayload, animationPayload }) {
  const iframe_ref = useRef(null);
  const [status, set_status] = useState("checking");
  const [load_error, set_load_error] = useState("");

  useEffect(() => {
    async function check_unity() {
      try {
        const resp = await fetch(unity_loader_url, {
          method: "HEAD",
          cache: "no-store",
        });

        if (!resp.ok) {
          set_status("missing");
          set_load_error(`找不到 Unity loader：${resp.status}`);
          return;
        }

        set_status("loading");
      } catch (err) {
        console.error("Unity battle load failed:", err);
        set_load_error(err?.message || String(err));
        set_status("error");
      }
    }

    check_unity();
  }, []);

  useEffect(() => {
    function handle_message(event) {
      if (event.data?.type === "unity-battle-ready") {
        set_status("ready");
      }

      if (event.data?.type === "unity-battle-error") {
        set_load_error(event.data.message || "Unity iframe failed");
        set_status("error");
      }
    }

    window.addEventListener("message", handle_message);
    return () => window.removeEventListener("message", handle_message);
  }, []);

  useEffect(() => {
    const win = iframe_ref.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: "battle-state",
        payload: statePayload,
      },
      window.location.origin
    );
  }, [status, statePayload]);

  useEffect(() => {
    const win = iframe_ref.current?.contentWindow;
    if (!win || !animationPayload) return;
    win.postMessage(
      {
        type: "battle-skill",
        payload: animationPayload,
      },
      window.location.origin
    );
  }, [status, animationPayload]);

  return (
    <div className={`unity-battle ${status === "ready" ? "ready" : ""}`}>
      {status !== "missing" && status !== "error" ? (
        <iframe
          ref={iframe_ref}
          className="unity-battle-frame"
          title="Unity Battle"
          src="/unity-battle/index.html?embed=1"
          onLoad={() => set_status((prev) => (prev === "checking" ? "loading" : prev))}
        />
      ) : null}
      {status !== "ready" ? (
        <div className="unity-battle-overlay">
          <div>
            {status === "loading"
              ? "Unity 战斗场景加载中..."
              : status === "checking"
                ? "正在检查 Unity WebGL 导出文件..."
                : load_error
                  ? `Unity 加载失败：${load_error}`
                  : "Unity WebGL 尚未导出，当前使用网页战斗演出"}
          </div>
          <a className="unity-test-link" href="/unity-battle/index.html" target="_blank" rel="noreferrer">
            单独打开 Unity
          </a>
        </div>
      ) : null}
    </div>
  );
}

function BattleStage({
  mode,
  playerName,
  playerAvatar,
  enemyName,
  enemyAvatar,
  playerHp,
  playerMaxHp = 120,
  enemyHp = 100,
  enemyMaxHp = 100,
  enemyPower,
  animation,
  selectedSkillNames = [],
}) {
  const is_active = Boolean(animation);
  const result_class = animation?.victory ? "victory" : "defeat";
  const move_class = animation ? `move-${animation.choiceId}` : "move-idle";
  const stage_label = mode === "tournament" ? "天机擂台" : "野外斗法";
  const shown_player_hp = is_active ? animation.playerHpAfter : playerHp;
  const shown_enemy_hp = is_active ? animation.enemyHpAfter : enemyHp;
  const unity_state = {
    mode,
    playerName: playerName || "你",
    playerAvatar,
    enemyName,
    enemyAvatar,
    playerHp,
    playerMaxHp,
    enemyHp,
    enemyMaxHp,
    enemyPower,
    selectedSkillNames,
  };

  return (
    <div
      className={`battle-stage has-unity ${is_active ? `is-casting ${result_class} ${move_class}` : "is-idle"}`}
    >
      <div className="battle-stage-bg" />
      <UnityBattleView statePayload={unity_state} animationPayload={animation} />
      <div className="battle-stage-label">{stage_label}</div>

      <div className="fighter fighter-player">
        <div className="fighter-aura" />
        <img className="fighter-avatar" src={playerAvatar} alt={playerName || "你"} />
        <div className="fighter-name">{playerName || "你"}</div>
        <div className="hp-wrap hp-player">
          <div className="hp-bar">
            <div
              className="hp-fill"
              style={{ width: get_hp_percent(shown_player_hp, playerMaxHp) }}
            />
          </div>
          <div className="hp-text">
            气血 {shown_player_hp} / {playerMaxHp}
          </div>
        </div>
        <div className="fighter-power">{is_active ? animation.playerValue : "待势"}</div>
      </div>

      <div className="spell-lane">
        <div className="spell-ring ring-left" />
        <div className="spell-ring ring-right" />
        <div className="spell-projectile" />
        <div className="clash-burst" />
        <div className="move-caption">
          {is_active ? `施展：${animation.choiceName}` : "凝神对峙"}
        </div>
      </div>

      <div className="fighter fighter-enemy">
        <div className="fighter-aura" />
        {enemyAvatar ? (
          <img className="fighter-avatar enemy-avatar" src={enemyAvatar} alt={enemyName || "对手"} />
        ) : (
          <div className="enemy-sigil">{enemyName?.slice(0, 1) || "敌"}</div>
        )}
        <div className="fighter-name">{enemyName}</div>
        <div className="hp-wrap hp-enemy">
          <div className="hp-bar">
            <div
              className="hp-fill"
              style={{ width: get_hp_percent(shown_enemy_hp, enemyMaxHp) }}
            />
          </div>
          <div className="hp-text">
            气血 {shown_enemy_hp} / {enemyMaxHp}
          </div>
        </div>
        <div className="fighter-power">{is_active ? animation.enemyValue : enemyPower}</div>
      </div>
    </div>
  );
}

function BattleSkillBar({ skills, selectedIds, playerMp, onToggle }) {
  const active_skills = skills.filter((skill) => skill.id !== "none");
  const selected_set = new Set(selectedIds || []);
  const selected_cost = active_skills.reduce(
    (sum, skill) => sum + (selected_set.has(skill.id) ? Number(skill.mpCost || 0) : 0),
    0
  );

  return (
    <div className="battle-skill-box">
      <div className="battle-skill-head">
        <span>组合技能</span>
        <span>
          已选 {selected_set.size} 个 ｜ 技能耗灵 {selected_cost} ｜ 当前灵力 {playerMp}
        </span>
      </div>

      <div className="battle-skills">
        {active_skills.map((skill) => {
          const selected = selected_set.has(skill.id);
          const disabled = !selected && playerMp < selected_cost + Number(skill.mpCost || 0);

          return (
            <button
              key={skill.id}
              type="button"
              className={`battle-skill ${selected ? "selected" : ""}`}
              onClick={() => onToggle(skill.id)}
              disabled={disabled}
            >
              <div className="battle-skill-top">
                <span>{skill.name}</span>
                <span>{Number(skill.mpCost || 0)} 灵力</span>
              </div>
              <div className="battle-skill-desc">{skill.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SettlementModal({ settlement, onClose }) {
  if (!settlement) return null;

  const items = get_settlement_items(settlement.summary);

  return (
    <div className="settlement-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settlement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settlement-kicker">结算</div>
        <div className="settlement-title" id="settlement-title">
          获得奖励
        </div>
        <div className="settlement-source">{settlement.title}</div>

        <div className="settlement-list">
          {items.map((item, idx) => (
            <div className="settlement-item" key={`${item}-${idx}`}>
              {item}
            </div>
          ))}
        </div>

        <button className="settlement-close" type="button" onClick={onClose}>
          收下
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [game, set_game] = useState(get_init_game());
  const [saved_game, set_saved_game] = useState(null);
  const [tab, set_tab] = useState("action");
  const [loading_event, set_loading_event] = useState(false);
  const [battle_animation, set_battle_animation] = useState(null);
  const [draft_name, set_draft_name] = useState("");
  const [draft_gender, set_draft_gender] = useState("male");
  const [story_box, set_story_box] = useState(null);
  const [story_idx, set_story_idx] = useState(0);
  const [story_seen, set_story_seen] = useState({});
  const [selected_battle_skill_ids, set_selected_battle_skill_ids] = useState([]);
  const [settlement_modal, set_settlement_modal] = useState(null);
  const last_settlement_serial = useRef(0);

  useEffect(() => {
    const raw = localStorage.getItem(save_key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalize_save(parsed);
      if (is_resumable_save(normalized)) {
        set_saved_game(normalized);
      } else {
        localStorage.removeItem(save_key);
      }
    } catch (err) {
      console.error(err);
      localStorage.removeItem(save_key);
    }
  }, []);

  useEffect(() => {
    if (!game.started) return;
    localStorage.setItem(save_key, JSON.stringify(game));
    if (is_resumable_save(game)) {
      set_saved_game(game);
    }
  }, [game]);

  useEffect(() => {
    if (!game.started) {
      last_settlement_serial.current = game.event_serial || 0;
      set_settlement_modal(null);
      return;
    }

    const serial = game.event_serial || 0;
    if (serial <= last_settlement_serial.current) return;

    last_settlement_serial.current = serial;

    if (!should_show_settlement(game.current_event)) {
      set_settlement_modal(null);
      return;
    }

    set_settlement_modal({
      serial,
      title: game.current_event.title,
      summary: game.current_event.summary,
    });
  }, [game.started, game.event_serial, game.current_event]);

  useEffect(() => {
    if (!settlement_modal) return undefined;

    function handle_keydown(event) {
      if (event.key === "Escape") {
        set_settlement_modal(null);
      }
    }

    window.addEventListener("keydown", handle_keydown);
    return () => window.removeEventListener("keydown", handle_keydown);
  }, [settlement_modal]);

  useEffect(() => {
    if (!game.started || game.ended || game.foundation) return;
    if (game.battle || game.tournament || game.auction || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation) return;
    if (Number(game.player.stage || 0) !== 10) return;
    if (Number(game.player.exp || 0) < get_need_exp(10)) return;

    const foundation = create_foundation_trial(game.player, game);
    set_game((prev) => ({
      ...prev,
      foundation,
      current_event: {
        title: "筑基关前",
        desc: "你体内灵力涨满，练气圆满的瓶颈终于松动。气海、经脉、道心三元同时震颤，只差一场真正的冲关。",
        summary: "三元同时达到 50 即可筑基。每回合末天压会递增削落三元。",
      },
      logs: push_log(prev.logs, "【筑基冲关】练气圆满已至，三元筑基开始。"),
      event_serial: (prev.event_serial || 0) + 1,
    }));
  }, [game.started, game.ended, game.foundation, game.battle, game.tournament, game.auction, game.puzzle, game.market, game.memory, game.trace, game.forage, game.balance, game.player.stage, game.player.exp, game.equipped_items]);

  const p = game.player;
  const battle_skills = useMemo(
    () => get_available_battle_skills(game),
    [game.equipped_items, game.equipped_gongfa, game.equipped_weapon, game.equipped_skill]
  );
  const selected_battle_skills = useMemo(
    () => get_battle_skills_by_ids(battle_skills, selected_battle_skill_ids),
    [battle_skills, selected_battle_skill_ids]
  );
  const selected_battle_skill = useMemo(
    () => combine_battle_skills(selected_battle_skills),
    [selected_battle_skills]
  );
  const need_exp = useMemo(() => get_need_exp(p.stage), [p.stage]);
  const exp_percent = Math.min(100, (p.exp / need_exp) * 100);
  const years_left = Math.max(0, max_year - game.now_year);

useEffect(() => {
  const valid_ids = selected_battle_skill_ids.filter((id) =>
    battle_skills.some((skill) => skill.id === id)
  );
  if (valid_ids.length !== selected_battle_skill_ids.length) {
    set_selected_battle_skill_ids(valid_ids);
  }
}, [battle_skills, selected_battle_skill_ids]);

function toggle_battle_skill(skill_id) {
  set_selected_battle_skill_ids((prev) =>
    prev.includes(skill_id) ? prev.filter((id) => id !== skill_id) : [...prev, skill_id]
  );
}

function get_gongfa_damage_bonus() {
  return get_equipped_bonus(game, "damage_bonus");
}

function get_real_choice_value(choice) {
  return Math.floor(
    (choice.value * (1 + get_gongfa_damage_bonus()) +
      get_equipped_bonus(game, "value_bonus") +
      Number(selected_battle_skill.valueBonus || 0)) *
      Number(selected_battle_skill.valueMultiplier || 1)
  );
}

function get_battle_enemy_hp(battle_like) {
  return clamp(
    Number(battle_like?.enemy_hp ?? battle_like?.enemy_max_hp ?? 100),
    0,
    get_battle_enemy_max_hp(battle_like)
  );
}

function get_battle_enemy_max_hp(battle_like) {
  return clamp(Number(battle_like?.enemy_max_hp ?? 100), 1, 140);
}

function get_damage_delta(a, b) {
  return Math.abs(Number(a || 0) - Number(b || 0));
}

function get_outgoing_damage(choice, delta, skill) {
  const base = choice.id === "fierce" ? 13 : choice.id === "normal" ? 9 : 6;
  return Math.max(
    3,
    Math.floor(base + delta * 1.65 + Number(skill.damageBonus || 0))
  );
}

function get_incoming_damage(battle_like, choice, delta, skill) {
  const enemy_base = Number(battle_like?.enemy_damage || 8);
  const raw = Math.floor((enemy_base + delta * 1.35) * Number(choice.loseFactor || 1));
  return Math.max(0, raw - Number(skill.incomingReduction || 0));
}

async function play_battle_animation(payload) {
  set_battle_animation({
    ...payload,
    key: Date.now(),
  });

  await sleep(1750);
}

  function open_story_box(title, lines, on_finish = null) {
  set_story_box({
    title,
    lines,
    on_finish,
  });
  set_story_idx(0);
}

function next_story_line() {
  if (!story_box) return;

  const is_last = story_idx >= story_box.lines.length - 1;

  if (!is_last) {
    set_story_idx((v) => v + 1);
    return;
  }

  const finish_fn = story_box.on_finish;
  set_story_box(null);
  set_story_idx(0);

  if (finish_fn) finish_fn();
}

function try_open_main_story(next_state) {
  const year = next_state.now_year;
  const story_map = get_main_story_map(next_state.role.avatar, next_state.role.name);
  const story = story_map[year];

  if (!story) return false;
  if (story_seen[year]) return false;

  set_story_seen((prev) => ({ ...prev, [year]: true }));

  open_story_box(
    story.title,
    story.lines,
    () => {
      set_game((prev) => {
        const next_player = {
          ...prev.player,
          exp: prev.player.exp + story.reward_exp,
        };
        const r1 = maybe_breakthrough(next_player, prev.logs);

        return {
          ...prev,
          player: r1.player,
          logs: push_log(
            r1.logs,
            `【主线推进】${story.title}，修为 +${story.reward_exp}。`
          ),
          current_event: {
            title: story.title,
            desc: story.lines[story.lines.length - 1].text || "主线推进。",
            summary: `主线推进，修为 +${story.reward_exp}。`,
          },
          event_serial: (prev.event_serial || 0) + 1,
        };
      });
    }
  );

  return true;
}

async function start_tournament_flow(base_game) {
  const round_data = await fetch_tournament_round(
    base_game.player,
    0,
    base_game.role.name
  );

  const base_value =
    base_game.player.stage * 8 +
    Math.floor(base_game.player.spirit / 2) +
    Math.floor(base_game.player.dao / 10);

  set_game({
    ...base_game,
    tournament_pending: false,
    tournament: {
      active: true,
      round_idx: 0,
      total_rounds: 3,
      wins: 0,
      losses: 0,
      current_round: {
        ...round_data,
        enemy_avatar: get_enemy_avatar(round_data.enemy_name, "tournament"),
        enemy_hp: 100,
        enemy_max_hp: 100,
        enemy_damage: 9,
        choices: [
          {
            id: "steady",
            name: "稳招",
            desc: "保守应对，输了掉血更少。",
            value: base_value - 3,
            mpCost: 0,
            loseFactor: 0.7,
          },
          {
            id: "normal",
            name: "常招",
            desc: "中规中矩，最均衡。",
            value: base_value + 2,
            mpCost: 4,
            loseFactor: 1,
          },
          {
            id: "fierce",
            name: "猛招",
            desc: "全力一击，但灵力消耗更大。",
            value: base_value + 10,
            mpCost: 10,
            loseFactor: 1.25,
          },
        ],
      },
    },
    current_event: {
      title: `天机大比${round_data.round_name}`,
      desc: round_data.desc,
      summary: `${round_data.hint}。对手：${round_data.enemy_name}`,
    },
    logs: push_log(
      base_game.logs,
      `【天机大比${round_data.round_name}】你的对手是${round_data.enemy_name}。`
    ),
    event_serial: (base_game.event_serial || 0) + 1,
  });
}

function get_full_power_player(player) {
  return {
    ...player,
    stage: 11,
    exp: get_need_exp(11),
    hp: 120,
    mp: 120,
    spirit: 120,
    stone: 9999,
    dao: 100,
    fame: 100,
    chance: 30,
    hurt: 0,
  };
}

async function handle_skip_to_tournament(full_power = false) {
  if (loading_event || game.ended || game.battle || game.tournament || game.auction || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation) return;

  set_loading_event(true);

  try {
    const next_player = full_power
      ? get_full_power_player(game.player)
      : {
          ...game.player,
          hp: clamp(game.player.hp + 20, 0, 120),
          mp: clamp(game.player.mp + 30, 0, 120),
        };

    const next_game = {
      ...game,
      now_year: max_year,
      now_season: 0,
      scene: "天机阁前",
      battle: null,
      tournament: null,
      auction: null,
      puzzle: null,
      market: null,
      memory: null,
      trace: null,
      forage: null,
      balance: null,
      foundation: null,
      tournament_pending: false,
      flags: {
        ...game.flags,
        qualify: true,
      },
      player: next_player,
      current_event: {
        title: full_power ? "满级抵达天机大比" : "抵达天机大比",
        desc: full_power
          ? "你直接抵达天机阁前。此刻的你气血充盈、灵力圆满、道心澄明，修为已至筑基初期，主打一个不装了，摊牌了。"
          : "你不再一年年磨蹭，直接赶到天机阁前。高台已起，钟声将鸣，诸宗修士尽数入场。",
        summary: full_power
          ? "已跳转到第 50 年春季，并获得满级数值。"
          : "已跳转到第 50 年春季，并自动开启天机大比。",
      },
      logs: push_log(
        game.logs,
        full_power
          ? "【满级抵达】你获得满级数值，并直接抵达第 50 年天机大比。"
          : "【一键抵达】你直接抵达第 50 年天机大比。"
      ),
      event_serial: (game.event_serial || 0) + 1,
    };

    set_tab("action");
    await start_tournament_flow(next_game);
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

function create_auction_from_gongfa(data) {
  const speed_bonus = Number(data.speed_bonus || 0);
  const damage_bonus = Number(data.damage_bonus || 0);

  const effects = [];
  if (speed_bonus > 0) effects.push(`闭关修炼 +${(speed_bonus * 100).toFixed(0)}%`);
  if (damage_bonus > 0) effects.push(`斗法伤害 +${(damage_bonus * 100).toFixed(0)}%`);

  const item = {
    id: `gongfa_${Date.now()}_${rand_int(1000, 9999)}`,
    type: "cultivation",
    name: data.name || "无名古诀",
    rarity: data.rarity || "凡阶",
    description: data.description || "一卷来历不明的古旧功法。",
    speed_bonus,
    damage_bonus,
    effect_text: data.effect_text || effects.join("，"),
    price: Number(data.price || 50),
  };

  const npc_name = pick([
    "青衫修士",
    "二楼贵客",
    "黑袍道人",
    "赤霞山弟子",
    "灵宝阁少主",
    "林沐心",
  ]);

  const start_price = Math.max(20, item.price);
  const npc_limit = Math.floor(start_price * (1.25 + Math.random() * 0.9));

  return {
    item,
    npc_name,
    current_price: start_price,
    next_bid: start_price + rand_int(10, 25),
    npc_limit,
    round: 0,
    max_round: rand_int(2, 5),
    last_bidder: "none",
    history: [
      `拍卖师捧出一枚玉简：${item.rarity}功法《${item.name}》，底价 ${start_price} 灵石。`,
      `功法效果：${item.effect_text || "暂无明显加成"}。`,
      `${npc_name}似乎也盯上了这枚玉简。`,
    ],
  };
}

function create_auction_from_item(data) {
  const item = {
    id: `item_${Date.now()}_${rand_int(1000, 9999)}`,
    type: data.type || "cultivation",
    name: data.name || "无名灵物",
    rarity: data.rarity || "凡阶",
    description: data.description || "一件来历不明的修行物。",
    speed_bonus: Number(data.speed_bonus || 0),
    damage_bonus: Number(data.damage_bonus || 0),
    value_bonus: Number(data.value_bonus || data.valueBonus || 0),
    damage_flat: Number(data.damage_flat || data.damageBonus || 0),
    incoming_reduction: Number(data.incoming_reduction || data.incomingReduction || 0),
    heal: Number(data.heal || 0),
    foundation_qi: Number(data.foundation_qi || 0),
    foundation_meridian: Number(data.foundation_meridian || 0),
    foundation_mind: Number(data.foundation_mind || 0),
    mpCost: Number(data.mpCost || 0),
    valueBonus: Number(data.valueBonus || data.value_bonus || 0),
    damageBonus: Number(data.damageBonus || data.damage_flat || 0),
    incomingReduction: Number(data.incomingReduction || data.incoming_reduction || 0),
    effect_text: data.effect_text || get_item_effect_text(data),
    price: Number(data.price || 50),
  };

  const npc_name = pick(["青衣修士", "二楼贵客", "黑袍道人", "赤霞山弟子", "灵宝阁少主", "林沐心"]);
  const start_price = Math.max(20, item.price);
  const npc_limit = Math.floor(start_price * (1.25 + Math.random() * 0.9));

  return {
    item,
    npc_name,
    current_price: start_price,
    next_bid: start_price + rand_int(10, 25),
    npc_limit,
    round: 0,
    max_round: rand_int(2, 5),
    last_bidder: "none",
    history: [
      `拍卖师捧出${get_item_type_label(item.type)}《${item.name}》，底价 ${start_price} 灵石。`,
      `效果：${item.effect_text || get_item_effect_text(item)}。`,
      `${npc_name}似乎也盯上了这件东西。`,
    ],
  };
}

async function handle_buy_gongfa() {
  if (loading_event || game.ended || game.battle || game.tournament || game.auction || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation) return;

  set_loading_event(true);

  try {
    const preferred_type = Number(game.player.stage || 1) >= 8 && rand_int(1, 100) <= 55
      ? "foundation"
      : "random";
    const data = await fetch_generated_item(game.player, "auction", preferred_type);
    const auction = create_auction_from_item(data);

    set_game({
      ...game,
      scene: "坊市拍卖会",
      auction,
      current_event: {
        title: "拍卖会开场",
        desc: `拍卖台上灵灯骤亮，一枚玉简被侍者捧出。拍卖师朗声道：“${auction.item.rarity}${get_item_type_label(auction.item.type)}《${auction.item.name}》，效果：${auction.item.effect_text || "暂无明显加成"}，底价 ${auction.current_price} 灵石！”`,
        summary: "拍卖开始，你可以选择出价或放弃。",
      },
      logs: push_log(
        game.logs,
        `【拍卖会】出现${auction.item.rarity}${get_item_type_label(auction.item.type)}《${auction.item.name}》，底价 ${auction.current_price} 灵石。`
      ),
      event_serial: (game.event_serial || 0) + 1,
    });

    set_tab("action");
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

function handle_auction_bid() {
  if (loading_event || !game.auction || game.ended) return;

  const auction = game.auction;
  const bid_price = auction.next_bid;

  if (game.player.stone < bid_price) {
    set_game({
      ...game,
      current_event: {
        title: "灵石不足",
        desc: `你想继续出价到 ${bid_price} 灵石，可储物袋里只有 ${game.player.stone} 灵石。拍卖场很安静，尴尬很大声。`,
        summary: "灵石不足，无法继续竞价。",
      },
      logs: push_log(game.logs, `【拍卖会】灵石不足，无法出价 ${bid_price}。`),
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const after_player_history = [
    `你举牌出价 ${bid_price} 灵石。`,
    ...auction.history,
  ];

  const npc_can_follow =
    bid_price < auction.npc_limit &&
    auction.round < auction.max_round &&
    rand_int(1, 100) <= 75;

  if (npc_can_follow) {
    const npc_bid = bid_price + rand_int(10, 30);

    const next_auction = {
      ...auction,
      current_price: npc_bid,
      next_bid: npc_bid + rand_int(10, 35),
      round: auction.round + 1,
      last_bidder: "npc",
      history: [
        `${auction.npc_name}轻轻一笑，继续加价到 ${npc_bid} 灵石。`,
        ...after_player_history,
      ].slice(0, 8),
    };

    set_game({
      ...game,
      auction: next_auction,
      current_event: {
        title: "有人竞价",
        desc: `你刚出价 ${bid_price} 灵石，${auction.npc_name}便再次举牌，将价格抬到 ${npc_bid} 灵石。拍卖场内不少目光都落到了你身上。`,
        summary: `当前最高价：${npc_bid} 灵石。`,
      },
      logs: push_log(
        game.logs,
        `【拍卖竞价】你出价 ${bid_price}，${auction.npc_name}加价到 ${npc_bid}。`
      ),
      event_serial: (game.event_serial || 0) + 1,
    });

    return;
  }

  const item = {
    ...auction.item,
    price: bid_price,
  };

  const next_player = {
    ...game.player,
    stone: game.player.stone - bid_price,
  };
  const equip_patch =
    item.type === "weapon"
        ? { equipped_weapon: item }
        : item.type === "skill"
          ? { equipped_skill: item }
          : item.type === "foundation"
            ? {}
            : { equipped_gongfa: item };
  const equipped_items = get_equipped_items(game);
  const next_equipped_items = equipped_items.length < 9
    ? [item, ...equipped_items.filter((equipped) => String(equipped.id || equipped.name) !== String(item.id || item.name))].slice(0, 9)
    : equipped_items;

  set_game({
    ...game,
    ...equip_patch,
    equipped_items: next_equipped_items,
    auction: null,
    player: next_player,
    bag: [item, ...(game.bag || [])],
    current_event: {
      title: "拍卖得功",
      desc: `你最终以 ${bid_price} 灵石拍下${item.rarity}${get_item_type_label(item.type)}《${item.name}》。玉简入手微温，灵纹流转。效果：${item.effect_text || "暂无明显加成"}。`,
      summary: `灵石 -${bid_price}，获得《${item.name}》${equipped_items.length < 9 ? "并装备" : "，装备栏已满"}。`,
    },
    logs: push_log(
      game.logs,
      `【拍卖得功】以 ${bid_price} 灵石拍下《${item.name}》，效果：${item.effect_text || "暂无明显加成"}。`
    ),
    event_serial: (game.event_serial || 0) + 1,
  });

  set_tab("bag");
}

function handle_auction_pass() {
  if (loading_event || !game.auction || game.ended) return;

  const auction = game.auction;
  const item = auction.item;

  set_game({
    ...game,
    auction: null,
    scene: "坊市拍卖会",
    current_event: {
      title: "放弃竞价",
      desc: `你放下手中号牌，没有继续争夺《${item.name}》。最终，${auction.npc_name}以 ${auction.current_price} 灵石附近的价格将其收入囊中。修仙路上，灵石也是命啊。`,
      summary: `你放弃了《${item.name}》。`,
    },
    logs: push_log(
      game.logs,
      `【拍卖会】你放弃竞价，《${item.name}》被${auction.npc_name}拍走。`
    ),
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_equip_gongfa(item_id) {
  const item = (game.bag || []).find((it) => it.id === item_id);
  if (!item) return;

  set_game({
    ...game,
    equipped_gongfa: item,
    current_event: {
      title: "功法切换",
      desc: `你重新整理经脉运转路线，将《${item.name}》定为主修功法。下一次闭关时，它会提升修炼所得。`,
      summary: `当前主修功法：《${item.name}》。`,
    },
    logs: push_log(
      game.logs,
      `【功法切换】当前主修功法改为《${item.name}》。`
    ),
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_equip_item(item_id) {
  const item = (game.bag || []).find((it) => it.id === item_id);
  if (!item) return;
  if (item.type === "trade_good") {
    set_game({
      ...game,
      current_event: {
        title: "旧物入袋",
        desc: `《${item.name}》只是坊市旧物，不能拿来装备。若想变现，去坊市经营里寄售。`,
        summary: "旧物只能寄售，不可装备。",
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const equipped_items = get_equipped_items(game);
  const item_key = String(item.id || item.name);
  const already_equipped = equipped_items.some(
    (equipped) => String(equipped.id || equipped.name) === item_key
  );

  if (already_equipped) {
    const next_equipped_items = equipped_items.filter(
      (equipped) => String(equipped.id || equipped.name) !== item_key
    );

    set_game({
      ...game,
      equipped_items: next_equipped_items,
      equipped_weapon: game.equipped_weapon?.id === item.id ? null : game.equipped_weapon,
      equipped_skill: game.equipped_skill?.id === item.id ? null : game.equipped_skill,
      equipped_gongfa: game.equipped_gongfa?.id === item.id ? null : game.equipped_gongfa,
      current_event: {
        title: "卸下装备",
        desc: `你将《${item.name}》从随身装备中取下，暂收入储物袋。`,
        summary: `已卸下《${item.name}》。`,
      },
      logs: push_log(game.logs, `【卸下装备】《${item.name}》已卸下。`),
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  if (equipped_items.length >= 9) {
    set_game({
      ...game,
      current_event: {
        title: "装备已满",
        desc: "你身上能稳定运转的功法、武器和技能已经排满。再硬塞只会灵力冲突。",
        summary: "最多同时装备 9 个物品。",
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const patch =
    item.type === "weapon"
      ? { equipped_weapon: item }
      : item.type === "skill"
        ? { equipped_skill: item }
        : item.type === "foundation"
          ? {}
          : { equipped_gongfa: item };

  set_game({
    ...game,
    ...patch,
    equipped_items: [item, ...equipped_items],
    current_event: {
      title: "装备切换",
      desc: `你将${get_item_type_label(item.type)}《${item.name}》纳入随身装备。效果：${item.effect_text || get_item_effect_text(item)}。`,
      summary: `已装备${get_item_type_label(item.type)}《${item.name}》，装备 ${equipped_items.length + 1} / 9。`,
    },
    logs: push_log(
      game.logs,
      `【装备切换】装备${get_item_type_label(item.type)}《${item.name}》。`
    ),
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_social_gift(contact_id) {
  if (loading_event || game.ended || game.battle || game.tournament || game.auction || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation) return;

  const contacts = normalize_contacts(game.contacts);
  const contact = contacts.find((item) => item.id === contact_id);
  if (!contact) return;

  const tpl = get_contact_template(contact.id);
  const gift_cost = 10 + Math.floor(contact.relation / 20) * 4;
  const mp_cost = 6;

  if (game.player.stone < gift_cost || game.player.mp < mp_cost) {
    set_game({
      ...game,
      current_event: {
        title: "礼数不周",
        desc: "你摸了摸储物袋，又感受了一下疲惫的神识，最后还是没有贸然登门。",
        summary: `需要灵石 ${gift_cost}、灵力 ${mp_cost}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const relation_gain = rand_int(7, 13);
  const favor_gain = rand_int(1, 100) <= 45 ? 1 : 0;
  const next_contacts = contacts.map((item) =>
    item.id === contact.id
      ? {
          ...item,
          relation: clamp(item.relation + relation_gain, 0, 100),
          favor: clamp(item.favor + favor_gain, 0, 9),
        }
      : item
  );

  set_game({
    ...game,
    player: {
      ...game.player,
      stone: game.player.stone - gift_cost,
      mp: clamp(game.player.mp - mp_cost, 0, 120),
    },
    contacts: next_contacts,
    current_event: {
      title: "人情往来",
      desc: `你备了些合适的小礼，登门拜访【${tpl.name}】。对方收得不算热络，却也没有拒你于门外。`,
      summary: `关系 +${relation_gain}，灵石 -${gift_cost}，灵力 -${mp_cost}${favor_gain ? "，人情 +1" : ""}。`,
    },
    logs: push_log(
      game.logs,
      `【人情往来】你拜访【${tpl.name}】，关系 +${relation_gain}${favor_gain ? "，人情 +1" : ""}。`
    ),
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_social_help(contact_id) {
  if (loading_event || game.ended || game.battle || game.tournament || game.auction || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation) return;

  const contacts = normalize_contacts(game.contacts);
  const contact = contacts.find((item) => item.id === contact_id);
  if (!contact) return;

  const tpl = get_contact_template(contact.id);
  if (contact.relation < 25 || contact.favor <= 0) {
    set_game({
      ...game,
      current_event: {
        title: "人情未到",
        desc: `你试着向【${tpl.name}】开口，可话到嘴边便知道分量还不够。`,
        summary: "需要关系 25 且至少 1 点人情。",
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  let player = { ...game.player };
  let desc = "";
  let summary = "";

  if (contact.id === "old_appraiser") {
    player.chance += 1;
    player.fame += 1;
    desc = "鉴货老修低声说了几条坊市暗线，哪些旧物最近有人收，哪些摊主专坑新脸，他都点了几句。";
    summary = "机缘 +1，名望 +1。";
  } else if (contact.id === "talisman_seller") {
    const gain = rand_int(22, 42);
    player.stone += gain;
    desc = "符铺老陈替你牵了一笔小买卖，对方不算大方，但胜在出手干脆。";
    summary = `灵石 +${gain}。`;
  } else if (contact.id === "escort_leader") {
    const gain_exp = rand_int(28, 48);
    player.exp += gain_exp;
    player.chance += 1;
    desc = "镖队头目给你标出一条少有人走的山路，路上虽险，却也有几处适合磨炼的灵地。";
    summary = `修为 +${gain_exp}，机缘 +1。`;
  } else {
    const gain_dao = rand_int(4, 8);
    const gain_exp = rand_int(18, 34);
    player.dao = clamp(player.dao + gain_dao, 0, 100);
    player.exp += gain_exp;
    desc = "林沐心听完你的困惑，先是损了你两句，随后还是指出了你行功里几处不稳的地方。";
    summary = `悟性 +${gain_dao}，修为 +${gain_exp}。`;
  }

  const next_contacts = contacts.map((item) =>
    item.id === contact.id
      ? {
          ...item,
          relation: clamp(item.relation - 8, 0, 100),
          favor: clamp(item.favor - 1, 0, 9),
        }
      : item
  );

  const r1 = maybe_breakthrough(player, game.logs);
  player = r1.player;

  set_game({
    ...game,
    player,
    contacts: next_contacts,
    current_event: {
      title: `${tpl.name}相助`,
      desc,
      summary: `${summary} 人情 -1，关系 -8。`,
    },
    logs: push_log(
      r1.logs,
      `【人脉请托】${tpl.name}出手相助：${summary}`
    ),
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_social_debate(contact_id) {
  if (loading_event || game.ended || game.battle || game.tournament || game.auction || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation) return;

  const contacts = normalize_contacts(game.contacts);
  const contact = contacts.find((item) => item.id === contact_id);
  if (!contact) return;

  const tpl = get_contact_template(contact.id);
  const mp_cost = 8;
  if (game.player.mp < mp_cost) {
    set_game({
      ...game,
      current_event: {
        title: "神识疲惫",
        desc: `你想与【${tpl.name}】坐而论道，可心神已经有些发涩，只能暂且作罢。`,
        summary: `需要灵力 ${mp_cost}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const success_rate = clamp(
    42 + Math.floor(game.player.dao / 4) + Math.floor(contact.relation / 6),
    35,
    88
  );
  const success = rand_int(1, 100) <= success_rate;
  const relation_gain = success ? rand_int(5, 9) : rand_int(1, 3);
  const dao_gain = success ? rand_int(3, 7) : rand_int(1, 2);
  const exp_gain = success ? rand_int(12, 24) : rand_int(4, 9);
  const favor_gain = success && rand_int(1, 100) <= 28 ? 1 : 0;
  const next_contacts = contacts.map((item) =>
    item.id === contact.id
      ? {
          ...item,
          relation: clamp(item.relation + relation_gain, 0, 100),
          favor: clamp(item.favor + favor_gain, 0, 9),
        }
      : item
  );
  const player = {
    ...game.player,
    mp: clamp(game.player.mp - mp_cost, 0, 120),
    dao: clamp(game.player.dao + dao_gain, 0, 100),
    exp: game.player.exp + exp_gain,
  };
  const r1 = maybe_breakthrough(player, game.logs);

  set_game({
    ...game,
    player: r1.player,
    contacts: next_contacts,
    current_event: success
      ? {
          title: `${tpl.debate}有得`,
          desc: `你与【${tpl.name}】围绕「${tpl.debate}」谈了许久，几处关窍被对方一点，心中顿时通透不少。`,
          summary: `灵力 -${mp_cost}，关系 +${relation_gain}，道心 +${dao_gain}，修为 +${exp_gain}${favor_gain ? "，人情 +1" : ""}。`,
        }
      : {
          title: `${tpl.debate}未透`,
          desc: `你与【${tpl.name}】谈到一半，思路几次卡住。虽没能真正说服对方，但也从错处里摸到一点门路。`,
          summary: `灵力 -${mp_cost}，关系 +${relation_gain}，道心 +${dao_gain}，修为 +${exp_gain}。`,
        },
    logs: push_log(
      r1.logs,
      `【论道】你与【${tpl.name}】论及${tpl.debate}，关系 +${relation_gain}。`
    ),
    event_serial: (game.event_serial || 0) + 1,
  });
}

function get_contact_trade_result(contact, player) {
  const tpl = get_contact_template(contact.id);
  const relation_discount = Math.floor(Number(contact.relation || 0) / 25) * 2;
  const base_cost_map = {
    old_appraiser: 14,
    talisman_seller: 18,
    escort_leader: 20,
    lin_muxin_contact: 20,
    wandering_sword: 24,
    tianji_clerk: 30,
  };
  const cost = Math.max(8, Number(base_cost_map[contact.id] || 16) - relation_discount);

  const result_map = {
    old_appraiser: {
      title: "买得行情",
      desc: `【${tpl.name}】收了灵石，压低声音给你讲了几条坊市暗线。哪些摊位能捡漏，哪些话术是套人，他说得很细。`,
      exp: rand_int(5, 10),
      chance: 1,
      fame: 0,
      dao: 0,
      hp: 0,
      mp: 0,
    },
    talisman_seller: {
      title: "买得符箓",
      desc: `【${tpl.name}】从柜底摸出一叠温养符，说是旧客价。符纸贴身一暖，灵力周转轻快了些。`,
      exp: rand_int(6, 12),
      chance: 0,
      fame: 0,
      dao: 0,
      hp: 0,
      mp: rand_int(12, 22),
    },
    escort_leader: {
      title: "买得路引",
      desc: `【${tpl.name}】把几条近来太平的山路标给你看，还顺手送了些行路药。`,
      exp: rand_int(6, 12),
      chance: 1,
      fame: 0,
      dao: 0,
      hp: rand_int(8, 16),
      mp: 0,
    },
    lin_muxin_contact: {
      title: "换得旧物",
      desc: "林沐心嘴上说着“这东西也就你会要”，还是把一枚残旧玉片推了过来。玉片入手微凉，灵纹很旧。",
      exp: rand_int(14, 24),
      chance: 1,
      fame: 0,
      dao: rand_int(2, 4),
      hp: 0,
      mp: 0,
    },
    wandering_sword: {
      title: "买得剑符",
      desc: "沈孤舟递给你一道薄薄剑符，符中剑意不重，却足够让你琢磨许久。",
      exp: rand_int(18, 30),
      chance: 0,
      fame: 1,
      dao: rand_int(1, 3),
      hp: 0,
      mp: 0,
    },
    tianji_clerk: {
      title: "买得名册",
      desc: "高阁执事给了你一份不算完整的大比名册。名字不多，却足以让你提前看清几分局势。",
      exp: rand_int(8, 14),
      chance: 2,
      fame: 2,
      dao: 0,
      hp: 0,
      mp: 0,
    },
  };

  return {
    cost,
    ...(result_map[contact.id] || result_map.old_appraiser),
  };
}

function handle_social_trade(contact_id) {
  if (loading_event || game.ended || game.battle || game.tournament || game.auction || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation) return;

  const contacts = normalize_contacts(game.contacts);
  const contact = contacts.find((item) => item.id === contact_id);
  if (!contact) return;

  const tpl = get_contact_template(contact.id);
  const trade = get_contact_trade_result(contact, game.player);
  if (game.player.stone < trade.cost) {
    set_game({
      ...game,
      current_event: {
        title: "灵石不足",
        desc: `你想和【${tpl.name}】做这笔交易，可储物袋里的灵石还是差了一截。`,
        summary: `需要灵石 ${trade.cost}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const relation_gain = rand_int(1, 4);
  const next_contacts = contacts.map((item) =>
    item.id === contact.id
      ? {
          ...item,
          relation: clamp(item.relation + relation_gain, 0, 100),
        }
      : item
  );
  const player = {
    ...game.player,
    stone: Math.max(0, game.player.stone - trade.cost),
    exp: game.player.exp + trade.exp,
    chance: game.player.chance + trade.chance,
    fame: game.player.fame + trade.fame,
    dao: clamp(game.player.dao + trade.dao, 0, 100),
    hp: clamp(game.player.hp + trade.hp, 0, 120),
    mp: clamp(game.player.mp + trade.mp, 0, 120),
  };
  const r1 = maybe_breakthrough(player, game.logs);
  const gains = [
    `灵石 -${trade.cost}`,
    `关系 +${relation_gain}`,
    trade.exp ? `修为 +${trade.exp}` : "",
    trade.chance ? `机缘 +${trade.chance}` : "",
    trade.fame ? `名望 +${trade.fame}` : "",
    trade.dao ? `道心 +${trade.dao}` : "",
    trade.hp ? `气血 +${trade.hp}` : "",
    trade.mp ? `灵力 +${trade.mp}` : "",
  ].filter(Boolean);

  set_game({
    ...game,
    player: r1.player,
    contacts: next_contacts,
    current_event: {
      title: trade.title,
      desc: trade.desc,
      summary: `${gains.join("，")}。`,
    },
    logs: push_log(
      r1.logs,
      `【人脉交易】你与【${tpl.name}】完成交易，${gains.join("，")}。`
    ),
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_sell_item(item_id, mode = "normal") {
  if (loading_event || game.ended || game.battle || game.tournament || game.auction || game.puzzle || game.memory || game.trace || game.forage || game.balance || game.foundation) return;

  const item = (game.bag || []).find((it) => it.id === item_id);
  if (!item) return;

  const normal_price = get_normal_sell_price(item);
  const urgent_cost = get_urgent_sell_cost(item);
  const equipped_patch = clear_sold_equipment(game, item);

  if (mode === "normal") {
    const price = normal_price;
    const sale_line = `你把《${item.name}》按普通收货价卖出，入账 ${price} 灵石。`;
    set_game({
      ...game,
      ...equipped_patch,
      player: {
        ...game.player,
        stone: game.player.stone + price,
      },
      bag: (game.bag || []).filter((it) => it.id !== item.id),
      market: game.market
        ? {
            ...game.market,
            history: [sale_line, ...(game.market.history || [])].slice(0, 8),
          }
        : game.market,
      current_event: {
        title: "普通卖出",
        desc: `你把${get_item_type_label(item.type)}《${item.name}》交给坊市收货摊，对方压了压价，最后以 ${price} 灵石收走。`,
        summary: `灵石 +${price}${is_equipped_item(game, item) ? "，已自动卸下装备" : ""}。`,
      },
      logs: push_log(
        game.logs,
        `【普通卖出】${get_item_type_label(item.type)}《${item.name}》卖得 ${price} 灵石。`
      ),
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  if (game.player.mp < urgent_cost) {
    set_game({
      ...game,
      current_event: {
        title: "灵力不足",
        desc: "你想托人加急寻买家，可神识疲乏，连几条靠谱门路都筛不出来。",
        summary: `加急寻找需要灵力 ${urgent_cost}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const base = get_item_base_price(item);
  const [low, high] = get_urgent_sell_estimate(item, game.player);
  const social_bonus =
    Math.floor(Number(game.player.fame || 0) / 6) +
    Math.floor(Number(game.player.spirit || 0) / 16) +
    Math.floor(Number(game.player.chance || 0) / 2);
  const roll = clamp(rand_int(-18, 30) + social_bonus, -18, 42);
  const price = clamp(Math.round(base * (0.82 + roll / 100)), normal_price, Math.max(high, Math.round(base * 1.45)));
  const good_deal = price >= Math.round(base * 1.05);

  let next_state = {
    ...game,
    ...equipped_patch,
    scene: "坊市摊位",
    market: null,
    player: {
      ...game.player,
      mp: clamp(game.player.mp - urgent_cost, 0, 120),
      stone: game.player.stone + price,
      fame: game.player.fame + (good_deal ? 1 : 0),
    },
    bag: (game.bag || []).filter((it) => it.id !== item.id),
    current_event: {
      title: good_deal ? "加急寻得好买家" : "加急出手",
      desc: good_deal
        ? `你托人连夜放出消息，终于找到正缺此物的买家。《${item.name}》没有摆上多久，便以 ${price} 灵石成交。`
        : `你加急寻了一圈买家，愿意立刻接手的人不多。几番议价后，《${item.name}》以 ${price} 灵石成交。`,
      summary: `灵石 +${price}，灵力 -${urgent_cost}${good_deal ? "，名望 +1" : ""}。`,
    },
    logs: push_log(
      game.logs,
      `【加急卖出】《${item.name}》预估 ${low}-${high}，实际成交 ${price} 灵石。`
    ),
    event_serial: (game.event_serial || 0) + 1,
  };

  next_state = finalize_one_year(next_state);
  set_game(next_state);
}

async function resolve_puzzle(success, reason = "") {
  if (loading_event || !game.puzzle || game.ended) return;

  set_loading_event(true);

  try {
    const puzzle = game.puzzle;
    let player = { ...game.player };
    let logs = [...game.logs];

    if (success) {
      player.exp += puzzle.reward_exp;
      player.stone += puzzle.reward_stone;
      player.chance += puzzle.chance_gain;
      logs = push_log(
        logs,
        `【古阵连线】阵图被成功接通，修为 +${puzzle.reward_exp}，灵石 +${puzzle.reward_stone}。`
      );
    } else {
      player.exp += puzzle.fail_exp;
      player.hp = clamp(player.hp - puzzle.fail_hp_loss, 0, 120);
      player.hurt = clamp(player.hurt + 1, 0, 10);
      logs = push_log(
        logs,
        `【古阵反噬】${reason || "阵纹紊乱"}，气血 -${puzzle.fail_hp_loss}。`
      );
    }

    const r1 = maybe_breakthrough(player, logs);
    player = r1.player;
    logs = r1.logs;

    let next_state = {
      ...game,
      player,
      logs,
      puzzle: null,
    };

    next_state = finalize_one_year(next_state);

    const result_event = success
      ? {
          title: "灵脉接通",
          desc: "最后一道灵线落下时，整座石台微微一震。阵眼中的残光沿着纹路流转，化作一缕温润灵气没入你的经脉，石缝里还震出几枚旧灵石。",
          summary: `修为 +${puzzle.reward_exp}，灵石 +${puzzle.reward_stone}，机缘 +${puzzle.chance_gain}。`,
        }
      : {
          title: "古阵反噬",
          desc: `${reason || "阵纹骤然逆转"}，石台上的灵光轰然散乱。你及时后退，却仍被乱流扫中经脉，只能带着伤势离开。`,
          summary: `气血 -${puzzle.fail_hp_loss}，修为 +${puzzle.fail_exp}，伤势 +1。`,
        };

    const final_state = {
      ...next_state,
      current_event: result_event,
      event_serial: (game.event_serial || 0) + 1,
      logs: push_log(next_state.logs, `【${result_event.title}】${result_event.summary}`),
    };

    if (final_state.tournament_pending) {
      await start_tournament_flow(final_state);
      return;
    }

    set_game(final_state);

    setTimeout(() => {
      try_open_main_story(final_state);
    }, 0);
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

function mark_puzzle_mistake(puzzle, reason) {
  const mistakes = Number(puzzle.mistakes || 0) + 1;
  const next_puzzle = {
    ...puzzle,
    selected: null,
    mistakes,
    history: [
      reason,
      ...(puzzle.history || []),
    ].slice(0, 6),
  };

  if (mistakes >= Number(puzzle.max_mistakes || 3)) {
    resolve_puzzle(false, reason);
    return;
  }

  set_game({
    ...game,
    puzzle: next_puzzle,
    current_event: {
      title: "阵纹不稳",
      desc: reason,
      summary: `失误 ${mistakes} / ${puzzle.max_mistakes}。再错就会触发反噬。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_puzzle_node_click(node_id) {
  if (loading_event || !game.puzzle || game.ended) return;

  const puzzle = game.puzzle;
  const node = get_puzzle_node(puzzle, node_id);
  if (!node) return;

  if (!puzzle.selected) {
    set_game({
      ...game,
      puzzle: {
        ...puzzle,
        selected: node_id,
      },
    });
    return;
  }

  if (puzzle.selected === node_id) {
    set_game({
      ...game,
      puzzle: {
        ...puzzle,
        selected: null,
      },
    });
    return;
  }

  const target = get_puzzle_target(puzzle, puzzle.selected, node_id);
  if (!target) {
    const from_node = get_puzzle_node(puzzle, puzzle.selected);
    mark_puzzle_mistake(
      puzzle,
      `你试图连接「${from_node?.label || "未知"}」与「${node.label}」，两枚阵眼灵性不合，石盘轻轻一震。`
    );
    return;
  }

  if (is_puzzle_pair_connected(puzzle, puzzle.selected, node_id)) {
    set_game({
      ...game,
      puzzle: {
        ...puzzle,
        selected: null,
      },
      current_event: {
        title: "阵线已成",
        desc: `「${target.label}」灵纹已经接通，无需重复牵引。`,
        summary: `已完成 ${puzzle.connections.length} / ${puzzle.targets.length}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  if (does_puzzle_line_cross(puzzle, puzzle.selected, node_id)) {
    mark_puzzle_mistake(
      puzzle,
      `你牵出的「${target.label}」灵线与已有灵脉相交，阵中灵气立刻变得躁动。`
    );
    return;
  }

  const next_connections = [
    ...(puzzle.connections || []),
    {
      from: target.from,
      to: target.to,
      label: target.label,
    },
  ];

  const next_puzzle = {
    ...puzzle,
    selected: null,
    connections: next_connections,
    history: [
      `「${target.label}」灵纹接通，石盘上的光亮稳定了一分。`,
      ...(puzzle.history || []),
    ].slice(0, 6),
  };

  if (next_connections.length >= puzzle.targets.length) {
    set_game({
      ...game,
      puzzle: next_puzzle,
    });
    resolve_puzzle(true);
    return;
  }

  set_game({
    ...game,
    puzzle: next_puzzle,
    current_event: {
      title: "灵线接通",
      desc: `你将两枚「${target.label}」阵眼接在一起，灵气沿线缓缓流动。剩下的阵眼仍在等待牵引。`,
      summary: `已完成 ${next_connections.length} / ${puzzle.targets.length}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_puzzle_reset() {
  if (loading_event || !game.puzzle || game.ended) return;

  set_game({
    ...game,
    puzzle: {
      ...game.puzzle,
      selected: null,
      connections: [],
      history: [
        "你抹去已经牵出的灵线，重新观察阵眼位置。",
        ...(game.puzzle.history || []),
      ].slice(0, 6),
    },
    current_event: {
      title: "重整阵图",
      desc: "你没有贸然继续，而是散去石盘上已经成形的灵线，准备从头梳理。",
      summary: `失误仍为 ${game.puzzle.mistakes} / ${game.puzzle.max_mistakes}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

async function resolve_trace(success, reason = "") {
  if (loading_event || !game.trace || game.ended) return;

  set_loading_event(true);

  try {
    const trace = game.trace;
    let player = { ...game.player };
    let logs = [...game.logs];

    if (success) {
      player.exp += trace.reward_exp;
      player.stone += trace.reward_stone;
      player.chance += trace.chance_gain;
      logs = push_log(
        logs,
        `【灵径一笔画】灵径贯通，修为 +${trace.reward_exp}，灵石 +${trace.reward_stone}。`
      );
    } else {
      player.exp += trace.fail_exp;
      player.hp = clamp(player.hp - trace.fail_hp_loss, 0, 120);
      player.hurt = clamp(player.hurt + 1, 0, 10);
      logs = push_log(
        logs,
        `【灵径错乱】${reason || "灵纹断裂"}，气血 -${trace.fail_hp_loss}。`
      );
    }

    const r1 = maybe_breakthrough(player, logs);
    player = r1.player;
    logs = r1.logs;

    let next_state = {
      ...game,
      player,
      logs,
      trace: null,
    };

    next_state = finalize_one_year(next_state);

    const result_event = success
      ? {
          title: "灵径贯通",
          desc: "你最后一步落在终点，整条灵径如蛇行般亮起。山壁深处传来细微裂响，一股温润灵气和几枚旧灵石一并落入你手中。",
          summary: `修为 +${trace.reward_exp}，灵石 +${trace.reward_stone}，机缘 +${trace.chance_gain}。`,
        }
      : {
          title: "灵径错乱",
          desc: `${reason || "你脚下灵纹骤然断裂"}，山壁上的光路乱成一团。你及时收身，却仍被反冲灵气震得胸口发闷。`,
          summary: `气血 -${trace.fail_hp_loss}，修为 +${trace.fail_exp}，伤势 +1。`,
        };

    const final_state = {
      ...next_state,
      current_event: result_event,
      event_serial: (game.event_serial || 0) + 1,
      logs: push_log(next_state.logs, `【${result_event.title}】${result_event.summary}`),
    };

    if (final_state.tournament_pending) {
      await start_tournament_flow(final_state);
      return;
    }

    set_game(final_state);

    setTimeout(() => {
      try_open_main_story(final_state);
    }, 0);
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

function mark_trace_mistake(trace, reason) {
  const mistakes = Number(trace.mistakes || 0) + 1;
  const next_trace = {
    ...trace,
    mistakes,
    history: [reason, ...(trace.history || [])].slice(0, 6),
  };

  if (mistakes >= Number(trace.max_mistakes || 3)) {
    resolve_trace(false, reason);
    return;
  }

  set_game({
    ...game,
    trace: next_trace,
    current_event: {
      title: "灵径震颤",
      desc: reason,
      summary: `失误 ${mistakes} / ${trace.max_mistakes}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_trace_cell_click(cell_id) {
  if (loading_event || !game.trace || game.ended) return;

  const trace = game.trace;
  const cell = get_trace_cell(trace, cell_id);
  if (!cell) return;

  if (!(trace.path || []).length) {
    if (cell_id !== trace.start) {
      mark_trace_mistake(trace, "灵径起点尚未点亮，你踩错了第一步，石壁上光芒微微一暗。");
      return;
    }

    set_game({
      ...game,
      trace: {
        ...trace,
        path: [cell_id],
        history: ["你踏上起点，脚下第一枚灵纹亮了起来。", ...(trace.history || [])].slice(0, 6),
      },
      current_event: {
        title: "灵径起步",
        desc: "第一枚灵纹被你点亮，剩余光格开始依次泛起微光。",
        summary: `已走 1 / ${trace.cells.length}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  if (trace.path.includes(cell_id)) {
    mark_trace_mistake(trace, "你试图重复踏入已经亮起的灵纹，灵径立刻发出细碎裂响。");
    return;
  }

  const prev_cell = get_trace_cell(trace, trace.path[trace.path.length - 1]);
  if (!are_trace_neighbors(prev_cell, cell)) {
    mark_trace_mistake(trace, "你这一步跨得太远，灵径没有接上，山壁上的光路顿时紊乱。");
    return;
  }

  const next_path = [...trace.path, cell_id];
  const next_trace = {
    ...trace,
    path: next_path,
    history: [`第 ${next_path.length} 枚灵纹点亮，光路继续向前延伸。`, ...(trace.history || [])].slice(0, 6),
  };

  if (next_path.length >= trace.cells.length) {
    set_game({
      ...game,
      trace: next_trace,
    });
    resolve_trace(is_trace_complete(trace, next_path), "你走完了所有灵纹，却没有落在终点，灵径没有真正闭合。");
    return;
  }

  set_game({
    ...game,
    trace: next_trace,
    current_event: {
      title: "灵径延伸",
      desc: "你沿着相邻灵纹继续前行，脚下光路一格格接续成线。",
      summary: `已走 ${next_path.length} / ${trace.cells.length}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_trace_reset() {
  if (loading_event || !game.trace || game.ended) return;

  set_game({
    ...game,
    trace: {
      ...game.trace,
      path: [],
      history: ["你退回原处，抹去已经点亮的灵纹，准备重新一笔走完。", ...(game.trace.history || [])].slice(0, 6),
    },
    current_event: {
      title: "重看灵径",
      desc: "你没有硬着头皮继续，而是退回起点外，重新观察整片光格的走向。",
      summary: `失误仍为 ${game.trace.mistakes} / ${game.trace.max_mistakes}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

async function resolve_balance(success, reason = "", balance_override = null) {
  if (loading_event || !game.balance || game.ended) return;
  set_loading_event(true);

  try {
    const balance = balance_override || game.balance;
    let player = { ...game.player };
    let logs = [...game.logs];

    if (success) {
      player.exp += balance.reward_exp;
      player.stone += balance.reward_stone;
      player.chance += balance.chance_gain;
      logs = push_log(
        logs,
        `【灵泉调息】四脉归一，修为 +${balance.reward_exp}，灵石 +${balance.reward_stone}。`
      );
    } else {
      player.exp += balance.fail_exp;
      player.hp = clamp(player.hp - balance.fail_hp_loss, 0, 120);
      player.hurt = clamp(player.hurt + 1, 0, 10);
      logs = push_log(
        logs,
        `【灵泉紊乱】${reason || "气机未能调和"}，气血 -${balance.fail_hp_loss}。`
      );
    }

    const r1 = maybe_breakthrough(player, logs);
    const final_state = finalize_one_year({
      ...game,
      player: r1.player,
      logs: r1.logs,
      balance: null,
      current_event: success
        ? {
          title: "灵泉归脉",
          desc: "你将四道气旋逐一调平，泉底灵光随之升起，温润灵气沿经脉缓缓铺开。",
          summary: `修为 +${balance.reward_exp}，灵石 +${balance.reward_stone}，机缘 +${balance.chance_gain}。`,
        }
        : {
          title: "灵泉紊乱",
          desc: `${reason || "你没能在泉眼闭合前调平灵息"}，四道气旋互相冲撞，震得经脉一阵发麻。`,
          summary: `气血 -${balance.fail_hp_loss}，修为 +${balance.fail_exp}，伤势 +1。`,
        },
      event_serial: (game.event_serial || 0) + 1,
    }, true);

    set_game(final_state);
  } finally {
    set_loading_event(false);
  }
}

function handle_balance_adjust(channel_id, delta) {
  if (loading_event || !game.balance || game.ended) return;

  const balance = game.balance;
  if (Number(balance.moves_left || 0) <= 0) return;

  const channels = balance.channels.map((channel) =>
    channel.id === channel_id
      ? {
        ...channel,
        current: clamp(Number(channel.current || 0) + delta, 1, 10),
      }
      : channel
  );
  const moves_left = Math.max(0, Number(balance.moves_left || 0) - 1);
  const changed = channels.find((channel) => channel.id === channel_id);
  const next_balance = {
    ...balance,
    channels,
    moves_left,
    history: [
      `${changed.label}${delta > 0 ? "升" : "降"}一息，当前 ${changed.current} / 目标 ${changed.target}。`,
      ...(balance.history || []),
    ].slice(0, 6),
  };

  if (is_balance_complete(next_balance)) {
    set_game({
      ...game,
      balance: next_balance,
    });
    resolve_balance(true, "", next_balance);
    return;
  }

  if (moves_left <= 0) {
    set_game({
      ...game,
      balance: next_balance,
    });
    resolve_balance(false, "步数用尽，泉眼在最后一息前闭合", next_balance);
    return;
  }

  set_game({
    ...game,
    balance: next_balance,
    current_event: {
      title: "灵泉调息",
      desc: "你屏息凝神，按着泉面气旋的起伏调整灵脉刻度。",
      summary: `剩余步数 ${moves_left} / ${balance.max_moves}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_balance_reset() {
  if (loading_event || !game.balance || game.ended) return;

  const balance = create_balance_puzzle(game.player, game.scene);
  set_game({
    ...game,
    balance: {
      ...balance,
      history: ["你重新闭目感气，泉面四道气旋换了一轮节拍。", ...(balance.history || [])].slice(0, 6),
    },
    current_event: {
      title: "灵泉调息",
      desc: "你退后半步，重新感知泉眼气机，再次尝试把四脉调至同频。",
      summary: "把四脉调到目标刻度，步数用尽前完成。",
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

function resolve_foundation(success, foundation_override = null, reason = "") {
  if (loading_event || !game.foundation || game.ended) return;

  const foundation = foundation_override || game.foundation;
  const need = get_need_exp(10);

  if (success) {
    const next_player = {
      ...game.player,
      exp: Math.max(0, Number(game.player.exp || 0) - need),
      stage: 11,
      hp: clamp(Number(game.player.hp || 0) + 18, 0, 120),
      mp: clamp(Number(game.player.mp || 0) + 24, 0, 120),
      dao: clamp(Number(game.player.dao || 0) + 8, 0, 100),
      fame: Number(game.player.fame || 0) + 6,
    };

    set_game({
      ...game,
      player: next_player,
      foundation: null,
      current_event: {
        title: "筑基功成",
        desc: "气海沉定，经脉贯通，道心如磐。三元终于在天压落下前凝成道基，你踏入筑基初期。",
        summary: "境界提升至筑基初期，气血 +18，灵力 +24，道心 +8，名望 +6。",
      },
      logs: push_log(game.logs, "【筑基功成】三元归一，你成功踏入筑基初期。"),
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const next_player = {
    ...game.player,
    exp: Math.min(Number(game.player.exp || 0), Math.floor(need * 0.65)),
    hp: clamp(Number(game.player.hp || 0) - 18, 0, 120),
    mp: clamp(Number(game.player.mp || 0) - 16, 0, 120),
    hurt: clamp(Number(game.player.hurt || 0) + 2, 0, 10),
  };

  set_game({
    ...game,
    player: next_player,
    foundation: null,
    current_event: {
      title: "筑基未成",
      desc: `${reason || "天压落下，三元未能同时凝住"}。道基虚影散去，经脉也被反震得隐隐作痛。`,
      summary: "气血 -18，灵力 -16，伤势 +2，筑基进度退回 65%。",
    },
    logs: push_log(game.logs, "【筑基未成】三元未能同至，道基虚影散去。"),
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_foundation_action(action_id) {
  if (loading_event || !game.foundation || game.ended) return;

  const foundation = game.foundation;
  if (foundation.resolving) return;

  const action = get_foundation_actions(foundation).find((item) => item.id === action_id);
  if (!action) return;

  const after_action = apply_foundation_delta(foundation.values, action.delta);
  const action_line = `施展【${action.name}】：气海 ${after_action.qi}，经脉 ${after_action.meridian}，道心 ${after_action.mind}。`;

  if (is_foundation_success(foundation, after_action)) {
    const next_foundation = {
      ...foundation,
      values: after_action,
      resolving: true,
      fx: {
        type: "success",
        key: Date.now(),
        line: "三元同至，灵光贯顶，道基正在凝成。",
      },
      history: [action_line, ...(foundation.history || [])].slice(0, 6),
    };
    set_game({
      ...game,
      foundation: next_foundation,
    });
    setTimeout(() => resolve_foundation(true, next_foundation), 720);
    return;
  }

  const decay = get_foundation_decay(foundation);
  const after_decay = decay_foundation_values(after_action, decay);
  const next_round = Number(foundation.round || 1) + 1;
  const next_foundation = {
    ...foundation,
    round: next_round,
    values: after_decay,
    fx: {
      type: "decay",
      key: Date.now(),
      line: `【${action.name}】冲起三元，随后天压落下，各削 ${decay}。`,
    },
    history: [
      `${action_line} 天压落下，三元各 -${decay}。`,
      ...(foundation.history || []),
    ].slice(0, 6),
  };

  if (next_round > Number(foundation.max_rounds || 9)) {
    const failed_foundation = {
      ...next_foundation,
      resolving: true,
      fx: {
        type: "fail",
        key: Date.now(),
        line: "天压封顶，三元未能同凝，道基虚影开始散乱。",
      },
    };

    set_game({
      ...game,
      foundation: failed_foundation,
    });
    setTimeout(
      () => resolve_foundation(false, failed_foundation, "十轮冲关已尽，三元仍未同时凝成"),
      720
    );
    return;
  }

  set_game({
    ...game,
    foundation: next_foundation,
    current_event: {
      title: "筑基冲关",
      desc: "你强行稳住翻涌灵息，等待下一轮天压间隙继续冲关。",
      summary: `第 ${next_round} 回合，天压将升至 -${get_foundation_decay(next_foundation)}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

async function resolve_forage(success, reason = "", forage_override = null) {
  if (loading_event || !game.forage || game.ended) return;

  set_loading_event(true);

  try {
    const forage = forage_override || game.forage;
    let player = { ...game.player };
    let logs = [...game.logs];

    if (success) {
      player.exp += forage.reward_exp;
      player.stone += forage.reward_stone;
      player.chance += forage.chance_gain;
      logs = push_log(
        logs,
        `【灵草采撷】采得 ${forage.collected} 株灵草，修为 +${forage.reward_exp}，灵石 +${forage.reward_stone}。`
      );
    } else {
      player.exp += forage.fail_exp;
      player.hp = clamp(player.hp - forage.fail_hp_loss, 0, 120);
      player.hurt = clamp(player.hurt + 1, 0, 10);
      logs = push_log(
        logs,
        `【采药失手】${reason || "药性散乱"}，气血 -${forage.fail_hp_loss}。`
      );
    }

    const r1 = maybe_breakthrough(player, logs);
    player = r1.player;
    logs = r1.logs;

    let next_state = {
      ...game,
      player,
      logs,
      forage: null,
    };

    next_state = finalize_one_year(next_state);

    const result_event = success
      ? {
          title: "灵草入篓",
          desc: "你看准灵光起伏，接连采下几株药性正盛的灵草。草叶离土后仍有微光流转，显然能换来不少修行资粮。",
          summary: `修为 +${forage.reward_exp}，灵石 +${forage.reward_stone}，机缘 +${forage.chance_gain}。`,
        }
      : {
          title: "采药失手",
          desc: `${reason || "你没能稳住药性"}，灵草灵光散去，杂草间还飘起一缕刺鼻毒气。你只得先行退开。`,
          summary: `气血 -${forage.fail_hp_loss}，修为 +${forage.fail_exp}，伤势 +1。`,
        };

    const final_state = {
      ...next_state,
      current_event: result_event,
      event_serial: (game.event_serial || 0) + 1,
      logs: push_log(next_state.logs, `【${result_event.title}】${result_event.summary}`),
    };

    if (final_state.tournament_pending) {
      await start_tournament_flow(final_state);
      return;
    }

    set_game(final_state);

    setTimeout(() => {
      try_open_main_story(final_state);
    }, 0);
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

function handle_forage_select(patch_id) {
  if (loading_event || !game.forage || game.ended) return;

  const patch = game.forage.patches.find((item) => item.id === patch_id);
  if (!patch || patch.picked) return;

  set_game({
    ...game,
    forage: {
      ...game.forage,
      selected: patch_id,
      qte_round: Number(game.forage.qte_round || 0) + 1,
    },
  });
}

function handle_forage_harvest(pos, window_start, window_end) {
  if (loading_event || !game.forage || game.ended) return;

  const forage = game.forage;
  const selected = forage.patches.find((patch) => patch.id === forage.selected);
  if (!selected || selected.picked) return;

  const in_window = pos >= window_start && pos <= window_end;
  const success = in_window && selected.kind === "herb";
  const attempts = Math.max(0, Number(forage.attempts || 0) - 1);
  const collected = success ? Number(forage.collected || 0) + 1 : Number(forage.collected || 0);
  const reason = selected.kind === "poison"
    ? "你误采毒草，指尖被细刺扎了一下，灵光顿时散乱。"
    : in_window
      ? "你手法稳住了，可这株只是杂草，药性并未入篓。"
      : "你出手慢了半拍，灵草药性散入风中。";

  const patches = forage.patches.map((patch) =>
    patch.id === selected.id
      ? {
          ...patch,
          picked: true,
          revealed: true,
        }
      : patch
  );

  const next_forage = {
    ...forage,
    patches,
    selected: null,
    attempts,
    collected,
    qte_round: Number(forage.qte_round || 0) + 1,
    history: [
      success
        ? `采摘成功，成熟灵草入篓。进度 ${collected} / ${forage.target_count}。`
        : reason,
      ...(forage.history || []),
    ].slice(0, 7),
  };

  if (collected >= forage.target_count) {
    set_game({
      ...game,
      forage: next_forage,
    });
    resolve_forage(true, "", next_forage);
    return;
  }

  if (attempts <= 0) {
    set_game({
      ...game,
      forage: next_forage,
    });
    resolve_forage(false, "你连续失手，草地里的灵光渐渐散尽。", next_forage);
    return;
  }

  set_game({
    ...game,
    forage: next_forage,
    current_event: {
      title: success ? "采摘得手" : "采摘未成",
      desc: success ? "你卡准灵光稳定的一瞬，稳稳将灵草采入篓中。" : reason,
      summary: `进度 ${collected} / ${forage.target_count}，剩余机会 ${attempts}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

async function resolve_memory(success, reason = "") {
  if (loading_event || !game.memory || game.ended) return;

  set_loading_event(true);

  try {
    const memory = game.memory;
    let player = { ...game.player };
    let logs = [...game.logs];

    if (success) {
      player.exp += memory.reward_exp;
      player.stone += memory.reward_stone;
      player.chance += memory.chance_gain;
      logs = push_log(
        logs,
        `【${memory.title}】你按序复现灵纹，修为 +${memory.reward_exp}，灵石 +${memory.reward_stone}。`
      );
    } else {
      player.exp += memory.fail_exp;
      player.hp = clamp(player.hp - memory.fail_hp_loss, 0, 120);
      player.hurt = clamp(player.hurt + 1, 0, 10);
      logs = push_log(
        logs,
        `【神识失守】${reason || "数字灵纹复现失败"}，气血 -${memory.fail_hp_loss}。`
      );
    }

    const r1 = maybe_breakthrough(player, logs);
    player = r1.player;
    logs = r1.logs;

    let next_state = {
      ...game,
      player,
      logs,
      memory: null,
    };

    next_state = finalize_one_year(next_state);

    const result_event = success
      ? {
          title: "禁制松动",
          desc: "最后一个数字落下，石壁深处传出轻响。灵纹如水般退开，一缕精纯灵气与几枚旧灵石从暗格中浮出。",
          summary: `修为 +${memory.reward_exp}，灵石 +${memory.reward_stone}，机缘 +${memory.chance_gain}。`,
        }
      : {
          title: "神识反噬",
          desc: `${reason || "你复现的数字顺序乱了一瞬"}，禁制立刻逆转，刺痛沿着眉心炸开。你勉强稳住身形，却也受了些伤。`,
          summary: `气血 -${memory.fail_hp_loss}，修为 +${memory.fail_exp}，伤势 +1。`,
        };

    const final_state = {
      ...next_state,
      current_event: result_event,
      event_serial: (game.event_serial || 0) + 1,
      logs: push_log(next_state.logs, `【${result_event.title}】${result_event.summary}`),
    };

    if (final_state.tournament_pending) {
      await start_tournament_flow(final_state);
      return;
    }

    set_game(final_state);

    setTimeout(() => {
      try_open_main_story(final_state);
    }, 0);
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

function handle_memory_digit(digit) {
  if (loading_event || !game.memory || game.ended) return;

  const memory = game.memory;
  if (memory.input.length >= memory.sequence.length) return;

  const expected = memory.sequence[memory.input.length];
  if (digit !== expected) {
    resolve_memory(false, `你按下了「${digit}」，可此处本该是另一枚灵纹`);
    return;
  }

  const input = [...memory.input, digit];
  const next_memory = {
    ...memory,
    input,
    history: [
      `第 ${input.length} 枚灵纹复现正确。`,
      ...(memory.history || []),
    ].slice(0, 6),
  };

  if (input.length >= memory.sequence.length) {
    set_game({
      ...game,
      memory: next_memory,
    });
    resolve_memory(true);
    return;
  }

  set_game({
    ...game,
    memory: next_memory,
    current_event: {
      title: "灵纹吻合",
      desc: `你按下「${digit}」，石壁上的一处暗纹随之亮起。`,
      summary: `已复现 ${input.length} / ${memory.sequence.length}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

function handle_memory_clear() {
  if (loading_event || !game.memory || game.ended) return;

  set_game({
    ...game,
    memory: {
      ...game.memory,
      input: [],
      history: [
        "你收束神识，重新整理刚才记下的顺序。",
        ...(game.memory.history || []),
      ].slice(0, 6),
    },
    current_event: {
      title: "重整神识",
      desc: "你没有继续乱按，而是先清空脑中杂念，准备重新复现数字灵纹。",
      summary: "输入已清空。",
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

function create_market_state(result) {
  const goods = Array.isArray(result?.goods) ? result.goods : [];

  return {
    goods,
    holding: null,
    api_error: result?.ok ? "" : result?.error || "坊市 API 未连接。",
    history: [
      result?.ok
        ? "你在坊市支起临时摊位，先扫了一圈今日能倒手的货。"
        : "坊市货物生成失败：后端 API 暂未连上。",
      "货不怕旧，怕的是旧得没来历；价不怕高，怕的是高得没道理。",
    ],
  };
}

async function handle_market_retry() {
  if (loading_event || !game.market || game.ended) return;

  set_loading_event(true);

  try {
    const result = await fetch_market_goods(game.player, game);
    const market = create_market_state(result);

    set_game({
      ...game,
      market,
      current_event: {
        title: result.ok ? "坊市货物已刷新" : "坊市 API 未连接",
        desc: result.ok
          ? "你重新扫过一圈摊位，今日可倒手的货已经列在眼前。"
          : market.api_error,
        summary: result.ok ? "API 已返回坊市货物。" : "请先启动后端 API。",
      },
      event_serial: (game.event_serial || 0) + 1,
      logs: push_log(
        game.logs,
        result.ok ? "【坊市经营】API 已生成今日货物。" : "【坊市经营】API 未连接，无法生成货物。"
      ),
    });
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

function handle_market_search(good_id) {
  if (loading_event || !game.market || game.ended) return;

  const good = game.market.goods.find((item) => item.id === good_id);
  if (!good || good.searched) return;

  if (game.player.mp < good.search_cost) {
    set_game({
      ...game,
      current_event: {
        title: "灵力不足",
        desc: "你想继续打听消息，可神识已经有些发涩。再强行探听，怕是连摊主的假话都听不清。",
        summary: `需要灵力 ${good.search_cost}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const accuracy = clamp(0.38 - Number(game.player.spirit || 0) / 420, 0.12, 0.34);
  const spread = Math.max(4, Math.round(good.true_value * accuracy));
  const low = Math.max(1, good.true_value - rand_int(Math.floor(spread / 2), spread));
  const high = good.true_value + rand_int(Math.floor(spread / 2), spread);

  const goods = game.market.goods.map((item) =>
    item.id === good_id
      ? {
          ...item,
          searched: true,
          estimate_low: low,
          estimate_high: high,
        }
      : item
  );

  set_game({
    ...game,
    player: {
      ...game.player,
      mp: clamp(game.player.mp - good.search_cost, 0, 120),
    },
    market: {
      ...game.market,
      goods,
      history: [
        `你花了些心神打听《${good.name}》，得到线索：${good.clue}`,
        ...(game.market.history || []),
      ].slice(0, 8),
    },
    current_event: {
      title: "搜得线索",
      desc: `你绕到旁边茶摊问了几句，又以神识扫过《${good.name}》的灵纹，心里大概有了数。`,
      summary: `灵力 -${good.search_cost}，估价 ${low} - ${high} 灵石。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

async function finish_market(next_state, result_event) {
  const final_state = {
    ...next_state,
    market: null,
    current_event: result_event,
    event_serial: (game.event_serial || 0) + 1,
    logs: push_log(next_state.logs, `【${result_event.title}】${result_event.summary}`),
  };

  if (final_state.tournament_pending) {
    await start_tournament_flow(final_state);
    return;
  }

  set_game(final_state);

  setTimeout(() => {
    try_open_main_story(final_state);
  }, 0);
}

async function handle_market_buy(good_id) {
  if (loading_event || !game.market || game.ended) return;
  if (game.market.holding) return;

  const good = game.market.goods.find((item) => item.id === good_id);
  if (!good) return;

  if (game.player.stone < good.asking_price) {
    set_game({
      ...game,
      current_event: {
        title: "灵石不足",
        desc: `你看中了《${good.name}》，可摸了摸储物袋，还是只能把手收回来。`,
        summary: `需要灵石 ${good.asking_price}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  if (good.type === "foundation") {
    const item = market_good_to_bag_item(good, good.asking_price);
    const equipped_items = get_equipped_items(game);
    const next_equipped_items = equipped_items.length < 9
      ? [item, ...equipped_items.filter((equipped) => String(equipped.id || equipped.name) !== String(item.id || item.name))].slice(0, 9)
      : equipped_items;
    const goods = game.market.goods.filter((market_item) => market_item.id !== good.id);

    set_game({
      ...game,
      player: {
        ...game.player,
        stone: Math.max(0, game.player.stone - good.asking_price),
      },
      bag: [item, ...(game.bag || [])],
      equipped_items: next_equipped_items,
      market: {
        ...game.market,
        goods,
        history: [
          `你花 ${good.asking_price} 灵石买下筑基功法《${good.name}》。`,
          ...(game.market.history || []),
        ].slice(0, 8),
      },
      current_event: {
        title: "买得筑基功法",
        desc: `你从${good.seller}手里买下《${good.name}》。玉简里记着冲关时稳住三元的法门，正适合练气圆满后尝试筑基。`,
        summary: `灵石 -${good.asking_price}，获得《${good.name}》${equipped_items.length < 9 ? "并装备" : "，装备栏已满"}。`,
      },
      logs: push_log(
        game.logs,
        `【筑基功法】买下《${good.name}》，效果：${item.effect_text}。`
      ),
      event_serial: (game.event_serial || 0) + 1,
    });
    return;
  }

  const fluctuation = Math.max(1, Math.floor(Number(good.true_value || 1) * 0.08));
  const offer_price = Math.max(1, Number(good.true_value || good.asking_price) + rand_int(-fluctuation, fluctuation));
  const holding = {
    good,
    offer_price,
    profit: offer_price - good.asking_price,
    buyer_name: pick(["茶棚掮客", "符铺老陈", "外城行商", "鉴货老修"]),
    buyer_pitch: offer_price >= good.asking_price
      ? "这件东西有点门道，我可以接。价钱不算亏你。"
      : "东西水分不小，我只能给这个数。你要是不急，可以自己留着慢慢找买主。",
  };

  const goods = game.market.goods.filter((item) => item.id !== good.id);

  set_game({
    ...game,
    player: {
      ...game.player,
      stone: Math.max(0, game.player.stone - good.asking_price),
    },
    market: {
      ...game.market,
      goods,
      holding,
      history: [
        `你花 ${good.asking_price} 灵石买下《${good.name}》，随后有人报价 ${offer_price} 灵石收货。`,
        ...(game.market.history || []),
      ].slice(0, 8),
    },
    current_event: {
      title: "货已到手",
      desc: `你买下《${good.name}》后，立刻有买主凑近问价。他愿出 ${offer_price} 灵石收走，卖不卖还得你自己决定。`,
      summary: `成本 ${good.asking_price}，当前收购价 ${offer_price}。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  });
}

async function resolve_market_holding(should_sell) {
  if (loading_event || !game.market?.holding || game.ended) return;

  set_loading_event(true);

  try {
    const holding = game.market.holding;
    const good = holding.good;
    const profit = Number(holding.profit || 0);
    const exp_gain = should_sell ? (profit >= 0 ? rand_int(8, 16) : rand_int(4, 9)) : rand_int(3, 7);
    const fame_gain = should_sell && profit >= 25 ? 2 : should_sell && profit > 0 ? 1 : 0;
    const chance_gain = should_sell && good.quality === "bargain" ? 1 : 0;
    const bag_item = market_good_to_bag_item(good, good.asking_price);

    let player = {
      ...game.player,
      stone: should_sell ? game.player.stone + Number(holding.offer_price || 0) : game.player.stone,
      exp: game.player.exp + exp_gain,
      fame: game.player.fame + fame_gain,
      chance: game.player.chance + chance_gain,
    };
    let logs = push_log(
      game.logs,
      should_sell
        ? profit >= 0
          ? `【坊市倒手】你买下《${good.name}》后卖给${holding.buyer_name}，净赚 ${profit} 灵石。`
          : `【坊市失手】你买下《${good.name}》后卖给${holding.buyer_name}，净亏 ${Math.abs(profit)} 灵石。`
        : `【坊市留货】你买下《${good.name}》后没有立刻卖掉，收入储物袋。`
    );

    const r1 = maybe_breakthrough(player, logs);
    player = r1.player;
    logs = r1.logs;

    let next_state = {
      ...game,
      player,
      logs,
      bag: should_sell ? game.bag : [bag_item, ...(game.bag || [])],
    };

    next_state = finalize_one_year(next_state);

    const result_event = should_sell
      ? profit >= 0
        ? {
            title: profit >= 25 ? "坊市捡漏" : "转手小赚",
            desc: `你点头应下，将《${good.name}》卖给${holding.buyer_name}。成本和收购价摊开一算，这一手算是落袋为安。`,
            summary: `净赚 ${profit} 灵石，修为 +${exp_gain}${fame_gain ? `，名望 +${fame_gain}` : ""}${chance_gain ? `，机缘 +${chance_gain}` : ""}。`,
          }
        : {
            title: "看走了眼",
            desc: `你还是决定卖掉《${good.name}》。买主压价压得很死，这一趟亏了些灵石，但至少换回了教训。`,
            summary: `净亏 ${Math.abs(profit)} 灵石，修为 +${exp_gain}。`,
          }
      : {
          title: "旧物入袋",
          desc: `你没有接受眼前报价，而是把《${good.name}》收入储物袋。它暂时占着货位，之后还能在坊市寄售找别的买主。`,
          summary: `获得旧物《${good.name}》，修为 +${exp_gain}。`,
        };

    await finish_market(next_state, result_event);
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

async function handle_market_leave() {
  if (loading_event || !game.market || game.ended) return;
  if (game.market.holding) {
    await resolve_market_holding(false);
    return;
  }

  set_loading_event(true);

  try {
    const next_state = {
      ...game,
      market: null,
      current_event: {
        title: "见好就撤",
        desc: "你在摊位间绕了几圈，最后还是按住了购买的念头。今日没有赚到灵石，但也没有把灵石送出去。",
        summary: "没有交易，也没有消耗本年行动。",
      },
      event_serial: (game.event_serial || 0) + 1,
      logs: push_log(game.logs, "【坊市撤手】你没有贸然下手，收摊离开。"),
    };

    set_game(next_state);
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

  async function handle_action(act_id) {
  if (loading_event || game.ended || game.battle || game.tournament || game.auction || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation) return;

  set_loading_event(true);

  try {
    if (act_id === "trade") {
      const result = await fetch_market_goods(game.player, game);
      const market = create_market_state(result);

      set_game({
        ...game,
        scene: "坊市摊位",
        market,
        current_event: {
          title: result.ok ? "坊市开摊" : "坊市 API 未连接",
          desc: result.ok
            ? "你在坊市里转了一圈，今日能倒手的货不止一件。有人急着出货，有人故意抬价，也有人话里藏着坑。"
            : market.api_error,
          summary: result.ok ? "先搜消息，买下后再决定卖掉或带走。" : "请先启动后端 API。",
        },
        event_serial: (game.event_serial || 0) + 1,
        logs: push_log(
          game.logs,
          result.ok ? "【坊市经营】API 已生成今日货物。" : "【坊市经营】API 未连接，无法生成货物。"
        ),
      });
      return;
    }

    const result = resolve_action(game, act_id);

    if (result.kind === "memory_seed") {
      const memory = await fetch_memory_puzzle(
        result.draft_state.player,
        result.draft_state,
        result.draft_state.scene
      );

      set_game({
        ...result.draft_state,
        memory,
        current_event: {
          title: memory.title,
          desc: memory.description,
          summary: memory.hint,
        },
        event_serial: (game.event_serial || 0) + 1,
        logs: push_log(
          result.draft_state.logs,
          `【${memory.title}】你遇到一处需要神识记忆的禁制。`
        ),
      });
    } else if (result.kind === "puzzle") {
      set_game(result.draft_state);
    } else if (result.kind === "forage") {
      set_game(result.draft_state);
    } else if (result.kind === "trace") {
      set_game(result.draft_state);
    } else if (result.kind === "balance") {
      set_game(result.draft_state);
    } else if (result.kind === "battle") {
      const intro = await generate_battle_intro_text(result.battle);

      set_game({
        ...result.draft_state,
        battle: result.battle,
        current_event: intro,
        event_serial: (game.event_serial || 0) + 1,
        logs: push_log(
          result.draft_state.logs,
          `【${intro.title}】${intro.summary}`
        ),
      });
    } else if (result.kind === "normal") {
      if (result.next_state.tournament_pending) {
        await start_tournament_flow(result.next_state);
        return;
      }

      const ai_text = await generate_ai_event_text(result.event_seed);

      const updated_state = {
        ...result.next_state,
        current_event: ai_text,
        event_serial: (game.event_serial || 0) + 1,
        logs: push_log(
          result.next_state.logs,
          `【${ai_text.title}】${ai_text.summary}`
        ),
      };

      const loot = await maybe_fetch_action_loot(updated_state.player, act_id);
      const final_state = loot
        ? {
            ...updated_state,
            bag: [
              { ...loot, id: `loot_${Date.now()}_${rand_int(1000, 9999)}` },
              ...(updated_state.bag || []),
            ],
            logs: push_log(
              updated_state.logs,
              `【获得物品】${get_item_type_label(loot.type)}《${loot.name}》已收入背包。`
            ),
          }
        : updated_state;

      set_game(final_state);

      setTimeout(() => {
        try_open_main_story(final_state);
      }, 0);
    }
  } catch (err) {
    console.error(err);
  } finally {
    set_loading_event(false);
  }
}

  async function handle_battle_choice(choice_id) {
  if (loading_event || !game.battle || game.ended) return;

  const battle = game.battle;
  const choice = battle.choices.find((it) => it.id === choice_id);
  if (!choice) return;
  const skill = selected_battle_skill;
  const total_mp_cost = choice.mpCost + Number(skill.mpCost || 0);
  if (p.mp < total_mp_cost) return;

  set_loading_event(true);

  try {
    let player = { ...game.player };
    let logs = [...game.logs];

    player.mp = clamp(player.mp - total_mp_cost, 0, 120);

    const real_choice = {
      ...choice,
      name: skill.id === "none" ? choice.name : `${choice.name}·${skill.name}`,
      value: get_real_choice_value(choice),
    };

    const enemy_hp_before = get_battle_enemy_hp(battle);
    const damage_delta = get_damage_delta(real_choice.value, battle.enemy_value);
    const player_advantage = real_choice.value > battle.enemy_value;
    const enemy_advantage = real_choice.value < battle.enemy_value;
    const player_damage = enemy_advantage
      ? get_incoming_damage(battle, choice, damage_delta, skill)
      : 0;
    const enemy_damage = player_advantage
      ? get_outgoing_damage(choice, damage_delta, skill)
      : 0;
    const player_hp_after = clamp(
      player.hp - player_damage + Number(skill.heal || 0),
      0,
      120
    );
    const enemy_hp_after = clamp(
      enemy_hp_before - enemy_damage,
      0,
      get_battle_enemy_max_hp(battle)
    );
    const victory = enemy_hp_after <= 0;
    const defeated = player_hp_after <= 0;

    await play_battle_animation({
      mode: "battle",
      choiceId: choice.id,
      choiceName: real_choice.name,
      playerValue: real_choice.value,
      enemyValue: battle.enemy_value,
      playerHpBefore: player.hp,
      playerHpAfter: player_hp_after,
      enemyHpBefore: enemy_hp_before,
      enemyHpAfter: enemy_hp_after,
      playerDamage: player_damage,
      enemyDamage: enemy_damage,
      heal: Number(skill.heal || 0),
      incomingReduction: Number(skill.incomingReduction || 0),
      skillCount: Number(skill.count || 0),
      skillNames: selected_battle_skills.map((item) => item.name),
      victory: player_advantage,
    });

    player.hp = player_hp_after;

    if (!victory && !defeated) {
      const round_summary =
        enemy_damage > 0
          ? `你以 ${real_choice.value} 压过敌方 ${battle.enemy_value}，对方气血 -${enemy_damage}。`
          : player_damage > 0
            ? `敌方以 ${battle.enemy_value} 压过你的 ${real_choice.value}，你气血 -${player_damage}。`
            : `双方数值同为 ${real_choice.value}，这一回合未分高下。`;
      const skill_summary =
        skill.id === "none"
          ? round_summary
          : `${round_summary} 技能【${skill.name}】生效。`;

      set_game({
        ...game,
        player,
        battle: {
          ...battle,
          enemy_hp: enemy_hp_after,
        },
        current_event: {
          title: "斗法未决",
          desc: `${skill_summary} 继续出招，气血归零才会分出胜负。`,
          summary: `你 ${player_hp_after} / 120，对方 ${enemy_hp_after} / 100。`,
        },
        event_serial: (game.event_serial || 0) + 1,
        logs: push_log(logs, `【斗法交锋】${skill_summary}`),
      });
      return;
    }

    if (victory) {
      const bonus_exp = battle.reward_exp + (choice.id === "fierce" ? 4 : 0);

      player.exp += bonus_exp;
      player.stone += battle.reward_stone;
      player.fame += battle.reward_fame;
      player.chance += battle.chance_gain;

      logs = push_log(logs, `你在斗法中取胜，压过了${battle.enemy_name}。`);

      const r1 = maybe_breakthrough(player, logs);
      player = r1.player;
      logs = r1.logs;

      let next_state = {
        ...game,
        player,
        logs,
        battle: null,
      };

      next_state = finalize_turn(next_state, false);

      const loot =
        battle.source_action === "explore" && rand_int(1, 100) <= 45
          ? await fetch_generated_item(player, "explore", "random")
          : battle.source_action === "quest" && rand_int(1, 100) <= 18
            ? await fetch_generated_item(player, "quest", "random")
            : null;
      const loot_item = loot
        ? { ...loot, id: `loot_${Date.now()}_${rand_int(1000, 9999)}` }
        : null;

      const ai_text = await generate_battle_result_text(
        battle,
        real_choice,
        true,
        player_damage,
        bonus_exp
      );

      set_game({
        ...next_state,
        bag: loot_item ? [loot_item, ...(next_state.bag || [])] : next_state.bag,
        current_event: ai_text,
        event_serial: (game.event_serial || 0) + 1,
        logs: loot_item
          ? push_log(
              push_log(next_state.logs, `【${ai_text.title}】${ai_text.summary}`),
              `【获得物品】${get_item_type_label(loot_item.type)}《${loot_item.name}》已收入背包。`
            )
          : push_log(next_state.logs, `【${ai_text.title}】${ai_text.summary}`),
      });
    } else {
      const bonus_exp = Math.max(4, Math.floor(battle.reward_exp / 2));

      player.exp += bonus_exp;
      player.hurt = clamp(player.hurt + 1, 0, 10);

      logs = push_log(logs, `你在斗法中落了下风，被${battle.enemy_name}逼退。`);

      const r1 = maybe_breakthrough(player, logs);
      player = r1.player;
      logs = r1.logs;

      let next_state = {
        ...game,
        player,
        logs,
        battle: null,
      };

      next_state = finalize_turn(next_state, false);

      const ai_text = await generate_battle_result_text(
  battle,
  real_choice,
  false,
  player_damage,
  bonus_exp
);

      set_game({
        ...next_state,
        current_event: ai_text,
        event_serial: (game.event_serial || 0) + 1,
        logs: push_log(next_state.logs, `【${ai_text.title}】${ai_text.summary}`),
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    set_battle_animation(null);
    set_loading_event(false);
  }
}

async function handle_tournament_choice(choice_id) {
  if (loading_event || !game.tournament || game.ended) return;

  const t = game.tournament;
  const round = t.current_round;
  const choice = round.choices.find((it) => it.id === choice_id);
  if (!choice) return;
  const skill = selected_battle_skill;
  const total_mp_cost = choice.mpCost + Number(skill.mpCost || 0);
  if (p.mp < total_mp_cost) return;

  set_loading_event(true);

  try {
    let player = { ...game.player };
    let logs = [...game.logs];

    player.mp = clamp(player.mp - total_mp_cost, 0, 120);

    const real_choice = {
      ...choice,
      name: skill.id === "none" ? choice.name : `${choice.name}·${skill.name}`,
      value: get_real_choice_value(choice),
    };

    const enemy_hp_before = get_battle_enemy_hp(round);
    const damage_delta = get_damage_delta(real_choice.value, round.enemy_value);
    const player_advantage = real_choice.value > round.enemy_value;
    const enemy_advantage = real_choice.value < round.enemy_value;
    const player_damage = enemy_advantage
      ? get_incoming_damage(round, choice, damage_delta, skill)
      : 0;
    const enemy_damage = player_advantage
      ? get_outgoing_damage(choice, damage_delta, skill)
      : 0;
    const player_hp_after = clamp(
      player.hp - player_damage + Number(skill.heal || 0),
      0,
      120
    );
    const enemy_hp_after = clamp(
      enemy_hp_before - enemy_damage,
      0,
      get_battle_enemy_max_hp(round)
    );
    const victory = enemy_hp_after <= 0;
    const defeated = player_hp_after <= 0;

    await play_battle_animation({
      mode: "tournament",
      choiceId: choice.id,
      choiceName: real_choice.name,
      playerValue: real_choice.value,
      enemyValue: round.enemy_value,
      playerHpBefore: player.hp,
      playerHpAfter: player_hp_after,
      enemyHpBefore: enemy_hp_before,
      enemyHpAfter: enemy_hp_after,
      playerDamage: player_damage,
      enemyDamage: enemy_damage,
      heal: Number(skill.heal || 0),
      incomingReduction: Number(skill.incomingReduction || 0),
      skillCount: Number(skill.count || 0),
      skillNames: selected_battle_skills.map((item) => item.name),
      victory: player_advantage,
    });

    player.hp = player_hp_after;

    if (!victory && !defeated) {
      const round_summary =
        enemy_damage > 0
          ? `你以 ${real_choice.value} 压过对方 ${round.enemy_value}，${round.enemy_name} 气血 -${enemy_damage}。`
          : player_damage > 0
            ? `${round.enemy_name} 以 ${round.enemy_value} 压过你的 ${real_choice.value}，你气血 -${player_damage}。`
            : `双方数值同为 ${real_choice.value}，这一回合未分高下。`;
      const skill_summary =
        skill.id === "none"
          ? round_summary
          : `${round_summary} 技能【${skill.name}】生效。`;

      set_game({
        ...game,
        player,
        tournament: {
          ...t,
          current_round: {
            ...round,
            enemy_hp: enemy_hp_after,
          },
        },
        current_event: {
          title: `${round.round_name}交锋`,
          desc: `${skill_summary} 气血归零才会判定胜负。`,
          summary: `你 ${player_hp_after} / 120，对方 ${enemy_hp_after} / 100。`,
        },
        event_serial: (game.event_serial || 0) + 1,
        logs: push_log(logs, `【${round.round_name}交锋】${skill_summary}`),
      });
      return;
    }

    if (victory) {
      player.exp += round.reward_exp || 20;
      player.stone += round.reward_stone || 20;
      player.fame += round.reward_fame || 4;
      logs = push_log(
        logs,
        `你在天机大比${round.round_name}中击败了${round.enemy_name}。`
      );
    } else {
      player.exp += Math.max(6, Math.floor((round.reward_exp || 20) / 2));
      player.hurt = clamp(player.hurt + 1, 0, 10);
      logs = push_log(
        logs,
        `你在天机大比${round.round_name}中不敌${round.enemy_name}。`
      );
    }

    const r1 = maybe_breakthrough(player, logs);
    player = r1.player;
    logs = r1.logs;

    const next_wins = t.wins + (victory ? 1 : 0);
    const next_losses = t.losses + (victory ? 0 : 1);
    const next_round_idx = defeated ? t.total_rounds : t.round_idx + 1;

    if (next_round_idx >= t.total_rounds) {
  let ending = null;

  if (next_wins >= 3 && player.stage >= 10) {
    ending = {
      title: "完美结局：天机夺魁",
      desc: "你连胜三轮，又已筑基，最终在天机大比中名动四方，被上宗直接收入门墙。",
      rank: "甲上",
      score: 260,
    };
  } else if (next_wins >= 2 && player.stage >= 10) {
    ending = {
      title: "成功结局：筑基入宗",
      desc: "你在天机大比中赢下多数对局，又已具筑基修为，最终顺利获得宗门名额。",
      rank: "甲",
      score: 210,
    };
  } else if (next_wins >= 2) {
    ending = {
      title: "遗憾结局：名动一时",
      desc: "你在天机大比中表现不俗，可惜终究未能筑基，距离真正改命仍差半步。",
      rank: "乙上",
      score: 170,
    };
  } else if (next_wins >= 1) {
    ending = {
      title: "普通结局：止步大比",
      desc: "你至少在天机大比中证明了自己并非泛泛之辈，只是还差最后一口气。",
      rank: "乙",
      score: 130,
    };
  } else {
    ending = {
      title: "普通结局：坊市散修",
      desc: "你未能在天机大比中取胜，但五十年修行并未白费。至少，你已见过真正的风浪。",
      rank: "未入流",
      score: 90,
    };
  }

  const final_logs = push_log(
    logs,
    `【天机大比收官】最终战绩：${next_wins} 胜 ${next_losses} 负。`
  );

  const preview_state = {
    ...game,
    player,
    logs: final_logs,
    tournament: {
      ...t,
      round_idx: Math.min(next_round_idx, t.total_rounds - 1),
      wins: next_wins,
      losses: next_losses,
      finished: true,
      current_round: {
        ...round,
        choices: [],
      },
    },
    ended: false,
    ending: null,
    current_event: {
      title: victory ? "三战收官" : "大比收官",
      desc: `最后一轮胜负已分。你在天机大比中的最终战绩为 ${next_wins} 胜 ${next_losses} 负。`,
      summary: `最终战绩：${next_wins} 胜 ${next_losses} 负。`,
    },
    event_serial: (game.event_serial || 0) + 1,
  };

  const final_state = {
    ...preview_state,
    tournament: null,
    ended: true,
    ending,
    current_event: {
      title: victory ? "大比收官" : "大比落幕",
      desc: `最后一轮胜负已分。你在天机大比中的最终战绩为 ${next_wins} 胜 ${next_losses} 负。`,
      summary: `最终战绩：${next_wins} 胜 ${next_losses} 负。`,
    },
  };

  const ending_lines =
    next_wins >= 3 && player.stage >= 10
      ? get_ending_dialogue_good(game.role.avatar)
      : next_wins >= 2
        ? get_ending_dialogue_mid(game.role.avatar)
        : get_ending_dialogue_bad(game.role.avatar);

  set_game(preview_state);

  setTimeout(() => {
    open_story_box(ending.title, ending_lines, () => {
      set_game(final_state);
    });
  }, 120);

  return;
}

    const round_data = await fetch_tournament_round(
      player,
      next_round_idx,
      game.role.name
    );

    const base_value =
      player.stage * 8 +
      Math.floor(player.spirit / 2) +
      Math.floor(player.dao / 10);

    set_game({
      ...game,
      player,
      tournament: {
        ...t,
        round_idx: next_round_idx,
        wins: next_wins,
        losses: next_losses,
        current_round: {
          ...round_data,
          enemy_avatar: get_enemy_avatar(round_data.enemy_name, "tournament"),
          enemy_hp: 100,
          enemy_max_hp: 100,
          enemy_damage: 9 + next_round_idx * 2,
          choices: [
            {
              id: "steady",
              name: "稳招",
              desc: "保守应对，输了掉血更少。",
              value: base_value - 4,
              mpCost: 0,
              loseFactor: 0.7,
            },
            {
              id: "normal",
              name: "常招",
              desc: "中规中矩，最均衡。",
              value: base_value,
              mpCost: 4,
              loseFactor: 1,
            },
            {
              id: "fierce",
              name: "猛招",
              desc: "全力一击，但灵力消耗更大。",
              value: base_value + 8,
              mpCost: 10,
              loseFactor: 1.25,
            },
          ],
        },
      },
      current_event: {
        title: victory ? `${round.round_name}得胜` : `${round.round_name}失利`,
        desc: victory
          ? `你以 ${real_choice.value} 压过对方的 ${round.enemy_value}，顺利拿下这一轮。下一位对手已经登场。`
          : `你以 ${real_choice.value} 未能压过对方的 ${round.enemy_value}，此轮失利。但大比尚未结束，仍有下一场机会。`,
        summary: `当前战绩：${next_wins} 胜 ${next_losses} 负。下一轮：${round_data.round_name}。`,
      },
      event_serial: (game.event_serial || 0) + 1,
      logs: push_log(
        logs,
        `【${victory ? `${round.round_name}得胜` : `${round.round_name}失利`}】当前战绩：${next_wins} 胜 ${next_losses} 负。`
      ),
    });
  } catch (err) {
    console.error(err);
  } finally {
    set_battle_animation(null);
    set_loading_event(false);
  }
}

function start_game() {
  const final_name = draft_name.trim() || "无名散修";
  const avatar =
    draft_gender === "female"
      ? "/avatar/nvjuese.png"
      : "/avatar/nanjuese.png";

  const next_game = {
    ...get_init_game(),
    started: true,
    role: {
      name: final_name,
      gender: draft_gender,
      avatar,
    },
  };

  set_game(next_game);
  set_tab("action");
  set_draft_name("");
  set_draft_gender("male");
  set_story_box(null);
  set_story_idx(0);
  set_story_seen({});
  set_selected_battle_skill_ids([]);
  set_settlement_modal(null);
  last_settlement_serial.current = next_game.event_serial || 0;
  set_saved_game(next_game);
  localStorage.setItem(save_key, JSON.stringify(next_game));

  setTimeout(() => {
    const story_map = get_main_story_map(next_game.role.avatar, next_game.role.name);
    const story = story_map[0];
    if (!story) return;

    set_story_seen((prev) => ({ ...prev, 0: true }));

    open_story_box(
      story.title,
      story.lines,
      () => {
        set_game((prev) => {
          const next_player = {
            ...prev.player,
            exp: prev.player.exp + story.reward_exp,
          };
          const r1 = maybe_breakthrough(next_player, prev.logs);

          return {
            ...prev,
            player: r1.player,
            logs: push_log(
              r1.logs,
              `【主线推进】${story.title}，修为 +${story.reward_exp}。`
            ),
            current_event: {
              title: story.title,
              desc: story.lines[story.lines.length - 1].text || "主线推进。",
              summary: `主线推进，修为 +${story.reward_exp}。`,
            },
            event_serial: (prev.event_serial || 0) + 1,
          };
        });
      }
    );
  }, 0);
}

function continue_game() {
  if (!saved_game) return;
  last_settlement_serial.current = saved_game.event_serial || 0;
  set_game(saved_game);
  set_tab("action");
  set_story_box(null);
  set_story_idx(0);
  set_story_seen({});
  set_selected_battle_skill_ids([]);
  set_settlement_modal(null);
}

function restart_game() {
  const next_game = get_init_game();
  set_game(next_game);
  set_tab("action");
  set_draft_name("");
  set_draft_gender("male");
  set_story_box(null);
  set_story_idx(0);
  set_story_seen({});
  set_selected_battle_skill_ids([]);
  set_settlement_modal(null);
  last_settlement_serial.current = next_game.event_serial || 0;
  set_saved_game(null);
  localStorage.removeItem(save_key);
}

if (!game.started) {
  return (
    <div className="page">
      <div className="page-inner start-page">
        <div className="start-panel">
          <div className="start-title">问道</div>
          <div className="start-subtitle">
            五十年修行，一场大比改命。先定下你的身份，再踏入这条道。
          </div>

          <div className="start-section">
            <div className="start-label">选择角色</div>
            <div className="role-select-grid">
              <button
                className={`role-card ${draft_gender === "male" ? "active" : ""}`}
                onClick={() => set_draft_gender("male")}
              >
                <img src="/avatar/nanjuese.png" alt="男角色" />
                <div className="role-card-name">男修</div>
              </button>

              <button
                className={`role-card ${draft_gender === "female" ? "active" : ""}`}
                onClick={() => set_draft_gender("female")}
              >
                <img src="/avatar/nvjuese.png" alt="女角色" />
                <div className="role-card-name">女修</div>
              </button>
            </div>
          </div>

          <div className="start-section">
            <div className="start-label">输入姓名</div>
            <input
              className="name-input"
              type="text"
              maxLength={12}
              placeholder="请输入角色姓名"
              value={draft_name}
              onChange={(e) => set_draft_name(e.target.value)}
            />
          </div>

          <button className="start-btn" onClick={start_game}>
            开始游戏
          </button>
          {saved_game ? (
            <button className="start-btn continue-btn" onClick={continue_game}>
              继续上次修行
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="page">
      <div className="page-inner">
        <div className="top-bar">
          <div className="top-left">
            <div className="game-title">问道</div>
            <div className="top-chip">第 {game.now_year} 年</div>
            <div className="top-chip">{season_list[game.now_season]}季</div>
            <div className="top-chip">{get_stage_name(p.stage)}</div>
          </div>

          <div className="top-right">
            <div className="resource">气血 {p.hp}</div>
            <div className="resource">灵力 {p.mp}</div>
            <div className="resource">灵石 {p.stone}</div>
            <div className="resource">名望 {p.fame}</div>
            <div className="resource highlight">距大比 {years_left} 年</div>
          </div>
        </div>

        <div className="main-layout">
          <section className="scene-panel">
            <div className="panel-title-row">
              <div className="panel-title">当前场景</div>
              <div className="scene-badge">{game.scene}</div>
            </div>

            <div className="scene-box">
             <div
              className="scene-art"
              style={{
              backgroundImage: `linear-gradient(rgba(18, 14, 10, 0.38), rgba(18, 14, 10, 0.72)), url(${get_scene_bg(game.scene)})`,
              }}
              >
               <div>
                 <div className="scene-art-title">{game.scene}</div>
                 <div className="scene-subtitle">风物各异，机缘与风险并存</div>
                </div>
                <div className="scene-art-desc">{get_scene_desc(game.scene)}</div>
               </div>

              <div className="scene-story event-animated" key={game.event_serial}>
                <div className="story-title">
                  当前事件
                  {loading_event ? (
                    <span className="ai-loading"> · 灵识推演中...</span>
                  ) : null}
                </div>

                <div className="event-title">{game.current_event.title}</div>
                <div className="story-text">{game.current_event.desc}</div>
                <div className="event-summary">{game.current_event.summary}</div>
              </div>
            </div>

            <div className="progress-wrap">
              <div className="progress-header">
                <span>修为</span>
                <span>
                  {p.exp} / {need_exp}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${exp_percent}%` }} />
              </div>
            </div>

{story_box ? (
  <div className="story-box">
    <div className="story-box-title">{story_box.title}</div>

    {(() => {
      const item = story_box.lines[story_idx];

      if (item.isNarration) {
        return <div className="story-narration">{item.text}</div>;
      }

      return (
        <div className={`story-dialogue ${item.side === "right" ? "right" : "left"}`}>
          <img className="story-avatar" src={item.avatar} alt={item.speaker} />
          <div className="story-bubble-wrap">
            <div className="story-speaker">{item.speaker}</div>
            <div className="story-bubble">{item.text}</div>
          </div>
        </div>
      );
    })()}

    <button className="story-box-btn" onClick={next_story_line}>
      {story_idx >= story_box.lines.length - 1 ? "收起" : "继续"}
    </button>
  </div>
) : (
  <div className="story-box story-box-empty">
    <div className="story-box-title">主线剧情</div>
    <div className="story-box-text">
      重要年份会在这里触发主线对白。到达结局时，也会在这里播放结局对话。
    </div>
  </div>
)}

            {game.ended ? (
              <div className="ending-box">
                <div className="ending-title">{game.ending?.title}</div>
                <div className="ending-desc">{game.ending?.desc}</div>
                <div className="ending-meta">
                  最终评价：{game.ending?.rank} ｜ 综合分：{game.ending?.score}
                </div>
                <button className="restart-btn" onClick={restart_game}>
                  重新开局
                </button>
              </div>
            ) : null}
          </section>

          <aside className="side-panel">
  <div className="side-title">角色面板</div>

  <div className="avatar-card">
    <img className="player-avatar" src={game.role.avatar} alt="角色头像" />
    <div className="avatar-info">
      <div className="avatar-name">{game.role.name}</div>
      <div className="avatar-subtitle">{get_stage_name(p.stage)}</div>
    </div>
  </div>

  <StatRow label="境界" value={get_stage_name(p.stage)} />
  <StatRow label="气血" value={p.hp} />
  <StatRow label="灵力" value={p.mp} />
  <StatRow label="神识" value={p.spirit} />
  <StatRow label="灵石" value={p.stone} />
  <StatRow label="道心" value={p.dao} />
  <StatRow label="名望" value={p.fame} />
  <StatRow label="机缘" value={p.chance} />
  <StatRow label="伤势" value={p.hurt} />
  <StatRow label="资格" value={game.flags.qualify ? "已获得" : "未获得"} />

  <div className="side-note">
    <div>修仙提示</div>
    <p>稳招保命，猛招赌命。别把自己打成返璞归真了。</p>
  </div>
</aside>
        </div>

        <section className="tab-panel">
          <div className="tab-bar">
            <button
              className={`tab-btn ${tab === "action" ? "active" : ""}`}
              onClick={() => set_tab("action")}
            >
              地图
            </button>
            <button
              className={`tab-btn ${tab === "log" ? "active" : ""}`}
              onClick={() => set_tab("log")}
            >
              日志
            </button>
            <button
              className={`tab-btn ${tab === "world" ? "active" : ""}`}
              onClick={() => set_tab("world")}
            >
              世界
            </button>
            <button
              className={`tab-btn ${tab === "bag" ? "active" : ""}`}
              onClick={() => set_tab("bag")}
            >
              背包
            </button>
            <button
              className={`tab-btn ${tab === "social" ? "active" : ""}`}
              onClick={() => set_tab("social")}
            >
              人脉
            </button>
          </div>

          <div className="tab-content">
            {tab === "action" && (
  <>
            {game.foundation ? (
  <FoundationPanel
    foundation={game.foundation}
    loading={loading_event}
    onAction={handle_foundation_action}
  />
) : game.forage ? (
  <ForagePanel
    forage={game.forage}
    loading={loading_event}
    onSelect={handle_forage_select}
    onHarvest={handle_forage_harvest}
    onGiveUp={() => resolve_forage(false, "你放弃继续采撷，草地里的灵光慢慢散去")}
  />
) : game.trace ? (
  <TracePanel
    trace={game.trace}
    loading={loading_event}
    onCellClick={handle_trace_cell_click}
    onReset={handle_trace_reset}
    onGiveUp={() => resolve_trace(false, "你放弃继续梳理灵径，山壁上的光格逐渐熄灭")}
  />
) : game.balance ? (
  <BalancePanel
    balance={game.balance}
    loading={loading_event}
    onAdjust={handle_balance_adjust}
    onReset={handle_balance_reset}
    onGiveUp={() => resolve_balance(false, "你主动撤去灵息，泉面气旋逐渐平息")}
  />
) : game.memory ? (
  <MemoryPanel
    memory={game.memory}
    loading={loading_event}
    onDigit={handle_memory_digit}
    onClear={handle_memory_clear}
    onGiveUp={() => resolve_memory(false, "你主动撤回神识，放弃继续破解禁制")}
  />
) : game.market ? (
  <MarketPanel
    market={game.market}
    player={p}
    bag={game.bag}
    loading={loading_event}
    onSearch={handle_market_search}
    onBuy={handle_market_buy}
    onResell={() => resolve_market_holding(true)}
    onKeep={() => resolve_market_holding(false)}
    onLeave={handle_market_leave}
    onRetry={handle_market_retry}
    onSell={handle_sell_item}
  />
) : game.puzzle ? (
  <PuzzlePanel
    puzzle={game.puzzle}
    loading={loading_event}
    onNodeClick={handle_puzzle_node_click}
    onReset={handle_puzzle_reset}
    onGiveUp={() => resolve_puzzle(false, "你主动散去灵力，放弃继续破解古阵")}
  />
) : game.auction ? (
  <AuctionPanel
    auction={game.auction}
    player={p}
    loading={loading_event}
    onBid={handle_auction_bid}
    onPass={handle_auction_pass}
  />
) : game.tournament ? (
      <div className="battle-box">
        <div className="battle-head">
          <div className="battle-title">天机大比</div>
          <div className="battle-enemy">
            {game.tournament.current_round.round_name} · {game.tournament.current_round.enemy_name}
          </div>
        </div>

        <div className="battle-rule">
          {game.tournament.current_round.desc}
          <br />
          当前战绩：{game.tournament.wins} 胜 {game.tournament.losses} 负
          <br />
          {game.tournament.current_round.hint}
        </div>

        <BattleSkillBar
          skills={battle_skills}
          selectedIds={selected_battle_skill_ids}
          playerMp={p.mp}
          onToggle={toggle_battle_skill}
        />

        <BattleStage
          mode="tournament"
          playerName={game.role.name}
          playerAvatar={game.role.avatar}
          enemyName={game.tournament.current_round.enemy_name}
          enemyAvatar={
            game.tournament.current_round.enemy_avatar ||
            get_enemy_avatar(game.tournament.current_round.enemy_name, "tournament")
          }
          playerHp={p.hp}
          playerMaxHp={120}
          enemyHp={get_battle_enemy_hp(game.tournament.current_round)}
          enemyMaxHp={get_battle_enemy_max_hp(game.tournament.current_round)}
          enemyPower={game.tournament.current_round.enemy_value}
          animation={battle_animation?.mode === "tournament" ? battle_animation : null}
          selectedSkillNames={selected_battle_skills.map((item) => item.name)}
        />

        <div className="battle-choices">
          {game.tournament.current_round.choices.map((choice) => (
            <button
              key={choice.id}
              className="battle-choice"
              onClick={() => handle_tournament_choice(choice.id)}
              disabled={loading_event || p.mp < choice.mpCost + Number(selected_battle_skill.mpCost || 0)}
            >
              <div className="battle-choice-top">
                <span>{choice.name}</span>
                <span className="battle-value">{get_real_choice_value(choice)}</span>
              </div>
              <div className="battle-meta">
                灵力消耗 {choice.mpCost + Number(selected_battle_skill.mpCost || 0)} ｜ {choice.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    ) : game.battle ? (
      <div className="battle-box">
        <div className="battle-head">
          <div className="battle-title">斗法</div>
          <div className="battle-enemy">{game.battle.enemy_name}</div>
        </div>

        <div className="battle-rule">
          对方已拦在身前，灵压隐隐逼近。先选一式出手，胜负随后揭晓。
        </div>

        <BattleSkillBar
          skills={battle_skills}
          selectedIds={selected_battle_skill_ids}
          playerMp={p.mp}
          onToggle={toggle_battle_skill}
        />

        <BattleStage
          mode="battle"
          playerName={game.role.name}
          playerAvatar={game.role.avatar}
          enemyName={game.battle.enemy_name}
          enemyAvatar={game.battle.enemy_avatar || get_enemy_avatar(game.battle.enemy_name, game.battle.source_action)}
          playerHp={p.hp}
          playerMaxHp={120}
          enemyHp={get_battle_enemy_hp(game.battle)}
          enemyMaxHp={get_battle_enemy_max_hp(game.battle)}
          enemyPower={game.battle.enemy_value}
          animation={battle_animation?.mode === "battle" ? battle_animation : null}
          selectedSkillNames={selected_battle_skills.map((item) => item.name)}
        />

        <div className="battle-choices">
          {game.battle.choices.map((choice) => (
            <button
              key={choice.id}
              className="battle-choice"
              onClick={() => handle_battle_choice(choice.id)}
              disabled={loading_event || p.mp < choice.mpCost + Number(selected_battle_skill.mpCost || 0)}
            >
              <div className="battle-choice-top">
                <span>{choice.name}</span>
                <span className="battle-value">{get_real_choice_value(choice)}</span>
              </div>
              <div className="battle-meta">
                灵力消耗 {choice.mpCost + Number(selected_battle_skill.mpCost || 0)} ｜ {choice.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    ) : game.ended ? (
      <div className="placeholder-box">
        大比已落幕，此世修行暂告一段落。
      </div>
    ) : (
      <WorldMap
        game={game}
        loading={loading_event}
        onAction={handle_action}
        onAuction={handle_buy_gongfa}
        onSkipTournament={handle_skip_to_tournament}
      />
    )}
  </>
)}

            {tab === "log" && (
              <div className="log-board">
                {game.logs.map((msg, idx) => (
                  <div key={idx} className="log-line">
                    <span className="log-no">[{game.logs.length - idx}]</span>
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "world" && (
              <div className="world-board">
                <div className="info-card">
                  <div className="info-label">天机大比</div>
                  <div className="info-value">第 50 年开启</div>
                </div>
                <div className="info-card">
                  <div className="info-label">当前状态</div>
                  <div className="info-value">
                    {game.flags.qualify ? "已具备基础资格" : "仍需继续努力"}
                  </div>
                </div>
                <div className="info-card">
                  <div className="info-label">战斗系统</div>
                  <div className="info-value">数字斗法已接入</div>
                </div>
              </div>
            )}

            {tab === "bag" && (
  <div className="bag-board">
    <div className="info-card">
      <div className="info-label">随身装备 {get_equipped_items(game).length} / 9</div>
      <div className="info-value">
        {get_equipped_items(game).length
          ? get_equipped_items(game)
              .map((item) => `《${item.name}》${get_item_type_label(item.type)}`)
              .join(" ｜ ")
          : "尚未装备，闭关全靠硬扛，斗法全靠头铁。"}
      </div>
    </div>

    <button
      className="menu-btn feature-btn bag-buy-btn"
      onClick={handle_buy_gongfa}
      disabled={loading_event || game.ended || game.battle || game.tournament || game.puzzle || game.market || game.memory || game.trace || game.forage || game.balance || game.foundation}
    >
      <span>去拍卖会再买一本</span>
      <span className="menu-btn-arrow">✦</span>
    </button>

    {(game.bag || []).length ? (
      <div className="gongfa-list">
        {(game.bag || []).map((item) => (
          <div className="gongfa-card" key={item.id}>
            <div className="gongfa-card-head">
              <div>
                <div className="gongfa-name">《{item.name}》</div>
                <div className="gongfa-rarity">{item.rarity}</div>
              </div>

              <div className="gongfa-bonus-box">
  {Number(item.speed_bonus || 0) > 0 && (
    <div className="gongfa-bonus">
      修炼 +{(Number(item.speed_bonus || 0) * 100).toFixed(0)}%
    </div>
  )}

  {Number(item.damage_bonus || 0) > 0 && (
    <div className="gongfa-bonus">
      伤害 +{(Number(item.damage_bonus || 0) * 100).toFixed(0)}%
    </div>
  )}
</div>
            </div>

            <div className="gongfa-desc">
              {item.description}
            </div>

            <div className="gongfa-meta">
              类型：{get_item_type_label(item.type)} ｜ 效果：{get_item_effect_text(item)}
            </div>

            <div className="gongfa-skill-list">
              {(item.type === "cultivation"
                ? get_gongfa_battle_skills(item)
                : [item_to_battle_skill(item)].filter(Boolean))
                .filter((skill) => skill.id !== "none")
                .map((skill) => (
                  <div className="gongfa-skill" key={skill.id}>
                    <strong>{skill.name}</strong>
                    <span>{skill.desc}</span>
                  </div>
                ))}
            </div>

            <div className="gongfa-meta">
              成交价：{item.price} 灵石
            </div>

            <button
              className="mini-btn"
              onClick={() => handle_equip_item(item.id)}
              disabled={item.type === "trade_good"}
            >
              {item.type === "trade_good"
                ? "仅可寄售"
                : is_equipped_item(game, item)
                  ? "卸下"
                  : `装备${get_item_type_label(item.type)}`}
            </button>
          </div>
        ))}
      </div>
    ) : (
      <div className="placeholder-box">
        储物袋目前很清爽，清爽到有点心酸。去拍卖会买一本功法吧。
      </div>
    )}
  </div>
)}

            {tab === "social" && (
              <SocialPanel
                contacts={game.contacts}
                player={p}
                year={game.now_year}
                loading={loading_event}
                actionDisabled={
                  loading_event ||
                  game.ended ||
                  game.battle ||
                  game.tournament ||
                  game.auction ||
                  game.puzzle ||
                  game.market ||
                  game.memory ||
                  game.trace ||
                  game.forage ||
                  game.balance ||
                  game.foundation
                }
                onVisit={() => handle_action("visit")}
                onGift={handle_social_gift}
                onHelp={handle_social_help}
                onDebate={handle_social_debate}
                onTrade={handle_social_trade}
              />
            )}
          </div>
        </section>
      </div>
      <SettlementModal
        settlement={settlement_modal}
        onClose={() => set_settlement_modal(null)}
      />
    </div>
  );
}
