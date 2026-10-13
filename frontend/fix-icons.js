/**
 * Safety net for the icon migration.
 *
 * Finds every `Hi*` identifier still referenced in a file and makes sure it is
 * imported — as a Lucide alias, so the JSX below does not have to change.
 * Run with `node fix-icons.js` from the frontend directory.
 */
const fs = require('fs');
const path = require('path');
const LU = new Set(Object.keys(require('react-icons/lu')));

const MAP = {
  HiOutlineHome: 'LuHouse', HiHome: 'LuHouse',
  HiOutlineTruck: 'LuTruck', HiTruck: 'LuTruck',
  HiOutlineCog: 'LuSettings2', HiCog: 'LuSettings2',
  HiOutlineClipboardCheck: 'LuClipboardCheck',
  HiOutlineClipboardList: 'LuClipboardList',
  HiOutlineCube: 'LuBoxes', HiCube: 'LuBoxes',
  HiOutlineShoppingCart: 'LuShoppingCart',
  HiOutlineShoppingBag: 'LuShoppingBag',
  HiOutlineChartBar: 'LuChartColumn',
  HiOutlineChartPie: 'LuChartPie',
  HiOutlineLightningBolt: 'LuZap',
  HiOutlineBell: 'LuBell',
  HiOutlineLogout: 'LuLogOut',
  HiOutlineAdjustments: 'LuSlidersHorizontal',
  HiOutlineUsers: 'LuUsers',
  HiOutlineUser: 'LuUser',
  HiOutlineUserGroup: 'LuUsersRound',
  HiOutlineUserCircle: 'LuCircleUser',
  HiOutlineDocumentReport: 'LuFileChartColumn',
  HiOutlineDocumentText: 'LuFileText',
  HiOutlineDocumentDownload: 'LuFileDown',
  HiOutlineDocumentDuplicate: 'LuFiles',
  HiOutlineDocument: 'LuFile',
  HiOutlineMenu: 'LuMenu',
  HiOutlineOfficeBuilding: 'LuBuilding2',
  HiOutlineDatabase: 'LuDatabase',
  HiOutlineReceiptTax: 'LuReceipt',
  HiOutlineReceiptRefund: 'LuReceipt',
  HiOutlineSun: 'LuSun', HiOutlineMoon: 'LuMoon',
  HiOutlineSearch: 'LuSearch', HiSearch: 'LuSearch',
  HiOutlinePlus: 'LuPlus', HiPlus: 'LuPlus',
  HiOutlineMinus: 'LuMinus',
  HiOutlinePencil: 'LuPencil', HiPencil: 'LuPencil',
  HiOutlineTrash: 'LuTrash2', HiTrash: 'LuTrash2',
  HiOutlineSave: 'LuSave',
  HiOutlineX: 'LuX', HiX: 'LuX',
  HiOutlineCheck: 'LuCheck', HiCheck: 'LuCheck',
  HiOutlineCheckCircle: 'LuCircleCheckBig', HiCheckCircle: 'LuCircleCheckBig',
  HiOutlineXCircle: 'LuCircleX', HiXCircle: 'LuCircleX',
  HiOutlineExclamation: 'LuTriangleAlert',
  HiOutlineExclamationCircle: 'LuCircleAlert',
  HiOutlineInformationCircle: 'LuInfo',
  HiOutlineQuestionMarkCircle: 'LuCircleHelp',
  HiOutlineRefresh: 'LuRefreshCw', HiRefresh: 'LuRefreshCw',
  HiOutlineUpload: 'LuUpload', HiOutlineDownload: 'LuDownload',
  HiOutlineEye: 'LuEye', HiEye: 'LuEye',
  HiOutlineEyeOff: 'LuEyeOff', HiEyeOff: 'LuEyeOff',
  HiOutlineMail: 'LuMail', HiMail: 'LuMail',
  HiOutlinePhone: 'LuPhone', HiPhone: 'LuPhone',
  HiOutlineLockClosed: 'LuLock', HiOutlineLockOpen: 'LuLockOpen',
  HiOutlineKey: 'LuKeyRound',
  HiOutlineArrowLeft: 'LuArrowLeft', HiArrowLeft: 'LuArrowLeft',
  HiOutlineArrowRight: 'LuArrowRight', HiArrowRight: 'LuArrowRight',
  HiOutlineArrowUp: 'LuArrowUp', HiOutlineArrowDown: 'LuArrowDown',
  HiOutlineChevronLeft: 'LuChevronLeft', HiChevronLeft: 'LuChevronLeft',
  HiOutlineChevronRight: 'LuChevronRight', HiChevronRight: 'LuChevronRight',
  HiOutlineChevronUp: 'LuChevronUp', HiChevronUp: 'LuChevronUp',
  HiOutlineChevronDown: 'LuChevronDown', HiChevronDown: 'LuChevronDown',
  HiOutlineCalendar: 'LuCalendar', HiOutlineClock: 'LuClock',
  HiOutlineLocationMarker: 'LuMapPin', HiOutlineGlobe: 'LuGlobe',
  HiOutlineBriefcase: 'LuBriefcase', HiOutlineCamera: 'LuCamera',
  HiOutlineSparkles: 'LuSparkles', HiOutlineHashtag: 'LuHash',
  HiOutlineCurrencyRupee: 'LuIndianRupee', HiOutlineCurrencyDollar: 'LuDollarSign',
  HiOutlineSwitchHorizontal: 'LuArrowLeftRight',
  HiOutlineChat: 'LuMessageCircle', HiOutlineChatAlt: 'LuMessageSquare',
  HiOutlinePaperAirplane: 'LuSend', HiOutlinePaperClip: 'LuPaperclip',
  HiOutlineFilter: 'LuFilter', HiOutlineViewGrid: 'LuLayoutGrid',
  HiOutlineViewList: 'LuList', HiOutlineTag: 'LuTag',
  HiOutlineShieldCheck: 'LuShieldCheck', HiOutlineBan: 'LuBan',
  HiOutlineStar: 'LuStar', HiStar: 'LuStar',
  HiOutlineDotsVertical: 'LuEllipsisVertical', HiOutlineDotsHorizontal: 'LuEllipsis',
  HiOutlineExternalLink: 'LuExternalLink', HiOutlineLink: 'LuLink',
  HiOutlinePrinter: 'LuPrinter', HiOutlineQrcode: 'LuQrCode',
  HiOutlineScale: 'LuScale', HiOutlineArchive: 'LuArchive',
  HiOutlineInbox: 'LuInbox', HiOutlineFolder: 'LuFolder',
  HiOutlineFlag: 'LuFlag', HiOutlineBookmark: 'LuBookmark',
  HiOutlineTrendingUp: 'LuTrendingUp', HiOutlineTrendingDown: 'LuTrendingDown',
  HiOutlinePlay: 'LuPlay', HiOutlinePause: 'LuPause', HiOutlineStop: 'LuSquare',
  HiOutlineLightBulb: 'LuLightbulb', HiOutlineFire: 'LuFlame',
  HiOutlineBeaker: 'LuFlaskConical', HiOutlineWrench: 'LuWrench',
  HiOutlineSupport: 'LuLifeBuoy', HiOutlineAnnotation: 'LuMessageSquareText',
  HiOutlineIdentification: 'LuIdCard', HiOutlineCreditCard: 'LuCreditCard',
  HiOutlineCash: 'LuBanknote', HiOutlineLibrary: 'LuLandmark',
  HiOutlineCollection: 'LuLayers', HiOutlineTemplate: 'LuLayoutTemplate',
  HiOutlineTable: 'LuTable', HiOutlineServer: 'LuServer',
  HiOutlineDeviceMobile: 'LuSmartphone', HiOutlineDesktopComputer: 'LuMonitor',
  HiOutlineAdjustmentsHorizontal: 'LuSlidersHorizontal',
};

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
    else if (/\.jsx?$/.test(e.name)) files.push(p);
  }
})('src');

