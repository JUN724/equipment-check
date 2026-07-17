/**
 * 路由系统和应用初始化
 */

/** 解析 hash 路由 */
function parseRoute() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  const parts = hash.split('/');
  return {
    page: parts[0],
    params: parts.slice(1)
  };
}

/** 路由导航 */
function navigate() {
  const { page, params } = parseRoute();

  switch (page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'check':
      renderCheckForm(parseInt(params[0]));
      break;
    case 'history':
      renderHistory(parseInt(params[0]));
      break;
    case 'export':
      renderExport();
      break;
    case 'manage':
      renderManage();
      break;
    default:
      document.getElementById('app').innerHTML = `
        <div class="empty-state">
          <h2>404</h2>
          <p>页面不存在</p>
          <a href="#dashboard">返回首页</a>
        </div>
      `;
  }
}

/** 初始化 */
function initApp() {
  // 监听 hash 变化
  window.addEventListener('hashchange', navigate);

  // 初始加载
  navigate();
}

// 立即检查 DOM 是否已就绪，避免 DOMContentLoaded 在某些环境下不触发
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
