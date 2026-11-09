/**
 * 上海房产司法维权精算仪 & 避坑决策指南 (GitHub Pages 纯静态驱动脚本)
 * 纯本地运行，不依赖任何第三方服务端，所有精算指标直接基于全量宏观模型毫秒级响应
 */

let currentRole = 'tenant'; // 'tenant' | 'buyer' | 'landlord' | 'seller'
let currentScenario = 'deposit_damage';
let filteredCases = [];
let currentPage = 1;
const PAGE_SIZE = 12;
let activeCaseId = null;
let currentDetailCase = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initScenariosBar();
  updateBentoActuarialCards();
  applyFilters();
});

function initTheme() {
  const isDark = localStorage.getItem('theme') === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.setAttribute('data-lucide', 'moon');
  } else {
    document.documentElement.classList.remove('dark');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.setAttribute('data-lucide', 'sun');
  }
  lucide.createIcons();
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  initTheme();
}

// 身份角色切换
function setRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.remove('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-xs');
    btn.classList.add('text-slate-600', 'dark:text-slate-400');
  });
  const activeBtn = document.getElementById(`btn-role-${role}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-xs');
    activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
  }

  // 角色与场景自然映射
  if (role === 'tenant' && !['deposit_damage', 'early_termination', 'sublessor_runaway', 'living_defects'].includes(currentScenario)) {
    setScenario('deposit_damage');
  } else if (role === 'buyer' && !['price_default_deposit', 'delayed_delivery_hukou', 'hidden_defects', 'agency_dispute'].includes(currentScenario)) {
    setScenario('price_default_deposit');
  } else if (role === 'landlord' && !['deposit_damage', 'early_termination'].includes(currentScenario)) {
    setScenario('deposit_damage');
  } else if (role === 'seller' && !['price_default_deposit', 'delayed_delivery_hukou'].includes(currentScenario)) {
    setScenario('price_default_deposit');
  } else {
    applyFilters();
  }

  showToast(`已切换至【${getRoleLabel(role)}】立场`);
}

function getRoleLabel(role) {
  if (role === 'tenant') return '租客维权取证';
  if (role === 'buyer') return '买房人保定金索赔';
  if (role === 'landlord') return '出租房东合规清退';
  return '卖房业主催款免责';
}

// 8 大场景选择条初始化
function initScenariosBar() {
  const container = document.getElementById('scenarios-bar');
  const data = window.SH_PROPERTY_DATA;
  if (!data || !data.macro_stats) return;

  const stats = data.macro_stats;
  container.innerHTML = Object.keys(stats).map(sKey => {
    const s = stats[sKey];
    const isSelected = (sKey === currentScenario);
    return `
      <button onclick="setScenario('${s.id}')" id="sc-btn-${s.id}" class="sc-pill p-2 rounded-xl border ${isSelected ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'} transition text-left shadow-xs flex flex-col justify-between h-full">
        <div>
          <div class="text-[11px] font-bold line-clamp-1 leading-snug">${s.name}</div>
          <div class="text-[9px] text-slate-400 mt-0.5 line-clamp-1">${s.desc}</div>
        </div>
        <div class="text-[10px] font-mono tabular-nums text-slate-400 mt-1 flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-1">
          <span>胜率: <b class="text-emerald-600 dark:text-emerald-400">${s.win_pct}%</b></span>
          <span>${s.total_cases.toLocaleString()}篇</span>
        </div>
      </button>
    `;
  }).join('');
}

// 切换当前激活场景
function setScenario(scenarioId) {
  currentScenario = scenarioId;
  document.querySelectorAll('.sc-pill').forEach(b => {
    b.classList.remove('border-blue-600', 'ring-2', 'ring-blue-500/20', 'bg-blue-50/60', 'dark:bg-blue-950/40', 'text-blue-700', 'dark:text-blue-300');
    b.classList.add('border-slate-200', 'dark:border-slate-800', 'bg-white', 'dark:bg-[#111827]', 'text-slate-700', 'dark:text-slate-300');
  });
  const btn = document.getElementById(`sc-btn-${scenarioId}`);
  if (btn) {
    btn.classList.add('border-blue-600', 'ring-2', 'ring-blue-500/20', 'bg-blue-50/60', 'dark:bg-blue-950/40', 'text-blue-700', 'dark:text-blue-300');
    btn.classList.remove('border-slate-200', 'dark:border-slate-800', 'bg-white', 'dark:bg-[#111827]', 'text-slate-700', 'dark:text-slate-300');
  }

  updateBentoActuarialCards();
  applyFilters();
}

// 更新 Bento 司法精算卡片 (100% 依托宏观真实数据)
function updateBentoActuarialCards() {
  const data = window.SH_PROPERTY_DATA;
  if (!data || !data.macro_stats) return;

  const s = data.macro_stats[currentScenario];
  if (!s) return;

  document.getElementById('bento-total-cases').innerText = s.total_cases.toLocaleString();
  document.getElementById('bento-win-pct').innerText = `${s.win_pct}%`;
  document.getElementById('bento-granted-pct').innerText = `${s.granted_pct}%`;
  document.getElementById('bento-partial-pct').innerText = `${s.partial_pct}%`;
  document.getElementById('bento-deny-pct').innerText = `${s.deny_pct}%`;

  document.getElementById('bento-realization-rate').innerText = `${s.avg_realization_rate}%`;
  const tenKSupport = Math.round(10000 * (s.avg_realization_rate / 100));
  document.getElementById('bento-calc-prompt').innerHTML = `诉请索赔 10,000 元，法院平均实判支持约 <strong class="text-amber-700 dark:text-amber-400 font-mono">${tenKSupport.toLocaleString()}</strong> 元。`;

  document.getElementById('bento-scenario-desc').innerText = `${s.name} · 上海全量实践`;

  // 渲染 Top 证据与陷阱预览
  const evBox = document.getElementById('bento-top-evidences');
  const win1 = s.top_winning_evidence[0] || '书面清晰账目核算单';
  const trap1 = s.top_rejected_traps[0] || '口头抗辩无实质证据支持';
  evBox.innerHTML = `
    <div class="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 truncate">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
      <span class="truncate">首选铁证: ${win1}</span>
    </div>
    <div class="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 truncate">
      <span class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
      <span class="truncate">致命陷阱: ${trap1}</span>
    </div>
  `;
}

// 过滤 300 篇案例
let debounceTimer = null;
function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    applyFilters();
  }, 200);
}

function clearSearch() {
  document.getElementById('input-search').value = '';
  applyFilters();
}

function applyFilters(page = 1) {
  currentPage = page;
  const data = window.SH_PROPERTY_DATA;
  if (!data || !data.curated_cases) return;

  const q = document.getElementById('input-search').value.trim().toLowerCase();
  const court = document.getElementById('select-court').value;
  const verdict = document.getElementById('select-verdict').value;

  filteredCases = data.curated_cases.filter(c => {
    // 场景筛选: 优先看 scenario_id，或当输入搜索词时允许全局搜索
    if (!q && currentScenario && c.scenario_id !== currentScenario) {
      return false;
    }

    if (court && !c.court.includes(court)) {
      return false;
    }

    if (verdict !== 'ALL' && c.verdict !== verdict) {
      return false;
    }

    if (q) {
      const matchText = `${c.title} ${c.location} ${c.dispute_tags.join(' ')} ${c.claim_vs_support} ${c.judge_core_rule} ${c.party_roles}`.toLowerCase();
      const words = q.split(/\s+/);
      return words.every(w => matchText.includes(w));
    }

    return true;
  });

  renderCasesList();
}

// 渲染案例列表
function renderCasesList() {
  const container = document.getElementById('cases-container');
  const total = filteredCases.length;
  totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  document.getElementById('list-total-count').innerText = total.toLocaleString();
  document.getElementById('list-page-num').innerText = currentPage;
  document.getElementById('page-display').innerText = `${currentPage} / ${totalPages}`;
  document.getElementById('btn-prev-page').disabled = currentPage <= 1;
  document.getElementById('btn-next-page').disabled = currentPage >= totalPages;

  if (total === 0) {
    container.innerHTML = `
      <div class="p-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 bg-white/50 dark:bg-[#111827]/50 space-y-2">
        <div>未在当前精选库中找到完全匹配的案例。</div>
        <div class="text-[11px] text-blue-600 dark:text-blue-400 cursor-pointer" onclick="clearSearch()">点击重置搜索关键词</div>
      </div>
    `;
    return;
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredCases.slice(startIdx, startIdx + PAGE_SIZE);

  container.innerHTML = pageItems.map(c => {
    const isSelected = (c.case_id === activeCaseId);
    const vBadge = getVerdictBadge(c.verdict);
    const rateDisp = c.realization_rate !== null ? `${c.realization_rate}%` : '未计';
    const roleAction = getActionByRole(c, currentRole);
    const roleLabel = getRoleLabel(currentRole);

    return `
      <div onclick="openCaseDetail('${c.case_id}')" class="group p-4 rounded-xl border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/20 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'} cursor-pointer transition space-y-2.5">
        
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="font-mono text-slate-500 font-medium">${c.domain}</span>
            <span class="text-slate-300 dark:text-slate-700">·</span>
            <span class="font-mono text-slate-400">${c.case_id}</span>
            <span class="text-slate-300 dark:text-slate-700">·</span>
            <span class="text-slate-500 truncate max-w-[140px]">${c.court} (${c.year}年)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-mono text-slate-400 tabular-nums">获赔率: <b class="text-slate-700 dark:text-slate-300">${rateDisp}</b></span>
            ${vBadge}
          </div>
        </div>

        <div>
          <h3 class="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1 leading-snug">
            ${c.title}
          </h3>
          <div class="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
            ${c.location} · ${c.party_roles}
          </div>
        </div>

        <div class="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 line-clamp-2 leading-relaxed">
          <span class="font-bold text-slate-800 dark:text-slate-200">【诉辩实判】</span>${c.claim_vs_support}
        </div>

        <div class="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 px-2.5 py-1.5 rounded-lg flex items-start gap-1.5">
          <span class="font-bold shrink-0">[${roleLabel}]:</span>
          <span class="line-clamp-1">${roleAction}</span>
        </div>

        <div class="flex items-center justify-between pt-0.5 text-[11px]">
          <div class="flex flex-wrap gap-1">
            ${(c.dispute_tags || []).slice(0, 4).map(t => `
              <span class="font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">#${t}</span>
            `).join('')}
          </div>
          <span class="text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1 font-mono text-[11px] font-semibold">
            查看案情拆解与防坑条款 <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </span>
        </div>

      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function getActionByRole(c, role) {
  if (role === 'landlord' || role === 'seller') {
    return c.actionable_landlord_seller || '主张扣减或索赔须备齐实际发票凭证，空口主张法院不予支持。';
  }
  return c.actionable_tenant_buyer || '签约或交接时务必留存书面微信确认单，未见原件不可盲目付款。';
}

function getVerdictBadge(verdict) {
  if (verdict === 'GRANTED') {
    return `<span class="px-2 py-0.5 rounded-full font-mono text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">全部支持</span>`;
  }
  if (verdict === 'PARTIAL') {
    return `<span class="px-2 py-0.5 rounded-full font-mono text-[11px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">部分支持</span>`;
  }
  return `<span class="px-2 py-0.5 rounded-full font-mono text-[11px] bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-medium">全部驳回</span>`;
}

function changePage(delta) {
  const target = currentPage + delta;
  if (target >= 1 && target <= totalPages) {
    currentPage = target;
    renderCasesList();
    document.getElementById('left-pane').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 打开右侧详情抽屉 (Master-Detail 双栏联动)
function openCaseDetail(caseId) {
  const data = window.SH_PROPERTY_DATA;
  if (!data || !data.curated_cases) return;

  const c = data.curated_cases.find(item => item.case_id === caseId);
  if (!c) return;

  activeCaseId = caseId;
  currentDetailCase = c;

  // 展开右栏
  const leftPane = document.getElementById('left-pane');
  const rightPane = document.getElementById('right-pane');
  leftPane.classList.remove('lg:col-span-12');
  leftPane.classList.add('lg:col-span-5');
  rightPane.classList.remove('hidden');

  renderCasesList();

  // 注入详情内容
  document.getElementById('dt-title').innerText = c.title;
  document.getElementById('dt-case-id').innerText = c.case_id;
  document.getElementById('dt-domain-badge').innerText = c.domain;
  document.getElementById('dt-verdict-badge').innerHTML = getVerdictBadge(c.verdict);

  document.getElementById('dt-court').innerText = c.court;
  document.getElementById('dt-year').innerText = `${c.year}年判决`;
  document.getElementById('dt-location').innerText = c.location;
  document.getElementById('dt-rate').innerText = c.realization_rate !== null ? `${c.realization_rate}%` : '未计/非金钱';
  document.getElementById('dt-base-amount').innerText = c.base_amount || '未明确披露';
  document.getElementById('dt-party-roles').innerText = c.party_roles;

  document.getElementById('dt-claim-support').innerText = c.claim_vs_support;
  document.getElementById('dt-judge-rule').innerText = c.judge_core_rule;

  const wUl = document.getElementById('dt-winning-ev');
  wUl.innerHTML = (c.winning_evidence && c.winning_evidence.length > 0)
    ? c.winning_evidence.map(e => `<li>${e}</li>`).join('')
    : '<li>无特殊采信列举</li>';

  const rUl = document.getElementById('dt-rejected-ev');
  rUl.innerHTML = (c.rejected_evidence_trap && c.rejected_evidence_trap.length > 0)
    ? c.rejected_evidence_trap.map(e => `<li>${e}</li>`).join('')
    : '<li>无特殊败诉证据记载</li>';

  // 针对当前身份展示核心保命建议
  const sopText = (currentRole === 'landlord' || currentRole === 'seller')
    ? `【房东/卖家止损合规条款建议】\n${c.actionable_landlord_seller}`
    : `【租客/买房人取证维权条款建议】\n${c.actionable_tenant_buyer}`;
  document.getElementById('dt-actionable-sop').innerText = sopText;
  document.getElementById('dt-case-card').innerText = c.case_card_summary;

  // 重置滚动条
  const scrollBox = document.getElementById('detail-scroll');
  if (scrollBox) scrollBox.scrollTop = 0;

  if (window.innerWidth < 1024) {
    rightPane.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  lucide.createIcons();
}

function closeDetailPane() {
  activeCaseId = null;
  currentDetailCase = null;
  const leftPane = document.getElementById('left-pane');
  const rightPane = document.getElementById('right-pane');
  leftPane.classList.remove('lg:col-span-5');
  leftPane.classList.add('lg:col-span-12');
  rightPane.classList.add('hidden');
  renderCasesList();
}

function copyActionSop() {
  const text = document.getElementById('dt-actionable-sop').innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制维权与签约防坑要点！');
  }).catch(err => {
    console.error('Copy failed:', err);
  });
}

// 私域代查弹窗控制
function showContactModal() {
  document.getElementById('contact-modal').classList.remove('hidden');
}

function closeContactModal() {
  document.getElementById('contact-modal').classList.add('hidden');
}

// 轻量 Toast 提示
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').innerText = msg;
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
  }, 1800);
}