let touched = 0;
const unmapped = new Set();

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');

  // Only real code references count. Config files store icon NAMES as strings
  // (e.g. `icon: 'HiOutlineTruck'`) which a lookup map resolves at render time —
  // those need no import, so blank out string literals before scanning.
  const code = s
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');

  const used = new Set(code.match(/\bHi[A-Z][A-Za-z0-9]*/g) || []);
  if (!used.size) continue;

  // Which of those already have a binding (any import at all)
  const imported = new Set();
  for (const m of s.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-icons\/[a-z0-9]+';/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) imported.add(name);
    }
  }

  const missing = [...used].filter((n) => !imported.has(n));
  if (!missing.length) continue;

  const lines = [];
  for (const n of missing) {
    const lu = MAP[n];
    if (!lu || !LU.has(lu)) { unmapped.add(n + (lu ? ` (-> ${lu} not in lucide)` : '')); continue; }
    lines.push(`  ${lu} as ${n},`);
  }
  if (!lines.length) continue;

  const block = `import {\n${lines.join('\n')}\n} from 'react-icons/lu';\n`;

  // Insert after the last existing import so hoisting order stays sane
  const allImports = [...s.matchAll(/^import .*?;\s*$/gm)];
  if (allImports.length) {
    const last = allImports[allImports.length - 1];
    const at = last.index + last[0].length;
    s = s.slice(0, at) + '\n' + block + s.slice(at);
  } else {
    s = block + s;
  }

  fs.writeFileSync(f, s);
  touched++;
  console.log(`${path.relative('src', f)}  +${lines.length} icon import(s)`);
}

console.log(`\n${touched} file(s) fixed`);
if (unmapped.size) {
  console.log('UNMAPPED (add to MAP):');
  for (const u of unmapped) console.log('  ' + u);
}
